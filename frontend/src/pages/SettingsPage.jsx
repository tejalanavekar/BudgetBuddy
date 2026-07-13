import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, updateUserProfile, changePassword } from '../api/services';
import {
  UserIcon, GridIcon, BellIcon, LockIcon, BoxIcon, LogoutIcon,
  UploadIcon, WarningIcon, CheckIcon, LaptopIcon, PhoneIcon, DownloadIcon, HourglassIcon
} from '../components/icons/Icon';
import '../styles/profile.css';
import '../styles/settings.css';

const TABS = [
  { id: 'account', label: 'Account', icon: UserIcon },
  { id: 'preferences', label: 'Preferences', icon: GridIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'security', label: 'Security', icon: LockIcon },
  { id: 'privacy', label: 'Data & Privacy', icon: BoxIcon },
];

// A single on/off pill switch — used across Preferences/Notifications/Security/Privacy tabs.
const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    className={`settings-toggle ${checked ? 'on' : ''}`}
    onClick={() => onChange(!checked)}
    aria-pressed={checked}
  >
    <span className="settings-toggle-knob" />
  </button>
);

const SettingsPage = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('account');

  const [accountForm, setAccountForm] = useState({ fullName: '', phone: '' });
  const [saveMsg, setSaveMsg] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);

  const [prefs, setPrefs] = useState({
    currency: 'USD', dateFormat: 'MM/DD/YYYY', weekStart: 'Monday',
    theme: 'Dark', compactMode: false, animations: true
  });

  const [notifs, setNotifs] = useState({
    budgetLimitWarning: true, unusualSpending: true, subscriptionReminders: true,
    weeklyReport: true, monthlySummary: false, emailDigest: false, pushNotifications: true
  });

  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessions, setSessions] = useState([
    { id: 1, device: 'MacBook Pro · Chrome', meta: 'New York, US · Now', icon: LaptopIcon, current: true },
    { id: 2, device: 'iPhone 15 · Safari', meta: 'New York, US · 2 hours ago', icon: PhoneIcon, current: false },
    { id: 3, device: 'iPad · Firefox', meta: 'Boston, US · 3 days ago', icon: PhoneIcon, current: false },
  ]);

  const [privacy, setPrivacy] = useState({ analytics: true, crashReports: true });

  useEffect(() => {
    if (!user?.userId) return;
    getUserProfile(user.userId)
      .then(res => {
        setProfile(res.data);
        setAccountForm({
          fullName: `${res.data.firstName || ''} ${res.data.lastName || ''}`.trim(),
          phone: res.data.phone || ''
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const initials = profile
    ? `${(profile.firstName || '').charAt(0)}${(profile.lastName || '').charAt(0)}`.toUpperCase()
    : '?';

  const handleSaveAccount = async () => {
    setIsSaving(true);
    setSaveMsg({ type: '', text: '' });
    try {
      const [firstName, ...rest] = accountForm.fullName.trim().split(' ');
      const lastName = rest.join(' ');
      const res = await updateUserProfile(user.userId, { firstName, lastName, phone: accountForm.phone });
      setProfile(res.data);
      updateUser({ firstName: res.data.firstName, lastName: res.data.lastName });
      setSaveMsg({ type: 'success', text: 'Changes saved.' });
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' }); return;
    }
    if (passwordForm.newPass.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters.' }); return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword(user.userId, {
        currentPassword: passwordForm.current,
        newPassword: passwordForm.newPass
      });
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setPasswordForm({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const revokeSession = (id) => setSessions(prev => prev.filter(s => s.id !== id));

  const handleSignOut = () => { logout(); navigate('/signin'); };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="profile-loading-inner">
          <div className="profile-loading-icon"><HourglassIcon size={36} /></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account, preferences, and security</p>
      </div>

      <div className="profile-body settings-body">
        {/* Sidebar */}
        <div className="sidebar-card">
          {TABS.map(tab => (
            <button key={tab.id}
              className={`sidebar-action ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}>
              <span className="sidebar-action-icon"><tab.icon /></span>
              {tab.label}
            </button>
          ))}
          <div className="sidebar-divider" />
          <button className="sidebar-action danger" onClick={handleSignOut}>
            <span className="sidebar-action-icon"><LogoutIcon /></span>Sign Out
          </button>
        </div>

        {/* Panel */}
        <div className="panel-card">
          {activeTab === 'account' && (
            <>
              <div className="settings-row">
                <div className="settings-row-text">
                  <h4>Profile Photo</h4>
                  <p>Shown on your profile and activity</p>
                </div>
                <div className="settings-photo-actions">
                  <div className="settings-avatar">{initials}</div>
                  <button type="button" className="settings-btn-neutral" onClick={() => setSaveMsg({ type: 'error', text: 'Photo upload is not available yet.' })}>
                    <UploadIcon size={14} /> Upload
                  </button>
                </div>
              </div>

              <div className="settings-form-grid">
                <div className="settings-field">
                  <label>Full Name</label>
                  <input className="settings-input" value={accountForm.fullName}
                    onChange={e => setAccountForm({ ...accountForm, fullName: e.target.value })} />
                </div>
                <div className="settings-field">
                  <label>Phone</label>
                  <input className="settings-input" value={accountForm.phone}
                    onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })} />
                </div>
              </div>

              <div className="settings-field">
                <label>Email Address</label>
                <input className="settings-input" value={profile?.email || ''} disabled title="Contact support to change your login email" />
              </div>

              <div className="settings-row">
                <div className="settings-row-text">
                  <h4>Current Plan</h4>
                  <p>Member since {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                    : 'N/A'}</p>
                </div>
                <div className="settings-photo-actions">
                  <span className="settings-plan-badge">Free</span>
                  <button type="button" className="settings-btn-primary" onClick={() => setSaveMsg({ type: 'error', text: 'Pro plans are not available yet.' })}>
                    Upgrade to Pro
                  </button>
                </div>
              </div>

              <div className="settings-save-row">
                <button type="button" className="settings-btn-save" disabled={isSaving} onClick={handleSaveAccount}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {saveMsg.text && (
                <div className={`settings-msg ${saveMsg.type}`}>
                  {saveMsg.type === 'success' ? <CheckIcon size={14} /> : <WarningIcon size={14} />} {saveMsg.text}
                </div>
              )}
            </>
          )}

          {activeTab === 'preferences' && (
            <>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Currency</h4><p>Used across all amounts and totals</p></div>
                <select className="settings-select" value={prefs.currency} onChange={e => setPrefs({ ...prefs, currency: e.target.value })}>
                  <option>USD</option><option>EUR</option><option>GBP</option><option>INR</option>
                </select>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Date Format</h4><p>How dates appear throughout the app</p></div>
                <select className="settings-select" value={prefs.dateFormat} onChange={e => setPrefs({ ...prefs, dateFormat: e.target.value })}>
                  <option>MM/DD/YYYY</option><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option>
                </select>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Week Starts On</h4></div>
                <select className="settings-select" value={prefs.weekStart} onChange={e => setPrefs({ ...prefs, weekStart: e.target.value })}>
                  <option>Sunday</option><option>Monday</option>
                </select>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Theme</h4></div>
                <div className="settings-segmented">
                  {['Dark', 'Light', 'System'].map(t => (
                    <button key={t} type="button" className={prefs.theme === t ? 'active' : ''} onClick={() => setPrefs({ ...prefs, theme: t })}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Compact Mode</h4><p>Reduce spacing for more data on screen</p></div>
                <Toggle checked={prefs.compactMode} onChange={v => setPrefs({ ...prefs, compactMode: v })} />
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Animations</h4><p>Motion effects and transitions</p></div>
                <Toggle checked={prefs.animations} onChange={v => setPrefs({ ...prefs, animations: v })} />
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              {[
                ['budgetLimitWarning', 'Budget Limit Warning', 'Alert when spending exceeds 80% of budget'],
                ['unusualSpending', 'Unusual Spending', 'Detect and flag outlier transactions'],
                ['subscriptionReminders', 'Subscription Due Reminders', 'Notify 3 days before a subscription renews'],
                ['weeklyReport', 'Weekly Spending Report', 'Summary every Sunday evening'],
                ['monthlySummary', 'Monthly Summary', 'Full breakdown at end of each month'],
                ['emailDigest', 'Email Digest', 'Receive reports in your inbox'],
                ['pushNotifications', 'Push Notifications', 'Allow Budget Buddy to send device notifications'],
              ].map(([key, title, sub]) => (
                <div className="settings-row" key={key}>
                  <div className="settings-row-text"><h4>{title}</h4><p>{sub}</p></div>
                  <Toggle checked={notifs[key]} onChange={v => setNotifs({ ...notifs, [key]: v })} />
                </div>
              ))}
            </>
          )}

          {activeTab === 'security' && (
            <>
              <form onSubmit={handlePasswordChange}>
                <div className="settings-field">
                  <label>Current Password</label>
                  <input type="password" className="settings-input" value={passwordForm.current}
                    onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} required />
                </div>
                <div className="settings-form-grid">
                  <div className="settings-field">
                    <label>New Password</label>
                    <input type="password" className="settings-input" placeholder="Min. 8 characters" value={passwordForm.newPass}
                      onChange={e => setPasswordForm({ ...passwordForm, newPass: e.target.value })} required />
                  </div>
                  <div className="settings-field">
                    <label>Confirm New Password</label>
                    <input type="password" className="settings-input" placeholder="Repeat password" value={passwordForm.confirm}
                      onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} required />
                  </div>
                </div>
                <div className="settings-save-row">
                  <button type="submit" className="settings-btn-save" disabled={isChangingPassword}>
                    {isChangingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
                {passwordMsg.text && (
                  <div className={`settings-msg ${passwordMsg.type === 'success' ? 'success' : 'error'}`}>
                    {passwordMsg.type === 'success' ? <CheckIcon size={14} /> : <WarningIcon size={14} />} {passwordMsg.text}
                  </div>
                )}
              </form>

              <div className="settings-row" style={{ marginTop: 8 }}>
                <div className="settings-row-text"><h4>Two-Factor Authentication</h4><p>Add a one-time code from an authenticator app on login</p></div>
                <Toggle checked={twoFactor} onChange={setTwoFactor} />
              </div>

              <p className="settings-section-label">Active Sessions</p>
              {sessions.map(s => (
                <div className="settings-session-row" key={s.id}>
                  <span className="settings-device-icon"><s.icon size={18} /></span>
                  <div className="settings-row-text">
                    <h4>{s.device} {s.current && <span className="settings-tag">This device</span>}</h4>
                    <p>{s.meta}</p>
                  </div>
                  {!s.current && (
                    <button type="button" className="settings-btn-revoke" onClick={() => revokeSession(s.id)}>Revoke</button>
                  )}
                </div>
              ))}
            </>
          )}

          {activeTab === 'privacy' && (
            <>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Export Expenses</h4><p>Download all expense records as a CSV file</p></div>
                <button type="button" className="settings-btn-neutral"><DownloadIcon size={14} /> Download CSV</button>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Export Budget History</h4><p>Monthly budget records in JSON format</p></div>
                <button type="button" className="settings-btn-neutral"><DownloadIcon size={14} /> Download JSON</button>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Export Receipts</h4><p>All uploaded receipt images as a ZIP archive</p></div>
                <button type="button" className="settings-btn-neutral"><DownloadIcon size={14} /> Download ZIP</button>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Analytics & Telemetry</h4><p>Share anonymous usage data to help improve the app</p></div>
                <Toggle checked={privacy.analytics} onChange={v => setPrivacy({ ...privacy, analytics: v })} />
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Crash Reports</h4><p>Automatically send error reports to help fix bugs</p></div>
                <Toggle checked={privacy.crashReports} onChange={v => setPrivacy({ ...privacy, crashReports: v })} />
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4 className="danger-text">Clear This Month's Expenses</h4><p>Permanently removes all expenses for the current month</p></div>
                <button type="button" className="settings-btn-danger-outline">Clear month</button>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4 className="danger-text">Delete Account</h4><p>Permanently erase your account and all data. Cannot be undone.</p></div>
                <button type="button" className="settings-btn-danger">Delete account</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
