import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { logoutSession } from '../../api';

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await logoutSession();
      navigate('/admin/login');
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
            <NavLink to="/admin/dashboard" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>📊 Dashboard</span>
            </NavLink>
            <NavLink to="/admin/members" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>👥 Members & Families</span>
            </NavLink>
            <NavLink to="/admin/payments" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>💳 Payment Transactions</span>
            </NavLink>
            <NavLink to="/admin/fees" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>⚙️ Fee Configurations</span>
            </NavLink>
            <NavLink to="/admin/events" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>📅 Events Management</span>
            </NavLink>
            <NavLink to="/admin/gallery" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>🖼️ Gallery Albums</span>
            </NavLink>
            <NavLink to="/admin/reports" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>📈 Generate Reports</span>
            </NavLink>
            <NavLink to="/admin/audit-logs" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>📜 Audit Logs</span>
            </NavLink>
            <NavLink to="/admin/settings" className={({ isActive }) => `member-nav-link ${isActive ? 'active' : ''}`}>
              <span>🔧 Trust Settings</span>
            </NavLink>
          </nav>

          <div className="member-sidebar-footer">
            <div className="member-user-info">
              <div className="member-avatar">
                A
              </div>
              <div className="member-user-details">
                <span className="member-user-name">{user?.full_name ?? 'Admin'}</span>
                <span className="member-user-role">Trust Administrator</span>
              </div>
            </div>
            <button className="member-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        <main className="member-content" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
          <div style={{ flex: '1 0 auto' }}>
            <Outlet />
          </div>
          <footer style={{ 
            marginTop: '40px', 
            paddingTop: '20px', 
            borderTop: '1px solid var(--color-border)', 
            textAlign: 'center', 
            fontSize: '0.85rem', 
            color: 'var(--color-text-muted)' 
          }}>
            &copy; {new Date().getFullYear()} Kumbhad Samaj Trust. All rights reserved. (Admin Portal)
          </footer>
        </main>
      </div>
    </div>
  );
}
