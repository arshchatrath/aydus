import React from 'react';
import './Footer.css';
import { siteConfig } from './siteConfig';

const Footer = React.memo(function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      {/* Oversized company name */}
      <div className="footer-brand-wrapper">
        <span className="footer-brand-text">{siteConfig.company.name}</span>
      </div>

      {/* Glowing horizontal bars below the name */}
      <div className="footer-bars">
        <span className="bar bar-1"></span>
        <span className="bar bar-2"></span>
        <span className="bar bar-3"></span>
        <span className="bar bar-4"></span>
      </div>

      <p className="footer-copyright">
        &copy; {currentYear} {siteConfig.company.name}. All rights reserved.
      </p>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
