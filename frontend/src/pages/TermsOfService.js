/**
 * TermsOfService
 *
 * Static legal page that displays MacroTrack's terms of service. Includes a
 * back-navigation button so users can return to wherever they came from.
 *
 * Props:
 *   None
 *
 * Used in: App.js (route: '/terms-of-service')
 */
import React from "react";
import { useNavigate } from "react-router-dom";

function TermsOfService() {
    const navigate = useNavigate();

    return (
        <div className="legal-page">
            <div className="legal-container">
                <button className="btn-back" onClick={() => navigate(-1)}>
                    ← Back
                </button>

                <div className="legal-header">
                    <h1>Terms of Service</h1>
                    <p className="legal-date">Last Updated: January 19, 2026</p>
                </div>

                <div className="legal-content">
                    <section className="legal-section">
                        <h2>1. Acceptance of Terms</h2>
                        <p>
                            By accessing and using MacroTrack ("the Service"), you accept and agree to be bound by these terms. If you do not agree, please do not use the Service.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>2. Description of Service</h2>
                        <p>
                            MacroTrack is a nutrition tracking application that helps users monitor food intake, track calories and macronutrients, and receive nutrition insights. Features include:
                        </p>
                        <ul>
                            <li>Food diary and meal logging</li>
                            <li>Nutrition database integration</li>
                            <li>Progress tracking and reporting</li>
                            <li>Weight logging and trend analysis</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h2>3. Medical Disclaimer</h2>
                        <div className="warning-box">
                            <p><strong>IMPORTANT: MacroTrack is NOT a medical device or medical service.</strong></p>
                            <ul>
                                <li>The Service is for informational and educational purposes only</li>
                                <li>It is not intended to diagnose, treat, cure, or prevent any disease</li>
                                <li>It is not a substitute for professional medical advice</li>
                                <li>Always consult a qualified health provider about medical conditions</li>
                            </ul>
                        </div>
                    </section>

                    <section className="legal-section">
                        <h2>4. Eating Disorder Warning</h2>
                        <div className="warning-box">
                            <p><strong>If you have or suspect an eating disorder, please seek professional help immediately.</strong></p>
                            <p>Calorie counting may be harmful for individuals with eating disorders including anorexia, bulimia, or binge eating disorder.</p>
                            <p><strong>Nepal Mental Health Helpline:</strong> 1166</p>
                            <p><strong>UK Beat Eating Disorders:</strong> 0808 801 0677</p>
                        </div>
                    </section>

                    <section className="legal-section">
                        <h2>5. User Eligibility</h2>
                        <ul>
                            <li><strong>Minimum Age:</strong> You must be at least 13 years old</li>
                            <li><strong>Parental Consent:</strong> Users aged 13-17 require parental consent</li>
                            <li><strong>Accuracy:</strong> You must provide accurate information</li>
                            <li><strong>Account Security:</strong> You are responsible for your account credentials</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h2>6. User Responsibilities</h2>
                        <p>You agree NOT to:</p>
                        <ul>
                            <li>Use the Service for any illegal purpose</li>
                            <li>Violate any applicable laws</li>
                            <li>Impersonate any person or entity</li>
                            <li>Interfere with or disrupt the Service</li>
                            <li>Attempt unauthorised access to any part of the Service</li>
                            <li>Use automated systems (bots, scrapers) without permission</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h2>7. Intellectual Property</h2>
                        <p>The Service uses third-party technologies under their respective licenses:</p>
                        <ul>
                            <li><strong>FatSecret API:</strong> Used according to their Terms of Service</li>
                        </ul>
                        <p>You retain ownership of your content (food logs, notes). By using the Service, you grant us a license to process this content solely for providing the Service.</p>
                    </section>

                    <section className="legal-section">
                        <h2>8. Privacy and Data Protection</h2>
                        <p>Your use of the Service is governed by our <button className="btn-link" onClick={() => navigate('/privacy-policy')}>Privacy Policy</button>, which complies with:</p>
                        <ul>
                            <li>Nepal's Privacy Act 2075</li>
                            <li>UK General Data Protection Regulation (UK GDPR)</li>
                            <li>UK Data Protection Act 2018</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h2>9. Accessibility</h2>
                        <p>In accordance with the UK Equality Act 2010, we are committed to making MacroTrack accessible to all users, including those with disabilities. Our accessibility features include:</p>
                        <ul>
                            <li>High contrast design for visual clarity</li>
                            <li>Semantic HTML structure for screen reader compatibility</li>
                            <li>Keyboard navigation support</li>
                            <li>Clear, readable typography</li>
                        </ul>
                        <p>If you experience accessibility issues, please contact us at accessibility@macrotrack.com.np</p>
                    </section>

                    <section className="legal-section">
                        <h2>10. Termination</h2>
                        <p>You may delete your account at any time through profile settings. Upon deletion, all your personal data will be permanently removed within 30 days, in accordance with your right to erasure under data protection laws.</p>
                        <p>We may suspend accounts that violate these Terms or engage in illegal activity.</p>
                    </section>

                    <section className="legal-section">
                        <h2>11. Limitation of Liability</h2>
                        <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR:</p>
                        <ul>
                            <li>Indirect, incidental, or consequential damages</li>
                            <li>Health issues arising from use of the Service</li>
                            <li>Inaccurate nutrition information</li>
                            <li>Decisions made based on Service information</li>
                        </ul>
                    </section>

                    <section className="legal-section">
                        <h2>12. Governing Law</h2>
                        <p>These Terms are governed by the laws of the Federal Democratic Republic of Nepal, including:</p>
                        <ul>
                            <li>Privacy Act 2075 (2018)</li>
                            <li>Electronic Transactions Act 2063 (2008)</li>
                            <li>Consumer Protection Act 2075 (2018)</li>
                        </ul>
                        <p>Where applicable, we also comply with UK GDPR and the Equality Act 2010.</p>
                    </section>

                    <section className="legal-section">
                        <h2>13. Dispute Resolution</h2>
                        <p>Disputes shall be resolved through:</p>
                        <ol>
                            <li>Informal negotiation via legal@macrotrack.com.np</li>
                            <li>Mediation in Kathmandu, Nepal</li>
                            <li>Courts of Kathmandu, Nepal (exclusive jurisdiction)</li>
                        </ol>
                    </section>

                    <section className="legal-section">
                        <h2>14. Contact Information</h2>
                        <div className="contact-info">
                            <p><strong>General:</strong> support@macrotrack.com.np</p>
                            <p><strong>Legal:</strong> legal@macrotrack.com.np</p>
                            <p><strong>Accessibility:</strong> accessibility@macrotrack.com.np</p>
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

export default TermsOfService;
