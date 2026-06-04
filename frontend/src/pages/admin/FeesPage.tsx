import { useState } from 'react';
import { useAdminActiveFee, useAdminFeeHistory, useAdminCreateFee } from '../../hooks/useAdminQueries';
import { DataTable } from '../../components/admin/DataTable';

export function FeesPage() {
  const [page, setPage] = useState(1);
  const [membershipFee, setMembershipFee] = useState<number>(1000);
  const [renewalFee, setRenewalFee] = useState<number>(500);
  const [effectiveFrom, setEffectiveFrom] = useState<string>('');

  const [showConfigModal, setShowConfigModal] = useState(false);

  const { data: activeFeeData, isLoading: loadingActive, refetch: refetchActive } = useAdminActiveFee();
  const { data: historyData, isLoading: loadingHistory, refetch: refetchHistory } = useAdminFeeHistory({ page, page_size: 10 });
  const createFeeMutation = useAdminCreateFee();

  const activeFee = activeFeeData?.data;
  const historyItems = historyData?.data?.items ?? [];
  const pagination = historyData?.meta?.pagination;
  const totalPages = pagination?.total_pages ?? 0;

  const handleSubmitFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveFrom) return;

    try {
      await createFeeMutation.mutateAsync({
        membership_fee_amount: membershipFee,
        renewal_fee_amount: renewalFee,
        effective_from: effectiveFrom,
      });
      alert('New fee configuration created successfully!');
      setShowConfigModal(false);
      refetchActive();
      refetchHistory();
    } catch (err: any) {
      alert(err.message || 'Failed to configure new fee structure');
    }
  };

  const columns = [
    { key: 'membership_fee_amount', header: 'Registration Fee', render: (row: any) => `INR ${parseFloat(row.membership_fee_amount).toFixed(2)}` },
    { key: 'renewal_fee_amount', header: 'Renewal Fee', render: (row: any) => `INR ${parseFloat(row.renewal_fee_amount).toFixed(2)}` },
    { key: 'effective_from', header: 'Effective From', render: (row: any) => new Date(row.effective_from).toLocaleDateString() },
    { key: 'effective_to', header: 'Effective To', render: (row: any) => (row.effective_to ? new Date(row.effective_to).toLocaleDateString() : 'Active / Current') },
  ];

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">⚙️ Fee Configurations</h1>
          <p className="member-subtitle">Configure registration/renewal amounts and view active and historical fee tiers.</p>
        </div>
        <div>
          <button className="button button-primary" onClick={() => setShowConfigModal(true)}>
            🔄 Create Fee Change
          </button>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '32px' }}>
        {/* Active Fee summary */}
        <div className="card" style={{ padding: '24px' }}>
          <h3>Current Active Fees</h3>
          {loadingActive ? (
            <div>Loading active fee info...</div>
          ) : !activeFee ? (
            <div style={{ color: 'var(--color-error)', fontWeight: 600, marginTop: '16px' }}>
              ⚠️ Active fee is not configured in the database! Registration is disabled.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
              <div className="grid grid-2">
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>REGISTRATION FEE</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    INR {parseFloat(activeFee.membership_fee_amount).toFixed(2)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>RENEWAL FEE</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    INR {parseFloat(activeFee.renewal_fee_amount).toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>EFFECTIVE SINCE</span>
                <div style={{ fontWeight: 700 }}>{new Date(activeFee.effective_from).toLocaleDateString()}</div>
              </div>
            </div>
          )}
        </div>

        {/* Business rules memo card */}
        <div className="card" style={{ padding: '24px', background: '#f8fafc' }}>
          <h3>📌 Business Logic Rules</h3>
          <ul style={{ paddingLeft: '20px', marginTop: '16px', fontSize: '0.9rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Past fee periods are completely immutable to protect historical receipts.</li>
            <li>Creating a new fee config automatically marks the previous active fee as ending one day prior.</li>
            <li>Overlap of active ranges is prohibited by database unique bounds.</li>
            <li>Effective from dates must be either today or in the future.</li>
          </ul>
        </div>
      </div>

      <div className="section-title" style={{ textAlign: 'left', marginBottom: '20px' }}>
        <h3>📜 Historical Fee Tiers</h3>
      </div>

      <DataTable
        columns={columns}
        data={historyItems}
        isLoading={loadingHistory}
        emptyMessage="No fee tiers found in database history."
        emptyIcon="📜"
        pagination={{
          page,
          totalPages,
          totalItems: pagination?.total_items,
          onPageChange: setPage,
        }}
      />

      {/* Create Fee Change Modal overlay */}
      {showConfigModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', padding: '24px' }}>
            <h3>Create Fee Change</h3>
            <form onSubmit={handleSubmitFee} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>New Registration Fee (INR) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={membershipFee}
                  onChange={(e) => setMembershipFee(parseFloat(e.target.value))}
                  required
                />
              </div>

              <div className="form-group">
                <label>New Renewal Fee (INR) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={renewalFee}
                  onChange={(e) => setRenewalFee(parseFloat(e.target.value))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Effective Date *</label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="button button-primary" style={{ flex: 1 }} disabled={createFeeMutation.isPending}>
                  {createFeeMutation.isPending ? 'Saving...' : 'Publish Tier'}
                </button>
                <button type="button" className="button button-outline" style={{ flex: 1 }} onClick={() => setShowConfigModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
