import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'];

const CategoryChart = ({ expenses = [] }) => {
  const data = useMemo(() => {
    const totals = { Food: 0, Transport: 0, Entertainment: 0, Utilities: 0, Other: 0 };
    expenses.forEach((e) => {
      const cat = e.category || 'Other';
      const amount = parseFloat(e.amount) || 0;
      if (totals[cat] !== undefined) totals[cat] += amount;
      else totals.Other += amount;
    });

    return {
      labels: CATEGORIES,
      datasets: [
        {
          data: CATEGORIES.map((c) => totals[c]),
          backgroundColor: ['#ff6384', '#36a2eb', '#ffcd56', '#4bc0c0', '#9b59b6'],
          hoverBackgroundColor: ['#ff6b8a', '#3fb0ff', '#ffd84f', '#5ad0c8', '#a875c9']
        }
      ]
    };
  }, [expenses]);

  return (
    <div style={{ maxWidth: 380, margin: '0 auto' }}>
      <Doughnut data={data} />
    </div>
  );
};

export default CategoryChart;
