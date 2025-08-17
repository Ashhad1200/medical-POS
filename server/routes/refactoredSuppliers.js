const express = require('express');
const router = express.Router();
const {
  getAllSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  toggleSupplierStatus,
  searchSuppliers,
  getSupplierStats,
  getSuppliersByCity,
  validateSupplierData,
  exportSuppliers
} = require('../controllers/refactoredSupplierController');
const { auth, checkRole } = require('../middleware/auth');
const { validateSupplierInput, validateSupplierUpdate } = require('../middleware/validation');
const { searchLimiter, exportLimiter, createCustomLimiter } = require('../middleware/rateLimiter');
const rateLimiter = createCustomLimiter;

// Apply authentication to all routes
router.use(auth);

// Apply role-based access control
router.use(checkRole(['admin', 'manager', 'warehouse']));

// Search suppliers (public endpoint for autocomplete)
router.get('/search', searchLimiter, searchSuppliers);

// Get supplier statistics
router.get('/stats', getSupplierStats);

// Get suppliers by city
router.get('/cities', getSuppliersByCity);

// Export suppliers
router.get('/export', checkRole(['admin', 'manager']), exportSuppliers);

// Validate supplier data
router.post('/validate', validateSupplierData);
router.post('/validate/:id', validateSupplierData);

// Get all suppliers with pagination and filters
router.get('/', getAllSuppliers);

// Get single supplier
router.get('/:id', getSupplier);

// Create new supplier
router.post('/', 
  checkRole(['admin', 'manager']),
  validateSupplierInput,
  createSupplier
);

// Update supplier
router.put('/:id', 
  checkRole(['admin', 'manager']),
  validateSupplierUpdate,
  updateSupplier
);

// Toggle supplier status
router.patch('/:id/toggle-status', 
  checkRole(['admin', 'manager']),
  toggleSupplierStatus
);

// Delete supplier
router.delete('/:id', 
  checkRole(['admin']),
  deleteSupplier
);

module.exports = router;