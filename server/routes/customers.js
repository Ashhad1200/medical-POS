const express = require("express");
const router = express.Router();
const { auth, checkRole } = require("../middleware/auth");
const {
  searchCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerOrderHistory,
  getCustomerPendingBalance,
  getCustomerStats,
  getCustomerMedicationHistory
} = require('../controllers/customerController');

// Role-based middleware
const adminOrCounter = checkRole(['admin', 'counter']);
const adminOnly = checkRole(['admin']);

// Middleware to validate customer ID (UUID format for Supabase)
const validateCustomerId = (req, res, next) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid customer ID format'
    });
  }
  
  next();
};

// Routes

// Search customers
router.get('/search', auth, adminOrCounter, searchCustomers);

// Get all customers (with pagination and filters)
router.get('/', auth, adminOrCounter, searchCustomers);

// Get customer by ID
router.get('/:id', auth, adminOrCounter, validateCustomerId, getCustomer);

// Get customer order history
router.get('/:id/orders', auth, adminOrCounter, validateCustomerId, getCustomerOrderHistory);

// Get customer pending balance
router.get('/:id/balance', auth, adminOrCounter, validateCustomerId, getCustomerPendingBalance);

// Get customer statistics
router.get('/:id/stats', auth, adminOrCounter, validateCustomerId, getCustomerStats);

// Get customer medication history
router.get('/:id/medications', auth, adminOrCounter, validateCustomerId, getCustomerMedicationHistory);

// Create new customer
router.post('/', auth, adminOrCounter, createCustomer);

// Update customer
router.put('/:id', auth, adminOrCounter, validateCustomerId, updateCustomer);

// Delete customer (admin only)
router.delete('/:id', auth, adminOnly, validateCustomerId, deleteCustomer);

module.exports = router;