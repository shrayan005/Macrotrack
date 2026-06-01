/**
 * ThemeContext.js
 *
 * Stores the app-wide colour theme ('light' or 'dark'). On first load it reads
 * the user's saved preference from localStorage, falling back to the OS
 * prefers-color-scheme. The chosen theme is applied as a class and data-theme
 * attribute on <html> and persisted to localStorage on every change.
 *
 * Provides to consumers:
 *   theme        (string)   — current theme: 'light' | 'dark'
 *   toggleTheme  (function) — flip between light and dark
 *
 * Usage: const { theme, toggleTheme } = useTheme();
 */
import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // Lazy initialiser: read saved preference, then OS preference, then default to light
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    // Apply the theme to <html> and persist it whenever theme changes.
    // Both a CSS class and a data-theme attribute are set for maximum CSS selector flexibility.
    useEffect(() => {
        const root = window.document.documentElement;

        // Remove the previous theme class
        root.classList.remove('light', 'dark');

        // Add the current theme class
        root.classList.add(theme);

        // Also set data-theme attribute for easier CSS selection
        root.setAttribute('data-theme', theme);

        // Save to localStorage
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // Expose theme and the toggle action; consumers never need setTheme directly
    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
