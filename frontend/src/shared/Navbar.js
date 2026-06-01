/**
 * Navbar
 *
 * Top navigation bar shown on every authenticated page. Renders primary links
 * inline on desktop and behind a hamburger toggle on mobile, with a "More"
 * dropdown for secondary pages and a profile/sign-out section on the right.
 *
 * Props:
 *   currentPage (string) — id of the active page (e.g. 'dashboard') used to
 *                          highlight the matching nav link
 *
 * Used in: App.js (wraps all authenticated route layouts)
 */
import { useState, useRef, useEffect, memo } from 'react';
import ThemeToggle from './ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const primaryNav = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { id: 'diary',     label: 'Diary',     path: '/diary'     },
  { id: 'foods',     label: 'Foods',     path: '/foods'     },
  { id: 'progress',  label: 'Progress',  path: '/progress'  },
  { id: 'coach',     label: 'Coach',     path: '/coach'     },
];

const moreNav = [
  { id: 'exercise', label: 'Exercise', path: '/exercises' },
  { id: 'recipes',  label: 'Recipes',  path: '/recipes'   },
  { id: 'reports',  label: 'Reports',  path: '/reports'   },
];

function Navbar({ currentPage }) {
  // Controls whether the mobile hamburger menu is expanded
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Controls whether the "More" dropdown is open
  const [moreOpen, setMoreOpen] = useState(false);
  // Tracks whether the avatar image failed to load
  const [avatarError, setAvatarError] = useState(false);
  // Tracks whether the avatar image has finished loading
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  // Ref attached to the More dropdown wrapper so we can detect outside clicks
  const moreRef = useRef(null);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // Reset avatar state whenever the profile picture URL changes
  useEffect(() => {
    setAvatarError(false);
    setAvatarLoaded(false);
  }, [user?.profile_picture]);

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // True when the currently active page belongs to the "More" dropdown
  const isMoreActive = moreNav.some((item) => item.id === currentPage);

  // Navigate to a path and close both menus so they don't stay open mid-nav
  const go = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
    setMoreOpen(false);
  };

  return (
    <nav className="app-navbar">
      {/* Skip to main content — accessibility */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <div className="navbar-content">

        <div className="navbar-logo" onClick={() => go('/dashboard')}>
          MACROTRACK
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Primary nav links */}
        <div className={`navbar-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {primaryNav.map(item => (
            <button
              key={item.id}
              className={`navbar-link ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => go(item.path)}
            >
              {item.label}
            </button>
          ))}

          {/* More dropdown */}
          <div className="navbar-more-wrap" ref={moreRef}>
            <button
              className={`navbar-link navbar-more-btn ${isMoreActive ? 'active' : ''}`}
              onClick={() => setMoreOpen(!moreOpen)}
            >
              More
              <svg
                className={`more-chevron ${moreOpen ? 'open' : ''}`}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
              >
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {moreOpen && (
              <div className="navbar-dropdown">
                {moreNav.map(item => (
                  <button
                    key={item.id}
                    className={`navbar-dropdown-item ${currentPage === item.id ? 'active' : ''}`}
                    onClick={() => go(item.path)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sign Out inside mobile menu (hidden on desktop via CSS) */}
          <button
            className="navbar-link navbar-mobile-logout"
            onClick={async () => { await logout(); navigate('/'); setMobileMenuOpen(false); }}
          >
            Sign Out
          </button>
        </div>

        {/* Right side actions */}
        <div className="navbar-right">
          <ThemeToggle />

          {/* Profile icon button — shows avatar image, initials, or a generic icon */}
          <button
            className={`navbar-profile-btn ${currentPage === 'profile' ? 'active' : ''} ${user?.profile_picture && !avatarError ? 'has-avatar' : ''}`}
            onClick={() => go('/profile')}
            aria-label="Profile & Settings"
            title="Profile & Settings"
          >
            {user?.profile_picture && !avatarError ? (
              <>
                <img
                  src={user.profile_picture}
                  alt="Profile"
                  className="navbar-profile-avatar"
                  style={{ display: avatarLoaded ? 'block' : 'none' }}
                  onLoad={() => setAvatarLoaded(true)}
                  onError={() => setAvatarError(true)}
                />
                {!avatarLoaded && (
                  <span className="navbar-profile-initials">
                    {(user.display_name || user.username || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </>
            ) : user?.display_name || user?.username ? (
              <span className="navbar-profile-initials">
                {(user.display_name || user.username).charAt(0).toUpperCase()}
              </span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            )}
          </button>

          {/* Desktop Sign Out (hidden on mobile via CSS) */}
          <button className="navbar-logout" onClick={async () => { await logout(); navigate('/'); }}>
            Sign Out
          </button>
        </div>

      </div>
    </nav>
  );
}

export default memo(Navbar);
