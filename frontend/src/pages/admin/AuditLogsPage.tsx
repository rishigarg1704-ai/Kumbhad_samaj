import { useState } from 'react';
import { useAdminAuditLogs } from '../../hooks/useAdminQueries';
import { DataTable } from '../../components/admin/DataTable';

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');

  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: auditData, isLoading, refetch } = useAdminAuditLogs({
    page,
    page_size: 10,
    search: search || undefined,
    action: action || undefined,
    entity_type: entityType || undefined,
  });

  const logs = auditData?.data?.items ?? [];
  const pagination = auditData?.meta?.pagination;
  const totalPages = pagination?.total_pages ?? 0;

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const columns = [
    { key: 'created_at', header: 'Timestamp', render: (row: any) => new Date(row.created_at).toLocaleString() },
    { key: 'actor_admin_email', header: 'Actor Email', render: (row: any) => row.actor_admin_email ?? 'System / Public' },
    { key: 'action', header: 'Action Logged', render: (row: any) => <code style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{row.action}</code> },
    { key: 'entity_type', header: 'Entity Type', render: (row: any) => <span style={{ textTransform: 'capitalize' }}>{row.entity_type}</span> },
    { key: 'entity_id', header: 'Entity ID', render: (row: any) => (row.entity_id ? `${row.entity_id.substring(0, 8)}...` : '-') },
    {
      key: 'view',
      header: 'Audit State',
      render: (row: any) => (
        <button
          className="button button-outline"
          style={{ minHeight: 'auto', padding: '4px 10px', fontSize: '0.85rem' }}
          onClick={() => setSelectedLog(row)}
        >
          View Details
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">📜 System Audit Logs</h1>
          <p className="member-subtitle">Immutable chronological logging of all administrative CRUD mutations and system activities.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
        <form onSubmit={handleFilter} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, admin email, entity ID..."
            style={{ flex: 1, minWidth: '250px' }}
          />
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} style={{ width: '180px' }}>
            <option value="">All Actions</option>
            <option value="member_created">member_created</option>
            <option value="member_updated">member_updated</option>
            <option value="member_deleted">member_deleted</option>
            <option value="family_member_created">family_member_created</option>
            <option value="family_member_updated">family_member_updated</option>
            <option value="family_member_deleted">family_member_deleted</option>
            <option value="fee_created">fee_created</option>
            <option value="setting_updated">setting_updated</option>
          </select>
          <button type="submit" className="button button-primary" style={{ minHeight: 'auto' }}>
            Filter
          </button>
        </form>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyMessage="No audit logs matched your parameters."
        emptyIcon="📜"
        pagination={{
          page,
          totalPages,
          totalItems: pagination?.total_items,
          onPageChange: setPage,
        }}
      />

      {/* Log Detail Modal */}
      {selectedLog && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="card" style={{ maxWidth: '600px', width: '90%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Audit Entry Details</h3>
              <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', minHeight: 'auto' }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              <div className="grid grid-2">
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>ACTION TYPE</span>
                  <div style={{ fontWeight: 700 }}>{selectedLog.action}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>ACTOR TYPE</span>
                  <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{selectedLog.actor_type} ({selectedLog.actor_admin_email ?? 'Public'})</div>
                </div>
              </div>

              <div className="grid grid-2">
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>ENTITY</span>
                  <div style={{ fontWeight: 700 }}>{selectedLog.entity_type} ({selectedLog.entity_id ?? 'None'})</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>TIMESTAMP</span>
                  <div style={{ fontWeight: 700 }}>{new Date(selectedLog.created_at).toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-2">
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>IP ADDRESS</span>
                  <div style={{ fontWeight: 700 }}>{selectedLog.ip_address ?? 'Not recorded'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>USER AGENT</span>
                  <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedLog.user_agent ?? 'Not recorded'}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>BEFORE STATE STATE</span>
                <pre style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius)', overflowX: 'auto', fontSize: '0.8rem', marginTop: '4px' }}>
                  {selectedLog.before_state ? JSON.stringify(JSON.parse(selectedLog.before_state), null, 2) : 'None (Created / Fresh)'}
                </pre>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>AFTER STATE STATE</span>
                <pre style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius)', overflowX: 'auto', fontSize: '0.8rem', marginTop: '4px' }}>
                  {selectedLog.after_state ? JSON.stringify(JSON.parse(selectedLog.after_state), null, 2) : 'None (Deleted / Erased)'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
