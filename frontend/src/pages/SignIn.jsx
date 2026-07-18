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
    console.log('email:', email);      // add this
    console.log('password:', password);
    console.log('loginUser is:', loginUser);
    setError('');
    setIsSubmitting(true);
    // Simple front-end check (replace with real auth later)
    if (!email || !password) {
      setError('Please enter correct email and password.');
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('Attempting login with:', { email, password });
      // 1. Call your actual backend: POST /api/users/login
      const response = await loginUser({ email, password });
      console.log('LoginUser promise resolved:', response);
      console.log('Full response data:', response.data);
      console.log('Token from response:', response.data.token);

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
      console.log('LoginUser promise rejected:', err);
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
  const handleForgotPasswordSubmit = async () => {
    if (!resetEmail.trim()) return;
    setIsSendingReset(true);
    setResetMsg({ type: '', text: '' });
    try {
      const res = await forgotPassword(resetEmail);
      setResetMsg({ type: 'success', text: res.data.message });
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
                  setShowForgotPassword(open => !open);
                  setResetMsg({ type: '', text: '' });
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
        <div className="forgot-password-overlay" onClick={() => setShowForgotPassword(false)}>
          <div className="forgot-password-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="forgot-password-modal-title">Reset your password</h3>
            <p className="auth-subtitle">Enter your email to get a reset link</p>

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
              <button type="button" className="link-btn" onClick={() => setShowForgotPassword(false)}>
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
