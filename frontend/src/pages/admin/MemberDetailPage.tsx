import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useAdminMember,
  useAdminUpdateMember,
  useAdminDeleteMember,
  useAdminAddFamilyMember,
  useAdminUpdateFamilyMember,
  useAdminRemoveFamilyMember,
} from '../../hooks/useAdminQueries';

export function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();

  const [editMode, setEditMode] = useState(false);
  const [headName, setHeadName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [memberStatus, setMemberStatus] = useState<string>('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [editingFamilyMember, setEditingFamilyMember] = useState<any>(null);
  const [fmName, setFmName] = useState('');
  const [fmDob, setFmDob] = useState('');
  const [fmGender, setFmGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say'>('male');
  const [fmRelationship, setFmRelationship] = useState('');

  const { data: memberData, isLoading, refetch } = useAdminMember(memberId!);

  const updateMemberMutation = useAdminUpdateMember(memberId!);
  const deleteMemberMutation = useAdminDeleteMember();
  const addFamilyMemberMutation = useAdminAddFamilyMember(memberData?.data?.family?.id ?? '', memberId!);
  const updateFamilyMemberMutation = useAdminUpdateFamilyMember(memberData?.data?.family?.id ?? '', memberId!);
  const removeFamilyMemberMutation = useAdminRemoveFamilyMember(memberData?.data?.family?.id ?? '', memberId!);

  const member = memberData?.data;

  const startEdit = () => {
    if (!member) return;
    setHeadName(member.user.full_name);
    setPhone(member.family.mobile_number);
    setEmail(member.user.email);
    setAddress(member.family.address);
    setMemberStatus(member.membership.status);
    setEditMode(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMemberMutation.mutateAsync({
        head_name: headName,
        phone,
        email,
        address,
        status: memberStatus,
      });
      setEditMode(false);
      refetch();
      alert('Member updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update member');
    }
  };

  const handleDelete = async () => {
    if (!deleteReason.trim()) return;
    try {
      await deleteMemberMutation.mutateAsync({
        memberId: memberId!,
        reason: deleteReason,
      });
      alert('Member record soft deleted.');
      navigate('/admin/members');
    } catch (err: any) {
      alert(err.message || 'Failed to delete member');
    }
  };

  const handleFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFamilyMember) {
        await updateFamilyMemberMutation.mutateAsync({
          familyMemberId: editingFamilyMember.id,
          payload: {
            name: fmName,
            date_of_birth: fmDob,
            gender: fmGender,
            relationship: fmRelationship,
          },
        });
      } else {
        await addFamilyMemberMutation.mutateAsync({
          name: fmName,
          date_of_birth: fmDob,
          gender: fmGender,
          relationship: fmRelationship,
        });
      }
      setShowFamilyModal(false);
      setEditingFamilyMember(null);
      setFmName('');
      setFmDob('');
      setFmRelationship('');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to update family member');
    }
  };

  const handleFamilyDelete = async (fmId: string) => {
    const reason = prompt('Please enter a reason for removing this family member:');
    if (!reason) return;
    try {
      await removeFamilyMemberMutation.mutateAsync({
        familyMemberId: fmId,
        reason,
      });
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to remove family member');
    }
  };

  const openFamilyAdd = () => {
    setEditingFamilyMember(null);
    setFmName('');
    setFmDob('');
    setFmGender('male');
    setFmRelationship('');
    setShowFamilyModal(true);
  };

  const openFamilyEdit = (fm: any) => {
    setEditingFamilyMember(fm);
    setFmName(fm.name);
    setFmDob(fm.date_of_birth);
    setFmGender(fm.gender);
    setFmRelationship(fm.relationship);
    setShowFamilyModal(true);
  };

  if (isLoading) {
    return (
      <div className="skeleton-container">
        <div className="skeleton" style={{ height: '40px', width: '250px', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius)' }} />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">🔎</span>
        <h3 className="empty-state-title">Record Not Found</h3>
        <p className="empty-state-desc">The requested member record does not exist or has been deleted.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">👤 {member.user.full_name}</h1>
          <p className="member-subtitle">Membership Number: <strong>{member.membership.membership_number}</strong></p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="button button-outline" onClick={() => navigate('/admin/members')}>
            Back to List
          </button>
          {!editMode && (
            <button className="button button-primary" onClick={startEdit}>
              📝 Edit Profile
            </button>
          )}
          <button className="button button-accent" style={{ background: 'var(--color-error)' }} onClick={() => setShowDeleteModal(true)}>
            🗑️ Delete Member
          </button>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Left Card: Member Info */}
        <div className="card" style={{ padding: '24px' }}>
          <h3>Member Profile</h3>
          {editMode ? (
            <form onSubmit={handleUpdate} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={headName} onChange={(e) => setHeadName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Mobile Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} />
              </div>
              <div className="form-group">
                <label>Membership Status</label>
                <select value={memberStatus} onChange={(e) => setMemberStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="pending_payment">Pending Payment</option>
                  <option value="expired">Expired</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="button button-primary" style={{ flex: 1 }}>Save</button>
                <button type="button" className="button button-outline" onClick={() => setEditMode(false)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>STATUS</span>
                <div>
                  <span className={`status-badge ${member.membership.status}`} style={{ marginTop: '4px' }}>
                    {member.membership.status}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>EMAIL ADDRESS</span>
                <div style={{ fontWeight: 700 }}>{member.user.email}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>MOBILE PHONE</span>
                <div style={{ fontWeight: 700 }}>{member.family.mobile_number}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>POSTAL ADDRESS</span>
                <div style={{ fontWeight: 700 }}>{member.family.address}</div>
              </div>
              <div className="grid grid-2" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Start Date</span>
                  <div style={{ fontWeight: 700 }}>{member.membership.start_date ? new Date(member.membership.start_date).toLocaleDateString() : '-'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Expiry Date</span>
                  <div style={{ fontWeight: 700 }}>{member.membership.expiry_date ? new Date(member.membership.expiry_date).toLocaleDateString() : '-'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Card: Family Members */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0 }}>👥 Family Members</h3>
            <button className="button button-outline" style={{ minHeight: 'auto', padding: '6px 12px', fontSize: '0.85rem' }} onClick={openFamilyAdd}>
              ➕ Add Member
            </button>
          </div>

          {member.family_members.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>No family members linked to this record.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {member.family_members.map((fm: any) => (
                <div key={fm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{fm.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                      {fm.relationship} &bull; {fm.gender} &bull; DOB: {new Date(fm.date_of_birth).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="button button-outline" style={{ minHeight: 'auto', padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => openFamilyEdit(fm)}>
                      ✏️
                    </button>
                    <button className="button button-outline" style={{ minHeight: 'auto', padding: '4px 8px', fontSize: '0.8rem', color: 'var(--color-error)', borderColor: 'var(--color-border)' }} onClick={() => handleFamilyDelete(fm.id)}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '24px', paddingTop: '20px' }}>
            <h3>💳 Payment Summary</h3>
            <div className="grid grid-2" style={{ marginTop: '12px' }}>
              <div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Total Amount Paid</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  INR {parseFloat(member.payment_summary.total_paid).toFixed(2)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Last Transaction Date</span>
                <div style={{ fontWeight: 700 }}>
                  {member.payment_summary.last_payment_at ? new Date(member.payment_summary.last_payment_at).toLocaleDateString() : 'No payments'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', padding: '24px' }}>
            <h3 style={{ color: 'var(--color-error)' }}>⚠️ Delete Member Account</h3>
            <p style={{ margin: '12px 0', fontSize: '0.95rem' }}>
              Are you sure you want to soft delete the membership record for <strong>{member.user.full_name}</strong>? This action is audited and will disable login.
            </p>
            <div className="form-group">
              <label>Reason for deletion *</label>
              <input type="text" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="e.g. Relocated out of samaj limits / Duplicate profile" required />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button className="button button-accent" style={{ background: 'var(--color-error)', flex: 1 }} onClick={handleDelete} disabled={!deleteReason.trim()}>
                Confirm Delete
              </button>
              <button className="button button-outline" style={{ flex: 1 }} onClick={() => { setShowDeleteModal(false); setDeleteReason(''); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Family Member Add/Edit Modal */}
      {showFamilyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%', padding: '24px' }}>
            <h3>{editingFamilyMember ? '✏️ Edit Family Member' : '➕ Add Family Member'}</h3>
            <form onSubmit={handleFamilySubmit} style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" value={fmName} onChange={(e) => setFmName(e.target.value)} required placeholder="e.g. Suman Kumbhad" />
              </div>
              <div className="form-group">
                <label>Date of Birth *</label>
                <input type="date" value={fmDob} onChange={(e) => setFmDob(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Gender *</label>
                <select value={fmGender} onChange={(e: any) => setFmGender(e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer Not To Say</option>
                </select>
              </div>
              <div className="form-group">
                <label>Relationship *</label>
                <input type="text" value={fmRelationship} onChange={(e) => setFmRelationship(e.target.value)} required placeholder="e.g. Spouse / Son / Daughter" />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="button button-primary" style={{ flex: 1 }}>Save Member</button>
                <button type="button" className="button button-outline" style={{ flex: 1 }} onClick={() => setShowFamilyModal(false)}>
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
