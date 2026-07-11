import React, { useState, useEffect } from 'react';
import { setBudget, getBudget } from '../api/services/budgetService';
import { CategoryIcon, WalletIcon, WarningIcon, CheckIcon, LightbulbIcon } from './icons/Icon';
import '../styles/budgetManager.css';

const CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Health',
  'Education',
  'Shopping',
  'Travel',
  'Savings',
  'Other'
];

const BudgetManager = ({ userId, monthYear, onBudgetSaved, onClose }) => {
  const [totalBudget, setTotalBudget] = useState('');
  const [categoryBudgets, setCategoryBudgets] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [enableCategoryBudgets, setEnableCategoryBudgets] = useState(false);

  // Load existing budget
  useEffect(() => {
    const loadBudget = async () => {
      try {
        const data = await getBudget(userId, monthYear);
        if (data.budget) {
          setTotalBudget(data.budget.totalMonthlyBudget.toString());
          setCategoryBudgets(data.budget.categoryBudgets || []);
          setEnableCategoryBudgets(data.budget.categoryBudgets.length > 0);
        }
      } catch (err) {
        console.log('No existing budget or error loading');
      }
    };

    if (userId && monthYear) {
      loadBudget();
    }
  }, [userId, monthYear]);

  const handleTotalBudgetChange = (e) => {
    const value = e.target.value;
    if (value === '' || !isNaN(value)) {
      setTotalBudget(value);
      setSaved(false);
    }
  };

  const handleCategoryBudgetChange = (category, amount) => {
    const updated = categoryBudgets.map(cb =>
      cb.category === category ? { ...cb, amount: parseFloat(amount) || 0 } : cb
    );
    setCategoryBudgets(updated);
    setSaved(false);
  };

  const toggleCategory = (category) => {
    const exists = categoryBudgets.some(cb => cb.category === category);
    
    if (exists) {
      setCategoryBudgets(categoryBudgets.filter(cb => cb.category !== category));
    } else {
      setCategoryBudgets([...categoryBudgets, { category, amount: 0 }]);
    }
    
    setSaved(false);
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    
    if (!totalBudget || parseFloat(totalBudget) <= 0) {
      setError('Total budget must be greater than 0');
      return;
    }

    // Validate category budgets sum
    if (enableCategoryBudgets) {
      const categorySum = categoryBudgets.reduce((sum, cb) => sum + (cb.amount || 0), 0);
      if (categorySum > parseFloat(totalBudget)) {
        setError(`Category budgets total ($${categorySum}) cannot exceed total budget ($${totalBudget})`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      await setBudget(
        userId,
        monthYear,
        parseFloat(totalBudget),
        enableCategoryBudgets ? categoryBudgets : []
      );

      setSaved(true);
      if (onBudgetSaved) {
        onBudgetSaved();
      }

      // Hide success message after 2 seconds
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || 'Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="budget-manager">
      <div className="manager-header">
        <h2><WalletIcon /> Budget Manager</h2>
        <p className="month-display">Setting budget for {monthYear}</p>
      </div>

      {error && (
        <div className="error-message">
          <span><WarningIcon size={18} /></span>
          <p>{error}</p>
        </div>
      )}

      {saved && (
        <div className="success-message">
          <span><CheckIcon size={18} /></span>
          <p>Budget saved successfully!</p>
        </div>
      )}

      <form onSubmit={handleSaveBudget} className="budget-form">
        {/* Total Monthly Budget */}
        <div className="form-section">
          <h3>Total Monthly Budget</h3>
          
          <div className="input-group">
            <label htmlFor="total-budget">Monthly Budget Amount</label>
            <div className="input-wrapper">
              <span className="currency">$</span>
              <input
                id="total-budget"
                type="number"
                value={totalBudget}
                onChange={handleTotalBudgetChange}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <small className="input-hint">
              Set your total spending limit for {monthYear}
            </small>
          </div>
        </div>

        {/* Category Budgets Section */}
        <div className="form-section">
          <div className="category-toggle">
            <label htmlFor="enable-categories">
              <input
                id="enable-categories"
                type="checkbox"
                checked={enableCategoryBudgets}
                onChange={(e) => {
                  setEnableCategoryBudgets(e.target.checked);
                  if (!e.target.checked) {
                    setCategoryBudgets([]);
                  }
                  setSaved(false);
                }}
              />
              <span>Set individual category budgets</span>
            </label>
            <small>Optional: Allocate specific budgets for each spending category</small>
          </div>

          {enableCategoryBudgets && (
            <div className="category-list">
              <h3>Category Budgets</h3>
              <div className="categories-grid">
                {CATEGORIES.map(category => {
                  const categoryBudget = categoryBudgets.find(cb => cb.category === category);
                  const isSelected = !!categoryBudget;

                  return (
                    <div
                      key={category}
                      className={`category-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="category-header">
                        <span className="emoji"><CategoryIcon category={category} /></span>
                        <span className="category-name">{category}</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="checkbox"
                        />
                      </div>

                      {isSelected && (
                        <div className="category-input" onClick={(e) => e.stopPropagation()}>
                          <div className="input-wrapper">
                            <span className="currency">$</span>
                            <input
                              type="number"
                              value={categoryBudget?.amount || ''}
                              onChange={(e) => handleCategoryBudgetChange(category, e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {categoryBudgets.length > 0 && (
                <div className="category-summary">
                  <div className="summary-item">
                    <span className="label">Categories Selected:</span>
                    <span className="value">{categoryBudgets.length}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Category Budgets Total:</span>
                    <span className="value">
                      ${categoryBudgets.reduce((sum, cb) => sum + (cb.amount || 0), 0).toFixed(2)}
                    </span>
                  </div>
                  {totalBudget && (
                    <div className="summary-item">
                      <span className="label">Unallocated Budget:</span>
                      <span className={`value ${parseFloat(totalBudget) - categoryBudgets.reduce((sum, cb) => sum + (cb.amount || 0), 0) < 0 ? 'error' : ''}`}>
                        ${Math.max(0, parseFloat(totalBudget) - categoryBudgets.reduce((sum, cb) => sum + (cb.amount || 0), 0)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading || !totalBudget}>
            {loading ? 'Saving...' : 'Save Budget'}
          </button>
          {onClose && (
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          )}
        </div>

        {/* Tips */}
        <div className="tips-section">
          <h4><LightbulbIcon size={16} /> Tips for Better Budget Management:</h4>
          <ul>
            <li>Start with your total monthly income and allocate 80-90% for spending</li>
            <li>Reserve 10-20% for savings or emergency fund</li>
            <li>Set category budgets based on your spending patterns</li>
            <li>Review and adjust monthly based on your needs</li>
            <li>Use the Budget AI to get personalized recommendations</li>
          </ul>
        </div>
      </form>
    </div>
  );
};

export default BudgetManager;
