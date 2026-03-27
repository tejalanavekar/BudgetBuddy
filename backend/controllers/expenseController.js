import Expense from '../models/Expense.js';
import axios from 'axios';

// ── Category Detection Helper ────────────────────────────────────
const detectCategory = (description) => {
  if (!description) return 'Other';
  
  const desc = description.toLowerCase().trim();
  
  // Transportation
  if (/\b(lyft|uber|taxi|cab|transit|train|bus|metro|parking|gas station|shell|chevron|bp|exxon|amtrak)\b/.test(desc)) {
    return 'Transportation';
  }
  
  // Dining
  if (/\b(restaurant|cafe|coffee|pizza|burger|food|bar|diner|grill|dining|bakery|ice cream|starbucks|mcdonalds|chick-fil-a|subway|chipotle|panera|wendy's)\b/.test(desc)) {
    return 'Dining';
  }
  
  // Shopping
  if (/\b(store|market|shop|mall|retail|amazon|walmart|target|costco|supermarket|grocery|best buy|whole foods|trader joe's|kroger)\b/.test(desc)) {
    return 'Shopping';
  }
  
  // Entertainment
  if (/\b(movie|cinema|theater|concert|game|entertainment|museum|amusement|ticket|regal|amc|cinemark)\b/.test(desc)) {
    return 'Entertainment';
  }
  
  // Utilities & Bills
  if (/\b(electric|water|gas bill|internet|phone|utility|cable|verizon|at&t|comcast|duke energy)\b/.test(desc)) {
    return 'Utilities';
  }
  
  // Health & Fitness
  if (/\b(gym|health|doctor|hospital|pharmacy|medical|fitness|clinic|cvs|walgreens|la fitness|planet fitness)\b/.test(desc)) {
    return 'Health';
  }
  
  // Default
  return 'Other';
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

  for (const line of lines) {
    // Pattern: YYYY-MM-DD
    const m2 = line.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m2) { date = `${m2[1]}-${m2[2]}-${m2[3]}`; break; }

    // Pattern: MM/DD/YYYY or MM-DD-YYYY
    const m1 = line.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (m1) { date = `${m1[3]}-${m1[1]}-${m1[2]}`; break; }

    // Pattern: "Month DD YYYY" or "Month DD, YYYY"
    const m3 = line.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
    if (m3) {
      const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                       jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
      date = `${m3[3]}-${months[m3[2].toLowerCase().slice(0,3)]}-${m3[1].padStart(2,'0')}`;
      break;
    }

    // Pattern: "MONTH DD YYYY" (text-based, e.g., "MARCH 25 2026")
    const m4 = line.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})\s+(\d{4})/i);
    if (m4) {
      const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                       jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
      date = `${m4[3]}-${months[m4[1].toLowerCase().slice(0,3)]}-${m4[2].padStart(2,'0')}`;
      break;
    }
  }

  // ── Description ──────────────────────────────────────────────────
  // Strategy 1: Look for merchant name in first few lines (usually top of receipt)
  const skipPatterns = [
    'reprint', 'receipt', 'welcome', 'thank you', 'please', 'note:',
    'your order', 'accuracy', 'phone:', 'order number', 'cashier',
    'blvd', 'street', 'ave', 'road', 'drive', 'if you', 'keep this',
    'www.', '.com', 'cafe #', 'suite', 'floor', 'just let', 'associate',
    'thanks for', 'ride with', 'hour', 'tax', 'fee', 'visa', 'cash',
    'mastercard', 'amex', 'charged', 'debit card', 'us$', '©', 'help',
    'transaction', 'reference', 'confirmation', 'invoice'
  ];

  let description = '';
  
  // First pass: Look in the first 10 lines for merchant name
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    
    if (line.length <= 2 || line.length > 100) continue;
    if (!isNaN(line)) continue;
    if (line.match(/^\d+$/)) continue;
    if (line.match(/\d{3}[-.\s]\d{3,4}/)) continue;
    if (line.match(/^\d{2}[\/\-]\d{2}/)) continue;
    if (line.includes('#')) continue;
    if (/^\d+[\.,]\d{2}$/.test(line)) continue; // Pure prices
    
    const lower = line.toLowerCase();
    if (skipPatterns.some(p => lower.includes(p))) continue;
    
    // Found a potential merchant name
    description = line;
    break;
  }
  
  // Fallback: If no merchant found in first 10 lines, search entire receipt
  if (!description) {
    for (const line of lines) {
      if (line.length <= 2 || line.length > 100) continue;
      if (!isNaN(line)) continue;
      if (line.match(/^\d+\s/)) continue;
      if (line.match(/\d{3}[-.\s]\d{3,4}/)) continue;
      if (line.match(/^\d{2}[\/\-]\d{2}/)) continue;
      if (line.includes('#')) continue;
      if (/^\d+\.?\d*$/.test(line)) continue;
      
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
  const mainCategory = detectCategory(description);
  
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
        items.push({ name, price, category: mainCategory });
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
          items.push({ name, price, category: mainCategory });
          processedLines.add(line);
        }
      }
    }
  }

  return { amount, date, description, items, category: detectCategory(description) };
};

// ────────────────────────────────────────────────────────────────


// ── POST /api/expenses/scan-receipt ──────────────────────────────
export const scanReceipt = async (req, res) => {

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const base64Image = req.file.buffer.toString('base64');

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

    const receiptPath = req.file ? req.file.originalname : null;

    const expense = new Expense({
      userId, description, amount, category, date,
      items: parsedItems,
      receiptPath
    });

    await expense.save();
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

    const expenses = await Expense.find({ userId }).sort({ date: -1 });
    res.status(200).json(expenses);

  } catch (error) {
    res.status(500).json({ message: 'Error fetching expenses', error: error.message });
  }
};