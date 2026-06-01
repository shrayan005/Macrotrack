/**
 * LandingPage
 *
 * Public marketing homepage shown to unauthenticated visitors. Includes hero
 * section, feature highlights, and calls to action that link to the sign-up
 * and login flows. Animates in on mount via an isVisible state flag.
 *
 * Props:
 *   None
 *
 * Used in: App.js (route: '/')
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

import Footer from '../shared/Footer';


function LandingPage() {
  // Triggers CSS fade-in on the nav bar — set to true once on mount
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  // Start the entrance animation immediately after the component mounts
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Smooth-scroll to an anchor section without a hard page jump
  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* HEADER */}
      <header className="landing-header">
        <div className={`landing-nav ${isVisible ? "fade-in" : ""}`}>
          <div className="logo">MACROTRACK</div>

          <div className="nav-buttons">
            <button className="btn-text" onClick={() => navigate("/login")}>
              Sign In
            </button>

            <button className="btn btn-primary" onClick={() => navigate("/signup")}>
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero-section">
        <div className={`hero-content ${isVisible ? "slide-up" : ""}`}>
          <div className="hero-badge">
            <span className="badge-dot"></span>
            Science-Backed Nutrition
          </div>

          <h1 className="hero-title">
            Track Your Nutrition,
            <br />
            <span className="gradient-text">Transform Your Health</span>
          </h1>

          <p className="hero-description">
            Precise calorie tracking with personalized insights. Reach your goals
            with effortless food logging and data-driven coaching. No guesswork, just results.
          </p>

          <div className="hero-buttons">
            <button className="btn btn-primary btn-large pulse" onClick={() => navigate("/signup")}>
              Start Free Today
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            <button className="btn btn-secondary btn-large" onClick={() => navigate("/login")}>
              Sign In
            </button>
          </div>

          <div className="landing-hero-stats">
            <div className="landing-stat-item">
              <div className="landing-stat-number">10K+</div>
              <div className="landing-stat-label">Active Users</div>
            </div>

            <div className="landing-stat-divider"></div>

            <div className="landing-stat-item">
              <div className="landing-stat-number">500K+</div>
              <div className="landing-stat-label">Meals Logged</div>
            </div>

            <div className="landing-stat-divider"></div>

            <div className="landing-stat-item">
              <div className="landing-stat-number">4.9★</div>
              <div className="landing-stat-label">User Rating</div>
            </div>
          </div>
        </div>

        <div className={`hero-visual ${isVisible ? "float" : ""}`}>
          <div className={`chart-container ${isVisible ? "chart-animate" : ""}`}>
            <div className="chart-bar bar-1"></div>
            <div className="chart-bar bar-2"></div>
            <div className="chart-bar bar-3"></div>
            <div className="chart-bar bar-4"></div>
            <div className="chart-bar bar-5"></div>
          </div>

          <div className="floating-card card-1">
            <div className="card-icon">
              🔥
            </div>
            <div className="card-text">
              <div className="card-value">1,850</div>
              <div className="card-label">Calories</div>
            </div>
          </div>

          <div className="floating-card card-2">
            <div className="card-icon">
              💪
            </div>
            <div className="card-text">
              <div className="card-value">+2.5kg</div>
              <div className="card-label">This Week</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-section">
        <div className="section-header">
          <span className="section-badge">Features</span>
          <h2 className="section-title">Everything You Need to Succeed</h2>
          <p className="section-subtitle">
            Powerful tools designed for your journey
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-number">01</div>
            <div className="feature-icon-wrapper">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
            </div>
            <h3>Smart Tracking</h3>
            <p>
              Log meals effortlessly with our intuitive interface. Barcode scanning
              and a comprehensive food database make tracking simple and accurate.
            </p>
            <a href="#smart-tracking" className="feature-link" onClick={(e) => scrollToSection(e, "smart-tracking")}>
              Learn more →
            </a>
          </div>

          <div className="feature-card">
            <div className="feature-number">02</div>
            <div className="feature-icon-wrapper">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
            </div>
            <h3>Personalized Goals</h3>
            <p>
              Set custom calorie and macro targets based on your unique goals.
              Whether bulking, cutting, or maintaining, we've got you covered.
            </p>
            <a href="#personalized-goals" className="feature-link" onClick={(e) => scrollToSection(e, "personalized-goals")}>
              Learn more →
            </a>
          </div>

          <div className="feature-card">
            <div className="feature-number">03</div>
            <div className="feature-icon-wrapper">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
            </div>
            <h3>Progress Analytics</h3>
            <p>
              Visualize your journey with detailed charts and insights. Track weight,
              body measurements, and nutrition trends over time.
            </p>
            <a href="#progress-analytics" className="feature-link" onClick={(e) => scrollToSection(e, "progress-analytics")}>
              Learn more →
            </a>
          </div>

          <div className="feature-card">
            <div className="feature-number">04</div>
            <div className="feature-icon-wrapper">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                  <circle cx="12" cy="9" r="2" />
                  <path d="M9 14h6" />
                  <path d="M9 18h6" />
                </svg>
              </div>
            </div>
            <h3>Coach</h3>
            <p>
              Get personalized recommendations and insights from our AI-powered coach.
              Receive tips, motivation, and guidance tailored to your progress.
            </p>
            <a href="#coach" className="feature-link" onClick={(e) => scrollToSection(e, "coach")}>
              Learn more →
            </a>
          </div>

          <div className="feature-card">
            <div className="feature-number">05</div>
            <div className="feature-icon-wrapper">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
            </div>
            <h3>Meal Planning</h3>
            <p>
              Plan your meals ahead with our meal diary. Copy meals, create templates,
              and build sustainable eating habits.
            </p>
            <a href="#meal-planning" className="feature-link" onClick={(e) => scrollToSection(e, "meal-planning")}>
              Learn more →
            </a>
          </div>

          <div className="feature-card">
            <div className="feature-number">06</div>
            <div className="feature-icon-wrapper">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>
            <h3>Privacy First</h3>
            <p>
              Your data is yours. We use industry-standard encryption and never sell
              your personal information to third parties.
            </p>
            <a href="#privacy" className="feature-link" onClick={(e) => scrollToSection(e, "privacy")}>
              Learn more →
            </a>
          </div>
        </div>
      </section>

      {/* DETAILED FEATURE SECTIONS */}
      <div className="feature-details-container">
        {/* Smart Tracking */}
        <section id="smart-tracking" className="feature-detail-section">
          <div className="feature-detail-content">
            <h2>Smart Tracking</h2>
            <p>
              Tracking meals has never been easier. Search our comprehensive food database or scan barcodes to log your meals with accuracy.
            </p>
            <ul className="feature-benefits">
              <li>Barcode scanning for packaged foods</li>
              <li>Verified food database with accurate macros</li>
              <li>Quick-add from your recently logged foods</li>
            </ul>
          </div>
          <div className="feature-detail-visual visual-tracking">
            <div className="visual-icon-wrapper">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </div>
          </div>
        </section>

        {/* Personalized Goals */}
        <section id="personalized-goals" className="feature-detail-section reverse">
          <div className="feature-detail-content">
            <h2>Personalized Goals</h2>
            <p>
              One size does not fit all. We calculate your ideal calorie and macro targets based on your specific body metrics (TDEE, BMR) and goals.
            </p>
            <ul className="feature-benefits">
              <li>Dynamic goal adjustments</li>
              <li>Custom macro splits (Keto, High Protein, etc.)</li>
              <li>Weight gain/loss speed control</li>
            </ul>
          </div>
          <div className="feature-detail-visual visual-goals">
            <div className="visual-icon-wrapper">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
            </div>
          </div>
        </section>

        {/* Progress Analytics */}
        <section id="progress-analytics" className="feature-detail-section">
          <div className="feature-detail-content">
            <h2>Progress Analytics</h2>
            <p>
              Visualize your success. Our comprehensive charts help you identify trends and stay motivated as you see your progress over time.
            </p>
            <ul className="feature-benefits">
              <li>Weight trend smoothing to filter fluctuations</li>
              <li>Body measurement tracking</li>
              <li>Calorie and macro adherence charts</li>
            </ul>
          </div>
          <div className="feature-detail-visual visual-analytics">
            <div className="visual-icon-wrapper">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
            </div>
          </div>
        </section>

        {/* Coach */}
        <section id="coach" className="feature-detail-section reverse">
          <div className="feature-detail-content">
            <h2>AI Coach</h2>
            <p>
              Get actionable insights, not just data. Our AI Coach analyzes your weekly performance and suggests specific changes to keep you on track.
            </p>
            <ul className="feature-benefits">
              <li>Weekly check-ins and adjustments</li>
              <li>Personalized tips based on your eating habits</li>
              <li>Motivation when you plateau</li>
            </ul>
          </div>
          <div className="feature-detail-visual visual-coach">
            <div className="visual-icon-wrapper">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
          </div>
        </section>

        {/* Meal Planning */}
        <section id="meal-planning" className="feature-detail-section">
          <div className="feature-detail-content">
            <h2>Meal Planning</h2>
            <p>
              Plan for success by prepping your week ahead. Save your favorite meals and create templates for easy logging.
            </p>
            <ul className="feature-benefits">
              <li>Create custom meal templates</li>
              <li>Copy/paste days for consistent eating</li>
              <li>Shopping list generation (Coming Soon)</li>
            </ul>
          </div>
          <div className="feature-detail-visual visual-planning">
            <div className="visual-icon-wrapper">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section id="privacy" className="feature-detail-section reverse">
          <div className="feature-detail-content">
            <h2>Privacy First</h2>
            <p>
              Your health data is sensitive, and we treat it that way. We use end-to-end encryption and will never sell your personal data.
            </p>
            <ul className="feature-benefits">
              <li>GDPR and CCPA compliant</li>
              <li>Local-first data options</li>
              <li>Full data export capabilities</li>
            </ul>
          </div>
          <div className="feature-detail-visual visual-privacy">
            <div className="visual-icon-wrapper">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
          </div>
        </section>
      </div>

      {/* HOW IT WORKS SECTION */}
      <section className="how-it-works-section">
        <div className="section-header">
          <span className="section-badge">How It Works</span>
          <h2 className="section-title">Your Journey to Better Health</h2>
          <p className="section-subtitle">
            Three simple steps to build sustainable habits
          </p>
        </div>

        <div className="steps-container">
          <div className="step-item">
            <div className="step-number">01</div>
            <div className="step-content">
              <h3>Log Your Meals</h3>
              <p>
                Search our food database or scan a barcode. We calculate accurate
                nutrition facts for everything you eat.
              </p>
            </div>
          </div>
          <div className="step-connector"></div>
          <div className="step-item">
            <div className="step-number">02</div>
            <div className="step-content">
              <h3>Get Insights</h3>
              <p>
                See how your choices affect your progress. Real-time feedback
                helps you make smarter decisions every day.
              </p>
            </div>
          </div>
          <div className="step-connector"></div>
          <div className="step-item">
            <div className="step-number">03</div>
            <div className="step-content">
              <h3>Hit Your Goals</h3>
              <p>
                Watch your progress unfold. Adjust your targets as you go and
                celebrate every milestone along the way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="testimonials-section">
        <div className="section-header">
          <span className="section-badge">Stories</span>
          <h2 className="section-title">Trusted by Thousands</h2>
          <p className="section-subtitle">
            See what our community has to say
          </p>
        </div>

        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">
              "Finally, a nutrition app that doesn't feel like a chore. The barcode
              scanning and food search make logging so easy. I've lost 15lbs in 2 months!"
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">S</div>
              <div className="author-info">
                <div className="author-name">Sarah J.</div>
                <div className="author-role">Lost 15 lbs</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">
              "The coaching insights are spot on. It feels like having a personal
              nutritionist in my pocket. Highly recommend for anyone serious about health."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">M</div>
              <div className="author-info">
                <div className="author-name">Mike T.</div>
                <div className="author-role">Muscle Gain</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div className="testimonial-stars">★★★★★</div>
            <p className="testimonial-text">
              "I love the privacy-first approach. Plus, the interface is so clean
              and easy to use. It actually makes tracking fun."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar">E</div>
              <div className="author-info">
                <div className="author-name">Emily R.</div>
                <div className="author-role">Maintenance</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="faq-section">
        <div className="section-header">
          <span className="section-badge">FAQ</span>
          <h2 className="section-title">Common Questions</h2>
          <p className="section-subtitle">
            Everything you need to know about MacroTrack
          </p>
        </div>

        <div className="faq-grid">
          <div className="faq-item">
            <h3>Is MacroTrack really free?</h3>
            <p>
              Yes! We offer a generous free tier that includes meal logging, basic
              analytics, and goal setting. Our Premium plan offers advanced coaching features.
            </p>
          </div>
          <div className="faq-item">
            <h3>How large is the food database?</h3>
            <p>
              Our database contains millions of verified food entries sourced from
              FatSecret. You can also create custom foods for anything not found.
            </p>
          </div>
          <div className="faq-item">
            <h3>Can I sync with other fitness apps?</h3>
            <p>
              We are working on integrations with Apple Health and Google Fit. Stay tuned
              for updates coming very soon!
            </p>
          </div>
          <div className="faq-item">
            <h3>Is my data private?</h3>
            <p>
              Absolutely. We enforce strict privacy policies and encryption. Your personal
              health data is never sold to advertisers.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Transform Your Health?</h2>
          <p>
            Join thousands of users achieving their nutrition goals with MacroTrack
          </p>

          <button className="btn btn-primary btn-large" onClick={() => navigate("/signup")}>
            Start Your Free Trial
          </button>


          <div className="cta-secondary">
            <p className="cta-secondary-text">New to nutrition tracking?</p>
            <button className="btn-text-large" onClick={() => navigate("/nutrition-guide")}>
              Read Our Beginner's Guide →
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default LandingPage;
