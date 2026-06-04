import { Link } from 'react-router-dom';
import { PageShell } from '../../components/layout/PageShell';

export function HomePage() {
  return (
    <PageShell
      title="Unity, Strength, and Progress for the Kumbhad Community"
      description="The official digital gateway for official trust memberships, community events, and family heritage."
    >
      <section className="section section-alt">
        <div className="container">
          <div className="grid grid-3">
            <div className="card">
              <h3>Community Growth</h3>
              <p>Join over 800 active families in building a stronger foundation for our collective future.</p>
            </div>
            <div className="card">
              <h3>Secure Membership</h3>
              <p>Modern digital identity for trust members with secure family records and payment history.</p>
            </div>
            <div className="card">
              <h3>Heritage Preserved</h3>
              <p>Documentation of our roots, traditions, and the values that define the Kumbhad Samaj.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: 'center' }}>
            <div>
              <h2>About Kumbhad Samaj Trust</h2>
              <p>
                Founded on the principles of mutual support and community development, the Kumbhad Samaj Trust 
                has been at the forefront of social service for decades. We believe in empowering our 
                youth, supporting our elders, and maintaining the cultural fabric of our community.
              </p>
              <div className="actions" style={{ marginTop: '32px' }}>
                <Link to="/about" className="button button-primary">Learn Our History</Link>
                <Link to="/membership-benefits" className="button button-outline">See Benefits</Link>
              </div>
            </div>
            <div style={{ background: '#e2e8f0', height: '300px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <span style={{ color: '#64748b' }}>Community Spirit Photo</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container text-center">
          <div className="section-title">
            <h2>Ready to join our community?</h2>
            <p>Membership is open to all families of the Kumbhad Samaj. Start your registration today.</p>
          </div>
          <Link to="/become-member" className="button button-accent" style={{ fontSize: '1.25rem', padding: '16px 40px' }}>
            Become a Member
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
