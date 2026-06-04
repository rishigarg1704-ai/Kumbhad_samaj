import { Link } from 'react-router-dom';
import {
  useMemberProfile,
  useMemberMembership,
  useMemberPayments,
  useMemberNotifications
} from '../../hooks/useMemberQueries';

export function DashboardPage() {
  const { data: profileData, isLoading: loadProfile } = useMemberProfile();
  const { data: membershipData, isLoading: loadMembership } = useMemberMembership();
  const { data: paymentsData, isLoading: loadPayments } = useMemberPayments({ page_size: 5 });
  const { data: notificationsData, isLoading: loadNotifications } = useMemberNotifications({ page_size: 3 });

  const isLoading = loadProfile || loadMembership || loadPayments || loadNotifications;

  if (isLoading) {
    return (
      <div className="skeleton-container">
        <div className="skeleton skeleton-title" style={{ height: '40px', width: '250px', marginBottom: '24px' }} />
        <div className="skeleton skeleton-text" style={{ height: '20px', width: '400px', marginBottom: '40px' }} />
        <div className="dashboard-grid">
          <div className="skeleton" style={{ height: '180px', borderRadius: 'var(--radius)' }} />
          <div className="skeleton" style={{ height: '180px', borderRadius: 'var(--radius)' }} />
        </div>
      </div>
    );
  }

  const profile = profileData?.data;
  const membership = membershipData?.data?.membership;
  const family = membershipData?.data?.family;
  const payments = paymentsData?.data?.items ?? [];
  const notifications = notificationsData?.data?.items ?? [];

  // Determine if eligible for renewal
  let canRenew = false;
  let renewalReason = '';
  if (membership) {
    if (membership.status === 'expired') {
      canRenew = true;
    } else if (membership.status === 'suspended') {
      canRenew = false;
      renewalReason = 'Your membership has been suspended. Please contact the administration.';
    } else if (membership.expiry_date) {
      const expiry = new Date(membership.expiry_date);
      const today = new Date();
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 60) {
        canRenew = true;
      } else {
        renewalReason = `Renewal is only open within 60 days of expiry. Expiry is in ${diffDays} days.`;
      }
    }
  }

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">Welcome, {profile?.full_name}!</h1>
          <p className="member-subtitle">Manage your membership, family members, payments, and view trust updates.</p>
        </div>
      </div>

      {membership?.status === 'suspended' && (
        <div className="empty-state" style={{ borderColor: 'var(--color-error)', backgroundColor: '#fee2e2', marginBottom: '24px', textAlign: 'left', padding: '24px' }}>
          <h3 style={{ color: 'var(--color-error)', marginBottom: '8px' }}>⚠️ Membership Suspended</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>{renewalReason}</p>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Membership Status</h3>
            <span className={`status-badge ${membership?.status}`}>
              {membership?.status?.replace('_', ' ') ?? 'None'}
            </span>
          </div>
          <div className="dashboard-card-value">
            {membership?.membership_number ?? 'No Membership'}
          </div>
          <div>
            {membership?.expiry_date ? (
              <span className="member-subtitle">
                Expires on: <strong>{new Date(membership.expiry_date).toLocaleDateString()}</strong>
              </span>
            ) : (
              <span className="member-subtitle">No expiry date</span>
            )}
          </div>
          {canRenew && (
            <Link to="/member/renew" className="button button-accent" style={{ marginTop: '10px', textDecoration: 'none' }}>
              Renew Now 🔄
            </Link>
          )}
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h3 className="dashboard-card-title">Contact & Family</h3>
          </div>
          <div className="member-subtitle">
            <p style={{ marginBottom: '8px' }}>📞 {family?.mobile_number ?? 'No mobile'}</p>
            <p style={{ marginBottom: '8px' }}>✉️ {family?.email ?? 'No email'}</p>
            <p>📍 {family?.address ?? 'No address'}</p>
          </div>
          <Link to="/member/membership" className="button button-outline" style={{ marginTop: 'auto', textDecoration: 'none' }}>
            View Details 🪪
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px', marginTop: '30px' }}>
        {/* Recent Payments */}
        <div className="table-container" style={{ margin: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>💳 Recent Payments</h3>
            <Link to="/member/payments" style={{ fontWeight: 600 }}>View All</Link>
          </div>
          {payments.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No payment history found.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td style={{ textTransform: 'capitalize' }}>{p.payment_type}</td>
                    <td>{p.currency} {parseFloat(String(p.amount)).toFixed(2)}</td>
                    <td>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${p.status}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Latest Notifications */}
        <div className="table-container" style={{ margin: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>🔔 Latest Notifications</h3>
            <Link to="/member/notifications" style={{ fontWeight: 600 }}>View All</Link>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No notifications found.
            </div>
          ) : (
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {notifications.map((n) => (
                <div key={n.id} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primary)' }}>
                      {n.title}
                      {n.status === 'sent' && (
                        <span className="status-badge" style={{ backgroundColor: 'var(--color-accent)', color: 'white', fontSize: '0.65rem', padding: '2px 6px', marginLeft: '8px' }}>
                          NEW
                        </span>
                      )}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
                    {n.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
