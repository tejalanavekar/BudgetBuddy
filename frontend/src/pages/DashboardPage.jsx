import React from 'react';
import { useEffect, useState } from 'react';
import axios from 'axios';

const DashboardPage = () => {
    const[expenses, setExpenses] = useState([]);
    const [totalExpense, setTotalExpense] = useState({total:0, thisMonth:0, totalCount:0});

    useEffect(() =>{
        axios.get('http://localhost:5000/expenses') // Fetching data from backend
        .then((response) => {
            const data = response.data;
            setExpenses(data);

            // Calculate totals
            const totalAmount = data.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
            const count = data.length;
            //Find the current month and calculate the totals for this month
            const currentMonth = new Date().getMonth();
            const thisMonthTotal = data.filter(expense => new Date(expense.date).getMonth() === currentMonth)
                                   .reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
            //Enter the final amounts in the state
            setTotalExpense({total: totalAmount, thisMonth: thisMonthTotal, totalCount: count});
        }).catch((error) => 
            console.error('Error fetching expenses:', error));
        },[]); // [] ensures this runs once on component mount

        // JSX for rendering the dashboard
    return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-6">
        <div className="bg-white shadow rounded p-4">
          <p className="text-gray-500">Total Spent</p>
          <p className="text-2xl font-bold text-red-600">₹{totalExpense.total.toFixed(2)}</p>
        </div>
        <div className="bg-white shadow rounded p-4">
          <p className="text-gray-500">This Month</p>
          <p className="text-2xl font-bold text-blue-600">₹{totalExpense.thisMonth.toFixed(2)}</p>
        </div>
        <div className="bg-white shadow rounded p-4">
          <p className="text-gray-500">Total Expenses</p>
          <p className="text-2xl font-bold text-green-600">{totalExpense.count}</p>
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-white shadow p-4 rounded overflow-x-auto">
        <h2 className="text-xl font-semibold mb-3">Recent Expenses</h2>
        <table className="min-w-full table-auto text-left border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Description</th>
              <th className="p-2 border">Category</th>
              <th className="p-2 border">Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length > 0 ? expenses.map((exp) => (
              <tr key={exp._id} className="hover:bg-gray-50">
                <td className="p-2 border">{new Date(exp.date).toLocaleDateString()}</td>
                <td className="p-2 border">{exp.description}</td>
                <td className="p-2 border">{exp.category}</td>
                <td className="p-2 border text-red-600 font-medium">₹{parseFloat(exp.amount).toFixed(2)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">No expenses yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardPage;