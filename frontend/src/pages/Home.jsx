import React, { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { UserIcon, ReceiptIcon, ArchiveIcon, SettingsIcon, LogoutIcon } from '../components/icons/Icon';
import FloatingChatbot from '../components/FloatingChatbot.jsx';
import { getUserProfile } from '../api/services';
import '../styles/dashboard.css';
const Home = () => {
  const { logout, user } = useAuth(); // ProtectedRoute already guarantees user is set before Home renders
  const location = useLocation();

  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef(null);

  // Apply the saved Compact Mode preference globally (not just while on the Settings
  // page) — fetched once per app load since AuthContext's user object doesn't carry it.
  useEffect(() => {
    if (!user?.userId) return;
    getUserProfile(user.userId)
      .then(res => document.body.classList.toggle('compact-mode', !!res.data?.preferences?.compactMode))
      .catch(() => {});
  }, [user?.userId]);

  const initials = user && (user.firstName || user.lastName)
    ? `${(user.firstName || '').charAt(0)}${(user.lastName || '').charAt(0)}`.toUpperCase()
    : 'T';

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  // Close profile dropdown on outside click (needed since it's now click-toggled, not hover-based)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { to: '/home/dashboard', label: 'Dashboard', match: (p) => p === '/home' || p === '/home/dashboard' },
    { to: '/home/expense', label: 'Expense', match: (p) => p.includes('expense') },
    { to: '/home/budget', label: 'Budget', match: (p) => p.includes('budget') },
    { to: '/home/subscriptions', label: 'Subscriptions', match: (p) => p.includes('subscriptions') },
  ];

  return (
    <div className="app-root">
      {/* Top Navigation Bar */}
      <nav className="top-navbar">
        {/* Left: Brand */}
        <div className="nav-brand">
          <span className="nav-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="2"/>
              <line x1="4" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </span>
          <h1>BUDGET BUDDY</h1>
        </div>

        {/* Center-Left: Navigation Links (desktop) */}
        <div className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-item ${link.match(location.pathname) ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Hamburger (mobile) + User Profile */}
        <div className="nav-right">
          <button
            className="mobile-menu-toggle"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(open => !open)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>

          <div className="nav-profile" ref={profileRef}>
            <div className="profile-dropdown-wrapper">
              <button
                className="profile-circle"
                title="Account"
                onClick={() => setProfileMenuOpen(open => !open)}
              >
                {initials}
              </button>
              <div className={`profile-dropdown ${profileMenuOpen ? 'open' : ''}`}>

                <hr className="dropdown-divider" />
                <button className="dropdown-item" style={{ justifyContent: 'center' }} onClick={() => navigate('/home/profile')}>
                  <UserIcon size={16} /> Profile
                </button>
                <button className="dropdown-item" onClick={() => navigate('/home/past-expenses')}>
                <ReceiptIcon size={16} /> Past Expenses
                </button>
                <button className="dropdown-item" onClick={() => navigate('/home/receipts')}>
                <ArchiveIcon size={16} /> Receipt Vault
                </button>
                <button className="dropdown-item" onClick={() => navigate('/home/settings')}>
                <SettingsIcon size={16} /> Settings
                </button>

                <hr className="dropdown-divider" />
                <button className="dropdown-item danger" onClick={() => { logout(); navigate('/signin'); }}>
                  <LogoutIcon size={16} /> Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="main-content">
        <Outlet />
      </div>

      <FloatingChatbot />
    </div>
  );
};

export default Home;
