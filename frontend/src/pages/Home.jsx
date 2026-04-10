import React from 'react';
import { Link, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/dashboard.css'; 
const Home = () => {
  const { logout } = useAuth();
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
            to="/home/budget" 
            className={`nav-item ${location.pathname.includes('budget') ? 'active' : ''}`}
          >
            Budget
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
  <div className="profile-dropdown-wrapper">
    <div className="profile-circle" title="Account">
      {initials}
    </div>
    <div className="profile-dropdown">
    
      <hr className="dropdown-divider" />
      <button className="dropdown-item" style={{ justifyContent: 'center' }} onClick={() => navigate('/profile')}>
        👤 Profile
      </button>
      <button className="dropdown-item" onClick={() => navigate('/home/past-expenses')}>
      🧾 Past Expenses
      </button>
      <button className="dropdown-item" onClick={() => navigate('/home/receipts')}>
      🗄️ Receipt Vault
      </button>
      
      <hr className="dropdown-divider" />
      <button className="dropdown-item danger" onClick={() => { logout(); navigate('/signin'); }}>
        🚪 Sign Out
      </button>
    </div>
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