const express = require("express");
const router = express.Router();
const { auth, checkRole } = require("../middleware/auth");
const {
  getInventory,
  getLowStockItems,
  getExpiringItems,
  generateAutoPurchaseOrders,
  getReorderSuggestions,
  updateInventoryItem,
  getInventoryStats
} = require('../controllers/inventoryController');

// Protected routes
router.use(auth);

// GET /api/inventory/stats - Get inventory statistics
router.get("/stats", checkRole(["admin", "warehouse", "manager"]), async (req, res) => {
  try {
    const stats = await getInventoryStats(req.user.organization_id);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/inventory/low-stock - Get low stock items
router.get("/low-stock", checkRole(["admin", "warehouse", "manager"]), getLowStockItems);

// GET /api/inventory/expiring - Get expiring items
router.get("/expiring", checkRole(["admin", "warehouse", "manager"]), getExpiringItems);

// GET /api/inventory/reorder-suggestions - Get reorder suggestions
router.get("/reorder-suggestions", checkRole(["admin", "warehouse", "manager"]), getReorderSuggestions);

// POST /api/inventory/auto-purchase-orders - Generate automatic purchase orders
router.post("/auto-purchase-orders", checkRole(["admin", "manager"]), generateAutoPurchaseOrders);

// GET /api/inventory - Get all inventory items with filtering
router.get("/", checkRole(["admin", "warehouse", "manager", "counter"]), getInventory);

// PUT /api/inventory/:id - Update inventory item
router.put("/:id", checkRole(["admin", "warehouse", "manager"]), updateInventoryItem);

module.exports = router;
