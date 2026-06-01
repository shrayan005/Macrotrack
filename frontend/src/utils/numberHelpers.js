/**
 * numberHelpers.js
 *
 * Null-safe number parsing, formatting, and math helpers used throughout the
 * app to guard against NaN and division-by-zero when rendering nutrition data.
 * Exports: safeParseFloat, safeParseInt, formatNumber, formatCalories,
 *          formatMacros, formatWeight, safePercentage, safeSum,
 *          formatWithCommas, clamp, calculateBMI
 */
// src/utils/numberHelpers.js

/**
 * Safely parse a value to a float number
 * @param {any} value - Value to parse
 * @param {number} defaultValue - Default value if parsing fails (default: 0)
 * @returns {number} Parsed number or default value
 */
export function safeParseFloat(value, defaultValue = 0) {
  const parsed = parseFloat(value);
  return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse a value to an integer
 * @param {any} value - Value to parse
 * @param {number} defaultValue - Default value if parsing fails (default: 0)
 * @returns {number} Parsed integer or default value
 */
export function safeParseInt(value, defaultValue = 0) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
}

/**
 * Format a number to a specific number of decimal places
 * @param {any} value - Value to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @param {number} defaultValue - Default value if parsing fails (default: 0)
 * @returns {string} Formatted number
 */
export function formatNumber(value, decimals = 0, defaultValue = 0) {
  const parsed = safeParseFloat(value, defaultValue);
  return parsed.toFixed(decimals);
}

/**
 * Format calories (round to nearest whole number)
 * @param {any} calories - Calories value
 * @returns {number} Rounded calories
 */
export function formatCalories(calories) {
  return Math.round(safeParseFloat(calories, 0));
}

/**
 * Format macronutrients (protein, carbs, fat) with 1 decimal place
 * @param {any} grams - Gram value
 * @returns {string} Formatted grams with 1 decimal
 */
export function formatMacros(grams) {
  return formatNumber(grams, 1, 0);
}

/**
 * Format weight with 1 decimal place
 * @param {any} weight - Weight value
 * @returns {string} Formatted weight with 1 decimal
 */
export function formatWeight(weight) {
  return formatNumber(weight, 1, 0);
}

/**
 * Calculate percentage safely (avoids NaN and division by zero)
 * @param {any} value - Numerator value
 * @param {any} total - Denominator value
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {number} Percentage value (0-100+)
 */
export function safePercentage(value, total, decimals = 0) {
  const numValue = safeParseFloat(value, 0);
  const numTotal = safeParseFloat(total, 1); // Use 1 as default to avoid division by zero

  if (numTotal === 0) {
    return 0;
  }

  const percentage = (numValue / numTotal) * 100;
  return decimals > 0 ? parseFloat(percentage.toFixed(decimals)) : Math.round(percentage);
}

/**
 * Sum an array of values safely
 * @param {Array} values - Array of values to sum
 * @returns {number} Sum of all values
 */
export function safeSum(values) {
  return values.reduce((sum, value) => sum + safeParseFloat(value, 0), 0);
}

/**
 * Format a number with thousands separator
 * @param {any} value - Value to format
 * @returns {string} Formatted number with commas
 */
export function formatWithCommas(value) {
  const parsed = safeParseFloat(value, 0);
  return Math.round(parsed).toLocaleString('en-US');
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(safeParseFloat(value, min), min), max);
}

/**
 * Calculate BMI safely
 * @param {any} weightKg - Weight in kilograms
 * @param {any} heightCm - Height in centimeters
 * @returns {number} BMI value
 */
export function calculateBMI(weightKg, heightCm) {
  const weight = safeParseFloat(weightKg, 0);
  const height = safeParseFloat(heightCm, 1);

  if (height === 0 || weight === 0) {
    return 0;
  }

  const heightInMeters = height / 100;
  return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
}

const numberHelpers = {
  safeParseFloat,
  safeParseInt,
  formatNumber,
  formatCalories,
  formatMacros,
  formatWeight,
  safePercentage,
  safeSum,
  formatWithCommas,
  clamp,
  calculateBMI,
};

export default numberHelpers;
