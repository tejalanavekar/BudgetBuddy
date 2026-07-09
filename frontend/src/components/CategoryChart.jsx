import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { CATEGORY_COLOR as categoryColors } from '../constants/categoryMeta';

ChartJS.register(ArcElement, Tooltip, Legend);

const CategoryChart = ({ expenses = [] }) => {

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
          color: '#ffffff'
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