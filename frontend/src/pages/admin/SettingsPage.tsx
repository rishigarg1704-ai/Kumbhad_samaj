import { useState, useEffect } from 'react';
import { useAdminSettings, useAdminUpdateSetting } from '../../hooks/useAdminQueries';

export function SettingsPage() {
  const { data: settingsData, isLoading, refetch } = useAdminSettings();
  const updateSettingMutation = useAdminUpdateSetting();

  const settings = settingsData?.data;

  // Local state
  const [trustName, setTrustName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [fbUrl, setFbUrl] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');

  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Local state for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { apiRequest } = await import('../../api');
      await apiRequest('/api/v1/admin/settings/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Sync state
  useEffect(() => {
    if (settings) {
      setTrustName(settings.trust_name || '');
      setContactEmail(settings.contact_details?.email || '');
      setContactPhone(settings.contact_details?.phone || '');
      setContactAddress(settings.contact_details?.address || '');
      setReceiptFooter(settings.receipt_settings?.footer_note || '');

      const fb = settings.social_links?.find((l: any) => l.platform === 'facebook')?.url || '';
      const yt = settings.social_links?.find((l: any) => l.platform === 'youtube')?.url || '';
      setFbUrl(fb);
      setYtUrl(yt);
    }
  }, [settings]);

  const handleUpdateKey = async (key: string, value: any) => {
    setSavingKey(key);
    try {
      await updateSettingMutation.mutateAsync({ key, value });
      alert('Setting updated successfully!');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to update setting');
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading) {
    return (
      <div className="skeleton-container">
        <div className="skeleton skeleton-title" style={{ height: '40px', width: '250px', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius)' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">🔧 Trust Settings</h1>
          <p className="member-subtitle">Configure global trust attributes, contact profiles, social accounts, and invoice/receipt layout terms.</p>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Core settings */}
        <div className="card" style={{ padding: '24px' }}>
          <h3>🏛️ Global Trust Information</h3>
          <div style={{ marginTop: '20px' }}>
            <div className="form-group">
              <label>Trust Legal Name</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={trustName} onChange={(e) => setTrustName(e.target.value)} />
                <button
                  className="button button-primary"
                  style={{ minHeight: 'auto', padding: '0 16px' }}
                  onClick={() => handleUpdateKey('trust_name', trustName)}
                  disabled={savingKey === 'trust_name'}
                >
                  {savingKey === 'trust_name' ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginTop: '20px' }}>
              <label>Contact Email Address</label>
              <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} style={{ marginBottom: '12px' }} />
              <label>Contact Phone Number</label>
              <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} style={{ marginBottom: '12px' }} />
              <label>Office Address</label>
              <textarea value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} rows={2} style={{ marginBottom: '12px' }} />
              <button
                className="button button-primary"
                style={{ width: '100%', minHeight: '40px', padding: '8px' }}
                onClick={() => handleUpdateKey('contact_details', {
                  email: contactEmail,
                  phone: contactPhone,
                  address: contactAddress
                })}
                disabled={savingKey === 'contact_details'}
              >
                {savingKey === 'contact_details' ? 'Saving Contacts...' : 'Update Office Contacts'}
              </button>
            </div>
          </div>
        </div>

        {/* receipt settings and social */}
        <div className="card" style={{ padding: '24px' }}>
          <h3>📄 Receipt & Social Configurations</h3>
          <div style={{ marginTop: '20px' }}>
            <div className="form-group">
              <label>Receipt Footer Disclaimer</label>
              <textarea value={receiptFooter} onChange={(e) => setReceiptFooter(e.target.value)} rows={3} style={{ marginBottom: '12px' }} />
              <button
                className="button button-primary"
                style={{ width: '100%', minHeight: '40px', padding: '8px' }}
                onClick={() => handleUpdateKey('receipt_settings', {
                  footer_note: receiptFooter,
                  terms: settings?.receipt_settings?.terms || 'Subject to Ahmedabad jurisdiction.'
                })}
                disabled={savingKey === 'receipt_settings'}
              >
                {savingKey === 'receipt_settings' ? 'Saving Receipt Terms...' : 'Update Receipt Footer'}
              </button>
            </div>

            <div className="form-group" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginTop: '20px' }}>
              <label>Facebook Page URL</label>
              <input type="url" value={fbUrl} onChange={(e) => setFbUrl(e.target.value)} style={{ marginBottom: '12px' }} />
              <label>YouTube Channel URL</label>
              <input type="url" value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} style={{ marginBottom: '12px' }} />
              <button
                className="button button-primary"
                style={{ width: '100%', minHeight: '40px', padding: '8px' }}
                onClick={() => handleUpdateKey('social_links', [
                  { platform: 'facebook', url: fbUrl },
                  { platform: 'youtube', url: ytUrl }
                ])}
                disabled={savingKey === 'social_links'}
              >
                {savingKey === 'social_links' ? 'Saving Social Tiers...' : 'Update Social Handles'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="card" style={{ padding: '24px', marginTop: '32px', maxWidth: '600px' }}>
        <h3>🔑 Update Administrator Password</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
          Change the password used to log into this trust administrator portal.
        </p>

        <form onSubmit={handleUpdatePassword}>
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input 
              type="password" 
              id="currentPassword" 
              value={currentPassword} 
              onChange={(e) => setCurrentPassword(e.target.value)} 
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input 
              type="password" 
              id="newPassword" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmNewPassword">Confirm New Password</label>
            <input 
              type="password" 
              id="confirmNewPassword" 
              value={confirmNewPassword} 
              onChange={(e) => setConfirmNewPassword(e.target.value)} 
              required
            />
          </div>

          <button 
            type="submit" 
            className="button button-primary" 
            style={{ width: '100%', marginTop: '8px' }} 
            disabled={isChangingPassword}
          >
            {isChangingPassword ? 'Updating Password...' : 'Change Password'}
          </button>

          {passwordError && <p className="error-text" style={{ color: 'var(--color-error)', marginTop: '12px', textAlign: 'center' }}>{passwordError}</p>}
          {passwordSuccess && <p style={{ color: 'var(--color-success)', marginTop: '12px', textAlign: 'center', fontWeight: 'bold' }}>{passwordSuccess}</p>}
        </form>
      </div>
    </div>
  );
}
