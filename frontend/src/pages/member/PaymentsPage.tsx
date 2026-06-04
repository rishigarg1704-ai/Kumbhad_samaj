import { useState } from 'react';
import { useMemberPayments } from '../../hooks/useMemberQueries';
import { downloadMemberReceiptFile } from '../../api';

export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: paymentsData, isLoading } = useMemberPayments({ page, page_size: 10 });

  const payments = paymentsData?.data?.items ?? [];
  const pagination = paymentsData?.meta?.pagination;
  const totalPages = pagination?.total_pages ?? 0;

  const handleDownload = async (paymentId: string) => {
    setDownloadingId(paymentId);
    try {
      const { blob, filename } = await downloadMemberReceiptFile(paymentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download receipt.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="skeleton-container">
        <div className="skeleton skeleton-title" style={{ height: '40px', width: '250px', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '350px', borderRadius: 'var(--radius)' }} />
      </div>
    );
  }

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">💳 Payment History</h1>
          <p className="member-subtitle">View your membership fees, renewal orders, and download payment receipts.</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">💳</span>
          <h3 className="empty-state-title">No Payment History</h3>
          <p className="empty-state-desc">You have no payment records registered in your account.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Payment Type</th>
                <th>Amount</th>
                <th>Paid Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.receipt_number ?? '-'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{p.payment_type}</td>
                  <td>{p.currency} {parseFloat(String(p.amount)).toFixed(2)}</td>
                  <td>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '-'}</td>
                  <td>
                    <span className={`status-badge ${p.status}`}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    {p.status === 'success' ? (
                      <button
                        className="button button-outline"
                        style={{ minHeight: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
                        onClick={() => handleDownload(p.id)}
                        disabled={downloadingId === p.id}
                      >
                        {downloadingId === p.id ? '📥 Downloading...' : '📄 Receipt'}
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
