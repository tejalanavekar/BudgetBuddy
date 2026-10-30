import React from 'react';
import PillSelect from './PillSelect.jsx';
import { MONTH_NAMES, toISO, fromISO, getYearOptions, isMonthDisabled, clampSelection } from '../utils/monthYearSelect.js';
import '../styles/monthYearSelect.css';

// Replaces the old single "October 2026" dropdown with a Month dropdown + Year
// dropdown side by side. value/onChange still speak the same "YYYY-MM" string the
// rest of the app already uses — this is purely a UI change.
const MonthYearSelect = ({ value, onChange, now = new Date() }) => {
  const { year, month } = fromISO(value);

  const monthOptions = MONTH_NAMES.map((name, i) => {
    const m = i + 1;
    return { value: m, label: name, disabled: isMonthDisabled(year, m, now) };
  });

  const yearOptions = getYearOptions(now).map(y => ({ value: y, label: String(y) }));

  const handleMonthChange = (newMonth) => {
    onChange(toISO(year, Number(newMonth)));
  };

  const handleYearChange = (newYear) => {
    // Switching to the current year while a future month is selected snaps the
    // month back to the current one, instead of leaving an impossible future date selected.
    const clamped = clampSelection(Number(newYear), month, now);
    onChange(toISO(clamped.year, clamped.month));
  };

  return (
    <div className="month-year-select-row">
      <PillSelect
        className="my-select-pill my-select-pill--month"
        value={month}
        onChange={handleMonthChange}
        options={monthOptions}
        ariaLabel="Select month"
      />
      <PillSelect
        className="my-select-pill my-select-pill--year"
        value={year}
        onChange={handleYearChange}
        options={yearOptions}
        ariaLabel="Select year"
      />
    </div>
  );
};

export default MonthYearSelect;
