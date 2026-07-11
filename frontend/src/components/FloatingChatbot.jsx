import React, { useState } from 'react';
import BudgetAI from './BudgetAI.jsx';
import { BotIcon, ChatIcon, WalletIcon, CloseIcon } from './icons/Icon';
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
        <span className="chat-icon"><BotIcon size={26} /></span>
        {!isOpen && <span className="chat-badge"><ChatIcon size={14} /></span>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="floating-chat-window">
          <div className="chat-window-header">
            <h3><WalletIcon size={18} /> Budget AI Assistant</h3>
            <button
              className="close-btn"
              onClick={() => setIsOpen(false)}
              title="Close chat"
            >
              <CloseIcon size={16} />
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
