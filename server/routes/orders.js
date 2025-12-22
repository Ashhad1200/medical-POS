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
  getDuedOrders,
  getCustomersWithDues,
  payDue,
} = require("../controllers/orderController");

// Middleware to validate order ID (UUID format for Supabase)
const validateOrderId = (req, res, next) => {
  const { id } = req.params;

  // UUID validation (Supabase uses UUID format)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!id || id === "undefined" || id === "null" || !uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID format. Expected UUID format.",
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

// === NEW: Due Orders Management ===
// Get all orders with outstanding dues (admin/counter)
router.get("/dued", adminOrCounter, getDuedOrders);

// Get customers with dues grouped (admin/counter)
router.get("/customers-with-dues", adminOrCounter, getCustomersWithDues);

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

// === NEW: Pay due on an order ===
router.patch("/:id/pay-due", adminOrCounter, validateOrderId, payDue);

module.exports = router;

