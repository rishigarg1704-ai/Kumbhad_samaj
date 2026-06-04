import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import type { ReactNode } from 'react';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { AboutPage } from './pages/public/AboutPage';
import { BenefitsPage } from './pages/public/BenefitsPage';
import { ContactPage } from './pages/public/ContactPage';
import { EventsPage } from './pages/public/EventsPage';
import { GalleryPage } from './pages/public/GalleryPage';
import { TermsPage, PrivacyPage, RefundPage } from './pages/public/LegalPages';
import { BecomeMemberPage } from './pages/public/BecomeMemberPage';
import { RegistrationStatusPage } from './pages/public/RegistrationStatusPage';
import { MemberLoginPage, AdminLoginPage } from './pages/public/LoginPage';
import { Admin2faPage } from './pages/public/Admin2faPage';
import { AdminForgotPasswordPage } from './pages/public/AdminForgotPasswordPage';
import { AdminResetPasswordPage } from './pages/public/AdminResetPasswordPage';
import { PageShell } from './components/layout/PageShell';

// Member Portal layout and pages
import { MemberLayout } from './components/layout/MemberLayout';
import { DashboardPage } from './pages/member/DashboardPage';
import { MembershipPage } from './pages/member/MembershipPage';
import { FamilyPage } from './pages/member/FamilyPage';
import { PaymentsPage } from './pages/member/PaymentsPage';
import { RenewalPage } from './pages/member/RenewalPage';
import { RenewalStatusPage } from './pages/member/RenewalStatusPage';
import { NotificationsPage } from './pages/member/NotificationsPage';

// Admin Portal layouts and pages
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { MembersPage as AdminMembersPage } from './pages/admin/MembersPage';
import { MemberDetailPage as AdminMemberDetailPage } from './pages/admin/MemberDetailPage';
import { PaymentsPage as AdminPaymentsPage } from './pages/admin/PaymentsPage';
import { FeesPage as AdminFeesPage } from './pages/admin/FeesPage';
import { EventsPage as AdminEventsPage } from './pages/admin/EventsPage';
import { GalleryPage as AdminGalleryPage } from './pages/admin/GalleryPage';
import { ReportsPage as AdminReportsPage } from './pages/admin/ReportsPage';
import { AuditLogsPage as AdminAuditLogsPage } from './pages/admin/AuditLogsPage';
import { SettingsPage as AdminSettingsPage } from './pages/admin/SettingsPage';

// Component for protected routes
function ProtectedRoute({ role, children }: { role: 'member' | 'admin'; children: ReactNode }) {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <PageShell title="Loading Session" description="Verifying your digital identity...">
        <div className="section"><div className="container text-center">Please wait...</div></div>
      </PageShell>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to={role === 'member' ? '/member/login' : '/admin/login'} replace />;
  }

  if (!user || user.role !== role) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/membership-benefits" element={<BenefitsPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/gallery" element={<GalleryPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/refund" element={<RefundPage />} />
      
      {/* Registration Flow */}
      <Route path="/become-member" element={<BecomeMemberPage />} />
      <Route path="/registration/status/:paymentId" element={<RegistrationStatusPage />} />

      {/* Auth */}
      <Route path="/member/login" element={<MemberLoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/2fa" element={<Admin2faPage />} />
      <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
      <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />

      {/* Member Portal */}
      <Route
        path="/member"
        element={
          <ProtectedRoute role="member">
            <MemberLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="membership" element={<MembershipPage />} />
        <Route path="family" element={<FamilyPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="renew" element={<RenewalPage />} />
        <Route path="renew/status/:paymentId" element={<RenewalStatusPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Admin Portal */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="members" element={<AdminMembersPage />} />
        <Route path="members/:memberId" element={<AdminMemberDetailPage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="fees" element={<AdminFeesPage />} />
        <Route path="events" element={<AdminEventsPage />} />
        <Route path="gallery" element={<AdminGalleryPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Generic Pages */}
      <Route path="/403" element={<PageShell title="403 Forbidden" description="You do not have access to this page." children={<div className="section" />} />} />
      <Route path="/404" element={<PageShell title="404 Not Found" description="The page you requested does not exist." children={<div className="section" />} />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
