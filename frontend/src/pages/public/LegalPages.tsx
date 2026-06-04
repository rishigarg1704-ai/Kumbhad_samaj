import { PageShell } from '../../components/layout/PageShell';

const LegalContent = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <PageShell title={title} showHero={true}>
    <section className="section section-alt">
      <div className="container">
        <div className="card" style={{ maxWidth: '900px', margin: '0 auto', lineHeight: '1.8' }}>
          {children}
        </div>
      </div>
    </section>
  </PageShell>
);

export function TermsPage() {
  return (
    <LegalContent title="Terms & Conditions">
      <p>Last Updated: June 2026</p>
      <h3 style={{ marginTop: '24px' }}>1. Introduction</h3>
      <p>Welcome to the Kumbhad Samaj Trust website. By accessing and using this platform, you agree to comply with and be bound by the following terms and conditions.</p>
      
      <h3 style={{ marginTop: '24px' }}>2. Membership Eligibility</h3>
      <p>Membership is exclusive to families belonging to the Kumbhad Samaj. The Trust reserves the right to verify community background and cancel memberships that are found to be fraudulent.</p>
      
      <h3 style={{ marginTop: '24px' }}>3. Use of Services</h3>
      <p>Users must provide accurate information during registration. Any misuse of the platform or sharing of false information may lead to suspension of membership.</p>
      
      <h3 style={{ marginTop: '24px' }}>4. Online Payments</h3>
      <p>All membership fees are processed securely. The Trust is not responsible for failures in the third-party payment gateway (Razorpay) but will assist in resolving disputes.</p>
    </LegalContent>
  );
}

export function PrivacyPage() {
  return (
    <LegalContent title="Privacy Policy">
      <p>Last Updated: June 2026</p>
      <h3 style={{ marginTop: '24px' }}>1. Information Collection</h3>
      <p>We collect personal information such as names, dates of birth, addresses, and contact details for the sole purpose of trust membership management.</p>
      
      <h3 style={{ marginTop: '24px' }}>2. Data Usage</h3>
      <p>Your data is used to maintain trust records, process renewals, and send community notifications. We do not sell or share your data with third-party commercial entities.</p>
      
      <h3 style={{ marginTop: '24px' }}>3. Security</h3>
      <p>We implement industry-standard security measures to protect your data. Access to member records is restricted to authorized Trust administrators only.</p>
    </LegalContent>
  );
}

export function RefundPage() {
  return (
    <LegalContent title="Refund & Cancellation Policy">
      <p>Last Updated: June 2026</p>
      <h3 style={{ marginTop: '24px' }}>1. Membership Fees</h3>
      <p>Membership fees and renewal fees are non-refundable once the payment is successful and the membership is activated/extended.</p>
      
      <h3 style={{ marginTop: '24px' }}>2. Failed Transactions</h3>
      <p>If a payment is deducted from your account but the membership is not updated, please wait for 24 hours for the system to reconcile. If it remains pending, contact the Trust office for assistance.</p>
      
      <h3 style={{ marginTop: '24px' }}>3. Cancellations</h3>
      <p>Members can request to deactivate their accounts, but no pro-rata refunds will be provided for the remaining duration of the membership.</p>
    </LegalContent>
  );
}
