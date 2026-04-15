import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import DailySpentSnapshot from '../components/DailySpentSnapshot.jsx';
import FloatingChatbot from '../components/FloatingChatbot.jsx';
import BudgetManager from '../components/BudgetManager.jsx';
import '../styles/budgetPage.css';

const BudgetPage = () => {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showBudgetManager, setShowBudgetManager] = useState(false);
  const [budgetRefresh, setBudgetRefresh] = useState(0);

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
          <h2>💰 Budget Management</h2>
          <p>Manage your monthly budget and track spending</p>
        </div>
        <div className="header-controls">
          <button
            className="set-budget-btn"
            onClick={() => setShowBudgetManager(true)}
          >
            + Set Budget
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
          <>
            {/* Daily Spent Snapshot */}
            <DailySpentSnapshot userId={user.userId} monthYear={selectedMonth} />

            {/* Floating Budget AI Chatbot */}
            <FloatingChatbot userId={user.userId} monthYear={selectedMonth} />
          </>
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
