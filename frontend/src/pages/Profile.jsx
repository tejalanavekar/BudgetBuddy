import React, {useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth }  from '../context/AuthContext';
import { getUserProfile , getExpenses } from '../api/services';
import { CategoryIcon, WalletIcon, ReceiptIcon, TrophyIcon, HourglassIcon, WarningIcon, ChartIcon, LogoutIcon } from '../components/icons/Icon';
import '../styles/profile.css';

const Profile = () => {

  const {user , logout} = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile]               = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError]     = useState('');
  const [expenses, setExpenses]             = useState([]);

  //Taking the first letter from the firstname and first from the lastname
  const initials = profile
    ? `${(profile.firstName || '').charAt(0)}${(profile.lastName || '').charAt(0)}`.toUpperCase()
    : '?';
  const fullName = profile
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
    : 'User';

  // Fetch full profile from backend -> instead of just name and  email
  //?. is used  to not  crashing if user is null
  //setProfile(res.data) -> save the entire profile to state and hide the  loading screen by setting it false or else  throw error
  useEffect(() => {
    if (!user?.userId) return; 
    getUserProfile(user.userId)
    .then(res => { setProfile(res.data); setProfileLoading(false); })
    .catch(err => { console.error(err); setProfileError('Could not load profile.'); setProfileLoading(false); });
  }, [user]); // reruns if user changes

  // Fetch expenses, axios converts into query string for  that params.
 useEffect(() => {
  if (!user?.userId) return;
  getExpenses(user.userId)
  .then(res => {
    const data = Array.isArray(res.data) ? res.data : [];
    setExpenses(data);
  })
  .catch(() => {});
}, [user]);

  //Compute the stats
  //parseFloat is used to ensure that the amount is treated as a number, and if it's missing or invalid, it defaults to 0.
  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0); //reduce is used to calculate the total amount spent by iterating through each expense and summing up the amounts. 
  const categoryTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount || 0); //gets the  existing total or assigns 0 if not seen that category
    return acc;
  }, {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]; //Object entries converts the categoryTotals object into an array of [category, total] pairs
  const thisMonthTotal = expenses
    .filter(e => {
      const d = new Date(e.date); const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0); //filter keeps for current month and  year, reduce sums them all

  const handleSignOut = () => { logout(); navigate('/signin'); };// signout and  show the  sign in page again

  if (profileLoading) return (
    <div className="profile-loading">
      <div className="profile-loading-inner">
        <div className="profile-loading-icon"><HourglassIcon size={36} /></div>
        <p>Loading your profile...</p>
      </div>
    </div>
  );

  if (profileError) return (
    <div className="profile-loading">
      <div className="profile-loading-inner">
        <div className="profile-loading-icon"><WarningIcon size={36} /></div>
        <p className="profile-error-text">{profileError}</p>
        <button className="profile-error-btn" onClick={() => navigate('/home')}>Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="profile-page">

      {/* Hero */}
      <div className="profile-hero">
        <div className="hero-back-wrap">
          <button className="hero-back" onClick={() => navigate('/home')}>← Back</button>
        </div>
        <div className="hero-identity">
          <div className="hero-avatar">{initials}</div>
          <div className="hero-text">
            <h1>{fullName}</h1>
            <p>Member of Budget Buddy</p>
            <div className="hero-badge"><span>●</span> Active Account</div>
          </div>
        </div>
      </div>
    {/* Stats strip */}
    <div className="stats-strip">
        <div className="stat-card">
          <span className="stat-icon"><WalletIcon /></span>
          <div className="stat-label">Total Spent</div>
          <div className="stat-value">${totalSpent.toFixed(0)}</div>
          <div className="stat-sub">across all time</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon"><ReceiptIcon /></span>
          <div className="stat-label">Transactions</div>
          <div className="stat-value">{expenses.length}</div>
          <div className="stat-sub">total expenses logged</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon"><TrophyIcon /></span>
          <div className="stat-label">Top Category</div>
          <div className="stat-value stat-value--sm">
            {topCategory ? (<><CategoryIcon category={topCategory[0]} /> {topCategory[0]}</>) : '—'}
          </div>
          <div className="stat-sub">{topCategory ? `$${topCategory[1].toFixed(0)} spent` : 'No data yet'}</div>
        </div>
      </div>
    {/* Body */}
      <div className="profile-body">

        {/* Sidebar */}
        <div>
          <div className="sidebar-card">
            <p className="sidebar-section-title">Personal Info</p>
            <div className="info-row">
              <span className="info-label">Full Name</span>
              <span className="info-value">{fullName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email</span>
              <span className={`info-value ${!profile?.email ? 'empty' : ''}`}>
                {profile?.email || 'Not available'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Phone</span>
              <span className={`info-value ${!profile?.phone ? 'empty' : ''}`}>
                {profile?.phone || 'Not set'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Member Since</span>
              <span className="info-value">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                  : 'N/A'}
              </span>
            </div>

            <div className="sidebar-divider" />
            <button className="sidebar-action danger" onClick={handleSignOut}>
              <span className="sidebar-action-icon"><LogoutIcon /></span>Sign Out
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="panel-card">
          <h2 className="panel-title"><ChartIcon /> Your Overview</h2>
              <div className="overview-grid">
                <div className="overview-tile">
                  <div className="overview-tile-label">This Month</div>
                  <div className="overview-tile-value">${thisMonthTotal.toFixed(0)}</div>
                  <div className="overview-tile-sub">current month spending</div>
                </div>
                <div className="overview-tile">
                  <div className="overview-tile-label">Receipts Uploaded</div>
                  <div className="overview-tile-value">{expenses.filter(e => e.receiptPath).length}</div>
                  <div className="overview-tile-sub">with receipt images</div>
                </div>
                <div className="overview-tile">
                  <div className="overview-tile-label">Avg per Transaction</div>
                  <div className="overview-tile-value">
                    ${expenses.length > 0 ? (totalSpent / expenses.length).toFixed(0) : '0'}
                  </div>
                  <div className="overview-tile-sub">average expense</div>
                </div>
                <div className="overview-tile">
                  <div className="overview-tile-label">Categories Used</div>
                  <div className="overview-tile-value">{Object.keys(categoryTotals).length}</div>
                  <div className="overview-tile-sub">unique categories</div>
                </div>
              </div>

        </div>
      </div>
    </div>
  );
};


export default Profile;
