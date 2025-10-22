/**
 * Security Headers Middleware
 * Removes sensitive information and headers from API responses
 */

/**
 * Middleware to sanitize responses and remove sensitive data
 */
const sanitizeResponse = (req, res, next) => {
  // Store the original json method
  const originalJson = res.json;

  // Override res.json to sanitize data before sending
  res.json = function (data) {
    // Remove sensitive fields from response data
    if (data && typeof data === 'object') {
      // Don't expose internal database IDs in some cases
      // Remove password fields if accidentally included
      if (data.password) delete data.password;
      if (data.password_hash) delete data.password_hash;
      
      // Remove session tokens from direct exposure
      if (data.session_token && req.path !== '/api/auth/login') {
        delete data.session_token;
      }
      
      // If it's an array, sanitize each item
      if (Array.isArray(data)) {
        data = data.map(item => {
          if (item && typeof item === 'object') {
            if (item.password) delete item.password;
            if (item.password_hash) delete item.password_hash;
            if (item.session_token) delete item.session_token;
          }
          return item;
        });
      }
      
      // If data has a 'data' property (common pattern), sanitize it too
      if (data.data) {
        if (Array.isArray(data.data)) {
          data.data = data.data.map(item => {
            if (item && typeof item === 'object') {
              if (item.password) delete item.password;
              if (item.password_hash) delete item.password_hash;
              if (item.session_token) delete item.session_token;
            }
            return item;
          });
        } else if (typeof data.data === 'object') {
          if (data.data.password) delete data.data.password;
          if (data.data.password_hash) delete data.data.password_hash;
          if (data.data.session_token && req.path !== '/api/auth/login') {
            delete data.data.session_token;
          }
        }
      }
      
      // If data has a 'user' property, sanitize it
      if (data.user && typeof data.user === 'object') {
        if (data.user.password) delete data.user.password;
        if (data.user.password_hash) delete data.user.password_hash;
        if (data.user.session_token && req.path !== '/api/auth/login') {
          delete data.user.session_token;
        }
      }
    }

    // Call the original json method
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Middleware to remove sensitive headers from responses
 */
const removeServerHeaders = (req, res, next) => {
  // Remove headers that expose server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  res.removeHeader('X-AspNet-Version');
  res.removeHeader('X-AspNetMvc-Version');
  
  next();
};

/**
 * Middleware to add security headers
 */
const addSecurityHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'no-referrer');
  
  // Only send content over HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
};

/**
 * Middleware to prevent information leakage in error messages
 */
const sanitizeErrors = (err, req, res, next) => {
  // In production, don't expose internal error details
  if (process.env.NODE_ENV === 'production') {
    // Remove stack traces
    delete err.stack;
    
    // Generic error messages for server errors
    if (err.statusCode >= 500) {
      err.message = 'An internal error occurred. Please try again later.';
    }
  }
  
  next(err);
};

module.exports = {
  sanitizeResponse,
  removeServerHeaders,
  addSecurityHeaders,
  sanitizeErrors,
};
