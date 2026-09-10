import React, { useState } from 'react';
import { registerUser, googleLogin } from '../api/services';
import { useAuth  } from '../context/AuthContext.jsx';
import { useNavigate , Link } from 'react-router-dom';
import GoogleAuthButton from '../components/GoogleAuthButton.jsx';
import '../styles/auth.css';

const SignUp = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
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

  // Same endpoint as SignIn's Google button — a brand-new email creates the account
  // right here, so this one call is genuinely the "sign up" path when the email is new.
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    try {
      const res = await googleLogin(credentialResponse.credential);
      login({ userId: res.data.userId, firstName: res.data.firstName }, res.data.token);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
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
          <img src="/logo-icon-dark.png" alt="" className="brand-logo-icon" />
          Budget Buddy
        </h3>
        <h2 className="brand-greeting">Hi there! Let's get you started.</h2>
        <p className="brand-subtext">Introduce Yourself!</p>
      </div>

      {/* Main Detail Card */}
      <div className="auth-card-simple">
        {error && <div className="auth-error">{error}</div>}

        <GoogleAuthButton
          text="signup_with"
          onSuccess={handleGoogleSuccess}
          onError={() => setError('Google sign-in failed. Please try again.')}
        />

        <div className="auth-divider"><span>or</span></div>

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
            <label className="form-label">And here's my password:</label>
            <input name="password" type="password" className="form-input" onChange={handleChange} required />
          </div>

          <button type="submit" className="auth-submit-alt" disabled={loading}>
            {loading ? 'Verifying...' : 'Sign me up!'}
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
