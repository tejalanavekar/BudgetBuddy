import React from 'react';
import { Link, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import '../styles/home.css';

const Home = () => {
  const auth = localStorage.getItem('bt_auth') === 'true' || sessionStorage.getItem('bt_auth') === 'true';
  const location = useLocation();
  
  const navigate = useNavigate();

  // load user from localStorage if available
  const raw = localStorage.getItem('bt_user');
  const user = raw ? JSON.parse(raw) : null;
  const initials = user && (user.firstName || user.lastName)
    ? `${(user.firstName || '').charAt(0)}${(user.lastName || '').charAt(0)}`.toUpperCase()
    : 'T';

  if (!auth) return <Navigate to="/signin" replace />;

  return (
    <div className="app-root">
      {/* Top Navigation Bar */}
      <nav className="top-navbar">
        {/* Left: Brand */}
        <div className="nav-brand">
          <h1>BUDGET BUDDY</h1>
        </div>

        {/* Center-Left: Navigation Links */}
        <div className="nav-links">
          <Link 
            to="/home/dashboard"   
            className={`nav-item ${location.pathname === '/home' || location.pathname === '/home/dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/home/expense" 
            className={`nav-item ${location.pathname.includes('expense') ? 'active' : ''}`}
          >
            Expense
          </Link>
          <Link 
            to="/home/receipts" 
            className={`nav-item ${location.pathname.includes('receipts') ? 'active' : ''}`}
          >
            Receipts
          </Link>
          <Link 
            to="/home/subscriptions" 
            className={`nav-item ${location.pathname.includes('subscriptions') ? 'active' : ''}`}
          >
            Subscriptions
          </Link>
        </div>

        {/* Right: User Profile */}
        <div className="nav-profile">
          <div
            className="profile-circle"
            onClick={() => navigate('/profile')}
            title="Account Details"
          >
            {initials}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default Home;