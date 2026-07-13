import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getBudget } from '../api/services/budgetService.js';
import DailySpentSnapshot from '../components/DailySpentSnapshot.jsx';
import BudgetManager from '../components/BudgetManager.jsx';
import { WalletIcon, EditIcon } from '../components/icons/Icon';
import { BUDGET_CHANGED } from '../utils/dataEvents';
import '../styles/budgetPage.css';

const BudgetPage = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showBudgetManager, setShowBudgetManager] = useState(false);
  const [budgetRefresh, setBudgetRefresh] = useState(0);
  // Lets the header button say "Edit Budget" instead of "+ Set Budget" once one
  // already exists for the selected month — BudgetManager already supports editing
  // (it preloads existing values), it just wasn't obvious that option existed.
  const [hasBudget, setHasBudget] = useState(false);

  useEffect(() => {
    if (!user?.userId || !selectedMonth) return;
    getBudget(user.userId, selectedMonth)
      .then(data => setHasBudget(!!data.budget))
      .catch(() => setHasBudget(false));
  }, [user, selectedMonth, budgetRefresh]);

  // The AI assistant can update the budget from anywhere in the app — refetch here
  // (both the snapshot via budgetRefresh, and the hasBudget check above) if that happens.
  useEffect(() => {
    const handler = () => setBudgetRefresh(prev => prev + 1);
    window.addEventListener(BUDGET_CHANGED, handler);
    return () => window.removeEventListener(BUDGET_CHANGED, handler);
  }, []);

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

  return (
    <>
      {/* Header */}
      <div className="budget-page-header">
        <div className="header-title">
          <h2><WalletIcon /> Budget Management</h2>
          <p>Manage your monthly budget and track spending</p>
        </div>
        <div className="header-controls">
          <button
            className="set-budget-btn"
            onClick={() => setShowBudgetManager(true)}
          >
            {hasBudget ? <><EditIcon size={14} /> Edit Budget</> : '+ Set Budget'}
          </button>
          <select
            className="month-selector"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {getLast12Months().map((d) => (
              <option key={d} value={d}>
                {formatMonthLabel(d)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="budget-page-content">
        {user?.userId && selectedMonth && (
          <DailySpentSnapshot userId={user.userId} monthYear={selectedMonth} refreshTrigger={budgetRefresh} />
        )}
      </div>

      {/* Budget Manager Modal */}
      {showBudgetManager && user?.userId && (
        <div className="budget-modal-overlay" onClick={() => setShowBudgetManager(false)}>
          <div
            className="budget-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <BudgetManager
              userId={user.userId}
              monthYear={selectedMonth}
              onBudgetSaved={() => {
                setBudgetRefresh((prev) => prev + 1);
              }}
              onClose={() => setShowBudgetManager(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default BudgetPage;
