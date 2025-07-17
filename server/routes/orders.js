const express = require("express");
const router = express.Router();
const { auth, checkRole } = require("../middleware/auth");

// Role-based middleware
const adminOrCounter = checkRole(['admin', 'counter']);
const adminOnly = checkRole(['admin']);
const {
  getAllOrders,
  getOrder,
  createOrder,
  getDashboardData,
  getOrderPdf,
  getSalesChartData,
} = require("../controllers/orderController");

// Middleware to validate order ID (MongoDB ObjectId format)
const validateOrderId = (req, res, next) => {
  const { id } = req.params;

  // MongoDB ObjectId validation (24 character hex string)
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;

  if (!id || id === "undefined" || id === "null" || !objectIdRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID format",
    });
  }

  next();
};

// Protected routes
router.use(auth);

// Get dashboard data (admin only)
router.get("/dashboard", adminOnly, getDashboardData);

// Get sales chart data (admin only)
router.get("/sales-chart", adminOnly, getSalesChartData);

// Get all orders (admin or counter)
router.get("/", adminOrCounter, getAllOrders);

// Get single order (admin or counter) - with ID validation
router.get("/:id", adminOrCounter, validateOrderId, getOrder);

// Get order PDF (admin or counter) - with ID validation
router.get(
  "/:id/receipt",
  adminOrCounter,
  validateOrderId,
  getOrderPdf
);

// Create order (counter and admin)
router.post("/", adminOrCounter, createOrder);

module.exports = router;
