import React, { useEffect, useState } from 'react';
import { getDailySpentSnapshot } from '../api/services/budgetService';
import '../styles/dailySpentSnapshot.css';

const CATEGORY_EMOJI = {
  Food: '🍔', Transport: '🚗', Utilities: '💡', Health: '💊',
  Education: '📚', Shopping: '🛍️', Travel: '✈️', Savings: '💰', Other: '📦'
};

const DailySpentSnapshot = ({ userId, monthYear, refreshTrigger = 0 }) => {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId || !monthYear) return;

    const fetchSnapshot = async () => {
      try {
        setLoading(true);
        const data = await getDailySpentSnapshot(userId, monthYear);
        setSnapshot(data);
        setError(null);
      } catch (err) {
        setError('Failed to load daily snapshot. Set a budget first.');
        setSnapshot(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshot();
  }, [userId, monthYear, refreshTrigger]);

  if (loading) {
    return (
      <div className="daily-spent-snapshot loading">
        <p>Loading snapshot...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="daily-spent-snapshot error">
        <p>{error}</p>
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  const percentageUsed = parseFloat(snapshot.percentageSpent);
  const progressBarColor = percentageUsed > 100 ? '#ef4444' : percentageUsed > 75 ? '#f59e0b' : '#10b981';
  const comparisonDiff = snapshot.previousMonth?.previousMonthSpending 
    ? snapshot.currentSpending - snapshot.previousMonth.previousMonthSpending 
    : 0;
  const comparisonPercent = snapshot.previousMonth?.previousMonthSpending
    ? ((comparisonDiff / snapshot.previousMonth.previousMonthSpending) * 100).toFixed(1)
    : 0;

  return (
    <div className="daily-spent-snapshot">
      {/* Main Numbers Section */}
      <div className="snapshot-grid">
        {/* April 2026 - Current Month */}
        <div className="snapshot-card primary-card">
          <div className="card-header">
            <h3>APRIL 2026</h3>
            <span className="badge current">Current Month</span>
          </div>
          <div className="amount">${snapshot.currentSpending.toFixed(2)}</div>
          <div className="card-meta">Current spending</div>
          <div className="comparison">
            <span className={comparisonDiff >= 0 ? 'negative' : 'positive'}>
              {comparisonDiff >= 0 ? '+' : '-'}${Math.abs(comparisonDiff).toFixed(2)} vs March
            </span>
            {comparisonDiff >= 0 ? (
              <span className="trend negative">↑ {comparisonPercent}% than March</span>
            ) : (
              <span className="trend positive">↓ {Math.abs(comparisonPercent)}% than March</span>
            )}
          </div>
        </div>

        {/* Previous Month */}
        <div className="snapshot-card secondary-card">
          <div className="card-header">
            <h3>MARCH 2026</h3>
            <span className="badge previous">Previous Month</span>
          </div>
          <div className="amount">${snapshot.previousMonth?.previousMonthSpending || 0}</div>
          <div className="card-meta">Baseline</div>
        </div>   
      </div>

      {/* Daily Spend Snapshot Section */}
      <div className="daily-spend-snapshot">
        <div className="snapshot-card wide-card">
          <div className="card-header">
            <h3>Daily Spend Snapshot</h3>
          </div>

          <div className="metrics-grid">
            <div className="metric">
              <div className="metric-value">${snapshot.avgDailySpend.toFixed(2)}</div>
              <div className="metric-label">Avg Daily Spend</div>
              <div className="metric-comparison">
                {snapshot.previousMonth?.previousMonthSpending ? (
                  <>
                    <span className="small-text">
                      Prev: ${(snapshot.previousMonth.previousMonthSpending / 31).toFixed(2)}/day
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="metric">
              <div className="metric-value">${snapshot.safeDailyBudget.toFixed(2)}</div>
              <div className="metric-label">Safe Daily Budget</div>
              <div className="metric-comparison">
                <span className="small-text">To stay on track</span>
              </div>
            </div>

            <div className="metric">
              <div className="metric-value">${snapshot.remainingBudget.toFixed(2)}</div>
              <div className="metric-label">Remaining Budget</div>
              <div className="metric-comparison">
                <span className="small-text">{snapshot.daysRemaining} days left</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-header">
              <span className="label">Budget Progress</span>
              <span className="percentage">{snapshot.percentageSpent}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${Math.min(percentageUsed, 100)}%`,
                  backgroundColor: progressBarColor
                }}
              />
            </div>
            <div className="progress-info">
              <span className="spent">Spent: ${snapshot.currentSpending.toFixed(2)}</span>
              <span className="budget">Budget: ${snapshot.totalBudget.toFixed(2)}</span>
            </div>
          </div>

          {/* Category Budgets Section */}
          {snapshot.categoryStatus && snapshot.categoryStatus.length > 0 && (
            <div className="category-budgets-section">
              <h4>Category Budgets</h4>
              <div className="category-budgets-grid">
                {snapshot.categoryStatus.map((categoryBudget) => {
                  // Find if this category has any expenses
                  const categoryExpense = snapshot.categoryBreakdown?.find(
                    cb => cb.category === categoryBudget.category
                  );
                  const spentAmount = categoryExpense?.total || 0;
                  // Check both 'budget' and 'budgeted' properties
                  const budgeted = categoryBudget.budget || categoryBudget.budgeted || 0;
                  
                  return (
                    <div key={categoryBudget.category} className="category-budget-item">
                      <div className="category-name">
                        <span className="emoji">{CATEGORY_EMOJI[categoryBudget.category] || '📦'}</span>
                        <span className="name">{categoryBudget.category}</span>
                      </div>
                      {budgeted > 0 ? (
                        <div className="category-amounts">
                          <div className="budget-info">
                            <span className="label">Spent:</span>
                            <span className="amount">${spentAmount.toFixed(2)}</span>
                          </div>
                          <div className="spent-info">
                            <span className="label">Total Category Budget:</span>
                            <span className="amount">${budgeted.toFixed(2)}</span>
                          </div>
                          <div className="remaining-info">
                            <span className="label">Remaining:</span>
                            <span className={`amount ${budgeted - spentAmount < 0 ? 'over-budget' : ''}`}>
                              ${(budgeted - spentAmount).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="no-budget">
                          <span className="amount">${spentAmount.toFixed(2)}</span>
                          <span className="label">(No budget set)</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Days Indicator */}
          <div className="days-info">
            <div className="day-stat">
              <span className="day-number">{snapshot.daysElapsed}</span>
              <span className="day-label">Days Passed</span>
            </div>
            <div className="day-stat">
              <span className="day-number">{snapshot.daysRemaining}</span>
              <span className="day-label">Days Remaining</span>
            </div>
            <div className="day-stat">
              <span className="day-number">{snapshot.totalDaysInMonth}</span>
              <span className="day-label">Total Days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailySpentSnapshot;
