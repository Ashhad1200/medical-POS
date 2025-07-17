const express = require("express");
const router = express.Router();
const { auth, checkRole } = require("../middleware/auth");
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus
} = require('../controllers/userController');

// Protected routes - only admin role
router.use(auth);
router.use(checkRole(["admin"]));

// GET /api/users
router.get("/", getUsers);

// GET /api/users/:id
router.get("/:id", getUser);

// POST /api/users
router.post("/", createUser);

// PUT /api/users/:id
router.put("/:id", updateUser);

// PATCH /api/users/:id
router.patch("/:id", updateUser);

// DELETE /api/users/:id
router.delete("/:id", deleteUser);

// PATCH /api/users/:id/status
router.patch("/:id/status", updateUserStatus);

module.exports = router;
