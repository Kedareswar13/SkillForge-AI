import React from 'react';
import { Github, Linkedin } from 'lucide-react';
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
            <Github size={20} />
          </a>
          <a href="https://www.linkedin.com/in/kedareswar-pattapu-0355bb254/" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="LinkedIn">
            <Linkedin size={20} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
