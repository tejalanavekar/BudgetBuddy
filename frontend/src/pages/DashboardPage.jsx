import BACKEND_URL from '../config.js';
import React, { use, useEffect, useState } from 'react';
import axios from 'axios';
import CategoryChart from '../components/CategoryChart';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/home.css';

const DashboardPage = () => {
    const { user } = useAuth();
    const [allExpenses, setAllExpenses] = useState([]); 
    const [filteredExpenses, setFilteredExpenses] = useState([]); 
    const [summary, setSummary] = useState({ thisMonth: 0, lastMonth: 0, count: 0 });
    const [sortOption, setSortOption] = useState('date-desc');
    const [categoryFilter, setCategoryFilter] = useState('All');

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
        if (!user || !user.userId) return;

        axios.get(`${BACKEND_URL}/expenses?userId=${user.userId}`)
            .then((response) => {
                setAllExpenses(response.data);
            })
            .catch((error) => console.error('Error fetching expenses:', error));
    }, [user]);

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

    // Derived categories for the selected month
    const categories = Array.from(new Set(filteredExpenses.map(e => e.category).filter(Boolean)));

    // Compute displayed recent items after applying category filter and sort
    const getDisplayedRecent = () => {
        // Filter by category (if any)
        let items = filteredExpenses.filter(e => categoryFilter === 'All' ? true : e.category === categoryFilter);

        // Sort according to sortOption
        const itemsCopy = [...items];
        if (sortOption === 'amount-desc') {
            itemsCopy.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
        } else if (sortOption === 'amount-asc') {
            itemsCopy.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
        } else { // date-desc
            itemsCopy.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        return itemsCopy.slice(0, 5);
    };


    return (
        <div className="dashboard-container">
            {/* Dashboard Header with Filter */}
            <div className="dashboard-header">
                <h2>Overview</h2>
                <div className="date-filter">
                    {/* <label>Month: </label> */}
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
                    <div className="label">{formatMonthLabel(selectedDate)}</div>
                    <div className="value big-blue">₹{(summary.thisMonth || 0).toFixed(2)}</div>
                </div>
                <div className="summary-tile">
                    <div className="label">{formatMonthLabel(getPreviousMonthISO(selectedDate))}</div>
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
    <h5 className="mb-2">Recent Expenses</h5>

    <div className="recent-filters">
        <div className="filter-group">
            <label className="filter-label">Category</label>
            <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="All">All</option>
                {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
        </div>

        <div className="filter-group">
            <label className="filter-label">Sort</label>
            <select className="filter-select" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                <option value="date-desc">Newest</option>
                <option value="amount-desc">Max spent</option>
                <option value="amount-asc">Amount ↑</option>
            </select>
        </div>
    </div>

    <div className="recent-list">
        {filteredExpenses.length > 0 ? (
            getDisplayedRecent().map((e) => (
                <div className="list-item" key={e._id}>
                    <div className="item-left">
                        <div className="cat-icon">
                            {e.category ? e.category.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                            <div className="desc">{e.description}</div>
                            <div className="sub-text">
                                {new Date(e.date).toLocaleDateString()} · {e.category}
                            </div>
                        </div>
                    </div>
                    <div className="item-right">
                        -₹{parseFloat(e.amount).toFixed(2)}
                    </div>
                </div>
            ))
        ) : (
            <div className="empty-state">No expenses found for this month.</div>
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
                    {/* <ChatAssistant /> Removed: Component not found */}
        </div>
    );
};

export default DashboardPage;