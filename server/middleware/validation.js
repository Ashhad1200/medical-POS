const { body, param, query, validationResult } = require('express-validator');
const { createErrorResponse } = require('../utils/errors');
const { validateEmail, validatePhone, validateUUID, validatePurchaseOrderStatus, validatePaymentStatus } = require('../utils/validators');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => `${error.param}: ${error.msg}`);
    return res.status(400).json(createErrorResponse(
      'Validation failed: ' + errorMessages.join(', '),
      400,
      'VALIDATION_ERROR',
      errors.array()
    ));
  }
  next();
};

// Supplier validation rules
const validateSupplierInput = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Supplier name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Supplier name must be between 2 and 255 characters'),
  
  body('contactPerson')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Contact person name cannot exceed 255 characters'),
  
  body('email')
    .optional()
    .trim()
    .toLowerCase()
    .custom((value) => {
      if (value && !validateEmail(value)) {
        throw new Error('Invalid email format');
      }
      return true;
    }),
  
  body('phone')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !validatePhone(value)) {
        throw new Error('Invalid phone number format');
      }
      return true;
    }),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Address cannot exceed 1000 characters'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),
  
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State cannot exceed 100 characters'),
  
  body('postalCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Postal code cannot exceed 20 characters'),
  
  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country cannot exceed 100 characters'),
  
  body('taxNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tax number cannot exceed 50 characters'),
  
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),
  
  body('paymentTerms')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Payment terms must be between 0 and 365 days'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters'),
  
  handleValidationErrors
];

const validateSupplierUpdate = [
  param('id')
    .custom((value) => {
      if (!validateUUID(value)) {
        throw new Error('Invalid supplier ID format');
      }
      return true;
    }),
  
  ...validateSupplierInput
];

// Purchase Order validation rules
const validatePurchaseOrderInput = [
  body('supplierId')
    .notEmpty()
    .withMessage('Supplier ID is required')
    .custom((value) => {
      if (!validateUUID(value)) {
        throw new Error('Invalid supplier ID format');
      }
      return true;
    }),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.medicineId')
    .notEmpty()
    .withMessage('Medicine ID is required for each item')
    .custom((value) => {
      if (!validateUUID(value)) {
        throw new Error('Invalid medicine ID format');
      }
      return true;
    }),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  
  body('items.*.unitCost')
    .isFloat({ min: 0 })
    .withMessage('Unit cost must be a positive number'),
  
  body('items.*.notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Item notes cannot exceed 500 characters'),
  
  body('orderDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid order date format'),
  
  body('expectedDeliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expected delivery date format')
    .custom((value, { req }) => {
      if (value && req.body.orderDate && new Date(value) <= new Date(req.body.orderDate)) {
        throw new Error('Expected delivery date must be after order date');
      }
      return true;
    }),
  
  body('taxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tax amount must be a positive number'),
  
  body('discountAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount amount must be a positive number'),
  
  body('shippingCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Shipping cost must be a positive number'),
  
  body('paymentTerms')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Payment terms must be between 0 and 365 days'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters'),
  
  body('internalNotes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Internal notes cannot exceed 2000 characters'),
  
  handleValidationErrors
];

const validatePurchaseOrderUpdate = [
  param('id')
    .custom((value) => {
      if (!validateUUID(value)) {
        throw new Error('Invalid purchase order ID format');
      }
      return true;
    }),
  
  body('supplierId')
    .optional()
    .custom((value) => {
      if (value && !validateUUID(value)) {
        throw new Error('Invalid supplier ID format');
      }
      return true;
    }),
  
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one item is required when updating items'),
  
  body('items.*.medicineId')
    .optional()
    .custom((value) => {
      if (value && !validateUUID(value)) {
        throw new Error('Invalid medicine ID format');
      }
      return true;
    }),
  
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  
  body('items.*.unitCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit cost must be a positive number'),
  
  body('expectedDeliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expected delivery date format'),
  
  body('taxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tax amount must be a positive number'),
  
  body('discountAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount amount must be a positive number'),
  
  body('shippingCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Shipping cost must be a positive number'),
  
  body('paymentTerms')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Payment terms must be between 0 and 365 days'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters'),
  
  body('internalNotes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Internal notes cannot exceed 2000 characters'),
  
  handleValidationErrors
];

const validateReceiveItems = [
  param('id')
    .custom((value) => {
      if (!validateUUID(value)) {
        throw new Error('Invalid purchase order ID format');
      }
      return true;
    }),
  
  body('items')
    .isArray({ min: 0 })
    .withMessage('Items must be an array'),
  
  body('items.*.id')
    .notEmpty()
    .withMessage('Item ID is required')
    .custom((value) => {
      if (!validateUUID(value)) {
        throw new Error('Invalid item ID format');
      }
      return true;
    }),
  
  body('items.*.received_quantity')
    .isInt({ min: 0 })
    .withMessage('Received quantity must be a non-negative integer'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  
  handleValidationErrors
];

// Query parameter validation
const validatePaginationQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

const validateSupplierQuery = [
  ...validatePaginationQuery,
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Search term must be between 1 and 255 characters'),
  
  query('status')
    .optional()
    .isIn(['all', 'active', 'inactive'])
    .withMessage('Status must be one of: all, active, inactive'),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'created_at', 'updated_at', 'city', 'credit_limit'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  handleValidationErrors
];

const validatePurchaseOrderQuery = [
  ...validatePaginationQuery,
  
  query('status')
    .optional()
    .custom((value) => {
      if (value && !validatePurchaseOrderStatus(value)) {
        throw new Error('Invalid purchase order status');
      }
      return true;
    }),
  
  query('supplierId')
    .optional()
    .custom((value) => {
      if (value && !validateUUID(value)) {
        throw new Error('Invalid supplier ID format');
      }
      return true;
    }),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (value && req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  query('sortBy')
    .optional()
    .isIn(['order_date', 'created_at', 'updated_at', 'total_amount', 'po_number'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  handleValidationErrors
];

// Search validation
const validateSearchQuery = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Search query must be between 2 and 255 characters'),
  
  handleValidationErrors
];

// Report validation
const validateReportQuery = [
  query('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be json or csv'),
  
  query('supplierId')
    .optional()
    .custom((value) => {
      if (value && !validateUUID(value)) {
        throw new Error('Invalid supplier ID format');
      }
      return true;
    }),
  
  query('status')
    .optional()
    .custom((value) => {
      if (value && !validatePurchaseOrderStatus(value)) {
        throw new Error('Invalid purchase order status');
      }
      return true;
    }),
  
  handleValidationErrors
];

module.exports = {
  validateSupplierInput,
  validateSupplierUpdate,
  validatePurchaseOrderInput,
  validatePurchaseOrderUpdate,
  validateReceiveItems,
  validatePaginationQuery,
  validateSupplierQuery,
  validatePurchaseOrderQuery,
  validateSearchQuery,
  validateReportQuery,
  handleValidationErrors
};