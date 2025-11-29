import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/auth.css';

const SignUp = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!firstName || !lastName || !phone || !email || !password) {
      setError('Please fill all fields.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone, email, password })
      });

      const data = await res.json();
      if (res.ok) {
        // Auto-login: store auth and user (include phone)
        const user = { firstName, lastName, email, phone };
        localStorage.setItem('bt_user', JSON.stringify(user));
        localStorage.setItem('bt_auth', 'true');
        navigate('/home');
      } else {
        setError(data.message || 'Registration failed');
      }
    // eslint-disable-next-line no-unused-vars
    } catch (err) {
      setError('Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-dialog">
        <h2 className="auth-title">Create Account</h2>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="form-label">First Name</label>
          <input className="form-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />

          <label className="form-label">Last Name</label>
          <input className="form-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />

          <label className="form-label">Phone</label>
          <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />

          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <button type="submit" className="auth-submit">{loading ? 'Creating...' : 'Create Account'}</button>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
