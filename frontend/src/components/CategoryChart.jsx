import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const CategoryChart = ({ expenses = [] }) => {
  
  // 1. Define your colors in one place mapped to category names
  const categoryColors = {
    Food: '#FF6384',          // Red/Pink
    Transport: '#36A2EB',     // Blue
    Entertainment: '#FFCE56', // Yellow
    Utilities: '#4BC0C0',     // Teal
    Other: '#9966FF',         // Purple
    
    // --- NEW CATEGORIES ---
    Health: '#ef4444',        // Red
    Education: '#6366f1',     // Indigo
    Shopping: '#ec4899',      // Pink
    Travel: '#f97316',        // Orange
    Savings: '#10b981',       // Green
  };

  const data = useMemo(() => {
    // initialize totals for ALL categories to 0
    const totals = {};
    Object.keys(categoryColors).forEach(cat => totals[cat] = 0);

    // Sum up expenses
    expenses.forEach((e) => {
      // Capitalize first letter just in case (e.g. "food" -> "Food")
      let cat = e.category || 'Other';
      cat = cat.charAt(0).toUpperCase() + cat.slice(1);

      const amount = parseFloat(e.amount) || 0;
      
      if (totals[cat] !== undefined) {
        totals[cat] += amount;
      } else {
        totals['Other'] += amount;
      }
    });

    // Remove categories with 0 spend so the chart looks clean
    const activeCategories = Object.keys(totals).filter(cat => totals[cat] > 0);
    const activeData = activeCategories.map(cat => totals[cat]);
    const activeColors = activeCategories.map(cat => categoryColors[cat]);

    return {
      labels: activeCategories,
      datasets: [
        {
          data: activeData,
          backgroundColor: activeColors,
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 4
        }
      ]
    };
  }, [expenses]);

  // 2. Configuration for LARGER TEXT
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right', // Moves legend to the side
        labels: {
          font: {
            size: 14,      // <--- THIS MAKES TEXT LARGER
            family: "'Inter', sans-serif",
            weight: '600'
          },
          padding: 20,
          usePointStyle: true, // Makes the color box a circle
          color: '#334155'
        }
      },
      tooltip: {
        bodyFont: { size: 14 },
        titleFont: { size: 16 }
      }
    },
    cutout: '70%', // Makes the ring thinner/modern
  };

  return (
    // Increased height to 300px for better visibility
    <div style={{ height: '300px', width: '100%', position: 'relative' }}>
      <Doughnut data={data} options={options} />
    </div>
  );
};

export default CategoryChart;