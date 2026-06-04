import { useMemberFamilyMembers } from '../../hooks/useMemberQueries';

export function FamilyPage() {
  const { data: familyData, isLoading } = useMemberFamilyMembers();

  if (isLoading) {
    return (
      <div className="skeleton-container">
        <div className="skeleton skeleton-title" style={{ height: '40px', width: '250px', marginBottom: '24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div className="skeleton" style={{ height: '150px', borderRadius: 'var(--radius)' }} />
          <div className="skeleton" style={{ height: '150px', borderRadius: 'var(--radius)' }} />
        </div>
      </div>
    );
  }

  const items = familyData?.data?.items ?? [];

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">👥 Family Members</h1>
          <p className="member-subtitle">List of registered family members associated with your trust membership.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">👥</span>
          <h3 className="empty-state-title">No Family Members</h3>
          <p className="empty-state-desc">There are no family members registered under your membership.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {items.map((m) => (
            <div key={m.id} className="dashboard-card" style={{ gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-primary)' }}>{m.name}</h3>
                <span className="status-badge active" style={{ fontSize: '0.7rem' }}>
                  {m.relationship}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>🎂 <strong>DOB:</strong> {new Date(m.date_of_birth).toLocaleDateString()}</div>
                <div style={{ textTransform: 'capitalize' }}>🧑 <strong>Gender:</strong> {m.gender?.replace(/_/g, ' ')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
