import React, { useState, useRef, useEffect } from 'react';
import { chatWithBudgetAI, getBudgetSummary } from '../api/services/budgetService';
import '../styles/budgetAI.css';

const BudgetAI = ({ userId, monthYear }) => {
  const [messages, setMessages] = useState([]);
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

  // Initialize with welcome message
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        type: 'ai',
        text: 'Hello! 👋 I\'m Budget Buddy AI. I can help you analyze your spending, answer questions about your budget, and provide personalized recommendations. Ask me anything like "How much more can I spend?" or "What\'s my spending trend?"',
        timestamp: new Date()
      }
    ]);
  }, [userId]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);
    setError(null);

    try {
      const response = await chatWithBudgetAI(userId, inputValue, monthYear);

      if (response.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          text: response.message || response.summary || 'I understood your question, but I need a budget set for this month to provide detailed analysis.',
          timestamp: response.timestamp || new Date()
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
        text: `Sorry, I encountered an error: ${err.message}. Make sure you have set a budget for this month.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Handle getting summary
  const handleGetSummary = async () => {
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
      setError(err.message || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
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
          <h2>💰 Budget AI</h2>
          <span className="badge">Powered by LangChain</span>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button className="error-close" onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="budget-ai-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.type}`}>
            <div className="message-avatar">
              {message.type === 'user' ? '👤' : message.type === 'error' ? '❌' : '🤖'}
            </div>
            <div className="message-content">
              <p className="message-text">
                {message.text.includes('**') 
                  ? message.text.split('\n').map((line, idx) => (
                      <span key={idx}>
                        {line.replace(/\*\*/g, '')}
                        {idx < message.text.split('\n').length - 1 && <br />}
                      </span>
                    ))
                  : message.text
                }
              </p>
              <span className="message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="message message-loading">
            <div className="message-avatar">🤖</div>
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
            onClick={() => {
              setInputValue('How much more can I spend this month?');
            }}
          >
            💰 Budget Check
          </button>
          <button 
            className="suggestion-btn"
            onClick={() => {
              setInputValue('What are my spending trends?');
            }}
          >
            📈 Trends
          </button>
          <button 
            className="suggestion-btn"
            onClick={handleGetSummary}
            disabled={loading}
          >
            📊 Summary
          </button>
          <button 
            className="suggestion-btn"
            onClick={() => {
              setInputValue('Can I afford to spend $X this shopping category?');
            }}
          >
            🛍️ Check Budget
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
          rows="3"
        />
        <div className="input-footer">
          <span className="char-count">{inputValue.length}/500</span>
          <button 
            className="send-button"
            onClick={handleSendMessage}
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
