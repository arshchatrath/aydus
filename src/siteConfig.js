/**
 * Single source of truth for site branding and copy.
 *
 * Starting a new project from this template? Edit `.env` (wordmark, company
 * name, contact email, meta title/description — shared with index.html) and
 * the fields below (nav links, hero copy) instead of hunting through
 * Navbar.jsx / Hero.jsx / Footer.jsx / Sections.jsx individually.
 */
export const siteConfig = {
  brand: {
    // Navbar wordmark.
    name: import.meta.env.VITE_BRAND_NAME || 'BRAND',
    // Hero glass-panel logo — swap the file at public/logo.png for your real mark.
    logoSrc: '/logo.png',
    logoAlt: `${import.meta.env.VITE_BRAND_NAME || 'BRAND'} logo`,
  },
  company: {
    // Oversized footer wordmark.
    name: import.meta.env.VITE_COMPANY_NAME || 'COMPANY',
  },
  nav: [
    { label: 'Home', href: '#home' },
    { label: 'Work', href: '#work' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ],
  hero: {
    heading: 'Attention is the last scarce resource',
    body: 'Building is commoditized — AI can write the code, design the product, run the operation. The one thing getting more difficult, and more expensive, every year is human attention. That battle is fought on social media, and we are kingmakers in it.',
  },
  contact: {
    email: import.meta.env.VITE_CONTACT_EMAIL || 'hello@studio.example',
  },
};
