import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import ExpensePage from '../pages/ExpensePage';
import '../styles/auth.css';

const overlayRoot = document.body;

const ExpenseModal = () => {
  const navigate = useNavigate();

  const close = () => navigate('/home');

  const onOverlayClick = (e) => {
    if (e.target === e.currentTarget) close();
  };

  return createPortal(
    <div className="auth-wrapper" onClick={onOverlayClick}>
      <div className="auth-dialog" style={{ width: '640px', maxWidth: '95%' }}>
        <button onClick={close} style={{ float: 'right', border: 'none', background: 'transparent', fontSize: 18 }}>✕</button>
        <ExpensePage />
      </div>
    </div>,
    overlayRoot
  );
};

export default ExpenseModal;
