import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getAllReceipts } from '../api/services/expenseService.js';
import { CategoryIcon, ArchiveIcon, InboxEmptyIcon, SearchIcon, ReceiptIcon } from '../components/icons/Icon';
import '../styles/receiptVault.css';

// This page needs a richer {bg, accent, text} shape per category (for folder card
// styling) rather than the shared flat CATEGORY_COLOR — kept as its own map for that reason.
const CATEGORY_COLORS = {
  Food:          { bg: '#fff1f2', accent: '#ff6384', text: '#be123c' },
  Transport:     { bg: '#eff6ff', accent: '#36A2EB', text: '#1d4ed8' },
  Entertainment: { bg: '#fefce8', accent: '#FFCE56', text: '#a16207' },
  Utilities:     { bg: '#f0fdfa', accent: '#4BC0C0', text: '#0f766e' },
  Health:        { bg: '#fef2f2', accent: '#ef4444', text: '#b91c1c' },
  Education:     { bg: '#eef2ff', accent: '#6366f1', text: '#4338ca' },
  Shopping:      { bg: '#fdf4ff', accent: '#ec4899', text: '#a21caf' },
  Travel:        { bg: '#fff7ed', accent: '#f97316', text: '#c2410c' },
  Savings:       { bg: '#f0fdf4', accent: '#10b981', text: '#065f46' },
  Other:         { bg: '#f8fafc', accent: '#9966FF', text: '#6b21a8' },
};

const BASE_URL = 'http://localhost:5000/uploads/';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = dateStr.split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return '—';
  const [year, , day] = d.split('-');
  const monthName = new Date(d + 'T00:00:00').toLocaleString('default', { month: 'short' });
  return `${parseInt(day)} ${monthName} ${year}`;
};

const ReceiptVaultPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [selectedMonth, setSelectedMonth] = useState('All');

  useEffect(() => {
  if (!user?.userId) return;
  setLoading(true);
  getAllReceipts(user.userId)
    .then(res => {
      const data = Array.isArray(res.data) ? res.data : [];
      setReceipts(data);
    })
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
}, [user]);

  const folders = useMemo(() => {
    const map = {};
    receipts.forEach(r => {
      const cat = r.category || 'Other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(r);
    });
    return Object.entries(map)
      .map(([cat, items]) => ({
        category: cat,
        items,
        total: items.reduce((s, i) => s + parseFloat(i.amount || 0), 0),
        latest: [...items].sort((a, b) => new Date(b.date) - new Date(a.date))[0],
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [receipts]);

  const availableMonths = useMemo(() => {
    const months = new Set(receipts.map(r => {
      const d = (r.date || '').split('T')[0];
      return d.slice(0, 7);
    }).filter(Boolean));
    return ['All', ...[...months].sort((a, b) => b.localeCompare(a))];
  }, [receipts]);

  const folderItems = useMemo(() => {
    if (!activeFolder) return [];
    let items = folders.find(f => f.category === activeFolder)?.items || [];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(r => (r.description || '').toLowerCase().includes(q));
    }
    if (selectedMonth !== 'All') {
      items = items.filter(r => (r.date || '').startsWith(selectedMonth));
    }
    const copy = [...items];
    if (sortBy === 'date-desc') copy.sort((a, b) => new Date(b.date) - new Date(a.date));
    else if (sortBy === 'date-asc') copy.sort((a, b) => new Date(a.date) - new Date(b.date));
    else if (sortBy === 'amount-desc') copy.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    else if (sortBy === 'amount-asc') copy.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
    return copy;
  }, [activeFolder, folders, search, selectedMonth, sortBy]);

  const totalAmount = useMemo(() =>
    receipts.reduce((s, r) => s + parseFloat(r.amount || 0), 0), [receipts]);

  const formatMonthLabel = (iso) => {
    if (iso === 'All') return 'All Time';
    const [y, m] = iso.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, 1)
      .toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) return (
    <div className="rv-loading">
      <div className="rv-spinner" />
      <p>Loading your receipt vault...</p>
    </div>
  );

  // ── Folder Grid View ──────────────────────────────────────────
  const FolderView = () => (
    <div className="rv-root">
      <div className="rv-header">
        <div>
          <h1 className="rv-title"><ArchiveIcon /> Receipt Vault</h1>
          <p className="rv-subtitle">All your receipts, organized automatically</p>
        </div>
      </div>

      <div className="rv-stats-bar">
        <div className="rv-stats-group">
          <div className="rv-stat-inline">
            <span className="rv-stat-inline-lbl">Total Receipts</span>
            <span className="rv-stat-inline-val">{receipts.length}</span>
          </div>
          <div className="rv-stat-inline">
            <span className="rv-stat-inline-lbl">Total Recorded</span>
            <span className="rv-stat-inline-val">${totalAmount.toFixed(2)}</span>
          </div>
          <div className="rv-stat-inline">
            <span className="rv-stat-inline-lbl">Categories</span>
            <span className="rv-stat-inline-val">{folders.length}</span>
          </div>
        </div>
        <button className="rv-upload-btn" onClick={() => navigate('/home/expense')}>+ Upload Receipt</button>
      </div>

      {folders.length === 0 ? (
        <div className="rv-empty-full">
          <h3>No receipts yet</h3>
          <p>Upload receipts when adding expenses and they'll appear here.</p>
        </div>
      ) : (
        <div className="rv-folder-grid">
          {folders.map(folder => {
            const colors = CATEGORY_COLORS[folder.category] || CATEGORY_COLORS.Other;
            return (
              <div
                key={folder.category}
                className="rv-folder-card"
                style={{ '--folder-accent': colors.accent, '--folder-bg': colors.bg }}
                onClick={() => setActiveFolder(folder.category)}
              >
                <div className="rv-folder-thumbs">
                  {folder.items.slice(0, 3).reverse().map((item, i) => (
                    <div
                      key={item._id}
                      className="rv-thumb-stack"
                      style={{
                        zIndex: i + 1,
                        transform: `rotate(${(i - 1) * 4}deg) translateY(${(2 - i) * 4}px)`
                      }}
                    >
                      <img
                        src={BASE_URL + item.receiptPath}
                        alt=""
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  ))}
                  {folder.items.length === 0 && (
                    <div className="rv-thumb-placeholder">
                      <span><CategoryIcon category={folder.category} /></span>
                    </div>
                  )}
                </div>

                <div className="rv-folder-info">
                  <div className="rv-folder-cat-row">
                    <span className="rv-folder-emoji"><CategoryIcon category={folder.category} /></span>
                    <span className="rv-folder-name" style={{ color: colors.text }}>
                      {folder.category}
                    </span>
                  </div>
                  <div className="rv-folder-meta">
                    <span className="rv-folder-count">
                      {folder.items.length} receipt{folder.items.length !== 1 ? 's' : ''}
                    </span>
                    <span className="rv-folder-total">${folder.total.toFixed(2)}</span>
                  </div>
                  <div className="rv-folder-latest">
                    Latest: {formatDate(folder.latest?.date)}
                  </div>
                </div>

                <div className="rv-folder-arrow">→</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Inside Folder View ────────────────────────────────────────
  const FolderInsideView = () => {
    const folder = folders.find(f => f.category === activeFolder);
    const colors = CATEGORY_COLORS[activeFolder] || CATEGORY_COLORS.Other;

    return (
      <div className="rv-root">
        <div className="rv-folder-header">
          <button
            className="rv-back-btn"
            onClick={() => { setActiveFolder(null); setSearch(''); setSelectedMonth('All'); }}
          >
            ← Back to Vault
          </button>
          <div className="rv-folder-title-row">
            <span className="rv-folder-title-emoji"><CategoryIcon category={activeFolder} /></span>
            <h1 className="rv-folder-title">{activeFolder}</h1>
            <span className="rv-folder-badge" style={{ background: colors.accent }}>
              {folder?.items.length} receipts
            </span>
          </div>
          <p className="rv-subtitle">Total: ${folder?.total.toFixed(2)}</p>
        </div>

        <div className="rv-filters">
          <div className="rv-search-wrap">
            <span className="rv-search-icon"><SearchIcon size={16} /></span>
            <input
              className="rv-search"
              placeholder="Search receipts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="rv-filter-select" value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}>
            {availableMonths.map(m => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
          </select>
          <select className="rv-filter-select" value={sortBy}
            onChange={e => setSortBy(e.target.value)}>
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Highest amount</option>
            <option value="amount-asc">Lowest amount</option>
          </select>
        </div>

        {folderItems.length === 0 ? (
          <div className="rv-empty-full">
            <span><SearchIcon size={40} /></span>
            <h3>No receipts found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="rv-gallery">
            {folderItems.map(r => (
              <div key={r._id} className="rv-receipt-card" onClick={() => setLightbox(r)}>
                <div className="rv-receipt-img-wrap">
                  <img
                    src={BASE_URL + r.receiptPath}
                    alt={r.description}
                    className="rv-receipt-img"
                    onError={e => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="rv-receipt-img-fallback" style={{ display: 'none' }}>
                    <span><ReceiptIcon size={32} /></span>
                  </div>
                  <div className="rv-receipt-overlay">
                    <span className="rv-view-btn"><SearchIcon size={14} /> View</span>
                  </div>
                </div>
                <div className="rv-receipt-info">
                  <div className="rv-receipt-desc">{r.description || '—'}</div>
                  <div className="rv-receipt-meta">
                    <span className="rv-receipt-date">{formatDate(r.date)}</span>
                    <span className="rv-receipt-amount" style={{ color: colors.text }}>
                      ${parseFloat(r.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Lightbox ──────────────────────────────────────────────────
  const Lightbox = () => {
    if (!lightbox) return null;
    const colors = CATEGORY_COLORS[lightbox.category] || CATEGORY_COLORS.Other;
    const currentIdx = folderItems.findIndex(r => r._id === lightbox._id);
    const hasPrev = currentIdx > 0;
    const hasNext = currentIdx < folderItems.length - 1;

    return (
      <div className="rv-lightbox-overlay" onClick={() => setLightbox(null)}>
        <div className="rv-lightbox" onClick={e => e.stopPropagation()}>

          <div className="rv-lightbox-header">
            <div>
              <div className="rv-lightbox-desc">{lightbox.description}</div>
              <div className="rv-lightbox-meta">
                <span style={{
                  background: colors.bg, color: colors.text,
                  padding: '2px 10px', borderRadius: '999px',
                  fontSize: '12px', fontWeight: 600
                }}>
                  <CategoryIcon category={lightbox.category} /> {lightbox.category}
                </span>
                <span className="rv-lightbox-date">{formatDate(lightbox.date)}</span>
                <span className="rv-lightbox-amt" style={{ color: colors.accent }}>
                  ${parseFloat(lightbox.amount).toFixed(2)}
                </span>
              </div>
            </div>
            <button className="rv-lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          </div>

          <div className="rv-lightbox-img-wrap">
            <img
              src={BASE_URL + lightbox.receiptPath}
              alt={lightbox.description}
              className="rv-lightbox-img"
            />
          </div>

          <div className="rv-lightbox-nav">
            <button className="rv-nav-btn" disabled={!hasPrev}
              onClick={() => setLightbox(folderItems[currentIdx - 1])}>
              ← Previous
            </button>
            <span className="rv-nav-counter">{currentIdx + 1} / {folderItems.length}</span>
            <button className="rv-nav-btn" disabled={!hasNext}
              onClick={() => setLightbox(folderItems[currentIdx + 1])}>
              Next →
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {activeFolder ? <FolderInsideView /> : <FolderView />}
      <Lightbox />
    </>
  );
};

export default ReceiptVaultPage;