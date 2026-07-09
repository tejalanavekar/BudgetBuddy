import React, { useState } from 'react';
import {registerUser} from '../api/services';
import { useAuth  } from '../context/AuthContext.jsx'; 
import { useNavigate , Link } from 'react-router-dom';
import '../styles/auth.css';

const SignUp = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth(); //pulls the login function from the AuthContext
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await registerUser(formData);
      login({ userId: res.data.userId, firstName: res.data.firstName }, res.data.token);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Server error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ 
        ...formData, 
        [e.target.name]: e.target.value 
    });
};

  return (
    <div className="auth-wrapper single-col">
      {/* Brand Header */}
      <div className="brand-header">
        <h3 className="brand-logo">
          <span className="brand-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="5" width="16" height="14" rx="2.5" stroke="white" strokeWidth="2"/>
              <line x1="4" y1="10" x2="20" y2="10" stroke="white" strokeWidth="2"/>
            </svg>
          </span>
          Budget Buddy
        </h3>
        <h2 className="brand-greeting">Hi there! Let's get you started.</h2>
        <p className="brand-subtext">Introduce Yourself!</p>
      </div>

      {/* Main Detail Card */}
      <div className="auth-card-simple">
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">My name is</label>
            <div className="form-row">
              <input name="firstName" placeholder="First name" className="form-input" value = {formData.firstName}onChange={handleChange} required />
              <input name="lastName" placeholder="Last name" className="form-input" onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Here's my email address:</label>
            <input name="email" type="email" className="form-input" onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">And here's my phone:</label>
            <input name="phone" className="form-input" onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">And here's my password:</label>
            <input name="password" type="password" className="form-input" onChange={handleChange} required />
          </div>

          <button type="submit" className="auth-submit-alt" disabled={loading}>
            {loading ? 'Verifying...' : 'Sign me up!'}
          </button>

          <div className="divider"><span>or</span></div>

          <button type="button" className="google-btn">
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Reference_Logo.svg" alt="G" />
            Sign up with Google
          </button>

          <div className="auth-footer">
            Already a member? <Link to="/signin" className="auth-footer-link">Log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
