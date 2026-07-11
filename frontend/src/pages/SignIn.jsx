import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api/services'; 
import { useAuth } from '../context/AuthContext.jsx'; 
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

    

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-left">
          <div className="logo-placeholder">
            <span className="brand-logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="2"/>
                <line x1="4" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </span>
            Budget Buddy
          </div>
          <p className="lead">Track your spending, stay on budget.</p>
        </div>

        <div className="auth-right">
          <h2 className="auth-title">Sign In</h2>
          {error && <div className="auth-error">{error}</div>}
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
              onClick={() => alert("Password reset functionality coming soon!")}
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
    </div>
  );
};

export default SignIn;
