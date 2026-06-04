import { PageShell } from '../../components/layout/PageShell';

export function ContactPage() {
  return (
    <PageShell
      title="Contact Us"
      description="Have questions or need assistance? Reach out to the Kumbhad Samaj Trust office."
    >
      <section className="section section-alt">
        <div className="container">
          <div className="grid grid-2">
            <div className="card">
              <h3>Office Details</h3>
              <div style={{ marginTop: '24px' }}>
                <p><strong>Address:</strong><br />123, Trust Bhavan, Samaj Road,<br />Kumbhad Village, Gujarat - 360001</p>
                <p style={{ marginTop: '16px' }}><strong>Phone:</strong><br />+91 98765 43210</p>
                <p style={{ marginTop: '16px' }}><strong>Email:</strong><br />contact@kumbhadsamaj.org</p>
                <p style={{ marginTop: '16px' }}><strong>Office Hours:</strong><br />Mon - Sat: 10:00 AM - 6:00 PM<br />Sunday: Closed</p>
              </div>
            </div>
            <div>
              <div className="card">
                <h3>Send a Message</h3>
                <form className="mt-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="form-group">
                    <label>Your Name</label>
                    <input type="text" placeholder="Enter your full name" />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" placeholder="email@example.com" />
                  </div>
                  <div className="form-group">
                    <label>Message</label>
                    <textarea rows={4} placeholder="How can we help you?"></textarea>
                  </div>
                  <button type="submit" className="button button-primary" style={{ width: '100%' }}>Send Message</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

    </PageShell>
  );
}
