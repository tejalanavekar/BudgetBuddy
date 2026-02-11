import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import ExpensePage from '../pages/ExpensePage';
import '../styles/auth.css';

const overlayRoot = document.body;

const ExpenseModal = () => {
  const navigate = useNavigate();

  // Function to go back to dashboard
  const close = () => navigate('/home');

  const onOverlayClick = (e) => {
    // If the click happened on the 'auth-wrapper' background and NOT the modal box
    if (e.target.classList.contains('auth-wrapper')) {
      close();
    }
  };
  const handleBackgroundClick = (e) => {
    // This stops the click from "bubbling up" to any 
    // parent elements that might have a click listener
    e.stopPropagation();
    e.preventDefault();
    
    // We log it just to see it working in the console
    console.log("Background click ignored to protect form data.");
  };

  return createPortal(
    <div className="auth-wrapper" >
      <div className="auth-dialog expense-modal-adjustment" >
        {/* Your close button remains the ONLY way out */}
        <button className="modal-close-btn" onClick={close}>✕</button>
        <ExpensePage />
      </div>
    </div>,
    overlayRoot
  );
};

export default ExpenseModal;
