const express = require('express');
const router = express.Router();
const { testSecuritySanitization, testHeaders } = require('../controllers/securityTestController');

// Test endpoints - REMOVE IN PRODUCTION
router.get('/sanitization', testSecuritySanitization);
router.get('/headers', testHeaders);

module.exports = router;
