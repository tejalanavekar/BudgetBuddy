import React, { useEffect, useState } from 'react';
import { getDailySpentSnapshot } from '../api/services/budgetService';
import { CATEGORY_COLOR } from '../constants/categoryMeta';
import { CategoryIcon } from './icons/Icon';
import '../styles/dailySpentSnapshot.css';

// "2026-04" -> "APRIL 2026" / previous-month variants, so the snapshot cards
// always reflect the actual selected month instead of a fixed placeholder.
const formatMonthYearUpper = (monthYear) => {
  const [year, month] = monthYear.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' })
    .toUpperCase();
};

const getPreviousMonthYear = (monthYear) => {
  const [year, month] = monthYear.split('-').map(Number);
  const d = new Date(year, month - 2, 1); // month-1 is current month index, -1 more for previous
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthNameOnly = (monthYear) => {
  const [year, month] = monthYear.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, 1)
    .toLocaleString('default', { month: 'long' });
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

  const previousMonthYear = getPreviousMonthYear(monthYear);
  const previousMonthName = monthNameOnly(previousMonthYear);

  return (
    <div className="daily-spent-snapshot">
      {/* Main Numbers Section */}
      <div className="snapshot-grid">
        {/* Current Month */}
        <div className="snapshot-card primary-card">
          <div className="card-header">
            <h3>{formatMonthYearUpper(monthYear)}</h3>
            <span className="badge current">Current Month</span>
          </div>
          <div className="amount">${snapshot.currentSpending.toFixed(2)}</div>
          <div className="card-meta">Current spending</div>
          <div className="comparison">
            <span className={comparisonDiff >= 0 ? 'negative' : 'positive'}>
              {comparisonDiff >= 0 ? '+' : '-'}${Math.abs(comparisonDiff).toFixed(2)} vs {previousMonthName}
            </span>
            {comparisonDiff >= 0 ? (
              <span className="trend negative">↑ {comparisonPercent}% than {previousMonthName}</span>
            ) : (
              <span className="trend positive">↓ {Math.abs(comparisonPercent)}% than {previousMonthName}</span>
            )}
          </div>
        </div>

        {/* Previous Month */}
        <div className="snapshot-card secondary-card">
          <div className="card-header">
            <h3>{formatMonthYearUpper(previousMonthYear)}</h3>
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
                  
                  const pct = budgeted > 0 ? Math.min(100, (spentAmount / budgeted) * 100) : 0;
                  const barColor = CATEGORY_COLOR[categoryBudget.category] || '#2dd4bf';

                  return (
                    <div key={categoryBudget.category} className="category-budget-row">
                      <span className="cbr-icon"><CategoryIcon category={categoryBudget.category} /></span>
                      <div className="cbr-main">
                        <div className="cbr-top">
                          <span className="cbr-name">{categoryBudget.category}</span>
                          {budgeted > 0 ? (
                            <span className="cbr-numbers">${spentAmount.toFixed(0)} / ${budgeted.toFixed(0)}</span>
                          ) : (
                            <span className="cbr-numbers">${spentAmount.toFixed(0)} <em>(no budget)</em></span>
                          )}
                        </div>
                        <div className="cbr-bar-bg">
                          <div className="cbr-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>
                      <span className="cbr-pct">{budgeted > 0 ? `${Math.round(pct)}%` : '—'}</span>
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
