import { Link } from 'react-router-dom';
import { PageShell } from '../../components/layout/PageShell';

export function BenefitsPage() {
  return (
    <PageShell
      title="Membership Benefits"
      description="Understand why joining the Kumbhad Samaj Trust is a valuable step for your family."
    >
      <section className="section section-alt">
        <div className="container">
          <h2>Why Become a Member?</h2>
          <div className="grid grid-2" style={{ marginTop: '40px' }}>
            <div className="card">
              <h3>Community Network</h3>
              <p>Gain access to a large network of community families for matrimonial, professional, and social support.</p>
            </div>
            <div className="card">
              <h3>Educational Support</h3>
              <p>Eligibility for community-funded scholarships and educational counseling for children.</p>
            </div>
            <div className="card">
              <h3>Event Invitations</h3>
              <p>Priority access and information regarding all Samaj events, medical camps, and festivals.</p>
            </div>
            <div className="card">
              <h3>Trust Voting Rights</h3>
              <p>Contribute to the decision-making process of the Trust and vote in committee elections.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Registration Eligibility</h2>
          <div className="card" style={{ marginTop: '30px', background: '#f8fafc' }}>
            <ul style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '12px' }}>Open to all families belonging to the Kumbhad Samaj.</li>
              <li style={{ marginBottom: '12px' }}>A family registration covers the head of the family, spouse, and dependent children.</li>
              <li style={{ marginBottom: '12px' }}>A valid identity proof (Aadhar/Voter ID) must be presented if requested by the committee.</li>
              <li style={{ marginBottom: '12px' }}>Initial membership is valid for one year and must be renewed annually.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section section-alt text-center">
        <div className="container">
          <h2>Ready to secure your family's future?</h2>
          <p className="mb-8" style={{ marginTop: '16px' }}>Registration is quick, secure, and entirely online.</p>
          <Link to="/become-member" className="button button-primary">Apply for Membership</Link>
        </div>
      </section>
    </PageShell>
  );
}
