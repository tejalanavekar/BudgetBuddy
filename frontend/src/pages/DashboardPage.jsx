import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import CategoryChart from '../components/CategoryChart';
import { useAuth } from '../context/AuthContext.jsx';
import { getExpenses , deleteExpense, updateExpense } from '../api/services/expenseService.js';
import { CATEGORY_EMOJI } from '../constants/categoryMeta';
import '../styles/dashboard.css';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allExpenses, setAllExpenses]           = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [summary, setSummary]                   = useState({ thisMonth: 0, lastMonth: 0, count: 0 });
  const [sortOption, setSortOption]             = useState('date-desc');
  const [categoryFilter, setCategoryFilter]     = useState('All');
  const [editingExpense, setEditingExpense] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editReceipt, setEditReceipt] = useState(null);
  const [editPreview, setEditPreview] = useState(null);
  const [editMessage, setEditMessage] = useState({ type: '', text: '' });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  

  // ── Helpers ──────────────────────────────────────────────────────
  const getCurrentMonthISO = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const getYearMonth = (dateStr) => {
  if (!dateStr) return [null, null];
  // ✅ Handles both "2026-04-01" and "2026-03-31T18:30:00.000Z"
  const parts = dateStr.split('T')[0].split('-');
  return [parseInt(parts[0]), parseInt(parts[1])];
};

  const getLast12Months = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months;
  };

  const formatMonthLabel = (iso) => {
    const [year, month] = iso.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, 1)
      .toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const getPreviousMonthISO = (iso) => {
    const [year, month] = iso.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const location = useLocation();
  // Read ?month= param on mount
  const getInitialMonth = () => {
    const params = new URLSearchParams(location.search);
    return params.get('month') || getCurrentMonthISO();
  };
  const [selectedDate, setSelectedDate] = useState(getInitialMonth());

  // Update selectedDate if URL changes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlMonth = params.get('month');
    if (urlMonth && urlMonth !== selectedDate) setSelectedDate(urlMonth);
  }, [location.search]);

  // ── Fetch Expenses ────────────────────────────────────────────────
useEffect(() => {
  if (!user?.userId) return;
  getExpenses(user.userId)
    .then(res => {
      console.log('Type:', typeof res.data);
      console.log('Is array:', Array.isArray(res.data));
      console.log('Data:', res.data);
      const data = Array.isArray(res.data) ? res.data : [];
      setAllExpenses(data);
    })
    .catch(err => console.error('Error fetching expenses:', err));
}, [user]);

  // ── Filter + Summary ──────────────────────────────────────────────
  useEffect(() => {
    if (allExpenses.length === 0) {
      setFilteredExpenses([]);
      setSummary({ thisMonth: 0, lastMonth: 0, count: 0 });
      return;
    }

    const [selYear, selMonth] = selectedDate.split('-').map(Number);
    const prevIso = getPreviousMonthISO(selectedDate);
    const [prevYear, prevMonth] = prevIso.split('-').map(Number);

    // Helper to extract year and month from YYYY-MM-DD string
    const getYearMonth = (dateStr) => {
      if (!dateStr || typeof dateStr !== 'string') return [null, null];
      const parts = dateStr.split('-');
      if (parts.length < 2) return [null, null];
      return [parseInt(parts[0]), parseInt(parts[1])];
    };

    const current = allExpenses.filter(e => {
      const [y, m] = getYearMonth(e.date);
      return y === selYear && m === selMonth;
    });

    const prev = allExpenses.filter(e => {
      const [y, m] = getYearMonth(e.date);
      return y === prevYear && m === prevMonth;
    });

    setFilteredExpenses(current);
    setSummary({
      thisMonth: current.reduce((s, e) => s + parseFloat(e.amount), 0),
      lastMonth: prev.reduce((s, e) => s + parseFloat(e.amount), 0),
      count: current.length
    });
  }, [allExpenses, selectedDate]);

  // ── Derived ───────────────────────────────────────────────────────
  const categories = Array.from(new Set(filteredExpenses.map(e => e.category).filter(Boolean)));

  const getDisplayedRecent = () => {
    let items = filteredExpenses.filter(e =>
      categoryFilter === 'All' ? true : e.category === categoryFilter
    );
    const copy = [...items];
    if (sortOption === 'amount-desc')      copy.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    else if (sortOption === 'amount-asc')  copy.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
    else                                   copy.sort((a, b) => new Date(b.date) - new Date(a.date));
    return copy.slice(0, 5);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // -- Action Handlers --
  const handleEdit = (expense) => {
  setEditingExpense(expense);
  setEditForm({
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    date: expense.date ? expense.date.slice(0, 10) : '',
  });
  setEditPreview(expense.receiptPath 
    ? `http://localhost:5000/uploads/${expense.receiptPath}` 
    : null
  );
  setEditReceipt(null);
  setEditMessage({ type: '', text: '' });
};

const handleEditClose = () => {
  setEditingExpense(null);
  setEditForm({});
  setEditPreview(null);
  setEditReceipt(null);
  setEditMessage({ type: '', text: '' });
};

const handleEditSubmit = async (e) => {
  e.preventDefault();
  setIsEditSubmitting(true);
  try {
    const formData = new FormData();
    formData.append('description', editForm.description);
    formData.append('amount', String(editForm.amount));
    formData.append('category', editForm.category);
    formData.append('date', editForm.date);
    if (editReceipt) formData.append('receipt', editReceipt);

    await updateExpense(editingExpense._id, formData);

    // Update local state so UI refreshes immediately
    setAllExpenses(prev => prev.map(exp =>
      exp._id === editingExpense._id
        ? { ...exp, ...editForm }
        : exp
    ));

    setEditMessage({ type: 'success', text: 'Expense updated successfully!' });
    setTimeout(() => handleEditClose(), 1200);
  } catch (err) {
    setEditMessage({ type: 'danger', text: 'Failed to update expense.' });
  } finally {
    setIsEditSubmitting(false);
  }
};
  

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await deleteExpense(id);
        // Remove from local state so the UI updates immediately
        setAllExpenses(allExpenses.filter(exp => exp._id !== id));
      } catch (err) {
        console.error("Failed to delete:", err);
        alert("Could not delete expense.");
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  
  return (
    <>
    {/* Header */}
    <div className="dashboard-header-area">
      <div>
        <h2>{greeting()}, {user?.firstName || 'there'} 👋</h2>
        <p>Here's your spending overview</p>
      </div>
      <select
        className="hero-month-select"
        value={selectedDate}
        onChange={e => setSelectedDate(e.target.value)}
      >
        {getLast12Months().map(d => (
          <option key={d} value={d}>{formatMonthLabel(d)}</option>
        ))}
      </select>
    </div>

    {/* Stats Strip */}
    <div className="stats-strip">
      <div className="stat-card">
        <span className="stat-icon">💸</span>
        <div className="stat-label">{formatMonthLabel(selectedDate)}</div>
        <div className="stat-value">${(summary.thisMonth || 0).toFixed(2)}</div>
        <div className="stat-sub">current month spending</div>
      </div>
      <div className="stat-card">
        <span className="stat-icon">📅</span>
        <div className="stat-label">{formatMonthLabel(getPreviousMonthISO(selectedDate))}</div>
        <div className="stat-value">${(summary.lastMonth || 0).toFixed(2)}</div>
        <div className="stat-sub">previous month spending</div>
      </div>
      <div className="stat-card">
        <span className="stat-icon">🧾</span>
        <div className="stat-label">Transactions</div>
        <div className="stat-value">{summary.count}</div>
        <div className="stat-sub">expenses this month</div>
      </div>
    </div>

    {/* Body */}
    <div className="dashboard-body">
      <div className="dashboard-grid">

        {/* Left — Recent Expenses */}
        <div className="panel-card">
          <div className="panel-header-row">
            <h2 className="section-title">🧾 Recent Expenses</h2>
            <button className="view-all-btn" onClick={() => navigate('/home/past-expenses')}>View all →</button>
          </div>
          <div className="filters-row">
            <div className="filter-group">
              <span className="filter-label">Category</span>
              <select className="filter-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="All">All</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <span className="filter-label">Sort</span>
              <select className="filter-select" value={sortOption} onChange={e => setSortOption(e.target.value)}>
                <option value="date-desc">Newest first</option>
                <option value="amount-desc">Highest amount</option>
                <option value="amount-asc">Lowest amount</option>
              </select>
            </div>
          </div>

          <div className="expense-list">
            {filteredExpenses.length > 0 ? (
              getDisplayedRecent().map(e => (
                <div className="expense-item" key={e._id}>
                  <div className="expense-emoji">{CATEGORY_EMOJI[e.category] || '📦'}</div>
                  <div className="expense-info">
                    <div className="expense-desc">{e.description}</div>
                    <div className="expense-meta">
                      {e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date)
                        ? (() => {
                            const [year, month, day] = e.date.split('-');
                            const monthName = new Date(e.date + 'T00:00:00').toLocaleString('default', { month: 'short' });
                            return `${parseInt(day)} ${monthName} ${year}`;
                          })()
                        : '—'}
                      <span className="expense-cat-badge">{e.category}</span>
                    </div>
                  </div>
                  <div className="expense-right-side">
                  <div className="expense-amount">-${parseFloat(e.amount).toFixed(2)}</div>
                  {/* 2. Added Action Buttons here */}
            <div className="expense-actions">
              <button 
                className="action-btn edit-btn" 
                onClick={() => handleEdit(e) }
                title="Edit"
              >
                ✏️
              </button>
              <button 
                className="action-btn delete-btn" 
                onClick={(event) => { event.stopPropagation(); handleDelete(e._id); }}
                title="Delete"
              >
                🗑️
              </button>
            </div>
          </div>
          </div>
              ))
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">🧾</span>
                <p className="empty-state-title">No expenses found for this month.</p>
                <p className="empty-state-sub">Add your first expense to see it here.</p>
                <button className="empty-state-btn" onClick={() => navigate('/home/expense')}>+ Add Expense</button>
              </div>
            )}
          </div>
        </div>

        {/* Right — Chart */}
        <div className="chart-panel">
          <h2 className="section-title">📊 Spend by Category</h2>
          {filteredExpenses.length > 0 ? (
            <CategoryChart expenses={filteredExpenses} />
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon">📊</span>
              <p>No data to display</p>
            </div>
          )}
        </div>

      </div>
    </div>

    {/* Inline Edit Modal */}

{editingExpense && (
  <div className="edit-modal-overlay" onClick={handleEditClose}>
    <div className="edit-modal-box" onClick={e => e.stopPropagation()}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #1a6b7c 60%, #2bbfbf 100%)',
        padding: '20px 24px',
        borderRadius: '16px 16px 0 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0, fontFamily: "'Clash Display', sans-serif" }}>
            Edit Expense
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: '4px 0 0' }}>
            Update your expense details below
          </p>
        </div>
        <button onClick={handleEditClose} style={{
          background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)',
          color: '#fff', borderRadius: '50%', width: '32px', height: '32px',
          fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>✕</button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleEditSubmit} style={{ padding: '24px', background: 'white', borderRadius: '0 0 16px 16px' }}>

        {/* Upload Receipt */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
            Upload Receipt
          </label>
          <label style={{ cursor: 'pointer', display: 'block' }}>
            <input type="file" accept="image/*"
              onChange={e => { setEditReceipt(e.target.files[0]); setEditPreview(URL.createObjectURL(e.target.files[0])); }}
              style={{ display: 'none' }} />
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              background: '#f0f4ff', border: '1.5px dashed #93acd3', borderRadius: '10px',
              padding: '10px', fontSize: '13px', fontWeight: 600, color: '#1a3a5c', cursor: 'pointer'
            }}>
              📤 {editPreview ? 'Replace Receipt' : 'Choose File'}
            </span>
          </label>
        </div>

        {/* Receipt Preview */}
        {editPreview && (
          <div style={{ marginBottom: '16px' }}>
            <img src={editPreview} alt="Receipt"
              style={{ width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '10px' }} />
            <button type="button"
              onClick={() => { setEditPreview(null); setEditReceipt(null); }}
              style={{ background: 'none', border: 'none', color: '#e53935', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginTop: '6px' }}>
              ✕ Remove
            </button>
          </div>
        )}

        {/* Description */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
            Description
          </label>
          <input type="text" value={editForm.description}
            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
            required
            style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: '#1a1a2e', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Amount + Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
              Amount
            </label>
            <input type="number" value={editForm.amount}
              onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
              required
              style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: '#1a1a2e', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
              Date
            </label>
            <input type="date" value={editForm.date}
              onChange={e => setEditForm({ ...editForm, date: e.target.value })}
              required
              style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: '#1a1a2e', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Category */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
            Category
          </label>
          <select value={editForm.category}
            onChange={e => setEditForm({ ...editForm, category: e.target.value })}
            style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', color: '#1a1a2e', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>
            {['Food','Transport','Utilities','Entertainment','Health','Education','Shopping','Travel','Savings','Other']
              .map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        {/* Save Button */}
        <button type="submit" disabled={isEditSubmitting} style={{
          width: '100%', padding: '12px', border: 'none', borderRadius: '12px',
          background: 'linear-gradient(135deg, #1a3a5c, #1a6b7c)',
          color: '#fff', fontSize: '15px', fontWeight: 700, cursor: isEditSubmitting ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          opacity: isEditSubmitting ? 0.7 : 1, fontFamily: "'Cabinet Grotesk', sans-serif"
        }}>
          {isEditSubmitting
            ? <><span className="eem-spinner" /> Saving...</>
            : 'Save Changes'}
        </button>

        {/* Message */}
        {editMessage.text && (
          <div style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 500,
            color: editMessage.type === 'success' ? '#1a7a4a' : '#c62828',
            background: editMessage.type === 'success' ? '#e6f9f0' : '#fdecea',
          }}>
            {editMessage.type === 'success' ? '✅' : '⚠️'} {editMessage.text}
          </div>
        )}
      </form>
    </div>
  </div>
)} 

  </>
);
};

export default DashboardPage;