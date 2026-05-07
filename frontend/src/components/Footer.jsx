import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="glass-footer">
      <div className="footer-content">
        <p className="footer-text">
          Developed by <span className="highlight">Spattapu Kedareshwar</span> for the <span className="highlight">Deccan AI Catalyst Hackathon 2026</span>
        </p>
        <div className="footer-links">
          <a href="https://github.com/Kedareswar13" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="GitHub">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.8 4.8 0 0 0 8 18v4"></path></svg>
          </a>
          <a href="https://www.linkedin.com/in/kedareswar-pattapu-0355bb254/" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="LinkedIn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
