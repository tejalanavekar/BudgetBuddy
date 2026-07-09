import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getSubscriptions, addSubscription, updateSubscription, deleteSubscription } from '../api/services/subscriptionService.js';
import '../styles/subscriptions.css';

const CATEGORY_META = {
  Software:   { emoji: '💻', color: '#6366f1' },
  Streaming:  { emoji: '🎬', color: '#ec4899' },
  Music:      { emoji: '🎵', color: '#2dd4bf' },
  Health:     { emoji: '💪', color: '#10b981' },
  Storage:    { emoji: '☁️', color: '#8b5cf6' },
  News:       { emoji: '📰', color: '#f59e0b' },
  Other:      { emoji: '📦', color: '#94a3b8' }
};
const CATEGORIES = Object.keys(CATEGORY_META);
const STATUS_TABS = ['All', 'Active', 'Paused', 'Cancelled'];

const monthlyEquivalent = (sub) => sub.billingCycle === 'Annual' ? sub.cost / 12 : sub.cost;
const annualEquivalent = (sub) => sub.billingCycle === 'Annual' ? sub.cost : sub.cost * 12;

const formatDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const monthName = new Date(`${iso}T00:00:00`).toLocaleString('default', { month: 'short' });
  return `${monthName} ${parseInt(d)}, ${y}`;
};

// Local YYYY-MM-DD for today — same local-date approach as ExpensePage, avoiding the
// toISOString() UTC-offset bug. Used to default the purchase date to "today" for a new subscription.
const getTodayLocal = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const emptyForm = () => ({ name: '', cost: '', billingCycle: 'Monthly', category: 'Software', purchaseDate: getTodayLocal() });

const SubscriptionsPage = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [billingView, setBillingView] = useState('Monthly'); // Monthly | Annual — controls the big total number only
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null); // null = adding new; otherwise the subscription being edited
  const [form, setForm] = useState(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.userId) return;
    getSubscriptions(user.userId)
      .then(setSubscriptions)
      .catch(() => setSubscriptions([]))
      .finally(() => setLoading(false));
  }, [user]);

  const activeSubs = useMemo(() => subscriptions.filter(s => s.status === 'Active'), [subscriptions]);

  const totalCost = useMemo(() => {
    const sum = activeSubs.reduce((acc, s) => acc + (billingView === 'Monthly' ? monthlyEquivalent(s) : annualEquivalent(s)), 0);
    return sum;
  }, [activeSubs, billingView]);

  const avgPerSub = activeSubs.length ? totalCost / activeSubs.length : 0;

  const counts = useMemo(() => ({
    active: subscriptions.filter(s => s.status === 'Active').length,
    paused: subscriptions.filter(s => s.status === 'Paused').length,
    cancelled: subscriptions.filter(s => s.status === 'Cancelled').length
  }), [subscriptions]);

  const categoryBreakdown = useMemo(() => {
    const totals = {};
    activeSubs.forEach(s => {
      totals[s.category] = (totals[s.category] || 0) + monthlyEquivalent(s);
    });
    const monthlyTotal = Object.values(totals).reduce((a, b) => a + b, 0);
    return Object.entries(totals)
      .map(([category, amount]) => ({ category, amount, pct: monthlyTotal > 0 ? (amount / monthlyTotal) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [activeSubs]);

  const upcomingBills = useMemo(() => (
    activeSubs
      .slice()
      .sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate))
      .slice(0, 5)
  ), [activeSubs]);

  const filteredSubscriptions = useMemo(() => (
    subscriptions.filter(s =>
      (statusFilter === 'All' || s.status === statusFilter) &&
      (categoryFilter === 'All' || s.category === categoryFilter)
    )
  ), [subscriptions, statusFilter, categoryFilter]);

  const openAddModal = () => {
    setEditingSub(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEditModal = (sub) => {
    setEditingSub(sub);
    setForm({
      name: sub.name,
      cost: String(sub.cost),
      billingCycle: sub.billingCycle,
      category: sub.category,
      purchaseDate: sub.purchaseDate
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.cost) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name,
        cost: parseFloat(form.cost),
        billingCycle: form.billingCycle,
        category: form.category,
        purchaseDate: form.purchaseDate
      };

      if (editingSub) {
        const updated = await updateSubscription(editingSub._id, payload);
        setSubscriptions(prev => prev.map(s => s._id === editingSub._id ? updated : s));
      } else {
        const created = await addSubscription(user.userId, payload);
        setSubscriptions(prev => [created, ...prev]);
      }

      setShowModal(false);
      setEditingSub(null);
      setForm(emptyForm());
    } catch {
      // service functions already log the error; the modal just stays open so the user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePause = async (sub) => {
    const newStatus = sub.status === 'Paused' ? 'Active' : 'Paused';
    const updated = await updateSubscription(sub._id, { status: newStatus });
    setSubscriptions(prev => prev.map(s => s._id === sub._id ? updated : s));
  };

  // The ✕ button cancels (a soft status change, so it still shows up in the
  // Cancelled tab/count) — it does not remove the record.
  const handleCancel = async (sub) => {
    const updated = await updateSubscription(sub._id, { status: 'Cancelled' });
    setSubscriptions(prev => prev.map(s => s._id === sub._id ? updated : s));
  };

  // Permanent removal — only offered once a subscription is already Cancelled.
  const handleDelete = async (sub) => {
    await deleteSubscription(sub._id);
    setSubscriptions(prev => prev.filter(s => s._id !== sub._id));
  };

  const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();

  if (loading) {
    return <div className="subs-loading">Loading your subscriptions...</div>;
  }

  return (
    <div className="subs-root">
      {/* Header */}
      <div className="subs-header">
        <div className="subs-header-left">
          <span className="subs-header-icon">🔄</span>
          <div>
            <h1 className="subs-title">Subscriptions</h1>
            <p className="subs-subtitle">Track and manage all your recurring payments</p>
          </div>
        </div>
        <button className="subs-add-btn" onClick={openAddModal}>+ Add Subscription</button>
      </div>

      {/* Total cost card */}
      <div className="subs-total-card">
        <div className="subs-total-top">
          <span className="subs-total-label">Total Subscription Cost</span>
          <div className="subs-billing-toggle">
            <button
              className={billingView === 'Monthly' ? 'active' : ''}
              onClick={() => setBillingView('Monthly')}
            >Monthly</button>
            <button
              className={billingView === 'Annual' ? 'active' : ''}
              onClick={() => setBillingView('Annual')}
            >Annual</button>
          </div>
        </div>
        <div className="subs-total-value">
          ${totalCost.toFixed(2)}<span className="subs-total-unit">{billingView === 'Monthly' ? '/mo' : '/yr'}</span>
        </div>
        <p className="subs-total-sub">Across {activeSubs.length} active subscription{activeSubs.length !== 1 ? 's' : ''}</p>

        <div className="subs-count-row">
          <div className="subs-count">
            <div className="subs-count-val subs-count-active">{counts.active}</div>
            <div className="subs-count-lbl">Active</div>
          </div>
          <div className="subs-count">
            <div className="subs-count-val subs-count-paused">{counts.paused}</div>
            <div className="subs-count-lbl">Paused</div>
          </div>
          <div className="subs-count">
            <div className="subs-count-val subs-count-cancelled">{counts.cancelled}</div>
            <div className="subs-count-lbl">Cancelled</div>
          </div>
          <div className="subs-count">
            <div className="subs-count-val subs-count-avg">${avgPerSub.toFixed(2)}</div>
            <div className="subs-count-lbl">Avg per Sub</div>
          </div>
        </div>
      </div>

      {/* Spend by category */}
      {categoryBreakdown.length > 0 && (
        <div className="subs-category-card">
          <div className="subs-section-label">Spend by Category</div>
          <div className="subs-category-list">
            {categoryBreakdown.map(({ category, amount, pct }) => (
              <div className="subs-category-row" key={category}>
                <span className="subs-category-dot" style={{ background: CATEGORY_META[category]?.color || '#94a3b8' }} />
                <span className="subs-category-name">{category}</span>
                <div className="subs-category-bar-bg">
                  <div className="subs-category-bar-fill" style={{ width: `${pct}%`, background: CATEGORY_META[category]?.color || '#94a3b8' }} />
                </div>
                <span className="subs-category-amt">${amount.toFixed(2)}</span>
                <span className="subs-category-pct">{Math.round(pct)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="subs-filters-row">
        <div className="subs-status-tabs">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              className={`subs-status-tab ${statusFilter === tab ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <select className="subs-category-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="All">All</option>
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      {/* Subscription list */}
      <div className="subs-list">
        {filteredSubscriptions.length === 0 ? (
          <div className="subs-empty">
            <span>🔄</span>
            <p>No subscriptions found.</p>
            <button className="subs-add-btn" onClick={openAddModal}>+ Add Subscription</button>
          </div>
        ) : (
          filteredSubscriptions.map(sub => {
            const meta = CATEGORY_META[sub.category] || CATEGORY_META.Other;
            return (
              <div
                className={`subs-item ${sub.status !== 'Active' ? 'subs-item--inactive' : ''}`}
                key={sub._id}
                style={{ '--subs-accent': meta.color }}
              >
                <div className="subs-item-icon" style={{ background: `${meta.color}33` }}>{meta.emoji}</div>
                <div className="subs-item-info">
                  <div className="subs-item-top">
                    <span className="subs-item-name">{sub.name}</span>
                    <span className={`subs-status-badge subs-status-${sub.status.toLowerCase()}`}>{sub.status}</span>
                  </div>
                  <div className="subs-item-meta">
                    <span>📁 {sub.category}</span>
                    <span>📆 {sub.billingCycle}</span>
                    <span>🗓️ Next: {formatDate(sub.nextBillingDate)}</span>
                  </div>
                </div>
                <div className="subs-item-right">
                  <div className="subs-item-cost" style={{ color: meta.color }}>
                    ${sub.cost.toFixed(2)}
                    <span className="subs-item-cost-unit">
                      /mo{sub.billingCycle === 'Annual' ? ' (billed annually)' : ''}
                    </span>
                  </div>
                  <div className="subs-item-actions">
                    <button className="subs-action-btn" title="Edit" onClick={() => openEditModal(sub)}>✎</button>
                    {sub.status !== 'Cancelled' ? (
                      <>
                        <button className="subs-action-btn" onClick={() => handleTogglePause(sub)}>
                          {sub.status === 'Paused' ? 'Resume' : 'Pause'}
                        </button>
                        <button
                          className="subs-action-btn subs-action-btn--danger"
                          title="Cancel subscription"
                          onClick={() => handleCancel(sub)}
                        >✕</button>
                      </>
                    ) : (
                      <button
                        className="subs-action-btn subs-action-btn--danger"
                        title="Remove permanently"
                        onClick={() => handleDelete(sub)}
                      >Delete</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upcoming bills */}
      {upcomingBills.length > 0 && (
        <div className="subs-upcoming-card">
          <div className="subs-section-label">Upcoming Bills — {monthLabel}</div>
          <div className="subs-upcoming-list">
            {upcomingBills.map(sub => (
              <div className="subs-upcoming-row" key={sub._id}>
                <span className="subs-category-dot" style={{ background: CATEGORY_META[sub.category]?.color || '#94a3b8' }} />
                <span className="subs-upcoming-name">{sub.name}</span>
                <span className="subs-upcoming-date">{formatDate(sub.nextBillingDate)}</span>
                <span className="subs-upcoming-amt">${sub.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Subscription Modal */}
      {showModal && (
        <div className="subs-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="subs-modal-box" onClick={e => e.stopPropagation()}>
            <h2 className="subs-modal-title">{editingSub ? 'Edit Subscription' : 'Add Subscription'}</h2>
            <p className="subs-modal-subtitle">
              {editingSub ? 'Update this recurring payment' : 'Track a new recurring payment'}
            </p>
            <form onSubmit={handleSubmit}>
              <label className="subs-form-label">Service Name</label>
              <input
                className="subs-form-input"
                placeholder="e.g. Netflix"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />

              <div className="subs-form-row">
                <div>
                  <label className="subs-form-label">Monthly Cost ($)</label>
                  <input
                    className="subs-form-input"
                    type="number" step="0.01" min="0"
                    placeholder="0.00"
                    value={form.cost}
                    onChange={e => setForm({ ...form, cost: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="subs-form-label">Billing Cycle</label>
                  <select
                    className="subs-form-input"
                    value={form.billingCycle}
                    onChange={e => setForm({ ...form, billingCycle: e.target.value })}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
              </div>

              <div className="subs-form-row">
                <div>
                  <label className="subs-form-label">Category</label>
                  <select
                    className="subs-form-input"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="subs-form-label">Purchase Date</label>
                  <input
                    className="subs-form-input"
                    type="date"
                    value={form.purchaseDate}
                    onChange={e => setForm({ ...form, purchaseDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="subs-modal-actions">
                <button type="button" className="subs-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="subs-btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingSub ? 'Save Changes' : 'Add Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionsPage;
