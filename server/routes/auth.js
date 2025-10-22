const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

// Public routes
// GET /api/auth/status - Check if auth service is available
router.get("/status", (req, res) => {
  res.json({
    success: true,
    message: "Auth service is running",
    timestamp: new Date().toISOString(),
  });
});

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPassword);

// POST /api/auth/reset-password
router.post("/reset-password", resetPassword);

// POST /api/auth/refresh
router.post("/refresh", (req, res) => {
  res.json({
    success: false,
    message: "Refresh token functionality not implemented yet",
  });
});

// Protected routes
// POST /api/auth/logout
router.post("/logout", auth, logout);

// GET /api/auth/profile
router.get("/profile", auth, getProfile);

// PUT /api/auth/profile
router.put("/profile", auth, updateProfile);

// POST /api/auth/change-password
router.post("/change-password", auth, changePassword);

module.exports = router;
