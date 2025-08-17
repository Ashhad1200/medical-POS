/**
 * Currency formatting utilities to prevent NaN warnings in React components
 */

/**
 * Safely formats a number as currency, handling null, undefined, and NaN values
 * @param {number|string|null|undefined} amount - The amount to format
 * @param {string} currency - Currency symbol (default: 'Rs.')
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'Rs.', decimals = 2) => {
  // Handle null, undefined, or non-numeric values
  if (amount === null || amount === undefined || amount === '') {
    return `${currency}0.${'0'.repeat(decimals)}`;
  }

  // Convert to number if it's a string
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // Handle NaN or invalid numbers
  if (isNaN(numericAmount) || !isFinite(numericAmount)) {
    return `${currency}0.${'0'.repeat(decimals)}`;
  }

  // Format the number with specified decimal places
  return `${currency}${numericAmount.toFixed(decimals)}`;
};

/**
 * Safely formats a number with decimal places, handling null, undefined, and NaN values
 * @param {number|string|null|undefined} value - The value to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, decimals = 2) => {
  // Handle null, undefined, or non-numeric values
  if (value === null || value === undefined || value === '') {
    return '0.' + '0'.repeat(decimals);
  }

  // Convert to number if it's a string
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  // Handle NaN or invalid numbers
  if (isNaN(numericValue) || !isFinite(numericValue)) {
    return '0.' + '0'.repeat(decimals);
  }

  // Format the number with specified decimal places
  return numericValue.toFixed(decimals);
};

/**
 * Safely calculates percentage, handling division by zero and invalid values
 * @param {number|string|null|undefined} value - The value
 * @param {number|string|null|undefined} total - The total
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, total, decimals = 1) => {
  // Handle null, undefined, or non-numeric values
  if (value === null || value === undefined || total === null || total === undefined) {
    return '0.' + '0'.repeat(decimals);
  }

  // Convert to numbers if they're strings
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  const numericTotal = typeof total === 'string' ? parseFloat(total) : total;

  // Handle NaN, invalid numbers, or division by zero
  if (isNaN(numericValue) || isNaN(numericTotal) || numericTotal === 0 || !isFinite(numericValue) || !isFinite(numericTotal)) {
    return '0.' + '0'.repeat(decimals);
  }

  // Calculate and format percentage
  const percentage = (numericValue / numericTotal) * 100;
  return percentage.toFixed(decimals);
};

/**
 * Safely adds two numbers, handling null, undefined, and NaN values
 * @param {number|string|null|undefined} a - First number
 * @param {number|string|null|undefined} b - Second number
 * @returns {number} Sum of the two numbers
 */
export const safeAdd = (a, b) => {
  const numA = typeof a === 'string' ? parseFloat(a) : a;
  const numB = typeof b === 'string' ? parseFloat(b) : b;
  
  const safeA = isNaN(numA) || numA === null || numA === undefined ? 0 : numA;
  const safeB = isNaN(numB) || numB === null || numB === undefined ? 0 : numB;
  
  return safeA + safeB;
};

/**
 * Safely multiplies two numbers, handling null, undefined, and NaN values
 * @param {number|string|null|undefined} a - First number
 * @param {number|string|null|undefined} b - Second number
 * @returns {number} Product of the two numbers
 */
export const safeMultiply = (a, b) => {
  const numA = typeof a === 'string' ? parseFloat(a) : a;
  const numB = typeof b === 'string' ? parseFloat(b) : b;
  
  const safeA = isNaN(numA) || numA === null || numA === undefined ? 0 : numA;
  const safeB = isNaN(numB) || numB === null || numB === undefined ? 0 : numB;
  
  return safeA * safeB;
};

/**
 * Safely converts a value to a number, handling null, undefined, and NaN values
 * @param {any} value - The value to convert
 * @param {number} defaultValue - Default value if conversion fails (default: 0)
 * @returns {number} Converted number or default value
 */
export const safeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue) || !isFinite(numericValue)) {
    return defaultValue;
  }
  
  return numericValue;
};