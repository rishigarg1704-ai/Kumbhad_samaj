import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { PageShell } from '../../components/layout/PageShell';
import { getRegistrationStatus, type RegistrationStatusResponse } from '../../api';

export function RegistrationStatusPage() {
  const { paymentId } = useParams();
  const [statusResult, setStatusResult] = useState<RegistrationStatusResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!paymentId) return;
    let timer: number;
    const loadStatus = async () => {
      try {
        const result = await getRegistrationStatus(paymentId);
        setStatusResult(result);
        if (result.data.payment.status === 'pending') {
          timer = window.setTimeout(loadStatus, 5000);
        }
      } catch (err) {
        setError('Unable to load payment status.');
      }
    };
    loadStatus();
    return () => clearTimeout(timer);
  }, [paymentId]);

  if (!paymentId) return <Navigate to="/become-member" replace />;

  const status = statusResult?.data.payment.status ?? 'pending';

  return (
    <PageShell title="Registration Status">
      <section className="section">
        <div className="container text-center">
          <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
            {status === 'pending' && (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
                <h3>Payment Pending</h3>
                <p>We are waiting for confirmation from the bank. This usually takes a few seconds.</p>
              </>
            )}
            {status === 'success' && (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>✅</div>
                <h3 style={{ color: 'var(--color-success)' }}>Registration Successful!</h3>
                <p>Welcome to the Kumbhad Samaj Trust. Your membership is now active.</p>
                <div style={{ margin: '24px 0', textAlign: 'left', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                   <p><strong>Membership No:</strong> {statusResult?.data.membership.membership_number}</p>
                   <p><strong>Expiry Date:</strong> {statusResult?.data.membership.expiry_date}</p>
                </div>
                <Link to="/member/login" className="button button-primary" style={{ width: '100%' }}>Login to Member Portal</Link>
              </>
            )}
            {status === 'failed' && (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>❌</div>
                <h3 style={{ color: 'var(--color-error)' }}>Payment Failed</h3>
                <p>Unfortunately, your payment could not be processed. Please try again.</p>
                <Link to="/become-member" className="button button-primary" style={{ width: '100%', marginTop: '20px' }}>Retry Registration</Link>
              </>
            )}
            {error && <p className="error-text mt-4">{error}</p>}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
