import React, { useState, useRef, useEffect } from 'react';
import { chatWithAssistant } from '../api/services/aiService';
import { getBudgetSummary, setBudget } from '../api/services/budgetService';
import { updateSubscription } from '../api/services/subscriptionService';
import { WalletIcon, WarningIcon, UserIcon, CloseIcon, BotIcon, TrendingUpIcon, ChartIcon, ShoppingBagIcon, RefreshIcon, CheckIcon } from '../components/icons/Icon';
import { SUBSCRIPTIONS_CHANGED, BUDGET_CHANGED, emitDataChanged } from '../utils/dataEvents';
import '../styles/budgetAI.css';

const BudgetAI = ({ userId, monthYear, firstName, page, messages, setMessages }) => {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState(null);
  const messagesEndRef = useRef(null);

  // Scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Seed the welcome message only the first time this session — messages live in the
  // parent (FloatingChatbot) now, so reopening the chat keeps whatever conversation was there.
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          type: 'ai',
          text: `Hi ${firstName || 'there'}, want a quick breakdown on your budget, or ask me anything?`,
          timestamp: new Date()
        }
      ]);
    }
  }, [userId, firstName]);

  // Handle sending message — accepts an optional override so a suggestion chip can
  // fire the send itself (skipping the input box) instead of just prefilling it.
  const handleSendMessage = async (textOverride) => {
    const textToSend = textOverride ?? inputValue;
    if (!textToSend.trim()) return;

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setError(null);

    // Last few turns, for follow-up context ("what about last month?")
    const history = messages
      .filter(m => m.type === 'user' || m.type === 'ai')
      .slice(-6)
      .map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', content: m.text }));

    try {
      const response = await chatWithAssistant(userId, userMessage.text, history, page);

      if (response.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          text: response.message,
          timestamp: response.timestamp ? new Date(response.timestamp) : new Date(),
          proposedAction: response.proposedAction || null,
          actionResolved: false
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        setError(response.message || 'Failed to get response');
      }
    } catch (err) {
      setError(err.message || 'Failed to process your question');
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        text: `Sorry, I encountered an error: ${err.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Handle getting summary
  const handleGetSummary = async () => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      text: 'Give me a summary of my budget',
      timestamp: new Date()
    }]);
    setLoading(true);
    setError(null);

    try {
      const response = await getBudgetSummary(userId, monthYear);

      if (response.success) {
        setSummary(response.summary);
        setShowSummary(true);

        const summaryMessage = {
          id: Date.now(),
          type: 'ai',
          text: `📊 **Budget Summary**\n\n${response.summary}`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, summaryMessage]);
      } else {
        setError('Failed to generate summary');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          text: `You haven't set a budget for this month yet, so I don't have anything to summarize. Head to "Manage Budget" to set your total (and category) budget, then ask me again!`,
          timestamp: new Date()
        }]);
      } else {
        setError(err.response?.data?.error || err.response?.data?.message || 'Failed to generate summary');
      }
    } finally {
      setLoading(false);
    }
  };

  // The only place a subscription or budget actually gets changed — a real click, going
  // straight to the existing update endpoints. The AI never gets to trigger this itself.
  const handleConfirmAction = async (messageId, action) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, actionResolved: true } : m));
    try {
      if (action.type === 'budget_update') {
        await setBudget(userId, action.monthYear, action.totalMonthlyBudget, action.categoryBudgets);
        emitDataChanged(BUDGET_CHANGED);
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          text: `Done — your budget for ${action.monthYear} is now set to $${action.totalMonthlyBudget}.`,
          timestamp: new Date()
        }]);
      } else {
        await updateSubscription(action.subscriptionId, { status: action.proposedStatus });
        emitDataChanged(SUBSCRIPTIONS_CHANGED);
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          text: `Done — ${action.name} is now ${action.proposedStatus}.`,
          timestamp: new Date()
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        text: `Couldn't make that change: ${err.message}`,
        timestamp: new Date()
      }]);
    }
  };

  const handleDismissAction = (messageId) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, actionResolved: true } : m));
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="budget-ai-container">
      <div className="budget-ai-header">
        <div className="header-content">
          <h2><WalletIcon /> Budget AI</h2>
          <span className="badge">Powered by LangChain</span>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon"><WarningIcon size={16} /></span>
          <span>{error}</span>
          <button className="error-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="budget-ai-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.type}`}>
            <div className="message-avatar">
              {message.type === 'user' ? <UserIcon size={18} /> : message.type === 'error' ? <CloseIcon size={18} /> : <BotIcon size={18} />}
            </div>
            <div className="message-content">
              <p className="message-text">
                {message.text.split('\n').map((line, idx, lines) => (
                  <span key={idx}>
                    {line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1')}
                    {idx < lines.length - 1 && <br />}
                  </span>
                ))}
              </p>
              <span className="message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {message.proposedAction && !message.actionResolved && (
                <div className="action-confirm-row">
                  {message.proposedAction.type === 'budget_update' ? (
                    <>
                      <span className="action-confirm-label">
                        {message.proposedAction.monthYear} budget: {message.proposedAction.isUpdate ? `$${message.proposedAction.previousTotal} → ` : ''}${message.proposedAction.totalMonthlyBudget}
                      </span>
                      {message.proposedAction.categoryBudgets?.length > 0 && (
                        <span className="action-confirm-note" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          {message.proposedAction.categoryBudgets.map(c => `${c.category}: $${c.amount}`).join(' · ')}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="action-confirm-label">
                        {message.proposedAction.name}: {message.proposedAction.currentStatus} → {message.proposedAction.proposedStatus}
                      </span>
                      {message.proposedAction.proposedStatus !== 'Active' && (
                        <span className="action-confirm-note">
                          This only updates your tracking in Budget Buddy — it won't cancel or pause anything with {message.proposedAction.name} itself. Be sure to also cancel directly on their site/app if you don't want to keep being charged.
                        </span>
                      )}
                    </>
                  )}
                  <div className="action-confirm-buttons">
                    <button className="action-confirm-btn" onClick={() => handleConfirmAction(message.id, message.proposedAction)}>
                      <CheckIcon size={13} /> Confirm
                    </button>
                    <button className="action-cancel-btn" onClick={() => handleDismissAction(message.id)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message message-loading">
            <div className="message-avatar"><BotIcon size={18} /></div>
            <div className="message-content">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="budget-ai-suggestions">
        <div className="suggestions-label">Quick Suggestions:</div>
        <div className="suggestion-buttons">
          <button
            className="suggestion-btn"
            onClick={() => handleSendMessage('How much more can I spend this month?')}
            disabled={loading}
          >
            <WalletIcon size={14} /> Budget Check
          </button>
          <button
            className="suggestion-btn"
            onClick={() => handleSendMessage('What are my spending trends?')}
            disabled={loading}
          >
            <TrendingUpIcon size={14} /> Trends
          </button>
          <button
            className="suggestion-btn"
            onClick={handleGetSummary}
            disabled={loading}
          >
            <ChartIcon size={14} /> Summary
          </button>
          <button
            className="suggestion-btn"
            onClick={() => handleSendMessage('How am I doing against my category budgets — any I should watch?')}
            disabled={loading}
          >
            <ShoppingBagIcon size={14} /> Check Budget
          </button>
          <button
            className="suggestion-btn"
            onClick={() => handleSendMessage('What subscriptions do I have, and which should I consider cancelling?')}
            disabled={loading}
          >
            <RefreshIcon size={14} /> Subscriptions
          </button>
        </div>
      </div>

      <div className="budget-ai-input-area">
        <textarea
          className="budget-ai-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask about your budget, spending, or get recommendations... (Shift+Enter for new line)"
          maxLength={500}
          rows="2"
        />
        <div className="input-footer">
          <span className="char-count">{inputValue.length}/500</span>
          <button
            className="send-button"
            onClick={() => handleSendMessage()}
            disabled={loading || !inputValue.trim()}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetAI;
