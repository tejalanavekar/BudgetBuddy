import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/axiosInstance.js';
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
    setError('');
    setIsSubmitting(true);
    // Simple front-end check (replace with real auth later)
    if (!email || !password) {
      setError('Please enter correct email and password.');
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('Attempting login to:', API.defaults.baseURL + '/users/login');
            // 1. Call your actual backend: POST /api/users/login
            const response = await API.post('/users/login', {
                email,
                password
            });
            console.log('Full response data:', response.data);
            console.log('Token from response:', response.data.token);

            // 2. The backend returns: { userId, firstName, message }
            // We save this into our global AuthContext
            //Saving the token in localstorage which allows to persists the users session
            // localStorage.setItem('bt_token', response.data.token);
            login({
                userId: response.data.userId,
                firstName: response.data.firstName
            }, response.data.token);

            // 3. Success! Move to home
            navigate('/home');
        } catch (err) {
        // ← REPLACE your current catch with this:
        console.error("1. Error name:", err.name);
        console.error("2. Error message:", err.message);
        console.error("3. Error code:", err.code);
        console.error("4. Has response?", !!err.response);
        console.error("5. Has request?", !!err.request);
        console.error("6. Response data:", err.response?.data);
        console.error("7. Response status:", err.response?.status);
        console.error("8. Config URL:", err.config?.url);
        console.error("9. Config baseURL:", err.config?.baseURL);

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
          <div className="logo-placeholder">Budget Buddy</div>
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
              <span>New user? </span><Link to="/signup">Create an account</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
