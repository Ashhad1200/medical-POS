const rateLimit = require('express-rate-limit');
const { createErrorResponse } = require('../utils/errors');

// Default rate limiter for general API endpoints
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: createErrorResponse(
    'Too many requests from this IP, please try again later.',
    429,
    'RATE_LIMIT_EXCEEDED'
  ),
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json(createErrorResponse(
      'Too many requests from this IP, please try again later.',
      429,
      'RATE_LIMIT_EXCEEDED',
      {
        limit: req.rateLimit.limit,
        current: req.rateLimit.current,
        remaining: req.rateLimit.remaining,
        resetTime: new Date(Date.now() + req.rateLimit.resetTime)
      }
    ));
  }
});

// Stricter rate limiter for search endpoints
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 search requests per minute
  message: createErrorResponse(
    'Too many search requests, please try again later.',
    429,
    'SEARCH_RATE_LIMIT_EXCEEDED'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(createErrorResponse(
      'Too many search requests, please try again later.',
      429,
      'SEARCH_RATE_LIMIT_EXCEEDED',
      {
        limit: req.rateLimit.limit,
        current: req.rateLimit.current,
        remaining: req.rateLimit.remaining,
        resetTime: new Date(Date.now() + req.rateLimit.resetTime)
      }
    ));
  }
});

// Rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: createErrorResponse(
    'Too many authentication attempts, please try again later.',
    429,
    'AUTH_RATE_LIMIT_EXCEEDED'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    res.status(429).json(createErrorResponse(
      'Too many authentication attempts, please try again later.',
      429,
      'AUTH_RATE_LIMIT_EXCEEDED',
      {
        limit: req.rateLimit.limit,
        current: req.rateLimit.current,
        remaining: req.rateLimit.remaining,
        resetTime: new Date(Date.now() + req.rateLimit.resetTime)
      }
    ));
  }
});

// Rate limiter for report generation endpoints
const reportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 report requests per 5 minutes
  message: createErrorResponse(
    'Too many report generation requests, please try again later.',
    429,
    'REPORT_RATE_LIMIT_EXCEEDED'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(createErrorResponse(
      'Too many report generation requests, please try again later.',
      429,
      'REPORT_RATE_LIMIT_EXCEEDED',
      {
        limit: req.rateLimit.limit,
        current: req.rateLimit.current,
        remaining: req.rateLimit.remaining,
        resetTime: new Date(Date.now() + req.rateLimit.resetTime)
      }
    ));
  }
});

// Rate limiter for data export endpoints
const exportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // Limit each IP to 3 export requests per 10 minutes
  message: createErrorResponse(
    'Too many export requests, please try again later.',
    429,
    'EXPORT_RATE_LIMIT_EXCEEDED'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(createErrorResponse(
      'Too many export requests, please try again later.',
      429,
      'EXPORT_RATE_LIMIT_EXCEEDED',
      {
        limit: req.rateLimit.limit,
        current: req.rateLimit.current,
        remaining: req.rateLimit.remaining,
        resetTime: new Date(Date.now() + req.rateLimit.resetTime)
      }
    ));
  }
});

// Rate limiter for bulk operations
const bulkOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 bulk operations per 15 minutes
  message: createErrorResponse(
    'Too many bulk operations, please try again later.',
    429,
    'BULK_OPERATION_RATE_LIMIT_EXCEEDED'
  ),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(createErrorResponse(
      'Too many bulk operations, please try again later.',
      429,
      'BULK_OPERATION_RATE_LIMIT_EXCEEDED',
      {
        limit: req.rateLimit.limit,
        current: req.rateLimit.current,
        remaining: req.rateLimit.remaining,
        resetTime: new Date(Date.now() + req.rateLimit.resetTime)
      }
    ));
  }
});

// Create a custom rate limiter with specific options
const createCustomLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json(createErrorResponse(
        options.message || 'Too many requests, please try again later.',
        429,
        options.errorCode || 'RATE_LIMIT_EXCEEDED',
        {
          limit: req.rateLimit.limit,
          current: req.rateLimit.current,
          remaining: req.rateLimit.remaining,
          resetTime: new Date(Date.now() + req.rateLimit.resetTime)
        }
      ));
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

module.exports = {
  defaultLimiter,
  searchLimiter,
  authLimiter,
  reportLimiter,
  exportLimiter,
  bulkOperationLimiter,
  createCustomLimiter
};