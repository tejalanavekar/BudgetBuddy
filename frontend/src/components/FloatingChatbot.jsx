import React, { useState } from 'react';
import BudgetAI from './BudgetAI.jsx';
import '../styles/floatingChatbot.css';

const FloatingChatbot = ({ userId, monthYear }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!userId || !monthYear) return null;

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className={`floating-chat-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Budget AI Assistant"
      >
        <span className="chat-icon">🤖</span>
        {!isOpen && <span className="chat-badge">💬</span>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="floating-chat-window">
          <div className="chat-window-header">
            <h3>💰 Budget AI Assistant</h3>
            <button
              className="close-btn"
              onClick={() => setIsOpen(false)}
              title="Close chat"
            >
              ✕
            </button>
          </div>
          <div className="chat-window-body">
            <BudgetAI userId={userId} monthYear={monthYear} />
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChatbot;
