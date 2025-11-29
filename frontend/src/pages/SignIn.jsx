import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/auth.css';

// Modern centered sign-in card with optional logo area and helper links

const SignIn = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simple front-end check (replace with real auth later)
    if (!username || !password) {
      setError('Please enter correct username and password.');
      return;
    }

    // Simulate successful sign in
    const user = { username };
    if (remember) {
      localStorage.setItem('bt_user', JSON.stringify(user));
      localStorage.setItem('bt_auth', 'true');
    } else {
      sessionStorage.setItem('bt_user', JSON.stringify(user));
      sessionStorage.setItem('bt_auth', 'true');
    }

    navigate('/home');
  };

  const handleForgot = (e) => {
    e.preventDefault();
    setError('Password reset not implemented in this demo.');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-left">
          <div className="logo-placeholder">Budget Buddy</div>
          <p className="lead">Track your spending, stay on budget.</p>
        </div>

        <div className="auth-right">
          <h2 className="auth-title">Sign In</h2>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Username or Email</label>
              <input
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="name@example.com"
                autoFocus
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
              <button className="link-btn" onClick={handleForgot}>Forgot password?</button>
            </div>

            <button type="submit" className="auth-submit">Sign In</button>

            <div className="auth-footer">
              <span>New user? </span><Link to="/signup">Create an account</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
