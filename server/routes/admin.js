const express = require("express");
const router = express.Router();
const { auth, checkRole } = require("../middleware/auth");
const { query } = require("../config/database");

// All admin routes require authentication and admin role
router.use(auth);
router.use(checkRole(["admin"]));

/**
 * GET /api/admin/stats - Get admin dashboard statistics
 */
router.get("/stats", async (req, res) => {
  try {
    // Get global statistics across all organizations
    const [
      totalOrganizationsResult,
      totalUsersResult,
      totalOrdersResult,
      totalMedicinesResult,
      totalSuppliersResult,
    ] = await Promise.all([
      query("SELECT COUNT(*) as count FROM organizations WHERE is_active = true"),
      query("SELECT COUNT(*) as count FROM users WHERE is_active = true"),
      query("SELECT COUNT(*) as count FROM orders"),
      query("SELECT COUNT(*) as count FROM medicines WHERE is_active = true"),
      query("SELECT COUNT(*) as count FROM suppliers WHERE is_active = true"),
    ]);

    const totalOrganizations = parseInt(totalOrganizationsResult.rows[0].count);
    const totalUsers = parseInt(totalUsersResult.rows[0].count);
    const totalOrders = parseInt(totalOrdersResult.rows[0].count);
    const totalMedicines = parseInt(totalMedicinesResult.rows[0].count);
    const totalSuppliers = parseInt(totalSuppliersResult.rows[0].count);

    // Get today's global revenue
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59
    );

    const todayRevenueResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_amount, COUNT(*) as count
       FROM orders
       WHERE status = $1 AND created_at >= $2 AND created_at <= $3`,
      ["completed", startOfDay, endOfDay]
    );

    const todayRevenue = parseFloat(todayRevenueResult.rows[0].total_amount) || 0;
    const todayOrders = parseInt(todayRevenueResult.rows[0].count) || 0;

    // Get this month's revenue
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyRevenueResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_amount, COUNT(*) as count
       FROM orders
       WHERE status = $1 AND created_at >= $2`,
      ["completed", startOfMonth]
    );

    const monthlyRevenue = parseFloat(monthlyRevenueResult.rows[0].total_amount) || 0;
    const monthlyOrders = parseInt(monthlyRevenueResult.rows[0].count) || 0;
    const averageOrderValue = monthlyOrders > 0 ? monthlyRevenue / monthlyOrders : 0;

    // Get pending orders
    const pendingResult = await query(
      "SELECT COUNT(*) as count FROM orders WHERE status = $1",
      ["pending"]
    );
    const pendingOrders = parseInt(pendingResult.rows[0].count);

    // Get organization statistics
    const orgStatsResult = await query(
      `SELECT COUNT(*) as count FROM organizations WHERE is_active = false`
    );
    const inactiveOrganizations = parseInt(orgStatsResult.rows[0].count);

    res.json({
      success: true,
      data: {
        organizations: {
          total: totalOrganizations,
          inactive: inactiveOrganizations,
          active: totalOrganizations - inactiveOrganizations,
        },
        users: totalUsers,
        medicines: totalMedicines,
        suppliers: totalSuppliers,
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          today: todayOrders,
        },
        revenue: {
          today: todayRevenue,
          thisMonth: monthlyRevenue,
          averageOrderValue: averageOrderValue,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin statistics",
    });
  }
});

/**
 * GET /api/admin/users - Get all users across all organizations
 */
router.get("/users", async (req, res) => {
  try {
    const { search, role, organizationId, isActive } = req.query;

    let whereClause = "1=1";
    const params = [];

    if (search) {
      whereClause += ` AND (username ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1} OR full_name ILIKE $${params.length + 1})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      whereClause += ` AND role_in_pos = $${params.length + 1}`;
      params.push(role);
    }

    if (organizationId) {
      whereClause += ` AND organization_id = $${params.length + 1}`;
      params.push(organizationId);
    }

    if (isActive !== undefined) {
      whereClause += ` AND is_active = $${params.length + 1}`;
      params.push(isActive === 'true');
    }

    const result = await query(
      `SELECT id, username, email, full_name, phone, role_in_pos as role,
              organization_id, is_active, last_login, created_at
       FROM users
       WHERE ${whereClause}
       ORDER BY created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

/**
 * GET /api/admin/users/:id - Get single user details
 */
router.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, username, email, full_name, phone, role_in_pos as role,
              organization_id, is_active, last_login, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
});

/**
 * POST /api/admin/users - Create new user
 */
router.post("/users", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      full_name,
      phone,
      role,
      organization_id,
    } = req.body;

    if (!username || !email || !password || !organization_id) {
      return res.status(400).json({
        success: false,
        message: "Username, email, password, and organization_id are required",
      });
    }

    // Check if user already exists
    const existing = await query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    // Hash password (assuming bcryptjs is available)
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (username, email, password, full_name, phone, role_in_pos, organization_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id, username, email, full_name, phone, role_in_pos as role, organization_id, created_at`,
      [username, email, hashedPassword, full_name || null, phone || null, role || "user", organization_id]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
});

/**
 * PUT /api/admin/users/:id - Update user
 */
router.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, full_name, phone, role, is_active } = req.body;

    // Check if user exists
    const userCheck = await query("SELECT id FROM users WHERE id = $1", [id]);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (username !== undefined) {
      updates.push(`username = $${paramIndex}`);
      values.push(username);
      paramIndex++;
    }

    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex}`);
      values.push(full_name);
      paramIndex++;
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(phone);
      paramIndex++;
    }

    if (role !== undefined) {
      updates.push(`role_in_pos = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }

    updates.push(`updated_at = now()`);
    values.push(id);

    const result = await query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING id, username, email, full_name, phone, role_in_pos as role, is_active, updated_at`,
      values
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
});

/**
 * DELETE /api/admin/users/:id - Delete user
 */
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userCheck = await query("SELECT id FROM users WHERE id = $1", [id]);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await query("DELETE FROM users WHERE id = $1", [id]);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
});

/**
 * GET /api/admin/audit-logs - Get audit logs
 */
router.get("/audit-logs", async (req, res) => {
  try {
    const { organizationId, userId, action, startDate, endDate } = req.query;

    let whereClause = "1=1";
    const params = [];

    if (organizationId) {
      whereClause += ` AND organization_id = $${params.length + 1}`;
      params.push(organizationId);
    }

    if (userId) {
      whereClause += ` AND user_id = $${params.length + 1}`;
      params.push(userId);
    }

    if (action) {
      whereClause += ` AND action = $${params.length + 1}`;
      params.push(action);
    }

    if (startDate) {
      whereClause += ` AND created_at >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND created_at <= $${params.length + 1}`;
      params.push(endDate);
    }

    const result = await query(
      `SELECT id, action, entity, entity_id, user_id, organization_id, old_values, new_values, created_at
       FROM audit_logs
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT 1000`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
    });
  }
});

module.exports = router;
