import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';

export function Header() {
  const { status } = useAuth();
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <header className={`header ${isNavOpen ? 'nav-open' : ''}`}>
      <div className="container">
        <Link to="/" className="logo" onClick={() => setIsNavOpen(false)}>
          <span>Kumbhad Samaj Trust</span>
        </Link>
        <nav className="nav">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsNavOpen(false)}>Home</NavLink>
          <NavLink to="/about" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsNavOpen(false)}>About Us</NavLink>
          <NavLink to="/membership-benefits" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsNavOpen(false)}>Benefits</NavLink>
          <NavLink to="/events" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsNavOpen(false)}>Events</NavLink>
          <NavLink to="/gallery" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsNavOpen(false)}>Gallery</NavLink>
          <NavLink to="/contact" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setIsNavOpen(false)}>Contact</NavLink>
        </nav>
        <div className="actions">
          {status === 'authenticated' ? (
            <Link to="/member/dashboard" className="button button-primary">Dashboard</Link>
          ) : (
            <>
              <Link to="/member/login" className="button button-outline">Login</Link>
              <Link to="/become-member" className="button button-primary">Become a Member</Link>
            </>
          )}
        </div>
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setIsNavOpen(!isNavOpen)}
          aria-label="Toggle Menu"
        >
          {isNavOpen ? '✕' : '☰'}
        </button>
      </div>
    </header>
  );
}
