import { addExpense, scanReceiptWithVision } from '../api/services/expenseService.js';
import React, { useState } from 'react';
import {Form, Button, Container, Card, Alert, Row, Col} from 'react-bootstrap';
import '../styles/expense.css';
import { useAuth } from '../context/AuthContext.jsx';
// ExpensePage component for adding new expenses and useState for form handling, so setForm is the action where in user inputs the data and the state is being changed from form to setForm
//setForm to update the object when user inputs in the fields

//OCR
// ── Category keyword map  to match items based  on image upload
const CATEGORY_KEYWORDS = {
  Food:       ['tomato', 'onion', 'bread', 'milk', 'rice', 'dal', 'vegetable',
    'fruit', 'chicken', 'eggs', 'butter', 'cheese', 'biscuit', 'snack',
    'restaurant', 'postmates', 'uber eats', 'swiggy' , 'zomato' , 'chocolate', 'matcha' ,'cafe', 'burger', 'pizza', 'food',
    'eat', 'kitchen', 'diner', 'bakery', 'coffee', 'tea', 'meal',
    'potato', 'carrot', 'spinach', 'paneer', 'curd', 'oil', 'flour',
    'sugar', 'salt', 'spice', 'sauce', 'noodles', 'pasta', 'soup'],
  Transport:  ['uber', 'ola', 'taxi', 'fuel', 'petrol', 'diesel', 'auto', 'bus', 'metro', 'train', 'cab', 'transport', 'fare'],
  Utilities:  ['electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'bill', 'recharge', 'mobile', 'phone', 'utility', 'rent', 'Ralphs', 'subscription', 'emi', 'loan', 'credit card', 'market', 'supermarket', 'grocery', 'mart'],
  Entertainment: ['movie', 'netflix', 'spotify', 'concert', 'game', 'amusement', 'park', 'entertainment', 'show', 'event', 'theater', 'museum', 'zoo', 'sports', 'car', 'club', 'music', 'workshop', 'festival'],
  Health:     ['pharmacy', 'medical', 'clinic', 'hospital', 'doctor', 'medicine', 'chemist', 'health', 'lab', 'diagnostic'],
  Education:  ['school', 'college', 'university', 'course', 'books', 'stationery', 'tuition', 'library', 'education', 'notebook',  'pens', 'diary', 'stationary', 'folder'],
  Shopping:   ['amazon', 'mall', 'store', 'shop', 'retail',  'clothing', 'electronics', 'shopping'],
  Travel:     ['hotel', 'flight', 'airlines', 'airbnb', 'booking', 'resort', 'hostel', 'travel', 'trip', 'tour'],
  Savings:    ['savings', 'deposit', 'investment', 'mutual fund', 'sip', 'fd', 'recurring', 'stocks', 'bonds', 'retirement'],
};
//Categorize item based on keywords in the description, if no match found, return 'Other', looks per item and first lowercase then if  it  matches the keyword then map with them.
//Object.entries converts into [key, value] pair
//.some is method-> returns true if there is even a single match 
const categorizeItem = (itemName) => {
  const lower = itemName.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'Other';
};


//Guess overall category, convert to entire  lowercase, (text) take  entire text as one big string
//.filter smarter than .some as it counts all the matches 
//which category matches the most keywords in the entire text, and returns that category as the guess for the overall expense category. If no keywords are found, it defaults to 'Other'.
const guessCategory = (text) => {
  const lower = text.toLowerCase();
  const scores = {};
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = keywords.filter(kw => lower.includes(kw)).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : 'Other';
};
//Extract total  ->(text) takes entire receipt 
//regex -> total amount : xyz.cents(2 decimals)
//replace , with . as in some countries they write as 175,22-> 175.22(fixed)
const extractAmount = (text) => {
  const lines = text.split('\n');

  // Strategy 1 — look for a line containing "total" but NOT subtotal/gratuity/tax/tip
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.includes('total') &&
      !lower.includes('subtotal') &&
      !lower.includes('sub total') &&
      !lower.includes('gratuity') &&
      !lower.includes('tip') &&
      !lower.includes('tax')
    ) {
      const match = line.match(/(\d+[\.,]\d{2})/);
      if (match) return parseFloat(match[1].replace(',', '.')).toFixed(2);
    }
  }

  // Strategy 2 — look for lines with "due" or "charged" or "visa/mastercard/cash"
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      lower.includes('due') ||
      lower.includes('charged') ||
      lower.includes('visa') ||
      lower.includes('mastercard') ||
      lower.includes('cash')
    ) {
      const match = line.match(/(\d+[\.,]\d{2})/);
      if (match) return parseFloat(match[1].replace(',', '.')).toFixed(2);
    }
  }

  // Strategy 3 — last resort, take the LAST price on the receipt
  // (receipts usually end with the final amount)
  const allPrices = [...text.matchAll(/\b(\d{1,4}[\.,]\d{2})\b/g)]
    .map(m => parseFloat(m[1].replace(',', '.')))
    .filter(p => p > 0 && p < 10000); // sanity cap

  if (allPrices.length > 0) return allPrices[allPrices.length - 1].toFixed(2);

  return '';
};

// ── Helper: Extract date ──────────────────────────────────────────
//For both USA based format and India/international format
const extractDate = (text, dateFormat = 'MM/DD/YYYY') => {  // ← accept dateFormat param
  const patterns = [
    
    // Pattern 1 — no change
    { 
      regex: /(\d{4})-(\d{2})-(\d{2})/, 
      format: (m) => `${m[1]}-${m[2]}-${m[3]}` 
    },

    // Pattern 2 — ADD THE COUNTRY LOGIC HERE ↓
    { 
      regex: /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/, 
      format: (m) => {
        if (dateFormat === 'MM/DD/YYYY') {
        return `${m[3]}-${m[1]}-${m[2]}`;  // ← year first, then month, then day
          } else {
          return `${m[3]}-${m[2]}-${m[1]}`;  // India: day and month swapped
    }
      }
    },

    // Pattern 3 — no change
    {
      regex: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
      format: (m) => {
        const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
        return `${m[3]}-${months[m[2].toLowerCase().slice(0,3)]}-${m[1].padStart(2,'0')}`;
      }
    }
  ];

  for (const { regex, format } of patterns) {
    const match = text.match(regex);
    if (match) return format(match);
  }

  return new Date().toISOString().split('T')[0];
};

// ── Helper: Extract description (store name = first meaningful line) ──
//filters and splits into meaningful data
const extractDescription = (text) => {
  const skipPatterns = ['reprint', 'receipt', 'welcome', 'thank you', 'please', 
    'your order', 'accuracy', 'cafe #', 'phone:', 'order number', 
    'cashier', 'blvd', 'street', 'ave ', 'road', 'drive',
    'if you', 'keep this', 'www.', 'http', '.com',];
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => {
      if (l.length <= 3) return false;
      if (!isNaN(l)) return false;
      if (l.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/)) return false; // date line
      if (l.match(/^\d+\s/)) return false;       // ← lines starting with numbers (addresses like "3711 Sports Arena")
      if (l.includes('#')) return false;
      if (l.match(/\d{3}[-.\s]\d{3,4}/)) return false; // ← phone numbers
      const lower = l.toLowerCase();
      if (skipPatterns.some(p => lower.includes(p))) return false;
      return true;
    });

  return lines[0] || '';
};

// ── Helper: Extract individual line items ─────────────────────────
//basically words other than skipwords are pushed into the data, for the information to be added 
const extractItems = (text) => {
  const items = [];
  const skipWords = ['total', 'subtotal', 'sub total', 'tax', 'tip', 'discount', 
                   'change', 'cash', 'balance', 'amount', 'bill', 
                   'gratuity', 'visa', 'mastercard', 'amex', 'acct', 
                   'auth', 'trans', 'apl', 'aid', 'savings', 'charged',
                   'due', 'payment', 'reward', 'points'];
  const lines = text.split('\n');

  for (const line of lines) {
    const match = line.match(/^(.+?)\s+[₹$]?\s*(\d+[\.,]\d{2})\s*$/);
    if (match) {
      const name  = match[1].trim();
      const price = parseFloat(match[2].replace(',', '.'));
      if (!skipWords.some(w => name.toLowerCase().includes(w)) && price > 0 && name.length > 1) {
        items.push({
          name,
          price,
          category: categorizeItem(name)
        });
      }
    }
  }
  return items;
};

const CATEGORIES = ['Food','Transport','Utilities','Entertainment','Health','Education','Shopping','Travel','Savings','Other'];
const ExpensePage = () => {
  const { user } = useAuth(); // Get the authenticated user from context
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'Food', // Default to first option
    date: new Date().toISOString().split('T')[0] // Defaults to today's date
  });

  const [receipt, setReceipt] = useState(null); //stores the actual binary file of the image uploaded by the user.
  const [preview, setPreview] = useState(null); //temp to display the image 
  const [extractedItems, setExtractedItems] = useState([]); //items from OCR
   //stores a temporary URL string used to display the image on the screen.
  const [message, setMessage] = useState({ type: '', text: '' }); //manages the Success or Error notifications shown to the user.
  const [isSubmitting, setIsSubmitting] = useState(false); //tracks whether a network request is currently in progress.
  const [isScanning, setIsScanning]         = useState(false); //OCR in progress

// e basically is an object that represents the event that triggered the function, typically an input change event(keystroke)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  }; // Updates text/select fields
// e.target.name]: e.target.value basically overwrites old value with the new one and matches the input name
// await fetch-> built in browser function for network requests

//for image receipts
const handleFileChange = async (e) => {
    const file = e.target.files[0]; // uploaded file 
    if (!file) return;

    setReceipt(file);
    setPreview(URL.createObjectURL(file));
    setIsScanning(true);
    setExtractedItems([]);
    setMessage({ type: 'info', text: '🔍 Scanning receipt...' });

    try {
    const res = await scanReceiptWithVision(file);
    const { parsed } = res.data;

    if (parsed) {
      const categorizedItems = (parsed.items || []).map(item => ({
        ...item,
        category: categorizeItem(item.name)
      }));
      setExtractedItems(categorizedItems);

      const combinedText = [
        parsed.description,
        ...categorizedItems.map(i => i.name)
      ].join(' ');

      setForm(prev => ({
        ...prev,
        amount:      parsed.amount      || prev.amount,
        date:        parsed.date        || prev.date,
        description: parsed.description || prev.description,
        category:    parsed.category    || guessCategory(combinedText) || prev.category,
      }));
    }

    setMessage({ type: 'success', text: '✅ Receipt scanned! Review and correct any fields below.' });

  } catch (err) {
    console.error('Scan error:', err);
    setMessage({ type: 'warning', text: '⚠️ Could not scan receipt. Please fill in manually.' });
  } finally {
    setIsScanning(false);
  }
};

  const updateItem = (index, field, value) => {
    const updated = [...extractedItems];
    updated[index] = { ...updated[index], [field]: value };
    // Re-guess category when name changes
    if (field === 'name') updated[index].category = categorizeItem(value);
    setExtractedItems(updated);
  };

  const deleteItem = (index) => setExtractedItems(extractedItems.filter((_, i) => i !== index)); 

  const addItem = () => setExtractedItems([...extractedItems, { name: '', price: 0, category: 'Other' }]); //manual entry

  //not  using JSON as image receipts are there which cant be extracted in JSON 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!user?.userId) {
      setMessage({ type: 'danger', text: 'User not identified. Please log in again.' });
      setIsSubmitting(false);
      return;
    }
    
    // 3. Constructing FormData for Multipart Upload (Text + File)
    const formData = new FormData();
    formData.append('userId', user.userId); // Include userId in the form data
    formData.append('description', form.description);
    formData.append('amount', form.amount);
    formData.append('category', form.category);
    formData.append('date', form.date);
    formData.append('items',       JSON.stringify(extractedItems));
    if (receipt) formData.append('receipt', receipt); //image file 

    // ✅ Fix — axios style:
try {
    const res = await addExpense(formData);

    // axios: res.data contains the response, no res.ok needed
    setMessage({ type: 'success', text: 'Expense added successfully!' });
    setForm({ description: '', amount: '', category: 'Food', date: new Date().toISOString().split('T')[0] });
    setReceipt(null);
    setPreview(null);
    setExtractedItems([]);

} catch (err) {
    // Check if expense actually saved despite the error
    if (err.response?.data?.message === 'Expense added successfully') {
        setMessage({ type: 'success', text: 'Expense added successfully!' });
        setForm({ description: '', amount: '', category: 'Food', date: new Date().toISOString().split('T')[0] });
        setReceipt(null);
        setPreview(null);
        setExtractedItems([]);
        return;
    }
    const msg = err.response?.data?.message || 'Failed to add expense.';
    setMessage({ type: 'danger', text: msg });
}
  };

  const clearReceipt = () => {
    setPreview(null);
    setReceipt(null);
    setExtractedItems([]);
    setMessage({ type: '', text: '' });
  };

  if (!user) return (
    <div style={{ padding: '100px', textAlign: 'center' }}>
      <h3>Loading your profile...</h3>
    </div>
  );

  return (
    <div className="expense-main-content">
      <div className="expense-form-wrapper">

        <div className="form-header text-center mb-4">
          <h2 className="display-6 fw-bold text-dark">Add New Expense</h2>
          <p className="text-muted">Upload a receipt to auto-fill, or enter details manually</p>
        </div>

        <Form onSubmit={handleSubmit} className="modern-form">
          <Row className="g-4">
            <Col lg={preview ? 7 : 12}>

              {/* Upload Receipt — first so OCR fills fields below */}
              <Form.Group className="mb-4">
                <Form.Label className="form-label-custom">
                  Upload Receipt
                  {isScanning && (
                    <span className="text-primary ms-2">— Scanning with Google Vision...</span>
                  )}
                </Form.Label>
                <Form.Control
                  type="file" accept="image/*"
                  onChange={handleFileChange}
                  className="input-custom file-input"
                  disabled={isScanning}
                />
                {isScanning && (
                <div className="ocr-progress-bar mt-2">
                <div className="ocr-progress-fill ocr-progress-pulse" />
                </div>
                )}
              </Form.Group>

              {/* Description */}
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Description</Form.Label>
                <Form.Control
                  className="input-custom"
                  type="text" name="description"
                  placeholder="What did you spend on?"
                  value={form.description} onChange={handleChange} required
                />
              </Form.Group>

              {/* Amount + Date */}
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-custom">Amount</Form.Label>
                    <Form.Control
                      className="input-custom"
                      type="number" name="amount" placeholder="0.00"
                      value={form.amount} onChange={handleChange} required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-custom">Date</Form.Label>
                    <Form.Control
                      className="input-custom"
                      type="date" name="date"
                      value={form.date} onChange={handleChange} required
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Category */}
              <Form.Group className="mb-3">
                <Form.Label className="form-label-custom">Category</Form.Label>
                <Form.Select className="input-custom" name="category" value={form.category} onChange={handleChange}>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </Form.Select>
              </Form.Group>

              {/* Extracted Items — editable */}
              {(extractedItems.length > 0 || isScanning === false) && extractedItems.length > 0 && (
                <div className="items-preview mt-3">
                  <Form.Label className="form-label-custom mb-2">
                      Edit if incorrect
                  </Form.Label>

                  {/* Header row */}
                  <div className="items-header">
                    <span style={{ flex: 2 }}>Item Name</span>
                    <span style={{ flex: 1.5 }}>Category</span>
                    <span style={{ flex: 1, textAlign: 'right' }}>Price</span>
                    <span style={{ width: 24 }}></span>
                  </div>

                  {extractedItems.map((item, i) => (
                    <div key={i} className="item-row-edit">

                      {/* Name */}
                      <input
                        className="item-input-name"
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => updateItem(i, 'name', e.target.value)}
                      />

                      {/* Category */}
                      <select
                        className="item-input-category"
                        value={item.category}
                        onChange={(e) => updateItem(i, 'category', e.target.value)}
                      >
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>

                      {/* Price */}
                      <input
                        className="item-input-price"
                        type="number"
                        placeholder="0.00"
                        value={item.price}
                        onChange={(e) => updateItem(i, 'price', parseFloat(e.target.value) || 0)}
                      />

                      {/* Delete */}
                      <button type="button" className="item-delete-btn" onClick={() => deleteItem(i)}>
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Add item manually */}
                  <button type="button" className="add-item-btn mt-2" onClick={addItem}>
                    + Add item manually
                  </button>

                  {/* Items total */}
                  <div className="items-total mt-2">
                    <span>Total</span>
                    <span>${extractedItems.reduce((sum, item) => sum + (item.price || 0), 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Manual add items button (when no receipt scanned) */}
              {extractedItems.length === 0 && !isScanning && (
                <button type="button" className="add-item-btn mt-1 mb-3" onClick={addItem}>
                  + Add items manually
                </button>
              )}

            </Col>

            {/* Receipt Preview */}
            {preview && (
              <Col lg={5} className="d-flex flex-column align-items-center justify-content-center border-start ps-lg-4">
                <span className="form-label-custom mb-2">Receipt Preview</span>
                <div className="receipt-preview-container">
                  <img src={preview} alt="Receipt" className="img-preview" />
                  <button type="button" className="remove-btn" onClick={clearReceipt}>✕</button>
                </div>
              </Col>
            )}
          </Row>

          <Button
            className="btn-primary-custom w-100 mt-3"
            type="submit"
            disabled={isSubmitting || isScanning}
          >
            {isSubmitting ? 'Saving...' : isScanning ? 'Scanning Receipt...' : 'Add Expense'}
          </Button>
        </Form>

        {message.text && (
          <Alert variant={message.type} className="mt-4 border-0 shadow-sm">
            {message.text}
          </Alert>
        )}
      </div>
    </div>
  );
};

export default ExpensePage;
