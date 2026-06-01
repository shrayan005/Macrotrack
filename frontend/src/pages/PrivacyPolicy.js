/**
 * PrivacyPolicy
 *
 * Static legal page that displays MacroTrack's privacy policy. Includes a
 * back-navigation button so users can return to wherever they came from.
 *
 * Props:
 *   None
 *
 * Used in: App.js (route: '/privacy-policy')
 */
import React from "react";
import { useNavigate } from "react-router-dom";

function PrivacyPolicy() {
    const navigate = useNavigate();

    return (
        <div className="legal-page">
            <div className="legal-container">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    ← Back
                </button>

                <div className="legal-header">
                    <h1>Privacy Policy</h1>
                    <p className="legal-date">Last Updated: January 19, 2026</p>
                </div>

                <div className="legal-content">
                    <section className="legal-section">
                        <h2>1. Introduction</h2>
                        <p>
                            MacroTrack ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information in accordance with Nepal's Privacy Act 2075 and the UK General Data Protection Regulation (UK GDPR).
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>2. Information We Collect</h2>
                        <p>We practice <strong>data minimisation</strong>—we only collect information necessary to provide the Service:</p>

                        <h3>2.1 Account Information</h3>
                        <ul>
                            <li>Email address and username</li>
                            <li>Password (encrypted, never stored in plain text)</li>
                            <li>Date of birth (for age verification)</li>
                        </ul>

                        <h3>2.2 Health & Nutrition Data</h3>
                        <ul>
                            <li>Height, weight, and goal weight</li>
                            <li>Food diary entries and meal logs</li>
                            <li>Daily notes and activity levels</li>
                        </ul>

                        <h3>2.3 Technical Data</h3>
                        <ul>
                            <li>Browser type and operating system</li>
                            <li>IP address (for security purposes)</li>
                        </ul>

                        <p><strong>We do NOT collect:</strong> Location data, contacts, or any data not necessary for nutrition tracking.</p>
                    </section>

                    <section className="legal-section">
                        <h2>3. Legal Basis for Processing (UK GDPR)</h2>
                        <p>We process your data based on:</p>
                        <ul>
                            <li><strong>Consent:</strong> You agree to this policy when creating an account</li>
                            <li><strong>Contract:</strong> Processing is necessary to provide the Service you requested</li>
                            <li><strong>Legitimate Interest:</strong> For security, fraud prevention, and service improvement</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h2>4. How We Use Your Information</h2>
                        <ul>
                            <li><strong>Service Delivery:</strong> Nutrition tracking, calorie calculations, and reports</li>
                            <li><strong>Account Management:</strong> Authentication and communication</li>
                            <li><strong>Security:</strong> Detecting and preventing fraud or abuse</li>
                        </ul>
                        <p><strong>We do NOT:</strong> Sell your data to third parties or use it for advertising.</p>
                    </section>

                    <section className="legal-section">
                        <h2>5. Data Security</h2>
                        <ul>
                            <li><strong>Encryption in Transit:</strong> All data transmitted via HTTPS/TLS</li>
                            <li><strong>Password Hashing:</strong> Passwords hashed using PBKDF2 with SHA256</li>
                            <li><strong>Secure Storage:</strong> API keys stored in environment variables, not in code</li>
                            <li><strong>Access Control:</strong> Token-based authentication for all API requests</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h2>6. Third-Party Services</h2>

                        <h3>6.1 FatSecret API</h3>
                        <p>Provides nutrition data. Search queries are sent to FatSecret. See <a href="https://www.fatsecret.com/Default.aspx?pa=privacy" target="_blank" rel="noopener noreferrer">FatSecret's Privacy Policy</a>.</p>

                        <h3>6.2 Google OAuth</h3>
                        <p>If you sign in with Google, authentication is handled by Google. See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a>.</p>

                    </section>

                    <section className="legal-section">
                        <h2>7. Your Rights</h2>
                        <p>Under Nepal's Privacy Act 2075 and UK GDPR, you have the following rights:</p>

                        <h3>7.1 Right to Access</h3>
                        <p>View all your personal data through the app interface or request a copy via privacy@macrotrack.com.np</p>

                        <h3>7.2 Right to Rectification</h3>
                        <p>Correct inaccurate information through your profile settings at any time.</p>

                        <h3>7.3 Right to Erasure ("Right to be Forgotten")</h3>
                        <p>Delete your account through profile settings. This permanently removes:</p>
                        <ul>
                            <li>All account and profile information</li>
                            <li>All food diary entries and meal logs</li>
                            <li>All weight logs and progress data</li>
                            <li>All daily notes</li>
                        </ul>
                        <p>Deletion is completed within 30 days of your request.</p>

                        <h3>7.4 Right to Data Portability</h3>
                        <p>Request your data in a machine-readable format by contacting privacy@macrotrack.com.np</p>

                        <h3>7.5 Right to Withdraw Consent</h3>
                        <p>Withdraw consent at any time by deleting your account.</p>

                        <h3>7.6 Right to Lodge a Complaint</h3>
                        <p>If you believe your data rights have been violated, you may contact Nepal's relevant authority or, for UK GDPR matters, the UK Information Commissioner's Office (ICO).</p>
                    </section>

                    <section className="legal-section">
                        <h2>8. Data Retention</h2>
                        <p>We retain your data only while your account is active. Upon account deletion, all personal data is permanently removed within 30 days. We may retain anonymised, aggregated data for service improvement.</p>
                    </section>

                    <section className="legal-section">
                        <h2>9. Children's Privacy</h2>
                        <p>MacroTrack is not intended for children under 13. Users aged 13-17 must have parental consent. We do not knowingly collect data from children under 13.</p>
                    </section>

                    <section className="legal-section">
                        <h2>10. International Data Transfers</h2>
                        <p>Your data is primarily stored on servers in Nepal. Some third-party services (nutrition APIs) may process data in other countries. We ensure appropriate safeguards are in place for any international transfers.</p>
                    </section>

                    <section className="legal-section">
                        <h2>11. Cookies</h2>
                        <p>We use only essential cookies and local storage for:</p>
                        <ul>
                            <li>Maintaining your login session</li>
                            <li>Remembering preferences</li>
                            <li>Account security</li>
                        </ul>
                        <p>We do NOT use tracking cookies, analytics cookies, or advertising cookies.</p>
                    </section>

                    <section className="legal-section">
                        <h2>12. Changes to This Policy</h2>
                        <p>We will notify you of material changes by updating the "Last Updated" date and, for significant changes, sending an email notification.</p>
                    </section>

                    <section className="legal-section">
                        <h2>13. Contact Us</h2>
                        <div className="contact-info">
                            <p><strong>Privacy Enquiries:</strong> privacy@macrotrack.com.np</p>
                            <p><strong>Data Protection:</strong> dpo@macrotrack.com.np</p>
                            <p><strong>General Support:</strong> support@macrotrack.com.np</p>
                            <p><strong>Location:</strong> Kathmandu, Nepal</p>
                        </div>
                    </section>
                </div>

                <div className="legal-footer">
                    <button className="btn btn-primary" onClick={() => navigate(-1)}>
                        I Understand
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PrivacyPolicy;
