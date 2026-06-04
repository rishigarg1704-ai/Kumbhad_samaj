import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdminMembers, useAdminCreateMember } from '../../hooks/useAdminQueries';
import { DataTable } from '../../components/admin/DataTable';

export function MembersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');

  const [isAdding, setIsAdding] = useState(searchParams.get('add') === 'true');
  const [headName, setHeadName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [memberStatus, setMemberStatus] = useState<'active' | 'pending_payment' | 'suspended'>('active');
  const [startDate, setStartDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Queries
  const { data, isLoading, refetch } = useAdminMembers({
    page,
    page_size: 10,
    search: search || undefined,
    status: status || undefined,
  });

  const createMemberMutation = useAdminCreateMember();

  const members = data?.data?.items ?? [];
  const pagination = data?.meta?.pagination;
  const totalPages = pagination?.total_pages ?? 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMemberMutation.mutateAsync({
        head_name: headName,
        phone,
        email,
        address,
        membership_status: memberStatus,
        start_date: memberStatus === 'active' ? startDate : null,
        expiry_date: memberStatus === 'active' ? expiryDate : null,
        family_members: [], // Added dynamically from detail view
      });
      alert('Member created successfully!');
      // reset form
      setHeadName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setStartDate('');
      setExpiryDate('');
      setIsAdding(false);
      setSearchParams({});
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to create member');
    }
  };

  const columns = [
    {
      key: 'membership_number',
      header: 'Membership No',
      render: (row: any) => (
        <Link to={`/admin/members/${row.user_id}`} style={{ fontWeight: 700 }}>
          {row.membership_number ?? 'UNASSIGNED'}
        </Link>
      ),
    },
    { key: 'full_name', header: 'Head of Family' },
    { key: 'email', header: 'Email' },
    { key: 'mobile_number', header: 'Phone' },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <span className={`status-badge ${row.status}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'expiry_date',
      header: 'Expiry Date',
      render: (row: any) => (row.expiry_date ? new Date(row.expiry_date).toLocaleDateString() : '-'),
    },
    {
      key: 'actions',
      header: 'Action',
      render: (row: any) => (
        <Link to={`/admin/members/${row.user_id}`} className="button button-outline" style={{ minHeight: 'auto', padding: '4px 10px', fontSize: '0.85rem' }}>
          Details
        </Link>
      ),
    },
  ];

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">👥 Members & Families</h1>
          <p className="member-subtitle">Manage samaj members, family relationships, statuses, and profiles.</p>
        </div>
        <div>
          {!isAdding ? (
            <button className="button button-primary" onClick={() => setIsAdding(true)}>
              ➕ Add New Member
            </button>
          ) : (
            <button className="button button-outline" onClick={() => { setIsAdding(false); setSearchParams({}); }}>
              Back to List
            </button>
          )}
        </div>
      </div>

      {isAdding ? (
        <div className="card form-card">
          <h3>Create Samaj Membership</h3>
          <form onSubmit={handleCreateMember} style={{ marginTop: '20px' }}>
            <div className="form-group">
              <label>Head of Family Name *</label>
              <input type="text" value={headName} onChange={(e) => setHeadName(e.target.value)} required placeholder="e.g. Rajesh Kumbhad" />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label>Mobile Number *</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="e.g. +919876543210" />
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="e.g. member@example.org" />
              </div>
            </div>

            <div className="form-group">
              <label>Full Postal Address *</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} placeholder="Full correspondence address" />
            </div>

            <div className="form-group">
              <label>Membership Status *</label>
              <select value={memberStatus} onChange={(e: any) => setMemberStatus(e.target.value)}>
                <option value="active">Active (Pre-paid / Manual Setup)</option>
                <option value="pending_payment">Pending Payment (Awaiting Hook)</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {memberStatus === 'active' && (
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Expiry Date *</label>
                  <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
                </div>
              </div>
            )}

            <button type="submit" className="button button-primary" style={{ width: '100%', marginTop: '20px' }} disabled={createMemberMutation.isPending}>
              {createMemberMutation.isPending ? 'Saving...' : 'Create Membership Record'}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, phone, or membership number..."
                style={{ flex: 1, minWidth: '250px' }}
              />
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                style={{ width: '180px' }}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="expired">Expired</option>
                <option value="suspended">Suspended</option>
              </select>
              <button type="submit" className="button button-primary" style={{ minHeight: 'auto' }}>
                Search
              </button>
            </form>
          </div>

          <DataTable
            columns={columns}
            data={members}
            isLoading={isLoading}
            emptyMessage="No members match the query filters."
            emptyIcon="👥"
            pagination={{
              page,
              totalPages,
              totalItems: pagination?.total_items,
              onPageChange: setPage,
            }}
          />
        </>
      )}
    </div>
  );
}
