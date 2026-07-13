import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import BudgetAI from './BudgetAI.jsx';
import { BotIcon, ChatIcon, WalletIcon, CloseIcon } from './icons/Icon';
import '../styles/floatingChatbot.css';

const PAGE_LABELS = {
  '/home': 'Dashboard',
  '/home/dashboard': 'Dashboard',
  '/home/expense': 'Expense',
  '/home/past-expenses': 'Past Expenses',
  '/home/receipts': 'Receipt Vault',
  '/home/budget': 'Budget',
  '/home/subscriptions': 'Subscriptions',
  '/home/profile': 'Profile',
  '/home/settings': 'Settings'
};

const getCurrentMonthYear = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Mounted once in Home.jsx, so it persists across every page instead of being
// re-created (and losing its "have I greeted this session" state) on navigation.
const FloatingChatbot = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  // Owned here (not in BudgetAI) so the conversation survives closing/reopening the
  // bubble — BudgetAI can mount/unmount freely without losing the chat history.
  const [messages, setMessages] = useState([]);

  // Auto-open once per login session, only from the Dashboard — not on every
  // page visit, and not more than once even if the user comes back to Dashboard later.
  useEffect(() => {
    const isDashboard = location.pathname === '/home' || location.pathname === '/home/dashboard';
    const alreadyGreeted = sessionStorage.getItem('bt_ai_greeted');
    if (isDashboard && !alreadyGreeted) {
      setIsOpen(true);
      sessionStorage.setItem('bt_ai_greeted', '1');
    }
  }, [location.pathname]);

  if (!user?.userId) return null;

  const page = PAGE_LABELS[location.pathname] || 'app';

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className={`floating-chat-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Budget Buddy Assistant"
      >
        <span className="chat-icon"><BotIcon size={26} /></span>
        {!isOpen && <span className="chat-badge"><ChatIcon size={14} /></span>}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="floating-chat-window">
          <div className="chat-window-header">
            <h3><WalletIcon size={18} /> Budget Buddy Assistant</h3>
            <button
              className="close-btn"
              onClick={() => setIsOpen(false)}
              title="Close chat"
            >
              <CloseIcon size={16} />
            </button>
          </div>
          <div className="chat-window-body">
            <BudgetAI
              userId={user.userId}
              monthYear={getCurrentMonthYear()}
              firstName={user.firstName}
              page={page}
              messages={messages}
              setMessages={setMessages}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChatbot;
