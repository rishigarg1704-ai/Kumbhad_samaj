import { useState } from 'react';
import { useMemberNotifications, useMarkNotificationRead } from '../../hooks/useMemberQueries';

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data: notificationsData, isLoading } = useMemberNotifications({ page, page_size: 10 });
  const { mutate: markRead, isPending: markingRead } = useMarkNotificationRead();

  const items = notificationsData?.data?.items ?? [];
  const pagination = notificationsData?.meta?.pagination;
  const totalPages = pagination?.total_pages ?? 0;

  const handleMarkRead = (id: string) => {
    markRead(id);
  };

  if (isLoading) {
    return (
      <div className="skeleton-container">
        <div className="skeleton skeleton-title" style={{ height: '40px', width: '250px', marginBottom: '24px' }} />
        <div className="skeleton-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius)' }} />
          <div className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius)' }} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">🔔 Notifications</h1>
          <p className="member-subtitle">Stay updated with the latest news, events, and membership notifications from the Trust.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">🔔</span>
          <h3 className="empty-state-title">No Notifications</h3>
          <p className="empty-state-desc">You are all caught up! No notifications yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="notifications-list">
            {items.map((n) => (
              <div key={n.id} className={`notification-item ${n.status === 'sent' ? 'unread' : ''}`}>
                <div className="notification-content">
                  <h3 className="notification-title">{n.title}</h3>
                  <p className="notification-body">{n.body}</p>
                  <div className="notification-meta">
                    <span>📅 Sent on {new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {n.status === 'read' && n.read_at && (
                      <span style={{ color: 'var(--color-success)', marginLeft: '12px' }}>✓ Read on {new Date(n.read_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                {n.status === 'sent' && (
                  <div className="notification-action">
                    <button
                      className="notification-read-btn"
                      onClick={() => handleMarkRead(n.id)}
                      disabled={markingRead}
                    >
                      Mark as Read
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong> (Total {pagination?.total_items} items)
              </span>
              <div className="pagination-buttons">
                <button
                  className="pagination-btn"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
