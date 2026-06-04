import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useRenewalPaymentStatus } from '../../hooks/useMemberQueries';

export function RenewalStatusPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const [timedOut, setTimedOut] = useState(false);

  const { data: statusData, isLoading, refetch } = useRenewalPaymentStatus(paymentId ?? null);

  const payment = statusData?.data?.payment;
  const membership = statusData?.data?.membership;

  useEffect(() => {
    if (!paymentId) return;
    const timer = setTimeout(() => {
      if (payment?.status === 'pending') {
        setTimedOut(true);
      }
    }, 120000); // 2 minutes
    return () => clearTimeout(timer);
  }, [paymentId, payment?.status]);

  if (isLoading) {
    return (
      <div className="empty-state" style={{ maxWidth: '600px', margin: '40px auto' }}>
        <span className="empty-state-icon" style={{ animation: 'spin 2s linear infinite', display: 'inline-block' }}>🌀</span>
        <h2 className="empty-state-title">Checking Status</h2>
        <p className="empty-state-desc">Checking payment verification status, please wait...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const isPending = payment?.status === 'pending';
  const isSuccess = payment?.status === 'success';
  const isFailed = payment?.status === 'failed' || payment?.status === 'refunded';

  return (
    <div className="empty-state" style={{ maxWidth: '600px', margin: '40px auto', padding: '40px' }}>
      {isSuccess && (
        <>
          <span className="empty-state-icon" style={{ color: 'var(--color-success)' }}>✅</span>
          <h2 className="empty-state-title">Payment Successful!</h2>
          <p className="empty-state-desc" style={{ marginBottom: '24px' }}>
            Thank you! Your membership renewal payment of <strong>{payment?.currency} {parseFloat(String(payment?.amount)).toFixed(2)}</strong> has been processed successfully.
          </p>
          <div className="card" style={{ textAlign: 'left', marginBottom: '24px', background: 'var(--color-bg-off-white)' }}>
            <p style={{ marginBottom: '8px' }}><strong>Membership Number:</strong> {membership?.membership_number}</p>
            <p style={{ marginBottom: '8px' }}><strong>Status:</strong> <span className="status-badge active">{membership?.status}</span></p>
            {membership?.expiry_date && (
              <p><strong>New Expiry Date:</strong> {new Date(membership.expiry_date).toLocaleDateString()}</p>
            )}
          </div>
          <Link to="/member/dashboard" className="button button-primary" style={{ textDecoration: 'none' }}>
            Go to Dashboard
          </Link>
        </>
      )}

      {isFailed && (
        <>
          <span className="empty-state-icon" style={{ color: 'var(--color-error)' }}>❌</span>
          <h2 className="empty-state-title">Payment Failed</h2>
          <p className="empty-state-desc" style={{ marginBottom: '24px' }}>
            Your payment could not be processed. Please try renewing again or contact the trust if fees were deducted.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/member/renew" className="button button-accent" style={{ textDecoration: 'none' }}>
              Try Again 🔄
            </Link>
            <Link to="/member/dashboard" className="button button-outline" style={{ textDecoration: 'none' }}>
              Dashboard
            </Link>
          </div>
        </>
      )}

      {isPending && !timedOut && (
        <>
          <span className="empty-state-icon" style={{ animation: 'spin 2s linear infinite', display: 'inline-block' }}>🌀</span>
          <h2 className="empty-state-title">Verification Pending</h2>
          <p className="empty-state-desc">
            We are waiting for confirmation from the payment provider (Razorpay). This page will automatically update once confirmed.
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </>
      )}

      {isPending && timedOut && (
        <>
          <span className="empty-state-icon">⏳</span>
          <h2 className="empty-state-title">Verification Taking Longer</h2>
          <p className="empty-state-desc" style={{ marginBottom: '24px' }}>
            Verification is taking longer than expected. You can manually refresh or check your dashboard later.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="button button-primary" onClick={() => refetch()}>
              Refresh Status 🔄
            </button>
            <Link to="/member/dashboard" className="button button-outline" style={{ textDecoration: 'none' }}>
              Go to Dashboard
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
