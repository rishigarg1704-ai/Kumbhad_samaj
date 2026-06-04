import { Link } from 'react-router-dom';
import { useAdminMembers, useAdminPayments } from '../../hooks/useAdminQueries';

export function AdminDashboard() {
  const { data: activeData, isLoading: loadingActive } = useAdminMembers({ status: 'active', page_size: 1 });
  const { data: pendingData, isLoading: loadingPending } = useAdminMembers({ status: 'pending_payment', page_size: 1 });
  const { data: totalData, isLoading: loadingTotal } = useAdminMembers({ page_size: 1 });
  const { data: paymentsData, isLoading: loadingPayments } = useAdminPayments({ page_size: 5 });

  const activeCount = activeData?.meta?.pagination?.total_items ?? 0;
  const pendingCount = pendingData?.meta?.pagination?.total_items ?? 0;
  const totalCount = totalData?.meta?.pagination?.total_items ?? 0;
  const recentPayments = paymentsData?.data?.items ?? [];

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">📊 Admin Dashboard</h1>
          <p className="member-subtitle">Quick overview of membership states, recent payment transactions, and content management.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span className="dashboard-card-title">Active Members</span>
            <span className="status-badge success">Active</span>
          </div>
          <div className="dashboard-card-value">{loadingActive ? '...' : activeCount}</div>
          <Link to="/admin/members?status=active" style={{ fontSize: '0.875rem', fontWeight: 600 }}>View List →</Link>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span className="dashboard-card-title">Pending Payment</span>
            <span className="status-badge pending">Pending</span>
          </div>
          <div className="dashboard-card-value">{loadingPending ? '...' : pendingCount}</div>
          <Link to="/admin/members?status=pending_payment" style={{ fontSize: '0.875rem', fontWeight: 600 }}>View List →</Link>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <span className="dashboard-card-title">Total Registrations</span>
            <span className="status-badge success" style={{ background: '#f1f5f9', color: '#475569' }}>Total</span>
          </div>
          <div className="dashboard-card-value">{loadingTotal ? '...' : totalCount}</div>
          <Link to="/admin/members" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Manage Members →</Link>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: '40px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>💳 Recent Payments</span>
            <Link to="/admin/payments" style={{ fontSize: '0.875rem', fontWeight: 600 }}>View All</Link>
          </h3>
          {loadingPayments ? (
            <div>Loading recent payments...</div>
          ) : recentPayments.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>No payments recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentPayments.map((p: any) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.membership_number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                      {p.payment_type} &bull; {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ fontWeight: 800 }}>INR {parseFloat(p.amount).toFixed(2)}</div>
                    <span className={`status-badge ${p.status}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>⚡ Quick Admin Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Link to="/admin/members?add=true" className="button button-primary" style={{ textDecoration: 'none', fontSize: '0.9rem', padding: '10px 12px', minHeight: 'auto', textAlign: 'center' }}>
              ➕ Add Member
            </Link>
            <Link to="/admin/events" className="button button-outline" style={{ textDecoration: 'none', fontSize: '0.9rem', padding: '10px 12px', minHeight: 'auto', textAlign: 'center' }}>
              📅 Create Event
            </Link>
            <Link to="/admin/fees" className="button button-outline" style={{ textDecoration: 'none', fontSize: '0.9rem', padding: '10px 12px', minHeight: 'auto', textAlign: 'center' }}>
              ⚙️ Configure Fees
            </Link>
            <Link to="/admin/reports" className="button button-outline" style={{ textDecoration: 'none', fontSize: '0.9rem', padding: '10px 12px', minHeight: 'auto', textAlign: 'center' }}>
              📈 Run Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
