import React, { useEffect, useState } from 'react';
import CategoryChart from '../components/CategoryChart';
import { useAuth } from '../context/AuthContext.jsx';
import { getExpenses , deleteExpense } from '../api/services/expenseService.js';
import '../styles/dashboard.css';
import { useNavigate } from 'react-router-dom';

const CATEGORY_EMOJI = {
  Food: '🍔', Transport: '🚗', Utilities: '💡', Health: '💊',
  Education: '📚', Shopping: '🛍️', Travel: '✈️', Savings: '💰', Other: '📦'
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allExpenses, setAllExpenses]           = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [summary, setSummary]                   = useState({ thisMonth: 0, lastMonth: 0, count: 0 });
  const [sortOption, setSortOption]             = useState('date-desc');
  const [categoryFilter, setCategoryFilter]     = useState('All');

  // ── Helpers ──────────────────────────────────────────────────────
  const getCurrentMonthISO = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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

  const [selectedDate, setSelectedDate] = useState(getCurrentMonthISO());

  // ── Fetch Expenses ────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.userId) return;
    getExpenses(user.userId)
    .then(res => setAllExpenses(res.data))
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

    const current = allExpenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === selYear && (d.getMonth() + 1) === selMonth;
    });

    const prev = allExpenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === prevYear && (d.getMonth() + 1) === prevMonth;
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
    // Redirect to the EditExpensePage with the expense id
    navigate(`/edit-expense/${expense._id}`);
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

  const handleView = (expense) => {
    // Redirect to receipts/history tab and pass the specific ID to highlight it
    navigate('/receipts', { state: { highlightId: expense._id } });
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
        <div className="stat-value">₹{(summary.thisMonth || 0).toFixed(0)}</div>
        <div className="stat-sub">current month spending</div>
      </div>
      <div className="stat-card">
        <span className="stat-icon">📅</span>
        <div className="stat-label">{formatMonthLabel(getPreviousMonthISO(selectedDate))}</div>
        <div className="stat-value">₹{(summary.lastMonth || 0).toFixed(0)}</div>
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
          <h2 className="section-title">🧾 Recent Expenses</h2>
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
                <div className="expense-item" key={e._id} onClick={() => handleView(e)}>
                  <div className="expense-emoji">{CATEGORY_EMOJI[e.category] || '📦'}</div>
                  <div className="expense-info">
                    <div className="expense-desc">{e.description}</div>
                    <div className="expense-meta">
                      {new Date(e.date).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                      <span className="expense-cat-badge">{e.category}</span>
                    </div>
                  </div>
                  <div className="expense-right-side">
                  <div className="expense-amount">-${parseFloat(e.amount).toFixed(2)}</div>
                  {/* 2. Added Action Buttons here */}
            <div className="expense-actions">
              <button 
                className="action-btn edit-btn" 
                onClick={(event) => { event.stopPropagation(); handleEdit(e); }}
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
                <p>No expenses found for this month.</p>
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
  </>
);
};

export default DashboardPage;