// Validation utility functions

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate phone number format (supports various formats)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone format
 */
function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
        return false;
    }
    
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if it's between 10-15 digits (international format)
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
}

/**
 * Validate required fields
 * @param {object} data - Object to validate
 * @param {array} requiredFields - Array of required field names
 * @returns {array} - Array of missing field names
 */
function validateRequiredFields(data, requiredFields) {
    const missing = [];
    
    requiredFields.forEach(field => {
        if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
            missing.push(field);
        }
    });
    
    return missing;
}

/**
 * Validate numeric value
 * @param {any} value - Value to validate
 * @param {object} options - Validation options
 * @returns {boolean} - True if valid
 */
function validateNumeric(value, options = {}) {
    const {
        min = null,
        max = null,
        allowZero = true,
        allowNegative = false
    } = options;
    
    const num = parseFloat(value);
    
    if (isNaN(num)) {
        return false;
    }
    
    if (!allowZero && num === 0) {
        return false;
    }
    
    if (!allowNegative && num < 0) {
        return false;
    }
    
    if (min !== null && num < min) {
        return false;
    }
    
    if (max !== null && num > max) {
        return false;
    }
    
    return true;
}

/**
 * Validate date format and range
 * @param {string} date - Date string to validate
 * @param {object} options - Validation options
 * @returns {boolean} - True if valid
 */
function validateDate(date, options = {}) {
    const {
        allowPast = true,
        allowFuture = true,
        minDate = null,
        maxDate = null
    } = options;
    
    if (!date) {
        return false;
    }
    
    const dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        return false;
    }
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const checkDate = new Date(dateObj);
    checkDate.setHours(0, 0, 0, 0);
    
    if (!allowPast && checkDate < now) {
        return false;
    }
    
    if (!allowFuture && checkDate > now) {
        return false;
    }
    
    if (minDate && checkDate < new Date(minDate)) {
        return false;
    }
    
    if (maxDate && checkDate > new Date(maxDate)) {
        return false;
    }
    
    return true;
}

/**
 * Validate string length
 * @param {string} str - String to validate
 * @param {object} options - Validation options
 * @returns {boolean} - True if valid
 */
function validateStringLength(str, options = {}) {
    const {
        min = 0,
        max = null,
        trim = true
    } = options;
    
    if (typeof str !== 'string') {
        return false;
    }
    
    const checkStr = trim ? str.trim() : str;
    
    if (checkStr.length < min) {
        return false;
    }
    
    if (max !== null && checkStr.length > max) {
        return false;
    }
    
    return true;
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} - True if valid UUID
 */
function validateUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') {
        return false;
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Validate postal code format
 * @param {string} postalCode - Postal code to validate
 * @param {string} country - Country code (optional)
 * @returns {boolean} - True if valid
 */
function validatePostalCode(postalCode, country = 'PK') {
    if (!postalCode || typeof postalCode !== 'string') {
        return false;
    }
    
    const patterns = {
        'PK': /^\d{5}$/, // Pakistan: 5 digits
        'US': /^\d{5}(-\d{4})?$/, // USA: 5 digits or 5+4
        'CA': /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/, // Canada: A1A 1A1
        'UK': /^[A-Za-z]{1,2}\d[A-Za-z\d]? \d[A-Za-z]{2}$/, // UK: Various formats
        'IN': /^\d{6}$/ // India: 6 digits
    };
    
    const pattern = patterns[country.toUpperCase()];
    if (!pattern) {
        // Default: allow alphanumeric with spaces and hyphens
        return /^[A-Za-z0-9\s-]{3,10}$/.test(postalCode.trim());
    }
    
    return pattern.test(postalCode.trim());
}

/**
 * Validate tax number format
 * @param {string} taxNumber - Tax number to validate
 * @param {string} country - Country code (optional)
 * @returns {boolean} - True if valid
 */
function validateTaxNumber(taxNumber, country = 'PK') {
    if (!taxNumber || typeof taxNumber !== 'string') {
        return false;
    }
    
    const patterns = {
        'PK': /^\d{7}-\d$/, // Pakistan NTN: 7 digits + hyphen + 1 digit
        'US': /^\d{2}-\d{7}$/, // USA EIN: XX-XXXXXXX
        'IN': /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/ // India GST
    };
    
    const pattern = patterns[country.toUpperCase()];
    if (!pattern) {
        // Default: allow alphanumeric with hyphens
        return /^[A-Za-z0-9-]{5,20}$/.test(taxNumber.trim());
    }
    
    return pattern.test(taxNumber.trim());
}

/**
 * Sanitize string input
 * @param {string} str - String to sanitize
 * @param {object} options - Sanitization options
 * @returns {string} - Sanitized string
 */
function sanitizeString(str, options = {}) {
    const {
        trim = true,
        removeHtml = true,
        removeSpecialChars = false,
        maxLength = null
    } = options;
    
    if (typeof str !== 'string') {
        return '';
    }
    
    let sanitized = str;
    
    if (trim) {
        sanitized = sanitized.trim();
    }
    
    if (removeHtml) {
        sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
    
    if (removeSpecialChars) {
        sanitized = sanitized.replace(/[^A-Za-z0-9\s]/g, '');
    }
    
    if (maxLength && sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
}

/**
 * Validate purchase order status
 * @param {string} status - Status to validate
 * @returns {boolean} - True if valid status
 */
function validatePurchaseOrderStatus(status) {
    const validStatuses = [
        'draft',
        'pending',
        'approved',
        'ordered',
        'partially_received',
        'received',
        'cancelled'
    ];
    
    return validStatuses.includes(status);
}

/**
 * Validate payment status
 * @param {string} status - Payment status to validate
 * @returns {boolean} - True if valid status
 */
function validatePaymentStatus(status) {
    const validStatuses = ['pending', 'partial', 'paid', 'overdue'];
    return validStatuses.includes(status);
}

module.exports = {
    validateEmail,
    validatePhone,
    validateRequiredFields,
    validateNumeric,
    validateDate,
    validateStringLength,
    validateUUID,
    validatePostalCode,
    validateTaxNumber,
    sanitizeString,
    validatePurchaseOrderStatus,
    validatePaymentStatus
};