/**
 * Footer
 *
 * Site-wide footer rendered on public (landing/legal) pages. Displays the
 * MacroTrack brand, social links, and navigation links to Resources and Legal
 * pages, along with a dynamic copyright year.
 *
 * Props:
 *   None
 *
 * Used in: LandingPage, FeaturesPage, NutritionGuidePage, PrivacyPolicy,
 *          TermsOfService
 */
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Footer.css';

function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-grid">

                    {/* Brand Section */}
                    <div className="footer-section">
                        <Link to="/" className="footer-logo">MACROTRACK</Link>
                        <p className="footer-tagline">
                            Science-backed nutrition tracking for everyone
                        </p>

                        <div className="footer-social">
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Facebook">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                </svg>
                            </a>

                            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Twitter">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                                </svg>
                            </a>

                            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="GitHub">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Resources Section */}
                    <div className="footer-section">
                        <h4 className="footer-heading">Resources</h4>
                        <ul className="footer-links">
                            <li>
                                <Link to="/nutrition-guide">Nutrition Guide</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal Section */}
                    <div className="footer-section">
                        <h4 className="footer-heading">Legal</h4>
                        <ul className="footer-links">
                            <li>
                                <Link to="/terms-of-service">Terms of Service</Link>
                            </li>
                            <li>
                                <Link to="/privacy-policy">Privacy Policy</Link>
                            </li>
                        </ul>
                    </div>

                </div>

                <div className="footer-bottom">
                    <p>&copy; {currentYear} MacroTrack. All rights reserved.</p>
                    <div className="footer-legal-links">
                        <Link to="/terms-of-service">Terms</Link>
                        <span className="footer-separator">•</span>
                        <Link to="/privacy-policy">Privacy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
