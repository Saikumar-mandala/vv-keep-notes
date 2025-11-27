// utils/helpers.js
// General utility functions
// Combined: api.js, dateFormatter.js

// ==================== API Constants ====================
export const DEFAULT_APP_BASE = 'http://localhost:3000';

// ==================== Date Formatting ====================
/**
 * Format a date to a locale string safely
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatLocalString(date) {
    try {
        return new Date(date).toLocaleString();
    } catch (e) {
        return String(date);
    }
}

