import { Link } from 'react-router-dom';
import { useMemberMembership } from '../../hooks/useMemberQueries';

export function MembershipPage() {
  const { data: membershipData, isLoading } = useMemberMembership();

  if (isLoading) {
    return (
      <div className="skeleton-container">
        <div className="skeleton skeleton-title" style={{ height: '40px', width: '250px', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius)' }} />
      </div>
    );
  }

  const membership = membershipData?.data?.membership;
  const family = membershipData?.data?.family;

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">🪪 Membership Details</h1>
          <p className="member-subtitle">Verify your trust membership status and family contact information.</p>
        </div>
      </div>

      <div className="dashboard-card" style={{ maxWidth: '800px', margin: '0 auto 30px', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Membership Number</span>
            <strong style={{ fontSize: '1.25rem', color: 'var(--color-primary)' }}>{membership?.membership_number ?? 'N/A'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Status</span>
            <div>
              <span className={`status-badge ${membership?.status}`}>
                {membership?.status?.replace('_', ' ') ?? 'None'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Start Date</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              {membership?.start_date ? new Date(membership.start_date).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Expiry Date</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              {membership?.expiry_date ? new Date(membership.expiry_date).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', marginBottom: '16px' }}>📍 Family Contact Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Phone Number</span>
              <span style={{ fontSize: '1rem', fontWeight: 500 }}>{family?.mobile_number ?? 'N/A'}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email Address</span>
              <span style={{ fontSize: '1rem', fontWeight: 500 }}>{family?.email ?? 'N/A'}</span>
            </div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Postal Address</span>
            <span style={{ fontSize: '1rem', fontWeight: 500 }}>{family?.address ?? 'N/A'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
          <Link to="/member/family" className="button button-outline" style={{ textDecoration: 'none' }}>
            View Family Members 👥
          </Link>
          {membership?.status !== 'suspended' && (
            <Link to="/member/renew" className="button button-primary" style={{ textDecoration: 'none' }}>
              Renew Membership 🔄
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
