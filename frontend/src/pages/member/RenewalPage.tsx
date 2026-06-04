import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMemberMembership, useCreateRenewalOrder, useMemberPayments } from '../../hooks/useMemberQueries';
import { getRenewalPaymentStatus } from '../../api';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function RenewalPage() {
  const navigate = useNavigate();
  const { data: membershipData, isLoading: loadMembership } = useMemberMembership();
  const { data: paymentsData } = useMemberPayments({ status: 'pending' });
  const { mutateAsync: createOrder, isPending: creatingOrder } = useCreateRenewalOrder();

  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState('');
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const [orderData, setOrderData] = useState<{
    payment_id: string;
    provider_order_id: string;
    amount: string | number;
    currency: string;
    checkout_key_id: string;
  } | null>(null);

  if (loadMembership) {
    return (
      <div className="skeleton-container">
        <div className="skeleton skeleton-title" style={{ height: '40px', width: '250px', marginBottom: '24px' }} />
        <div className="skeleton" style={{ height: '300px', borderRadius: 'var(--radius)' }} />
      </div>
    );
  }

  const membership = membershipData?.data?.membership;
  const family = membershipData?.data?.family;

  // Determine eligibility
  let isEligible = false;
  let ineligibilityReason = '';

  if (membership) {
    if (membership.status === 'expired') {
      isEligible = true;
    } else if (membership.status === 'suspended') {
      isEligible = false;
      ineligibilityReason = 'Your membership has been suspended. Please contact administration.';
    } else if (membership.status === 'cancelled') {
      isEligible = false;
      ineligibilityReason = 'Your membership has been cancelled.';
    } else if (membership.expiry_date) {
      const expiry = new Date(membership.expiry_date);
      const today = new Date();
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 60) {
        isEligible = true;
      } else {
        isEligible = false;
        ineligibilityReason = `Renewal is only open within 60 days of expiry. Your membership expires in ${diffDays} days on ${expiry.toLocaleDateString()}.`;
      }
    }
  } else {
    ineligibilityReason = 'No active membership found.';
  }

  const handleInitiateRenewal = async () => {
    setError('');
    try {
      if (!membership) return;
      const res = await createOrder(membership.id);
      setOrderData(res.data);
      setStep(2);
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to initiate renewal order.';
      if (msg.includes('already exists') || msg.includes('409')) {
        // Find existing pending renewal payment in payments list
        const pendingRenewal = paymentsData?.data?.items?.find(
          (p) => p.payment_type === 'renewal' && p.status === 'pending'
        );
        if (pendingRenewal) {
          try {
            const detail = await getRenewalPaymentStatus(pendingRenewal.id);
            setOrderData({
              payment_id: detail.data.payment.payment_id,
              provider_order_id: detail.data.payment.provider_order_id,
              amount: detail.data.payment.amount,
              currency: detail.data.payment.currency,
              checkout_key_id: detail.data.payment.provider_order_id ? 'rzp_test_dummy' : ''
            });
            // Try to use the checkout key from environment or fallback
            if (orderData) {
              orderData.checkout_key_id = detail.data.payment.provider_order_id ? 'rzp_test_dummy' : '';
            }
            setOrderData((prev) => prev ? {
              ...prev,
              checkout_key_id: prev.checkout_key_id || 'rzp_test_dummy'
            } : null);
            setStep(2);
            return;
          } catch (fetchErr) {
            console.error('Failed to fetch pending payment details', fetchErr);
          }
        }
      }
      setError(msg);
    }
  };

  const handlePayNow = async () => {
    if (!orderData) return;
    setError('');
    setIsOpeningCheckout(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay payment gateway failed to load. Please check your connection.');
      }

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK is not available.');
      }

      const checkout = new window.Razorpay({
        key: orderData.checkout_key_id || 'rzp_test_dummy',
        amount: Math.round(Number(orderData.amount) * 100),
        currency: orderData.currency,
        name: 'Kumbhad Samaj Trust',
        description: `Membership Renewal ${membership?.membership_number}`,
        order_id: orderData.provider_order_id,
        handler: () => navigate(`/member/renew/status/${orderData.payment_id}`),
        prefill: {
          name: '',
          email: family?.email ?? '',
          contact: family?.mobile_number ?? ''
        },
        notes: {
          payment_type: 'renewal',
          membership_id: membership?.id ?? ''
        },
        modal: {
          ondismiss: () => navigate(`/member/renew/status/${orderData.payment_id}`)
        },
        theme: {
          color: '#1e3a8a'
        }
      });

      checkout.open();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to open Razorpay payment gateway.');
    } finally {
      setIsOpeningCheckout(false);
    }
  };

  return (
    <div>
      <div className="member-header-section">
        <div>
          <h1 className="member-title">🔄 Membership Renewal</h1>
          <p className="member-subtitle">Renew your annual trust membership to continue receiving benefits and updates.</p>
        </div>
      </div>

      {!isEligible ? (
        <div className="empty-state" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <span className="empty-state-icon">🔒</span>
          <h3 className="empty-state-title">Not Eligible for Renewal</h3>
          <p className="empty-state-desc">{ineligibilityReason}</p>
          <Link to="/member/dashboard" className="button button-outline" style={{ textDecoration: 'none' }}>
            Go to Dashboard
          </Link>
        </div>
      ) : step === 1 ? (
        <div className="renewal-confirm">
          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)' }}>Initiate Renewal</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Your membership is currently <strong>{membership?.status?.replace('_', ' ')}</strong>. Initiating renewal will create a secure payment order.
          </p>

          <div style={{ marginTop: '10px' }}>
            <div className="renewal-item">
              <span className="renewal-item-label">Membership Number</span>
              <span className="renewal-item-value">{membership?.membership_number}</span>
            </div>
            {membership?.expiry_date && (
              <div className="renewal-item">
                <span className="renewal-item-label">Current Expiry</span>
                <span className="renewal-item-value">{new Date(membership.expiry_date).toLocaleDateString()}</span>
              </div>
            )}
            <div className="renewal-item">
              <span className="renewal-item-label">Validity Extension</span>
              <span className="renewal-item-value">1 Year (365 Days)</span>
            </div>
          </div>

          {error && <p className="error-text" style={{ textAlign: 'center' }}>{error}</p>}

          <button
            className="button button-primary"
            onClick={handleInitiateRenewal}
            disabled={creatingOrder}
            style={{ width: '100%' }}
          >
            {creatingOrder ? 'Initiating Order...' : 'Proceed to Review'}
          </button>
        </div>
      ) : (
        <div className="renewal-confirm">
          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', textAlign: 'center' }}>Review Renewal Payment</h2>

          <div style={{ margin: '20px 0' }}>
            <div className="renewal-item">
              <span className="renewal-item-label">Membership Number</span>
              <span className="renewal-item-value">{membership?.membership_number}</span>
            </div>
            <div className="renewal-item">
              <span className="renewal-item-label">Validity Extension</span>
              <span className="renewal-item-value">1 Year</span>
            </div>
            <div className="renewal-item renewal-total">
              <span className="renewal-item-label">Renewal Fee</span>
              <span className="renewal-item-value">
                {orderData?.currency} {parseFloat(String(orderData?.amount)).toFixed(2)}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            By proceeding, you agree to our <Link to="/refund" target="_blank">Refund Policy</Link> and terms of membership.
          </p>

          {error && <p className="error-text" style={{ textAlign: 'center' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="button button-outline"
              onClick={() => setStep(1)}
              style={{ flex: 1 }}
              disabled={isOpeningCheckout}
            >
              Back
            </button>
            <button
              className="button button-accent"
              onClick={handlePayNow}
              style={{ flex: 2 }}
              disabled={isOpeningCheckout}
            >
              {isOpeningCheckout ? 'Opening Gateway...' : 'Pay Now 💳'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
