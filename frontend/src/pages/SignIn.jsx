import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, googleLogin, forgotPassword } from '../api/services';
import { useAuth } from '../context/AuthContext.jsx';
import GoogleAuthButton from '../components/GoogleAuthButton.jsx';
import '../styles/auth.css';

// Modern centered sign-in card with optional logo area and helper links

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth(); //pulls the login function from the AuthContext

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState({ type: '', text: '' });
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    // Simple front-end check (replace with real auth later)
    if (!email || !password) {
      setError('Please enter correct email and password.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Call your actual backend: POST /api/users/login
      const response = await loginUser({ email, password });

      // 2. The backend returns: { userId, firstName, message }
      // We save this into our global AuthContext
      //Saving the token in localstorage which allows to persists the users session
      // localStorage.setItem('bt_token', response.data.token);
      login({
        userId: response.data.userId,
        firstName: response.data.firstName
      }, response.data.token, remember);

      // 3. Success! Move to home
      navigate('/home');
    } catch (err) {
      const message = err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
    };

  // Same login() + navigate() as the password flow — the backend already resolved
  // whether this was a new or existing account, this page doesn't need to know which.
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    try {
      const response = await googleLogin(credentialResponse.credential);
      login({
        userId: response.data.userId,
        firstName: response.data.firstName
      }, response.data.token, remember);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
    }
  };

  // Backend always responds the same way whether or not the email is registered
  // (prevents using this as a way to probe which emails exist), so we just show its message.
  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setResetMsg({ type: '', text: '' });
    setResetEmail('');
  };

  const handleForgotPasswordSubmit = async () => {
    if (!resetEmail.trim()) return;
    setIsSendingReset(true);
    setResetMsg({ type: '', text: '' });
    try {
      const res = await forgotPassword(resetEmail);
      setResetMsg({ type: 'success', text: res.data.message });
      setResetEmail('');
    } catch (err) {
      setResetMsg({ type: 'error', text: err.response?.data?.message || 'Something went wrong. Please try again.' });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-left">
          <div className="logo-placeholder">
            <img src="/logo-icon.png" alt="" className="brand-logo-icon" />
            Budget Buddy
          </div>
          <p className="lead">Track your spending, stay on budget.</p>
        </div>

        <div className="auth-right">
          <h2 className="auth-title">Sign In</h2>
          <p className="auth-subtitle">Welcome back — sign in to keep tracking your budget.</p>
          {error && <div className="auth-error">{error}</div>}

          <GoogleAuthButton
            text="signin_with"
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in failed. Please try again.')}
          />

          <div className="auth-divider"><span>or</span></div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>

            <div className="auth-row">
              <label className="remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
              </label>
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  if (showForgotPassword) {
                    closeForgotPasswordModal();
                  } else {
                    setShowForgotPassword(true);
                  }
                }}
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </button>

            <div className="auth-footer">
              <span>New user? </span><Link to="/signup" className="auth-footer-link">Create an account</Link>
            </div>
          </form>
        </div>
      </div>

      {showForgotPassword && (
        <div className="forgot-password-overlay" onClick={closeForgotPasswordModal}>
          <div className="forgot-password-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="forgot-password-modal-title">Reset your password</h3>
            <p className="auth-subtitle">Enter the email you signed up with if it's registered, we'll send a reset link</p>

            <input
              className="form-input"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="name@example.com"
              autoFocus
            />

            {resetMsg.text && (
              <div className={`auth-inline-msg auth-inline-msg--${resetMsg.type}`}>{resetMsg.text}</div>
            )}

            <div className="forgot-password-actions">
              <button
                type="button"
                className="auth-submit auth-submit--secondary"
                disabled={isSendingReset || !resetEmail.trim()}
                onClick={handleForgotPasswordSubmit}
              >
                {isSendingReset ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button type="button" className="link-btn" onClick={closeForgotPasswordModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignIn;
