import { useState } from 'react';
import {
  useAdminReportActiveMembers,
  useAdminReportExpiringMembers,
  useAdminReportBirthdays,
  useAdminReportPayments,
} from '../../hooks/useAdminQueries';
import { DataTable } from '../../components/admin/DataTable';

type ReportTab = 'active' | 'expiring' | 'birthdays' | 'payments';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('active');

  // Filters for Active
  const [activeSearch, setActiveSearch] = useState('');
  const [activePage, setActivePage] = useState(1);

  // Filters for Expiring (Default to next 30 days)
  const [expPage, setExpPage] = useState(1);
  const [expStart, setExpStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [expEnd, setExpEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Filters for Birthdays (Default to current month)
  const [dobPage, setDobPage] = useState(1);
  const [dobMonth, setDobMonth] = useState<number>(() => new Date().getMonth() + 1);

  // Filters for Payments
  const [payPage, setPayPage] = useState(1);
  const [payStatus, setPayStatus] = useState('success');
  const [payType, setPayType] = useState('');
  const [payStart, setPayStart] = useState('');
  const [payEnd, setPayEnd] = useState('');

  // Queries
  const { data: activeReportData, isLoading: loadingActive } = useAdminReportActiveMembers({
    page: activePage,
    page_size: 10,
    search: activeSearch || undefined,
  });

  const { data: expiringReportData, isLoading: loadingExpiring } = useAdminReportExpiringMembers({
    page: expPage,
    page_size: 10,
    start_date: expStart || undefined,
    end_date: expEnd || undefined,
  });

  const { data: birthdayReportData, isLoading: loadingBirthdays } = useAdminReportBirthdays({
    page: dobPage,
    page_size: 10,
    month: dobMonth,
  });

  const { data: paymentReportData, isLoading: loadingPayments } = useAdminReportPayments({
    page: payPage,
    page_size: 10,
    status: payStatus || undefined,
    payment_type: payType || undefined,
    start_date: payStart || undefined,
    end_date: payEnd || undefined,
  });

  // Data helpers
  const activeItems = activeReportData?.data?.items ?? [];
  const activeMeta = activeReportData?.meta?.pagination;

  const expiringItems = expiringReportData?.data?.items ?? [];
  const expiringMeta = expiringReportData?.meta?.pagination;

  const birthdayItems = birthdayReportData?.data?.items ?? [];
  const birthdayMeta = birthdayReportData?.meta?.pagination;

  const paymentItems = paymentReportData?.data?.items ?? [];
  const paymentMeta = paymentReportData?.meta?.pagination;
  const paymentSummary = paymentReportData?.data?.summary;

  const tabStyle = (tab: ReportTab) => ({
    padding: '12px 24px',
    cursor: 'pointer',
    fontWeight: 700,
    borderBottom: activeTab === tab ? '3px solid var(--color-primary)' : '3px solid transparent',
    color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
    background: 'none',
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    minHeight: 'auto',
    borderRadius: 0,
  });

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">📈 Generate Reports</h1>
          <p className="member-subtitle">Audit trust demographics, trace expiring memberships, follow birthdays, and reconcile payments.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '24px', overflowX: 'auto' }}>
        <button style={tabStyle('active')} onClick={() => setActiveTab('active')}>Active Members</button>
        <button style={tabStyle('expiring')} onClick={() => setActiveTab('expiring')}>Expiring Members</button>
        <button style={tabStyle('birthdays')} onClick={() => setActiveTab('birthdays')}>Birthdays Report</button>
        <button style={tabStyle('payments')} onClick={() => setActiveTab('payments')}>Payments Summary</button>
      </div>

      {/* 1. Active Members Report */}
      {activeTab === 'active' && (
        <div>
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <input
                type="text"
                value={activeSearch}
                onChange={(e) => { setActiveSearch(e.target.value); setActivePage(1); }}
                placeholder="Search active members by name, email, membership number..."
                style={{ flex: 1 }}
              />
            </div>
          </div>
          <DataTable
            columns={[
              { key: 'membership_number', header: 'Membership No' },
              { key: 'full_name', header: 'Member Name' },
              { key: 'email', header: 'Email' },
              { key: 'mobile_number', header: 'Phone' },
              { key: 'expiry_date', header: 'Expiry Date', render: (row: any) => new Date(row.expiry_date).toLocaleDateString() },
            ]}
            data={activeItems}
            isLoading={loadingActive}
            pagination={{
              page: activePage,
              totalPages: activeMeta?.total_pages ?? 0,
              totalItems: activeMeta?.total_items,
              onPageChange: setActivePage,
            }}
          />
        </div>
      )}

      {/* 2. Expiring Members Report */}
      {activeTab === 'expiring' && (
        <div>
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>From:</span>
                <input type="date" value={expStart} onChange={(e) => { setExpStart(e.target.value); setExpPage(1); }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>To:</span>
                <input type="date" value={expEnd} onChange={(e) => { setExpEnd(e.target.value); setExpPage(1); }} />
              </div>
            </div>
          </div>
          <DataTable
            columns={[
              { key: 'membership_number', header: 'Membership No' },
              { key: 'full_name', header: 'Member Name' },
              { key: 'email', header: 'Email' },
              { key: 'mobile_number', header: 'Phone' },
              { key: 'expiry_date', header: 'Expiry Date', render: (row: any) => new Date(row.expiry_date).toLocaleDateString() },
            ]}
            data={expiringItems}
            isLoading={loadingExpiring}
            pagination={{
              page: expPage,
              totalPages: expiringMeta?.total_pages ?? 0,
              totalItems: expiringMeta?.total_items,
              onPageChange: setExpPage,
            }}
          />
        </div>
      )}

      {/* 3. Birthday Report */}
      {activeTab === 'birthdays' && (
        <div>
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Filter Month:</span>
              <select value={dobMonth} onChange={(e) => { setDobMonth(parseInt(e.target.value)); setDobPage(1); }} style={{ width: '180px' }}>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
          </div>
          <DataTable
            columns={[
              { key: 'name', header: 'Family Member' },
              { key: 'relationship', header: 'Relationship', render: (row: any) => <span style={{ textTransform: 'capitalize' }}>{row.relationship}</span> },
              { key: 'date_of_birth', header: 'Date of Birth', render: (row: any) => new Date(row.date_of_birth).toLocaleDateString() },
              { key: 'family_email', header: 'Family Email' },
              { key: 'family_mobile', header: 'Contact Mobile' },
            ]}
            data={birthdayItems}
            isLoading={loadingBirthdays}
            pagination={{
              page: dobPage,
              totalPages: birthdayMeta?.total_pages ?? 0,
              totalItems: birthdayMeta?.total_items,
              onPageChange: setDobPage,
            }}
          />
        </div>
      )}

      {/* 4. Payment Report */}
      {activeTab === 'payments' && (
        <div>
          <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={payStatus} onChange={(e) => { setPayStatus(e.target.value); setPayPage(1); }} style={{ width: '150px' }}>
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <select value={payType} onChange={(e) => { setPayType(e.target.value); setPayPage(1); }} style={{ width: '150px' }}>
                <option value="">All Types</option>
                <option value="registration">Registration</option>
                <option value="renewal">Renewal</option>
              </select>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem' }}>From:</span>
                <input type="date" value={payStart} onChange={(e) => { setPayStart(e.target.value); setPayPage(1); }} style={{ padding: '8px 12px', fontSize: '0.9rem' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem' }}>To:</span>
                <input type="date" value={payEnd} onChange={(e) => { setPayEnd(e.target.value); setPayPage(1); }} style={{ padding: '8px 12px', fontSize: '0.9rem' }} />
              </div>
            </div>

            {paymentSummary && (
              <div style={{ display: 'flex', gap: '32px', borderTop: '1px solid var(--color-border)', marginTop: '16px', paddingTop: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>TOTAL FUNDS</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    INR {parseFloat(paymentSummary.total_amount).toFixed(2)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>TRANSACTION COUNT</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {paymentSummary.payment_count} transactions
                  </div>
                </div>
              </div>
            )}
          </div>
          <DataTable
            columns={[
              { key: 'payment_id', header: 'Payment ID', render: (row: any) => row.payment_id.substring(0, 8) + '...' },
              { key: 'membership_number', header: 'Membership No' },
              { key: 'full_name', header: 'Payer Name' },
              { key: 'payment_type', header: 'Type', render: (row: any) => <span style={{ textTransform: 'capitalize' }}>{row.payment_type}</span> },
              { key: 'amount', header: 'Amount Paid', render: (row: any) => `INR ${parseFloat(row.amount).toFixed(2)}` },
              { key: 'paid_at', header: 'Paid Date', render: (row: any) => (row.paid_at ? new Date(row.paid_at).toLocaleDateString() : '-') },
              { key: 'status', header: 'Status', render: (row: any) => <span className={`status-badge ${row.status}`}>{row.status}</span> },
            ]}
            data={paymentItems}
            isLoading={loadingPayments}
            pagination={{
              page: payPage,
              totalPages: paymentMeta?.total_pages ?? 0,
              totalItems: paymentMeta?.total_items,
              onPageChange: setPayPage,
            }}
          />
        </div>
      )}
    </div>
  );
}
