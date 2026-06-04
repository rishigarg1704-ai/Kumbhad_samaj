import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <h4>Kumbhad Samaj Trust</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              Strengthening community bonds and preserving our heritage for future generations.
            </p>
          </div>
          <div>
            <h4>Quick Links</h4>
            <Link to="/about">About Us</Link>
            <Link to="/membership-benefits">Membership Benefits</Link>
            <Link to="/events">Upcoming Events</Link>
            <Link to="/gallery">Gallery</Link>
            <Link to="/become-member">Join Us</Link>
          </div>
          <div>
            <h4>Legal</h4>
            <Link to="/terms">Terms & Conditions</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/refund">Refund Policy</Link>
            <Link to="/admin/login" style={{ marginTop: '12px', display: 'block', fontSize: '0.8rem', opacity: 0.6 }}>Admin Portal</Link>
          </div>
          <div>
            <h4>Contact</h4>
            <Link to="/contact">Contact Us</Link>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '12px' }}>
              Office Hours: 10:00 AM - 6:00 PM<br />
              Monday - Saturday
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {currentYear} Kumbhad Samaj Trust. All rights reserved.</p>
          <p>Built for the Community</p>
        </div>
      </div>
    </footer>
  );
}
