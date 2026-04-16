// ── PUT /api/expenses/:id ─────────────────────────────────────────────
import Expense from '../models/Expense.js';
import axios from 'axios';
import fs from 'fs/promises';
import { getCache, setCache, deleteCache } from '../utils/cache.js';



// ── Helper: Extract merchant/store name from receipt (smart extraction) ──
const extractMerchantName = (lines) => {
  // Strategy 1: Look near phone numbers (merchant usually before phone)
  for (let i = 0; i < lines.length - 1; i++) {
    const nextLine = lines[i + 1];
    // Check if next line is a phone number
    if (/\b\d{3}[-.\s]\d{3,4}[-.\s]\d{4}\b/.test(nextLine)) {
      const candidate = lines[i].trim();
      // Valid merchant name if reasonable length and not a skip pattern
      if (candidate.length > 2 && candidate.length <= 50 && 
          !candidate.match(/\d{5,}/) && // Not a long number
          !candidate.toLowerCase().includes('thank')) {
        return candidate;
      }
    }
  }
  
  // Strategy 2: Look near address (ZIP code pattern: 5 digits)
  for (let i = 0; i < lines.length; i++) {
    if (/\b\d{5}\b/.test(lines[i])) {
      // Search backwards for merchant name
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const candidate = lines[j].trim();
        if (candidate.length > 2 && candidate.length <= 50 && 
            !candidate.match(/^\d+/) && // Doesn't start with number
            !candidate.toLowerCase().includes('address')) {
          return candidate;
        }
      }
    }
  }
  
  // Strategy 3: Look for clean line at top (not a policy/greeting)
  const skipTop = ['thank', 'welcome', 'no refund', 'return', 'please', 'your order'];
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const candidate = lines[i].trim();
    const lower = candidate.toLowerCase();
    if (candidate.length > 2 && candidate.length <= 50 &&
        !skipTop.some(s => lower.includes(s))) {
      return candidate;
    }
  }
  
  return '';
};

// ── Helper: Infer category from items (context-based) ──
const inferCategoryFromItems = (items) => {
  if (!items || items.length === 0) return null;
  
  // Define category keywords for each type
  const categoryKeywords = {
    Food: ['burger', 'pizza', 'fries', 'chicken', 'beef', 'pasta', 'bread', 'rice', 
            'dal', 'paneer', 'curry', 'roti', 'naan', 'meal', 'food', 'drink', 'coffee',
            'tea', 'juice', 'beer', 'wine', 'appetizer', 'dessert', 'ice cream'],
    Shopping: ['paneer', 'yogurt', 'milk', 'butter', 'cheese', 'vegetable', 'fruit',
               'onion', 'tomato', 'potato', 'carrot', 'spinach', 'spice', 'flour',
               'oil', 'sugar', 'salt', 'soap', 'shampoo', 'toothpaste', 'clothing',
               'shoe', 'shirt', 'pant', 'dress', 'hat', 'bag', 'book'],
    Transport: ['fuel', 'gas', 'petrol', 'diesel', 'toll', 'parking', 'fare', 'ticket'],
    Entertainment: ['movie', 'ticket', 'concert', 'game', 'show', 'museum', 'park'],
    Health: ['medicine', 'pharmacy', 'doctor', 'tablet', 'vitamin', 'health'],
    Education: ['book', 'pen', 'notebook', 'stationery', 'course', 'tuition'],
    Travel: ['hotel', 'flight', 'room', 'resort'],
  };
  
  const scores = {};
  let totalMatches = 0;
  
  // Count keyword matches in item names
  for (const item of items) {
    const itemLower = item.name.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => itemLower.includes(kw))) {
        scores[category] = (scores[category] || 0) + 1;
        totalMatches++;
      }
    }
  }
  
  // Return category with most matches (if any matches found)
  if (totalMatches === 0) return null;
  
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
};

// ── Category Detection Helper (Enhanced) ────────────────────────────
const detectCategory = (description, items = []) => {
  if (!description) {
    // Try inferring from items if no description
    const inferred = inferCategoryFromItems(items);
    return inferred || 'Other';
  }
  
  const desc = description.toLowerCase().trim();
  
  // Quick match for major brands (lean list)
  const majorBrands = {
    'Transport': ['lyft', 'uber', 'taxi', 'didi', 'ola'],
    'Food': ['starbucks', 'mcdonalds', 'subway', 'chipotle', 'panera'],
    'Shopping': ['amazon', 'walmart', 'target', 'costco', 'kroger']
  };
  
  for (const [category, keywords] of Object.entries(majorBrands)) {
    if (keywords.some(kw => desc.includes(kw))) {
      return category;
    }
  }
  
  // Broader category matching
  if (/\b(taxi|cab|bus|uber|lyft|didi|ola|metro|train|parking|gas|petrol|fuel|toll)\b/.test(desc)) {
    return 'Transport';
  }
  
  if (/\b(restaurant|cafe|coffee|pizza|burger|food|bar|diner|bakery|ice cream)\b/.test(desc)) {
    return 'Food';
  }
  
  if (/\b(store|market|shop|mall|retail|supermarket|grocery|bazaar|safeway|albertsons)\b/.test(desc)) {
    return 'Shopping';
  }
  
  if (/\b(movie|cinema|theater|concert|game|entertainment|museum|amusement|ticket)\b/.test(desc)) {
    return 'Entertainment';
  }
  
  if (/\b(electric|water|gas bill|internet|phone|utility|cable)\b/.test(desc)) {
    return 'Utilities';
  }
  
  if (/\b(pharmacy|medical|clinic|hospital|doctor|medicine|health)\b/.test(desc)) {
    return 'Health';
  }
  
  if (/\b(school|college|university|course|books|education|library)\b/.test(desc)) {
    return 'Education';
  }
  
  if (/\b(hotel|flight|airlines|airbnb|booking|travel|trip|tour)\b/.test(desc)) {
    return 'Travel';
  }
  
  // Fallback: Try to infer from items
  const inferred = inferCategoryFromItems(items);
  return inferred || 'Other';
};

// ── Receipt Text Parser ───────────────────────────────────────────
const parseReceiptText = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // ── Amount ───────────────────────────────────────────────────────
  let amount = '';
  const skipFeeKeywords = ['fee', 'tax', 'tip', 'gratuity', 'discount', 'credit', 'subtotal', 'sub total'];

  // Strategy 1: Look for "TOTAL" or "AMOUNT DUE" lines (case-insensitive)
  for (const line of lines) {
    const lower = line.toLowerCase();
    if ((lower.includes('total') || lower.includes('amount due') || lower.includes('grand total')) &&
        !skipFeeKeywords.some(keyword => lower.includes(keyword))) {
      const match = line.match(/[US$₹€]*\s*(\d+[\.,]\d{2})/);
      if (match) { amount = parseFloat(match[1].replace(',', '.')).toFixed(2); break; }
    }
  }

  // Strategy 2: Look for payment method lines
  if (!amount) {
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (
        lower.includes('visa') ||
        lower.includes('cash') ||
        lower.includes('mastercard') ||
        lower.includes('charged') ||
        lower.includes('due') ||
        lower.includes('amex') ||
        lower.includes('debit')
      ) {
        const match = line.match(/[US$₹€]*\s*(\d+[\.,]\d{2})/);
        if (match) { amount = parseFloat(match[1].replace(',', '.')).toFixed(2); break; }
      }
    }
  }

  // Strategy 3: Find the largest amount (usually the total)
  if (!amount) {
    const allPrices = [...text.matchAll(/[US$₹€]*\s*(\d+[\.,]\d{2})/g)]
      .map(m => parseFloat(m[1].replace(',', '.')))
      .filter(p => p > 0 && p < 100000);
    
    if (allPrices.length > 0) {
      // Get the largest amount (most likely the total)
      amount = Math.max(...allPrices).toFixed(2);
    }
  }

  // ── Date ─────────────────────────────────────────────────────────
  let date = new Date().toISOString().split('T')[0];

  // First pass: Look for dates in all lines (more aggressive search)
  for (const line of lines) {
    // Pattern: YYYY-MM-DD
    const m2 = line.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m2) { date = `${m2[1]}-${m2[2]}-${m2[3]}`; break; }

    // Pattern: MM/DD/YYYY or MM-DD-YYYY (with flexible whitespace)
    const m1 = line.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m1) { date = `${m1[3]}-${m1[1].padStart(2,'0')}-${m1[2].padStart(2,'0')}`; break; }

    // Pattern: "Month DD, YYYY" or "Month DD YYYY" or "DD Month YYYY"
    const m3 = line.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(\d{4})/i);
    if (m3) {
      const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                       jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
      date = `${m3[3]}-${months[m3[2].toLowerCase().slice(0,3)]}-${m3[1].padStart(2,'0')}`;
      break;
    }

    // Pattern: "MONTH DD, YYYY" or "MONTH DD YYYY" (text-based, e.g., "MARCH 25, 2026" or "Mar 25 2026")
    const m4 = line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s+(\d{1,2}),?\s+(\d{4})/i);
    if (m4) {
      const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                       jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
      date = `${m4[3]}-${months[m4[1].toLowerCase().slice(0,3)]}-${m4[2].padStart(2,'0')}`;
      break;
    }

    // Pattern: "DD-Month-YYYY" or "DD/Month/YYYY" (e.g., "25-Mar-2026")
    const m5 = line.match(/(\d{1,2})[\/\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\/\-](\d{4})/i);
    if (m5) {
      const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                       jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
      date = `${m5[3]}-${months[m5[2].toLowerCase().slice(0,3)]}-${m5[1].padStart(2,'0')}`;
      break;
    }
  }

  // ── Description ──────────────────────────────────────────────────
  // Use smart merchant extraction instead of hardcoded keywords
  let description = extractMerchantName(lines);
  
  // Fallback: If smart extraction didn't work, use pattern-based extraction
  if (!description) {
    const skipPatterns = [
      'reprint', 'receipt', 'welcome', 'thank you', 'please', 'note:',
      'your order', 'accuracy', 'phone:', 'order number', 'cashier',
      'blvd', 'street', 'ave', 'road', 'drive', 'if you', 'keep this',
      'www.', '.com', 'cafe #', 'suite', 'floor', 'just let', 'associate',
      'hour', 'tax', 'fee', 'visa', 'cash', 'refund', 'return',
      'mastercard', 'amex', 'charged', 'debit card', 'us$', '©', 'help',
      'transaction', 'reference', 'confirmation', 'invoice'
    ];

    // Look in the first 10 lines for a clean description
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      
      if (line.length <= 2 || line.length > 100) continue;
      if (!isNaN(line)) continue;
      if (line.match(/^\d+$/)) continue;
      if (line.match(/\d{3}[-.\s]\d{3,4}/)) continue;
      if (line.match(/^\d{2}[\/\-]\d{2}/)) continue;
      if (line.includes('#')) continue;
      if (/^\d+[\.,]\d{2}$/.test(line)) continue;
      
      const lower = line.toLowerCase();
      if (skipPatterns.some(p => lower.includes(p))) continue;
      
      description = line;
      break;
    }
  }

  // ── Items ─────────────────────────────────────────────────────────
  const skipWords = [
    'total', 'subtotal', 'sub total', 'tax', 'tip', 'discount',
    'change', 'cash', 'balance', 'amount', 'bill', 'gratuity',
    'visa', 'mastercard', 'amex', 'acct', 'auth', 'trans',
    'apl', 'aid', 'savings', 'charged', 'due', 'payment',
    'reward', 'points', 'receipt', 'order', 'fee', 'debit', 'card',
    'thanks', 'ride', 'hour', 'day', 'week', 'month'
  ];

  const items = [];
  const processedLines = new Set();
  
  // Will determine category after extracting items, so we can use context-based inference
  let category = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Try pattern: "Name $amount" or "Name    $amount"
    const pricePattern = /^(.+?)\s{2,}[US$₹€]*\s*(\d+[\.,]\d{2})\s*$/;
    const match = line.match(pricePattern);
    
    if (match) {
      const name = match[1].trim();
      const price = parseFloat(match[2].replace(',', '.'));
      const lower = name.toLowerCase();
      
      // Skip lines that are fee/tax/total items or already very large (main total)
      if (!skipWords.some(w => lower.includes(w)) && 
          price > 0 && 
          price < 1000 && 
          name.length > 1 &&
          name.length < 100 &&
          !processedLines.has(line)) {
        // Use description for now, will update after extracting all items
        items.push({ name, price, category: description });
        processedLines.add(line);
      }
    } else {
      // Alternative: Try pattern "Name $amount" on same line (with regex for amount at end)
      const match2 = line.match(/^(.+?)\s+[US$₹€]*\s*(\d+[\.,]\d{2})\s*$/);
      if (match2) {
        const name = match2[1].trim();
        const price = parseFloat(match2[2].replace(',', '.'));
        const lower = name.toLowerCase();
        
        if (!skipWords.some(w => lower.includes(w)) && 
            price > 0 && 
            price < 1000 && 
            name.length > 1 &&
            name.length < 100 &&
            !processedLines.has(line)) {
          items.push({ name, price, category: description });
          processedLines.add(line);
        }
      }
    }
  }

  return { amount, date, description, items, category: detectCategory(description, items) };
};

// ────────────────────────────────────────────────────────────────


// ── POST /api/expenses/scan-receipt ──────────────────────────────
export const scanReceipt = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    // Read file from disk and convert to base64
    const fileBuffer = await fs.readFile(req.file.path);
    const base64Image = fileBuffer.toString('base64');

    const visionResponse = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`,
      {
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
        }]
      }
    );

    const fullText = visionResponse.data.responses[0]?.fullTextAnnotation?.text || '';

    if (!fullText) {
      return res.status(200).json({ text: '', parsed: null, message: 'No text found in image' });
    }

    const parsed = parseReceiptText(fullText);
    
    console.log('Parsed data:', {
      description: parsed.description,
      category: parsed.category,
      amount: parsed.amount,
      date: parsed.date
    });
    
    res.status(200).json({ text: fullText, parsed });

  } catch (error) {
    console.error('Google Vision error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Receipt scan failed', error: error.message });
  }
};


// ── POST /api/expenses ────────────────────────────────────────────
export const createExpense = async (req, res) => {
  try {
    const { userId, description, amount, category, date, items } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    let parsedItems = [];
    if (items) {
      try { parsedItems = JSON.parse(items); } catch { parsedItems = []; }
    }


    const expense = new Expense({
      userId, description, amount, category, date,
      items: parsedItems,
      receiptPath : req.file ? req.file.filename : null
    });

    await expense.save();
    await deleteCache(`expenses:${userId}`);
    await deleteCache(`receipts:${userId}`);
    res.status(201).json({ message: 'Expense added successfully', expense });

  } catch (error) {
    res.status(400).json({ message: 'Error adding expense', error: error.message });
  }
};


// ── GET /api/expenses ─────────────────────────────────────────────
export const getExpenses = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    const cacheKey = `expenses:${userId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log('Cache HIT:', cacheKey);
      return res.status(200).json(cached);
      const data = Array.isArray(cached) ? cached : Object.values(cached);
      return res.status(200).json(data);
    }

    // 2. Cache miss — hit the database
    console.log('Cache MISS:', cacheKey);
    const expenses = await Expense.find({ userId }).sort({ date: -1 });
    const plainExpenses = expenses.map(e => e.toObject());
    // 3. Store in cache for 5 minutes
    await setCache(cacheKey, expenses);

    res.status(200).json(expenses);

  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses', error: error.message });
  }
};

// Update an existing expense
export const updateExpense = async (req, res) => {
  try {
    const expenseId = req.params.id;

    // Find the expense and ensure it belongs to the user
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found or unauthorized' });
    }

    // Update fields if provided
    if (req.body.description !== undefined) expense.description = req.body.description;
    if (req.body.amount !== undefined)      expense.amount = Number(req.body.amount);
    if (req.body.category !== undefined)    expense.category = req.body.category;
    if (req.body.date !== undefined) expense.date = req.body.date;
    if (req.body.items) {
      try {
        expense.items = JSON.parse(req.body.items);
      } catch {
        expense.items = [];
      }
    }
    // Handle new receipt upload
    if (req.file) {
      expense.receiptPath = req.file.filename;
    }

    await expense.save();
    await deleteCache(`expenses:${expense.userId}`);
await deleteCache(`receipts:${expense.userId}`);
    res.status(200).json({ message: 'Expense updated successfully', expense });
  } catch (error) {
    res.status(400).json({ message: 'Error updating expense', error: error.message });
  }
};
// Delete an expense
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });

    // ✅ Verify ownership before deleting
    if (expense.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const userId = expense.userId;

    await Expense.findByIdAndDelete(req.params.id);
    await deleteCache(`expenses:${userId}`);
    await deleteCache(`receipts:${userId}`);
    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting expense', error: error.message });
  }
};

// Get all expenses with receipts for a user
export const getAllReceipts = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'User ID required' });

    const cacheKey = `receipts:${userId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log('Cache HIT:', cacheKey);
      return res.status(200).json(cached);
    }
    console.log('Cache MISS:', cacheKey);

    const expenses = await Expense.find({ userId, receiptPath: { $exists: true, $ne: null } }).sort({ date: -1 });
    const plainExpenses = expenses.map(e => e.toObject());
    await setCache(cacheKey, expenses);
    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching receipts', error: error.message });
  }
};