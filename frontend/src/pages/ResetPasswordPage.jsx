import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../api/services';
import '../styles/auth.css';

// Destination of the link emailed by the forgot-password flow — /reset-password/:token
const ResetPasswordPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await resetPassword(token, newPassword);
      setDone(true);
      setTimeout(() => navigate('/signin'), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'This link is invalid or has expired.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-right" style={{ width: '100%' }}>
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">Choose a new password for your account.</p>

          {done ? (
            <div className="auth-inline-msg auth-inline-msg--success">
              Password reset successfully — redirecting you to Sign In...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                />
              </div>

              {message.text && (
                <div className={`auth-inline-msg auth-inline-msg--${message.type}`}>{message.text}</div>
              )}

              <button type="submit" className="auth-submit" disabled={isSubmitting}>
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>

              <div className="auth-footer">
                <Link to="/signin" className="auth-footer-link">Back to Sign In</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
