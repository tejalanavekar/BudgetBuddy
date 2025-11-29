import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CategoryChart from '../components/CategoryChart';
import '../styles/home.css';

const DashboardPage = () => {
    const [allExpenses, setAllExpenses] = useState([]); 
    const [filteredExpenses, setFilteredExpenses] = useState([]); 
    const [summary, setSummary] = useState({ thisMonth: 0, lastMonth: 0, count: 0 });

    // --- HELPER FUNCTIONS ---

    // 1. Get Today's Year-Month in "YYYY-MM" format (Local Time safe)
    const getCurrentMonthISO = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    // 2. Generate Last 12 Months for Dropdown
    const getLast12Months = () => {
        const months = [];
        const now = new Date();
        
        for (let i = 0; i < 12; i++) {
            // Create a date object for the 1st of the month, i months ago
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            months.push(`${year}-${month}`);
        }
        return months;
    };

    // 3. Format "YYYY-MM" to readable "November 2025"
    const formatMonthLabel = (isoDate) => {
        const [year, month] = isoDate.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    // 4. Get Previous Month ISO string from a given ISO string
    const getPreviousMonthISO = (currentIso) => {
        const [year, month] = currentIso.split('-').map(Number);
        const date = new Date(year, month - 1 - 1, 1); // Subtract 1 for index, 1 for prev month
        const prevYear = date.getFullYear();
        const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
        return `${prevYear}-${prevMonth}`;
    };

    // --- STATE ---
    const [selectedDate, setSelectedDate] = useState(getCurrentMonthISO()); 

    // --- EFFECTS ---

    // Fetch Data
    useEffect(() => {
        axios.get('http://localhost:5000/expenses')
            .then((response) => {
                setAllExpenses(response.data);
            })
            .catch((error) => console.error('Error fetching expenses:', error));
    }, []);

    // Filter Logic
    useEffect(() => {
        if (allExpenses.length === 0) return;

        // Parse selected Year/Month
        const [selYear, selMonth] = selectedDate.split('-').map(Number);

        // Filter for Selected Month
        const currentMonthData = allExpenses.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === selYear && (d.getMonth() + 1) === selMonth;
        });

        // Filter for Previous Month (for comparison)
        const prevIso = getPreviousMonthISO(selectedDate);
        const [prevYear, prevMonth] = prevIso.split('-').map(Number);
        
        const prevMonthData = allExpenses.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === prevYear && (d.getMonth() + 1) === prevMonth;
        });

        // Calculate Totals
        const totalThisMonth = currentMonthData.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const totalLastMonth = prevMonthData.reduce((sum, e) => sum + parseFloat(e.amount), 0);

        setFilteredExpenses(currentMonthData);
        setSummary({
            thisMonth: totalThisMonth,
            lastMonth: totalLastMonth,
            count: currentMonthData.length
        });

    }, [allExpenses, selectedDate]);


    return (
        <div className="dashboard-container">
            {/* Dashboard Header with Filter */}
            <div className="dashboard-header">
                <h2>Overview</h2>
                <div className="date-filter">
                    <label>Period:</label>
                    <select 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="month-select wide"
                    >
                        {getLast12Months().map(dateStr => (
                            <option key={dateStr} value={dateStr}>
                                {formatMonthLabel(dateStr)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Tiles */}
            <div className="summary-grid">
                <div className="summary-tile">
                    <div className="label">Spent — {formatMonthLabel(selectedDate)}</div>
                    <div className="value big-blue">₹{(summary.thisMonth || 0).toFixed(2)}</div>
                </div>
                <div className="summary-tile">
                    <div className="label">Spent — Previous Month</div>
                    <div className="value text-muted">₹{(summary.lastMonth || 0).toFixed(2)}</div>
                </div>
                <div className="summary-tile">
                    <div className="label">Transactions</div>
                    <div className="value text-green">{summary.count}</div>
                </div>
            </div>

            {/* Main Grid: Recent List & Chart */}
            <div className="dashboard-content-grid">
                {/* Left: Recent Expenses List */}
                <div className="card-box">
                    <h5 className="mb-3">Recent Expenses</h5>
                    <div className="recent-list">
                        {filteredExpenses.length > 0 ? (
                            // Sort by date descending, take top 5
                            filteredExpenses
                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                .slice(0, 5)
                                .map((e) => (
                                <div className="list-item" key={e._id}>
                                    <div className="item-left">
                                        <div className="desc">{e.description}</div>
                                        <div className="sub-text">{new Date(e.date).toLocaleDateString()} · {e.category}</div>
                                    </div>
                                    <div className="item-right">
                                        ₹{parseFloat(e.amount).toFixed(2)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">No expenses for {formatMonthLabel(selectedDate)}</div>
                        )}
                    </div>
                </div>

                {/* Right: Chart */}
                <div className="card-box chart-box">
                    <h5 className="mb-3">Spend by Category</h5>
                    {filteredExpenses.length > 0 ? (
                        <CategoryChart expenses={filteredExpenses} />
                    ) : (
                        <div className="empty-state">No data to display</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;