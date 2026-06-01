/**
 * ThemeToggle
 *
 * Icon button that switches the app between light and dark mode by calling
 * toggleTheme from ThemeContext. Shows a Moon icon in light mode and a Sun
 * icon in dark mode.
 *
 * Props:
 *   className (string) — optional extra CSS class for the button (default: '')
 *
 * Used in: shared/Navbar
 */
import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

const ThemeToggle = ({ className = '' }) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`theme-toggle ${className}`}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                transition: 'color 0.3s ease',
            }}
        >
            {theme === 'light' ? (
                <Moon size={20} />
            ) : (
                <Sun size={20} />
            )}
        </button>
    );
};

export default ThemeToggle;
