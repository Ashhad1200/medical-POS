import { VALIDATION_RULES } from '../config/constants';

/**
 * Centralized validation utilities
 * Provides consistent validation logic across the application
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return VALIDATION_RULES.EMAIL_REGEX.test(email.trim());
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with isValid and errors
 */
export const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`);
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {object} - Validation result
 */
export const validateUsername = (username) => {
  const errors = [];
  
  if (!username) {
    errors.push('Username is required');
    return { isValid: false, errors };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < VALIDATION_RULES.USERNAME_MIN_LENGTH) {
    errors.push(`Username must be at least ${VALIDATION_RULES.USERNAME_MIN_LENGTH} characters long`);
  }
  
  if (trimmed.length > VALIDATION_RULES.USERNAME_MAX_LENGTH) {
    errors.push(`Username must be no more than ${VALIDATION_RULES.USERNAME_MAX_LENGTH} characters long`);
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone format
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  return VALIDATION_RULES.PHONE_REGEX.test(phone.trim());
};

/**
 * Validate required field
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {object} - Validation result
 */
export const validateRequired = (value, fieldName = 'Field') => {
  const isEmpty = value === null || value === undefined || 
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);
  
  return {
    isValid: !isEmpty,
    errors: isEmpty ? [`${fieldName} is required`] : []
  };
};

/**
 * Validate numeric value
 * @param {any} value - Value to validate
 * @param {object} options - Validation options (min, max, integer)
 * @returns {object} - Validation result
 */
export const validateNumber = (value, options = {}) => {
  const { min, max, integer = false, fieldName = 'Value' } = options;
  const errors = [];
  
  if (value === null || value === undefined || value === '') {
    return { isValid: true, errors }; // Allow empty for optional fields
  }
  
  const num = Number(value);
  
  if (isNaN(num)) {
    errors.push(`${fieldName} must be a valid number`);
    return { isValid: false, errors };
  }
  
  if (integer && !Number.isInteger(num)) {
    errors.push(`${fieldName} must be a whole number`);
  }
  
  if (typeof min === 'number' && num < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  }
  
  if (typeof max === 'number' && num > max) {
    errors.push(`${fieldName} must be no more than ${max}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate date
 * @param {any} date - Date to validate
 * @param {object} options - Validation options
 * @returns {object} - Validation result
 */
export const validateDate = (date, options = {}) => {
  const { minDate, maxDate, fieldName = 'Date' } = options;
  const errors = [];
  
  if (!date) {
    return { isValid: true, errors }; // Allow empty for optional fields
  }
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    errors.push(`${fieldName} must be a valid date`);
    return { isValid: false, errors };
  }
  
  if (minDate && dateObj < new Date(minDate)) {
    errors.push(`${fieldName} cannot be before ${new Date(minDate).toLocaleDateString()}`);
  }
  
  if (maxDate && dateObj > new Date(maxDate)) {
    errors.push(`${fieldName} cannot be after ${new Date(maxDate).toLocaleDateString()}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate form data using validation rules
 * @param {object} data - Form data to validate
 * @param {object} rules - Validation rules
 * @returns {object} - Validation result with field-specific errors
 */
export const validateForm = (data, rules) => {
  const errors = {};
  let isValid = true;
  
  Object.keys(rules).forEach(field => {
    const fieldRules = rules[field];
    const value = data[field];
    const fieldErrors = [];
    
    // Check each rule for the field
    fieldRules.forEach(rule => {
      let result;
      
      switch (rule.type) {
        case 'required':
          result = validateRequired(value, rule.message || field);
          break;
        case 'email':
          if (value && !isValidEmail(value)) {
            result = { isValid: false, errors: [rule.message || 'Invalid email format'] };
          } else {
            result = { isValid: true, errors: [] };
          }
          break;
        case 'password':
          result = validatePassword(value);
          break;
        case 'username':
          result = validateUsername(value);
          break;
        case 'phone':
          if (value && !isValidPhone(value)) {
            result = { isValid: false, errors: [rule.message || 'Invalid phone format'] };
          } else {
            result = { isValid: true, errors: [] };
          }
          break;
        case 'number':
          result = validateNumber(value, { ...rule, fieldName: field });
          break;
        case 'date':
          result = validateDate(value, { ...rule, fieldName: field });
          break;
        case 'custom':
          result = rule.validator(value, data);
          break;
        default:
          result = { isValid: true, errors: [] };
      }
      
      if (!result.isValid) {
        fieldErrors.push(...result.errors);
        isValid = false;
      }
    });
    
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  });
  
  return {
    isValid,
    errors
  };
};

/**
 * Sanitize input string
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>"'&]/g, (match) => {
      const entities = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[match];
    });
};

/**
 * Format validation errors for display
 * @param {object} errors - Validation errors object
 * @returns {string} - Formatted error message
 */
export const formatValidationErrors = (errors) => {
  if (!errors || typeof errors !== 'object') return '';
  
  const allErrors = Object.values(errors).flat();
  return allErrors.join('. ');
};

export default {
  isValidEmail,
  validatePassword,
  validateUsername,
  isValidPhone,
  validateRequired,
  validateNumber,
  validateDate,
  validateForm,
  sanitizeInput,
  formatValidationErrors
};