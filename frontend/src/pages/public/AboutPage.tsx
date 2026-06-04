import { PageShell } from '../../components/layout/PageShell';

export function AboutPage() {
  return (
    <PageShell
      title="About Kumbhad Samaj Trust"
      description="Dedicated to the social, cultural, and educational upliftment of our community since 1985."
    >
      <section className="section section-alt">
        <div className="container">
          <div className="grid grid-2">
            <div>
              <h3>Our Mission</h3>
              <p style={{ marginTop: '12px', lineHeight: '1.6' }}>
                To provide a unified platform for the Kumbhad Samaj members to connect, support 
                each other, and pass down our cultural values to the next generation while 
                striving for collective economic, educational, and social progress.
              </p>
            </div>
            <div>
              <h3>Our Vision</h3>
              <p style={{ marginTop: '12px', lineHeight: '1.6' }}>
                A progressive, self-sufficient community where every family is supported, 
                every child has access to quality education, and our cultural identity 
                remains vibrant, cohesive, and strong across the globe.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Trust History</h2>
          <p style={{ marginTop: '16px', lineHeight: '1.7' }}>
            The Kumbhad Samaj Trust was established in 1985 with the vision of bringing together families 
            who share a common heritage and cultural background. What started as small community 
            gatherings in Rajkot has grown into a formal organization committed to the welfare of thousands 
            of families across India and abroad.
          </p>
          <p style={{ marginTop: '16px', lineHeight: '1.7' }}>
            For over four decades, the Trust has worked tirelessly to build community halls, organize cultural 
            gatherings, and support families during times of need. The transition to this digital portal in 2026 
            marks a significant milestone in our modernization journey, allowing transparent record-keeping and 
            easier participation for all members.
          </p>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2>Our Core Objectives</h2>
          <div className="grid grid-3" style={{ marginTop: '30px' }}>
            <div className="card" style={{ background: '#ffffff' }}>
              <h4>Social Welfare</h4>
              <p style={{ marginTop: '8px', color: '#64748b' }}>Supporting families in need and promoting community-wide brotherhood and cohesion.</p>
            </div>
            <div className="card" style={{ background: '#ffffff' }}>
              <h4>Education First</h4>
              <p style={{ marginTop: '8px', color: '#64748b' }}>Providing financial assistance, scholarships, and resources to help students excel.</p>
            </div>
            <div className="card" style={{ background: '#ffffff' }}>
              <h4>Cultural Heritage</h4>
              <p style={{ marginTop: '8px', color: '#64748b' }}>Organizing festivals, lectures, and events that keep our traditions alive and relevant.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Community Activities & Impact</h2>
          <p style={{ marginTop: '16px', lineHeight: '1.7' }}>
            The Trust regularly initiates programs that provide direct support and value to Samaj members:
          </p>
          <div className="grid grid-3" style={{ marginTop: '30px' }}>
            <div className="card">
              <h5>Annual Educational Awards</h5>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '8px' }}>
                Distributing merit-based scholarships and student packages to over 500 children every year.
              </p>
            </div>
            <div className="card">
              <h5>Healthcare Support</h5>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '8px' }}>
                Conducting free medical checkups, blood donation drives, and organizing subsidised treatments.
              </p>
            </div>
            <div className="card">
              <h5>Matrimonial Services</h5>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '8px' }}>
                Facilitating safe and respectful community matchmaking platforms for eligible candidates.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2>Trust Committee</h2>
          <p style={{ marginTop: '8px', color: '#64748b' }}>The Trust is managed by a dedicated committee of members serving with transparency and integrity.</p>
          
          <div className="grid grid-3" style={{ marginTop: '40px' }}>
             <div className="text-center card" style={{ background: '#ffffff', padding: '24px' }}>
                <div style={{ 
                  width: '100px', 
                  height: '100px', 
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', 
                  color: '#ffffff',
                  borderRadius: '50%', 
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 'bold'
                }}>
                  VK
                </div>
                <strong>Shri. Velji Bhai Kumbhad</strong>
                <p style={{ fontSize: '0.9rem', color: '#ea580c', fontWeight: 600, marginTop: '4px' }}>President</p>
             </div>
             
             <div className="text-center card" style={{ background: '#ffffff', padding: '24px' }}>
                <div style={{ 
                  width: '100px', 
                  height: '100px', 
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', 
                  color: '#ffffff',
                  borderRadius: '50%', 
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 'bold'
                }}>
                  MK
                </div>
                <strong>Shri. Mansukh Bhai Kumbhad</strong>
                <p style={{ fontSize: '0.9rem', color: '#ea580c', fontWeight: 600, marginTop: '4px' }}>Secretary</p>
             </div>
             
             <div className="text-center card" style={{ background: '#ffffff', padding: '24px' }}>
                <div style={{ 
                  width: '100px', 
                  height: '100px', 
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', 
                  color: '#ffffff',
                  borderRadius: '50%', 
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  fontWeight: 'bold'
                }}>
                  RK
                </div>
                <strong>Shri. Ratilal Bhai Kumbhad</strong>
                <p style={{ fontSize: '0.9rem', color: '#ea580c', fontWeight: 600, marginTop: '4px' }}>Treasurer</p>
             </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-2">
            <div className="card" style={{ background: '#f8fafc' }}>
              <h3>Trust Registration Details</h3>
              <p style={{ marginTop: '16px', color: '#475569' }}>
                Kumbhad Samaj Trust is officially registered as a public charitable trust:
              </p>
              <ul style={{ marginTop: '16px', paddingLeft: '20px', lineHeight: '2' }}>
                <li><strong>Registration Number:</strong> E-4521 / Rajkot</li>
                <li><strong>Date of Registration:</strong> 12th March 1985</li>
                <li><strong>Governing Act:</strong> Gujarat Public Trusts Act, 1950</li>
                <li><strong>Office Jurisdiction:</strong> Rajkot, Gujarat, India</li>
              </ul>
            </div>
            <div className="card" style={{ background: '#f8fafc' }}>
              <h3>Contact Information</h3>
              <p style={{ marginTop: '16px', color: '#475569' }}>
                Reach us for registrations, verification, or general queries:
              </p>
              <ul style={{ marginTop: '16px', paddingLeft: '20px', lineHeight: '2' }}>
                <li><strong>Office Address:</strong> 123, Trust Bhavan, Samaj Road, Kumbhad, Gujarat - 360001</li>
                <li><strong>Phone Number:</strong> +91 98765 43210</li>
                <li><strong>Email Address:</strong> contact@kumbhadsamaj.org</li>
                <li><strong>Office Hours:</strong> 10:00 AM - 6:00 PM (Monday to Saturday)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
