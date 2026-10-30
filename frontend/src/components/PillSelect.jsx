import React, { useState, useRef, useEffect, useId } from 'react';
import '../styles/pillSelect.css';

// A custom dropdown used in place of a native <select> for the dark "pill" pickers
// (month/year/category) across the app. Native <select> menus are positioned entirely
// by the browser/OS — on some mobile browsers that means the options list renders as a
// centered overlay on top of the trigger instead of opening below it, hiding which
// control it belongs to. This renders its own menu, so it's always anchored directly
// under the button that opened it, with its own keyboard navigation (arrow keys move a
// roving highlight, Enter selects, Escape/outside-click closes).
//
// options: [{ value, label, disabled? }]
const PillSelect = ({ value, onChange, options, className = '', ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);
  const idPrefix = useId();

  const selectedIndex = options.findIndex(o => String(o.value) === String(value));
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const firstEnabledIndex = () => options.findIndex(o => !o.disabled);

  const openMenu = () => {
    setActiveIndex(selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : firstEnabledIndex());
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Keep the active option in view — notably so opening the year list scrolls the
  // already-selected year into view instead of always starting at the top.
  useEffect(() => {
    if (open && activeIndex >= 0) {
      // jsdom (tests) doesn't implement scrollIntoView at all.
      optionRefs.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  // Focus the listbox itself when it opens, so arrow keys/Enter/Escape work
  // immediately without a separate click or tab press.
  useEffect(() => {
    if (open) menuRef.current?.focus();
  }, [open]);

  const moveActive = (delta) => {
    setActiveIndex((current) => {
      const count = options.length;
      let next = current;
      for (let i = 0; i < count; i++) {
        next = (next + delta + count) % count;
        if (!options[next].disabled) return next;
      }
      return current;
    });
  };

  const selectIndex = (index) => {
    const opt = options[index];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  };

  const handleTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) openMenu();
    }
  };

  const handleMenuKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(firstEnabledIndex());
        break;
      case 'End': {
        e.preventDefault();
        const lastEnabled = [...options].map((o, i) => i).reverse().find(i => !options[i].disabled);
        if (lastEnabled !== undefined) setActiveIndex(lastEnabled);
        break;
      }
      case 'Enter':
        e.preventDefault();
        selectIndex(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="pill-select-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`pill-select-trigger ${className}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
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
        <ul
          className="pill-select-menu"
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={activeIndex >= 0 ? `${idPrefix}-opt-${activeIndex}` : undefined}
          onKeyDown={handleMenuKeyDown}
          ref={menuRef}
        >
          {options.map((opt, index) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <li key={opt.value} role="presentation">
                <button
                  id={`${idPrefix}-opt-${index}`}
                  type="button"
                  role="option"
                  ref={(el) => { optionRefs.current[index] = el; }}
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled || undefined}
                  disabled={opt.disabled}
                  className={[
                    'pill-select-option',
                    isSelected ? 'pill-select-option--selected' : '',
                    index === activeIndex ? 'pill-select-option--active' : '',
                    opt.disabled ? 'pill-select-option--disabled' : ''
                  ].filter(Boolean).join(' ')}
                  onMouseEnter={() => !opt.disabled && setActiveIndex(index)}
                  onClick={() => selectIndex(index)}
                >
                  {isSelected && <span className="pill-select-check">✓</span>}
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default PillSelect;
