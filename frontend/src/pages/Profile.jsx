import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/home.css';

const Profile = () => {
  const navigate = useNavigate();
  const raw = localStorage.getItem('bt_user');
  const user = raw ? JSON.parse(raw) : null;

  if (!user) {
    return (
      <div className="profile-page card-box">
        <p>No user data found. Please sign in.</p>
        <button className="btn btn-secondary" onClick={() => navigate('/signin')}>Sign In</button>
      </div>
    );
  }

  return (
    <div className="profile-page card-box">
      <h2>Account Details</h2>
      <div style={{marginTop:12}}>
        <div><strong>Name:</strong> {user.firstName} {user.lastName}</div>
        <div style={{marginTop:6}}><strong>Phone:</strong> {user.phone || '—'}</div>
        <div style={{marginTop:6}}><strong>Email:</strong> {user.email}</div>
      </div>
      <div style={{marginTop:16}}>
        <button className="btn btn-primary" onClick={() => navigate('/home')}>Back</button>
      </div>
    </div>
  );
};

export default Profile;
