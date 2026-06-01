/**
 * Logo
 *
 * Inline SVG MacroTrack logo featuring a plate, fork, spoon, and the letter
 * "N". Size and primary color are fully configurable via props.
 *
 * Props:
 *   size  (number) — width and height of the SVG in pixels (default: 32)
 *   color (string) — hex or CSS color for all strokes and fills (default: '#4CAF50')
 *
 * Used in: features/auth/LoginPage, features/auth/SignupPage,
 *          features/onboarding/OnboardingPage
 */
import React from 'react';

function Logo({ size = 32, color = '#4CAF50' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Circular background */}
      <circle cx="24" cy="24" r="22" fill={color} opacity="0.1" />

      {/* Plate/Bowl base */}
      <circle
        cx="24"
        cy="26"
        r="14"
        stroke={color}
        strokeWidth="3"
        fill="none"
      />

      {/* Fork on left */}
      <g stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <line x1="16" y1="12" x2="16" y2="20" />
        <line x1="13.5" y1="12" x2="13.5" y2="18" />
        <line x1="18.5" y1="12" x2="18.5" y2="18" />
      </g>

      {/* Spoon on right */}
      <g stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="32" y1="12" x2="32" y2="20" />
        <circle cx="32" cy="14.5" r="2.5" fill={color} opacity="0.3" />
      </g>

      {/* Nutrition "N" letter overlay */}
      <text
        x="24"
        y="30"
        fontFamily="Arial, sans-serif"
        fontSize="16"
        fontWeight="bold"
        fill={color}
        textAnchor="middle"
      >
        N
      </text>
    </svg>
  );
}

export default Logo;
