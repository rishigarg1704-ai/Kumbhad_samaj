import { useState } from 'react';
import { useAdminPayments, useAdminPayment } from '../../hooks/useAdminQueries';
import { DataTable } from '../../components/admin/DataTable';

export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const { data: paymentsData, isLoading, refetch } = useAdminPayments({
    page,
    page_size: 10,
    status: status || undefined,
    search: search || undefined,
  });

  const { data: detailData, isLoading: loadingDetail } = useAdminPayment(selectedPaymentId || '');

  const payments = paymentsData?.data?.items ?? [];
  const pagination = paymentsData?.meta?.pagination;
  const totalPages = pagination?.total_pages ?? 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const paymentDetail = detailData?.data;

  const columns = [
    {
      key: 'id',
      header: 'Order ID',
      render: (row: any) => (
        <button
          onClick={() => setSelectedPaymentId(row.id)}
          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', minHeight: 'auto' }}
        >
          {row.id.substring(0, 8)}...
        </button>
      ),
    },
    { key: 'membership_number', header: 'Membership No' },
    { key: 'payment_type', header: 'Payment Type', render: (row: any) => <span style={{ textTransform: 'capitalize' }}>{row.payment_type}</span> },
    { key: 'amount', header: 'Amount', render: (row: any) => `INR ${parseFloat(row.amount).toFixed(2)}` },
    { key: 'paid_at', header: 'Paid Date', render: (row: any) => (row.paid_at ? new Date(row.paid_at).toLocaleString() : '-') },
    { key: 'status', header: 'Status', render: (row: any) => <span className={`status-badge ${row.status}`}>{row.status}</span> },
  ];

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">💳 Payment Transactions</h1>
          <p className="member-subtitle">Monitor Razorpay checkouts, webhook triggers, success ratios, and order details.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, payment ID, name, email, or membership..."
            style={{ flex: 1, minWidth: '250px' }}
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ width: '180px' }}
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <button type="submit" className="button button-primary" style={{ minHeight: 'auto' }}>
            Filter
          </button>
        </form>
      </div>

      <DataTable
        columns={columns}
        data={payments}
        isLoading={isLoading}
        emptyMessage="No transactions match the filter criteria."
        emptyIcon="💳"
        pagination={{
          page,
          totalPages,
          totalItems: pagination?.total_items,
          onPageChange: setPage,
        }}
      />

      {/* Payment Detail Modal overlay */}
      {selectedPaymentId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="card" style={{ maxWidth: '600px', width: '90%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Transaction Details</h3>
              <button
                onClick={() => setSelectedPaymentId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', minHeight: 'auto', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div>Loading transaction deep details...</div>
            ) : !paymentDetail ? (
              <div>Record not found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="grid grid-2">
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>TRANSACTION ID</span>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{paymentDetail.payment.id}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>STATUS</span>
                    <div>
                      <span className={`status-badge ${paymentDetail.payment.status}`} style={{ marginTop: '4px' }}>
                        {paymentDetail.payment.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-2">
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>AMOUNT</span>
                    <div style={{ fontWeight: 700 }}>INR {parseFloat(paymentDetail.payment.amount).toFixed(2)}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>PAYMENT TYPE</span>
                    <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{paymentDetail.payment.payment_type}</div>
                  </div>
                </div>

                <div className="grid grid-2">
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>ORDER ID</span>
                    <div style={{ fontWeight: 700 }}>{paymentDetail.payment.provider_order_id}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>GATEWAY PAYMENT ID</span>
                    <div style={{ fontWeight: 700 }}>{paymentDetail.payment.provider_payment_id ?? '-'}</div>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>RECEIPT NUMBER</span>
                  <div style={{ fontWeight: 700 }}>{paymentDetail.payment.receipt_number ?? '-'}</div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <h4 style={{ margin: 0 }}>👤 Associated Member</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{paymentDetail.member.full_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{paymentDetail.member.email}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700 }}>{paymentDetail.membership.membership_number}</div>
                    </div>
                  </div>
                </div>

                {paymentDetail.status_transitions.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                    <h4 style={{ marginBottom: '12px' }}>⚙️ Webhook Audit Events</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {paymentDetail.status_transitions.map((st: any) => (
                        <div key={st.event_id} style={{ fontSize: '0.85rem', padding: '8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'var(--color-bg-off-white)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                            <span>{st.event_type}</span>
                            <span style={{ color: st.processed ? 'var(--color-success)' : 'var(--color-error)' }}>
                              {st.processed ? 'Processed' : 'Failed'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            Time: {new Date(st.created_at).toLocaleString()}
                          </div>
                          {st.error_message && (
                            <div style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '4px' }}>
                              Error: {st.error_message}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
