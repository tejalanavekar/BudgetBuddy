import React, { useState, useRef, useEffect } from 'react';
import '../styles/pillSelect.css';

// A custom dropdown used in place of a native <select> for the dark "pill" pickers
// (month/year/category) across the app. Native <select> menus are positioned entirely
// by the browser/OS — on some mobile browsers that means the options list renders as a
// centered overlay on top of the trigger instead of opening below it, hiding which
// control it belongs to. This renders its own menu, so it's always anchored directly
// under the button that opened it.
//
// options: [{ value, label }]
const PillSelect = ({ value, onChange, options, className = '', ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const selected = options.find(o => String(o.value) === String(value));

  return (
    <div className="pill-select-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`pill-select-trigger ${className}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="pill-select-label">{selected ? selected.label : ''}</span>
        <svg
          className={`pill-select-chevron ${open ? 'pill-select-chevron--open' : ''}`}
          width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"
        >
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul className="pill-select-menu" role="listbox">
          {options.map(opt => (
            <li key={opt.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={String(opt.value) === String(value)}
                className={`pill-select-option ${String(opt.value) === String(value) ? 'pill-select-option--selected' : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                {String(opt.value) === String(value) && <span className="pill-select-check">✓</span>}
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PillSelect;
