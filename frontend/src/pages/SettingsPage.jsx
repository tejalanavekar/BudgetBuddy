import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, updateUserProfile, uploadProfilePhoto, deleteAccount, changePassword } from '../api/services';
import { exportExpensesCSV, exportReceiptsZip, clearMonthExpenses } from '../api/services/expenseService';
import { exportBudgetsJSON } from '../api/services/budgetService';
import {
  UserIcon, GridIcon, BellIcon, LockIcon, BoxIcon, LogoutIcon,
  UploadIcon, WarningIcon, CheckIcon, LaptopIcon, DownloadIcon, HourglassIcon
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
const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    className={`settings-toggle ${checked ? 'on' : ''}`}
    onClick={() => !disabled && onChange(!checked)}
    aria-pressed={checked}
    disabled={disabled}
  >
    <span className="settings-toggle-knob" />
  </button>
);

const NOTIF_SUBOPTIONS = [
  ['budgetLimitWarning', 'Budget Limit Warning', 'Alert when spending exceeds 80% of budget'],
  ['subscriptionReminders', 'Subscription Due Reminders', 'Notify 3 days before a subscription renews'],
  ['weeklyReport', 'Weekly Spending Report', 'Summary every Sunday evening'],
  ['monthlySummary', 'Monthly Summary', 'Full breakdown at end of each month'],
];

const SettingsPage = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const photoInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('account');

  const [accountForm, setAccountForm] = useState({ fullName: '', phone: '' });
  const [saveMsg, setSaveMsg] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [prefs, setPrefs] = useState({
    currency: 'USD', dateFormat: 'MM/DD/YYYY', weekStart: 'Monday', compactMode: false
  });
  const [prefsMsg, setPrefsMsg] = useState({ type: '', text: '' });

  const [notifs, setNotifs] = useState({
    emailDigest: false, budgetLimitWarning: true, subscriptionReminders: true,
    weeklyReport: true, monthlySummary: false
  });

  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [privacyMsg, setPrivacyMsg] = useState({ type: '', text: '' });
  const [exportingKey, setExportingKey] = useState(null); // which export button is in flight
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user?.userId) return;
    getUserProfile(user.userId)
      .then(res => {
        setProfile(res.data);
        setAccountForm({
          fullName: `${res.data.firstName || ''} ${res.data.lastName || ''}`.trim(),
          phone: res.data.phone || ''
        });
        if (res.data.preferences) setPrefs(prev => ({ ...prev, ...res.data.preferences }));
        if (res.data.notificationPrefs) setNotifs(prev => ({ ...prev, ...res.data.notificationPrefs }));
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

  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    setSaveMsg({ type: '', text: '' });
    try {
      const res = await uploadProfilePhoto(user.userId, file);
      setProfile(res.data);
      setSaveMsg({ type: 'success', text: 'Profile photo updated.' });
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.response?.data?.message || 'Failed to upload photo.' });
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // Preferences auto-save on each change — Compact Mode also flips the body class
  // immediately so it feels live, independent of whether the save round-trip succeeds yet.
  const handlePrefChange = async (key, value) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    if (key === 'compactMode') document.body.classList.toggle('compact-mode', value);
    try {
      await updateUserProfile(user.userId, { preferences: { [key]: value } });
    } catch (err) {
      setPrefsMsg({ type: 'error', text: 'Failed to save preference.' });
    }
  };

  const handleNotifChange = async (key, value) => {
    const updated = { ...notifs, [key]: value };
    setNotifs(updated);
    try {
      await updateUserProfile(user.userId, { notificationPrefs: { [key]: value } });
    } catch (err) {
      // non-critical — local state already reflects the toggle either way
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
    setPasswordMsg({ type: '', text: '' });
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

  const handleExport = async (key, fn) => {
    setExportingKey(key);
    setPrivacyMsg({ type: '', text: '' });
    try {
      await fn(user.userId);
    } catch (err) {
      setPrivacyMsg({ type: 'error', text: `Failed to export: ${err.message}` });
    } finally {
      setExportingKey(null);
    }
  };

  const handleClearMonth = async () => {
    if (!window.confirm("Permanently delete all of this month's expenses? This can't be undone.")) return;
    setIsClearing(true);
    setPrivacyMsg({ type: '', text: '' });
    try {
      const res = await clearMonthExpenses(user.userId);
      setPrivacyMsg({ type: 'success', text: `Cleared ${res.data.deletedCount} expense(s) for this month.` });
    } catch (err) {
      setPrivacyMsg({ type: 'error', text: 'Failed to clear expenses.' });
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Permanently delete your account and ALL data (expenses, budgets, subscriptions)? This cannot be undone.')) return;
    if (!window.confirm('Are you absolutely sure? This is your last chance to cancel.')) return;
    setIsDeleting(true);
    try {
      await deleteAccount(user.userId);
      logout();
      navigate('/signin');
    } catch (err) {
      setPrivacyMsg({ type: 'error', text: 'Failed to delete account.' });
      setIsDeleting(false);
    }
  };

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
                  {profile?.photoUrl ? (
                    <img src={`http://localhost:5000/uploads/${profile.photoUrl}`} alt="Profile" className="settings-avatar-img" />
                  ) : (
                    <div className="settings-avatar">{initials}</div>
                  )}
                  <input type="file" accept="image/*" ref={photoInputRef} style={{ display: 'none' }} onChange={handlePhotoSelected} />
                  <button type="button" className="settings-btn-neutral" disabled={isUploadingPhoto} onClick={() => photoInputRef.current?.click()}>
                    <UploadIcon size={14} /> {isUploadingPhoto ? 'Uploading...' : 'Upload'}
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
                <select className="settings-select" value={prefs.currency} onChange={e => handlePrefChange('currency', e.target.value)}>
                  <option>USD</option><option>EUR</option><option>GBP</option><option>INR</option>
                </select>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Date Format</h4><p>How dates appear throughout the app</p></div>
                <select className="settings-select" value={prefs.dateFormat} onChange={e => handlePrefChange('dateFormat', e.target.value)}>
                  <option>MM/DD/YYYY</option><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option>
                </select>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Week Starts On</h4></div>
                <select className="settings-select" value={prefs.weekStart} onChange={e => handlePrefChange('weekStart', e.target.value)}>
                  <option>Sunday</option><option>Monday</option>
                </select>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Compact Mode</h4><p>Reduce spacing for more data on screen</p></div>
                <Toggle checked={prefs.compactMode} onChange={v => handlePrefChange('compactMode', v)} />
              </div>
              {prefsMsg.text && (
                <div className={`settings-msg ${prefsMsg.type}`}>
                  <WarningIcon size={14} /> {prefsMsg.text}
                </div>
              )}
            </>
          )}

          {activeTab === 'notifications' && (
            <>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Email Digest</h4><p>Receive selected reports in your inbox</p></div>
                <Toggle checked={notifs.emailDigest} onChange={v => handleNotifChange('emailDigest', v)} />
              </div>
              <div className={`settings-notif-suboptions ${!notifs.emailDigest ? 'disabled' : ''}`}>
                {NOTIF_SUBOPTIONS.map(([key, title, sub]) => (
                  <div className="settings-row settings-row--sub" key={key}>
                    <div className="settings-row-text"><h4>{title}</h4><p>{sub}</p></div>
                    <Toggle checked={notifs[key]} disabled={!notifs.emailDigest} onChange={v => handleNotifChange(key, v)} />
                  </div>
                ))}
              </div>
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
                <div className="settings-row-text">
                  <h4>Two-Factor Authentication <span className="settings-tag settings-tag--muted">In progress</span></h4>
                  <p>Add a one-time code from an authenticator app on login — coming soon</p>
                </div>
                <Toggle checked={false} disabled onChange={() => {}} />
              </div>

              <p className="settings-section-label">Active Sessions</p>
              <div className="settings-session-row">
                <span className="settings-device-icon"><LaptopIcon size={18} /></span>
                <div className="settings-row-text">
                  <h4>{navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'This browser'} on {navigator.platform || 'this device'} <span className="settings-tag">This device</span></h4>
                  <p>Current session</p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'privacy' && (
            <>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Export Expenses</h4><p>Download all expense records as a CSV file</p></div>
                <button type="button" className="settings-btn-neutral" disabled={exportingKey === 'csv'} onClick={() => handleExport('csv', exportExpensesCSV)}>
                  <DownloadIcon size={14} /> {exportingKey === 'csv' ? 'Preparing...' : 'Download CSV'}
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Export Budget History</h4><p>Monthly budget records in JSON format</p></div>
                <button type="button" className="settings-btn-neutral" disabled={exportingKey === 'json'} onClick={() => handleExport('json', exportBudgetsJSON)}>
                  <DownloadIcon size={14} /> {exportingKey === 'json' ? 'Preparing...' : 'Download JSON'}
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4>Export Receipts</h4><p>All uploaded receipt images as a ZIP archive</p></div>
                <button type="button" className="settings-btn-neutral" disabled={exportingKey === 'zip'} onClick={() => handleExport('zip', exportReceiptsZip)}>
                  <DownloadIcon size={14} /> {exportingKey === 'zip' ? 'Preparing...' : 'Download ZIP'}
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4 className="danger-text">Clear This Month's Expenses</h4><p>Permanently removes all expenses for the current month</p></div>
                <button type="button" className="settings-btn-danger-outline" disabled={isClearing} onClick={handleClearMonth}>
                  {isClearing ? 'Clearing...' : 'Clear month'}
                </button>
              </div>
              <div className="settings-row">
                <div className="settings-row-text"><h4 className="danger-text">Delete Account</h4><p>Permanently erase your account and all data. Cannot be undone.</p></div>
                <button type="button" className="settings-btn-danger" disabled={isDeleting} onClick={handleDeleteAccount}>
                  {isDeleting ? 'Deleting...' : 'Delete account'}
                </button>
              </div>
              {privacyMsg.text && (
                <div className={`settings-msg ${privacyMsg.type}`}>
                  {privacyMsg.type === 'success' ? <CheckIcon size={14} /> : <WarningIcon size={14} />} {privacyMsg.text}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
