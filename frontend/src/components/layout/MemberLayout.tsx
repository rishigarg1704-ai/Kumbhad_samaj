import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMemberProfile, useMemberNotifications } from '../../hooks/useMemberQueries';
import { logoutSession } from '../../api';

export function MemberLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const { data: profileData } = useMemberProfile();
  const { data: notificationsData } = useMemberNotifications({ status: 'sent', page_size: 1 });

  const unreadCount = notificationsData?.meta?.pagination?.total_items ?? 0;
  const user = profileData?.data;

  const handleLogout = async () => {
    try {
      await logoutSession();
      navigate('/member/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div>
      <button
        className="member-sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '✕ Close Menu' : '☰ Open Menu'}
      </button>

      <div className="member-layout">
        <aside className={`member-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <nav className="member-nav" onClick={() => setSidebarOpen(false)}>
            <NavLink to="/member/dashboard" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>📊 Dashboard</span>
            </NavLink>
            <NavLink to="/member/membership" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>🪪 Membership</span>
            </NavLink>
            <NavLink to="/member/family" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>👥 Family Members</span>
            </NavLink>
            <NavLink to="/member/payments" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>💳 Payment History</span>
            </NavLink>
            <NavLink to="/member/renew" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>🔄 Renew Membership</span>
            </NavLink>
            <NavLink to="/member/notifications" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>🔔 Notifications</span>
              {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </NavLink>
          </nav>

          <div className="member-sidebar-footer">
            <div className="member-user-info">
              <div className="member-avatar">
                {user?.full_name ? user.full_name[0].toUpperCase() : 'M'}
              </div>
              <div className="member-user-details">
                <span className="member-user-name">{user?.full_name ?? 'Member'}</span>
                <span className="member-user-role">Samaj Member</span>
              </div>
            </div>
            <button className="member-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        <main className="member-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
