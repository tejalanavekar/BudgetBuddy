import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getExpenses, deleteExpense, updateExpense } from '../api/services/expenseService.js';
import '../styles/pastExpenses.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const CATEGORY_EMOJI = {
  Food: '🍔', Transport: '🚗', Utilities: '💡', Health: '💊',
  Education: '📚', Shopping: '🛍️', Travel: '✈️', Savings: '💰',
  Entertainment: '🎬', Other: '📦'
};

const CATEGORY_COLORS = {
  Food: '#FF6384', Transport: '#36A2EB', Entertainment: '#FFCE56',
  Utilities: '#4BC0C0', Other: '#9966FF', Health: '#ef4444',
  Education: '#6366f1', Shopping: '#ec4899', Travel: '#f97316', Savings: '#10b981',
};

const CATEGORIES = ['Food','Transport','Utilities','Entertainment','Health','Education','Shopping','Travel','Savings','Other'];

const getYearMonth = (dateStr) => {
  if (!dateStr) return [null, null];
  const parts = dateStr.split('T')[0].split('-');
  return [parseInt(parts[0]), parseInt(parts[1])];
};

const formatMonthLabel = (iso) => {
  const [year, month] = iso.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, 1)
    .toLocaleString('default', { month: 'short', year: 'numeric' });
};

const formatMonthFull = (iso) => {
  const [year, month] = iso.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = dateStr.split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return '—';
  const [year, month, day] = d.split('-');
  const monthName = new Date(d + 'T00:00:00').toLocaleString('default', { month: 'short' });
  return `${parseInt(day)} ${monthName} ${year}`;
};

const PastExpensesPage = () => {
  const { user } = useAuth();
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState('date-desc');
  const [editingExpense, setEditingExpense] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editReceipt, setEditReceipt] = useState(null);
  const [editPreview, setEditPreview] = useState(null);
  const [editMessage, setEditMessage] = useState({ type: '', text: '' });
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const drillRef = useRef(null);

  useEffect(() => {
  if (!user?.userId) return;
  setLoading(true);
  getExpenses(user.userId)
    .then(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      setAllExpenses(data);
    })
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
}, [user]);

  const availableYears = useMemo(() => {
  const currentYear = new Date().getFullYear();
  const startYear = 2025; // ← change this to whatever year your app launched
  const years = new Set();

  // Add all years from startYear to current
  for (let y = currentYear; y >= startYear; y--) {
    years.add(y);
  }

  // Also add any years that actually have expense data (in case older data exists)
  allExpenses.forEach(e => {
    const [y] = getYearMonth(e.date);
    if (y) years.add(y);
  });

  return [...years].sort((a, b) => b - a);
}, [allExpenses]);

  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mm = String(i + 1).padStart(2, '0');
      const iso = `${selectedYear}-${mm}`;
      const [y, m] = [selectedYear, i + 1];
      const expenses = allExpenses.filter(e => {
        const [ey, em] = getYearMonth(e.date);
        return ey === y && em === m;
      });
      return {
        iso,
        label: formatMonthLabel(iso),
        total: expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0),
        count: expenses.length,
      };
    });
  }, [allExpenses, selectedYear]);

  const yearTotal = useMemo(() => monthlyData.reduce((s, m) => s + m.total, 0), [monthlyData]);

  const drillExpenses = useMemo(() => {
    if (!selectedMonth) return [];
    const [y, m] = selectedMonth.split('-').map(Number);
    return allExpenses.filter(e => {
      const [ey, em] = getYearMonth(e.date);
      return ey === y && em === m;
    });
  }, [allExpenses, selectedMonth]);

  const drillFiltered = useMemo(() => {
    let items = selectedCategory === 'All'
      ? drillExpenses
      : drillExpenses.filter(e => e.category === selectedCategory);
    const copy = [...items];
    if (sortOption === 'amount-desc') copy.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    else if (sortOption === 'amount-asc') copy.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
    else copy.sort((a, b) => new Date(b.date) - new Date(a.date));
    return copy;
  }, [drillExpenses, selectedCategory, sortOption]);

  const drillTotal = useMemo(() =>
    drillExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0), [drillExpenses]);

  const drillCategories = useMemo(() =>
    Array.from(new Set(drillExpenses.map(e => e.category).filter(Boolean))), [drillExpenses]);

  const categoryBreakdown = useMemo(() => {
    const totals = {};
    drillExpenses.forEach(e => {
      const cat = e.category || 'Other';
      totals[cat] = (totals[cat] || 0) + parseFloat(e.amount || 0);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [drillExpenses]);

  const barData = useMemo(() => ({
    labels: monthlyData.map(m => m.label),
    datasets: [{
      label: 'Spending',
      data: monthlyData.map(m => m.total),
      backgroundColor: monthlyData.map(m =>
        m.iso === selectedMonth ? 'rgba(45,212,191,0.95)' : 'rgba(255,255,255,0.18)'
      ),
      borderColor: monthlyData.map(m =>
        m.iso === selectedMonth ? '#14b8a6' : 'rgba(255,255,255,0.3)'
      ),
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false,
    }]
  }), [monthlyData, selectedMonth]);

  const barOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_, elements) => {
      if (elements.length > 0) {
        const idx = elements[0].index;
        const clicked = monthlyData[idx].iso;
        setSelectedMonth(prev => prev === clicked ? null : clicked);
        setSelectedCategory('All');
        setTimeout(() => drillRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.95)',
        titleColor: '#2dd4bf',
        bodyColor: '#e2e8f0',
        padding: 12,
        cornerRadius: 10,
        callbacks: {
          label: ctx => ` $${ctx.parsed.y.toFixed(2)}`,
          afterLabel: ctx => ` ${monthlyData[ctx.dataIndex].count} transactions`,
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255,255,255,0.6)', font: { size: 11, weight: '600' } },
        border: { display: false }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.06)' },
        ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 }, callback: v => `$${v}` },
        border: { display: false }
      }
    }
  }), [monthlyData]);

  const donutData = useMemo(() => ({
    labels: categoryBreakdown.map(([cat]) => cat),
    datasets: [{
      data: categoryBreakdown.map(([, amt]) => amt),
      backgroundColor: categoryBreakdown.map(([cat]) => CATEGORY_COLORS[cat] || '#9966FF'),
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 6,
    }]
  }), [categoryBreakdown]);

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: { font: { size: 13, weight: '600' }, padding: 16, usePointStyle: true, color: '#334155' }
      },
      tooltip: { callbacks: { label: ctx => ` $${ctx.parsed.toFixed(2)}` } }
    },
    cutout: '68%',
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setEditForm({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date ? expense.date.slice(0, 10) : '',
    });
    setEditPreview(expense.receiptPath ? `http://localhost:5000/uploads/${expense.receiptPath}` : null);
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
      setAllExpenses(prev => prev.map(exp =>
        exp._id === editingExpense._id ? { ...exp, ...editForm } : exp
      ));
      setEditMessage({ type: 'success', text: 'Expense updated successfully!' });
      setTimeout(() => handleEditClose(), 1200);
    } catch {
      setEditMessage({ type: 'danger', text: 'Failed to update expense.' });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      setAllExpenses(prev => prev.filter(e => e._id !== id));
    } catch {
      alert('Could not delete expense.');
    }
  };

  if (loading) return (
    <div className="pe-loading">
      <div className="pe-spinner" />
      <p>Loading your expense history...</p>
    </div>
  );

  return (
    <div className="pe-root">

      {/* Header */}
      <div className="pe-header">
        <div>
          <h1 className="pe-title">📅 Past Expenses</h1>
          <p className="pe-subtitle">Your complete spending history, visualized</p>
        </div>
        <select
  className="pe-year-select"
  value={selectedYear}
  onChange={e => { setSelectedYear(Number(e.target.value)); setSelectedMonth(null); }}
>
  {availableYears.map(y => (
    <option key={y} value={y}>{y}</option>
  ))}
</select>
      </div>

      {/* Summary Strip */}
      <div className="pe-summary-strip">
        <div className="pe-summary-card">
          <span className="pe-summary-icon">💰</span>
          <div className="pe-summary-label">{selectedYear} Total</div>
          <div className="pe-summary-value">${yearTotal.toFixed(2)}</div>
          <div className="pe-summary-sub">annual spending</div>
        </div>
        <div className="pe-summary-card">
          <span className="pe-summary-icon">📊</span>
          <div className="pe-summary-label">Monthly Avg</div>
          <div className="pe-summary-value">
            ${(yearTotal / Math.max(monthlyData.filter(m => m.total > 0).length, 1)).toFixed(2)}
          </div>
          <div className="pe-summary-sub">per active month</div>
        </div>
        <div className="pe-summary-card">
          <span className="pe-summary-icon">🔥</span>
          <div className="pe-summary-label">Biggest Month</div>
          <div className="pe-summary-value">
            {monthlyData.reduce((best, m) => m.total > best.total ? m : best, monthlyData[0])?.label || '—'}
          </div>
          <div className="pe-summary-sub">highest spend</div>
        </div>
        <div className="pe-summary-card">
          <span className="pe-summary-icon">🧾</span>
          <div className="pe-summary-label">Transactions</div>
          <div className="pe-summary-value">{monthlyData.reduce((s, m) => s + m.count, 0)}</div>
          <div className="pe-summary-sub">total this year</div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="pe-chart-section">
        <div className="pe-chart-header">
          <h2 className="pe-section-title">📈 Monthly Spending — {selectedYear}</h2>
          <p className="pe-chart-hint">Click a bar to explore that month</p>
        </div>
        <div className="pe-bar-wrapper">
          <Bar data={barData} options={barOptions} />
        </div>
        <div className="pe-month-pills">
          {monthlyData.map(m => (
            <button
              key={m.iso}
              className={`pe-month-pill ${m.iso === selectedMonth ? 'active' : ''} ${m.total === 0 ? 'empty' : ''}`}
              onClick={() => {
                setSelectedMonth(prev => prev === m.iso ? null : m.iso);
                setSelectedCategory('All');
                setTimeout(() => drillRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
              }}
            >
              <span className="pe-pill-month">{m.label.split(' ')[0]}</span>
              <span className="pe-pill-amount">{m.total > 0 ? `$${m.total.toFixed(0)}` : '—'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Drill-down */}
      {selectedMonth && (
        <div className="pe-drill" ref={drillRef}>
          <div className="pe-drill-header">
            <div>
              <h2 className="pe-section-title">🔍 {formatMonthFull(selectedMonth)}</h2>
              <p className="pe-drill-sub">{drillExpenses.length} transactions · ${drillTotal.toFixed(2)} total</p>
            </div>
            <button className="pe-close-drill" onClick={() => setSelectedMonth(null)}>✕ Close</button>
          </div>

          {drillExpenses.length === 0 ? (
            <div className="pe-empty"><span>🧾</span><p>No expenses recorded for this month.</p></div>
          ) : (
            <div className="pe-drill-grid">
              {/* Left */}
              <div className="pe-drill-left">
                <div className="pe-drill-stats">
                  <div className="pe-drill-stat">
                    <div className="pe-drill-stat-val">${drillTotal.toFixed(2)}</div>
                    <div className="pe-drill-stat-lbl">Total Spent</div>
                  </div>
                  <div className="pe-drill-stat">
                    <div className="pe-drill-stat-val">{drillExpenses.length}</div>
                    <div className="pe-drill-stat-lbl">Transactions</div>
                  </div>
                  <div className="pe-drill-stat">
                    <div className="pe-drill-stat-val">{categoryBreakdown[0]?.[0] || '—'}</div>
                    <div className="pe-drill-stat-lbl">Top Category</div>
                  </div>
                  <div className="pe-drill-stat">
                    <div className="pe-drill-stat-val">
                      ${(drillTotal / Math.max(drillExpenses.length, 1)).toFixed(2)}
                    </div>
                    <div className="pe-drill-stat-lbl">Avg per Transaction</div>
                  </div>
                </div>

                <div className="pe-filters">
                  <div className="pe-filter-group">
                    <span className="pe-filter-label">Category</span>
                    <select className="pe-filter-select" value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}>
                      <option value="All">All</option>
                      {drillCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div className="pe-filter-group">
                    <span className="pe-filter-label">Sort</span>
                    <select className="pe-filter-select" value={sortOption}
                      onChange={e => setSortOption(e.target.value)}>
                      <option value="date-desc">Newest first</option>
                      <option value="amount-desc">Highest amount</option>
                      <option value="amount-asc">Lowest amount</option>
                    </select>
                  </div>
                </div>

                <div className="pe-expense-list">
                  {drillFiltered.length === 0 ? (
                    <div className="pe-empty"><span>🔍</span><p>No expenses match this filter.</p></div>
                  ) : drillFiltered.map(e => (
                    <div className="pe-expense-item" key={e._id}>
                      <div className="pe-expense-emoji">{CATEGORY_EMOJI[e.category] || '📦'}</div>
                      <div className="pe-expense-info">
                        <div className="pe-expense-desc">{e.description}</div>
                        <div className="pe-expense-meta">
                          {formatDate(e.date)}
                          <span className="pe-cat-badge">{e.category}</span>
                        </div>
                      </div>
                      <div className="pe-expense-right">
                        <div className="pe-expense-amount">-${parseFloat(e.amount).toFixed(2)}</div>
                        <div className="pe-expense-actions">
                          <button className="pe-action-btn" onClick={() => handleEdit(e)} title="Edit">✏️</button>
                          <button className="pe-action-btn pe-delete-btn" onClick={() => handleDelete(e._id)} title="Delete">🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right */}
              <div className="pe-drill-right">
                <h3 className="pe-donut-title">Spend by Category</h3>
                <div className="pe-donut-wrapper">
                  <Doughnut data={donutData} options={donutOptions} />
                </div>
                <div className="pe-cat-breakdown">
                  {categoryBreakdown.map(([cat, amt]) => (
                    <div
                      key={cat}
                      className={`pe-cat-row ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(prev => prev === cat ? 'All' : cat)}
                    >
                      <span className="pe-cat-emoji">{CATEGORY_EMOJI[cat] || '📦'}</span>
                      <div className="pe-cat-info">
                        <div className="pe-cat-name">{cat}</div>
                        <div className="pe-cat-bar-bg">
                          <div className="pe-cat-bar-fill" style={{
                            width: `${(amt / drillTotal) * 100}%`,
                            background: CATEGORY_COLORS[cat] || '#9966FF'
                          }} />
                        </div>
                      </div>
                      <div className="pe-cat-amt">
                        <div className="pe-cat-dollar">${amt.toFixed(2)}</div>
                        <div className="pe-cat-pct">{((amt / drillTotal) * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {allExpenses.length === 0 && !loading && (
        <div className="pe-empty-full">
          <span>📭</span>
          <h3>No expenses yet</h3>
          <p>Start adding expenses and they'll appear here.</p>
        </div>
      )}

      {/* Edit Modal */}
      {editingExpense && (
        <div className="edit-modal-overlay" onClick={handleEditClose}>
          <div className="edit-modal-box" onClick={e => e.stopPropagation()}>
            <div className="eem-header">
              <div>
                <h3 className="eem-title">Edit Expense</h3>
                <p className="eem-subtitle">Update your expense details below</p>
              </div>
              <button className="edit-modal-close" onClick={handleEditClose}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ padding: '24px' }}>
              <div className="eem-field mb-3">
                <label className="eem-label">Upload Receipt</label>
                <label className="eem-file-label">
                  <input type="file" accept="image/*"
                    onChange={e => { setEditReceipt(e.target.files[0]); setEditPreview(URL.createObjectURL(e.target.files[0])); }}
                    style={{ display: 'none' }} />
                  <span className="eem-file-btn">📤 {editPreview ? 'Replace Receipt' : 'Choose File'}</span>
                </label>
              </div>
              {editPreview && (
                <div className="eem-field mb-3">
                  <img src={editPreview} alt="Receipt"
                    style={{ width: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '10px' }} />
                  <button type="button" className="eem-remove-receipt"
                    onClick={() => { setEditPreview(null); setEditReceipt(null); }}>✕ Remove</button>
                </div>
              )}
              <div className="eem-field mb-3">
                <label className="eem-label">Description</label>
                <input className="eem-input" type="text" value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })} required />
              </div>
              <div className="eem-row mb-3">
                <div className="eem-field">
                  <label className="eem-label">Amount</label>
                  <input className="eem-input" type="number" value={editForm.amount}
                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })} required />
                </div>
                <div className="eem-field">
                  <label className="eem-label">Date</label>
                  <input className="eem-input" type="date" value={editForm.date}
                    onChange={e => setEditForm({ ...editForm, date: e.target.value })} required />
                </div>
              </div>
              <div className="eem-field mb-4">
                <label className="eem-label">Category</label>
                <select className="eem-input eem-select" value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <button className="eem-btn-save w-100" type="submit" disabled={isEditSubmitting}>
                {isEditSubmitting
                  ? <span className="eem-saving"><span className="eem-spinner" /> Saving...</span>
                  : 'Save Changes'}
              </button>
              {editMessage.text && (
                <div className="eem-error mt-3" style={{
                  color: editMessage.type === 'success' ? '#1a7a4a' : '#c62828',
                  background: editMessage.type === 'success' ? '#e6f9f0' : '#fdecea',
                  borderRadius: '10px', marginTop: '1rem'
                }}>
                  {editMessage.type === 'success' ? '✅' : '⚠️'} {editMessage.text}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PastExpensesPage;