const { query, withTransaction } = require("../config/database");
const bcrypt = require("bcryptjs");

/**
 * Get all users for the current organization
 */
const getUsers = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    const result = await query(
      `SELECT id, username, email, full_name, phone, role_in_pos as role, 
              is_active, last_login, created_at, organization_id
       FROM users WHERE organization_id = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [organizationId]
    );

    const formattedUsers = result.rows.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      organizationId: user.organization_id,
    }));

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        total: formattedUsers.length,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

/**
 * Get user by ID (within same organization)
 */
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const result = await query(
      `SELECT id, username, email, full_name, phone, role_in_pos as role, 
              is_active, last_login, created_at, organization_id
       FROM users WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          role: user.role,
          isActive: user.is_active,
          lastLogin: user.last_login,
          createdAt: user.created_at,
          organizationId: user.organization_id,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

/**
 * Create user (within same organization)
 */
const createUser = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      fullName,
      phone,
      role,
    } = req.body;

    const organizationId = req.user.organization_id;

    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Username, email, password, and fullName are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if email already exists in organization
    const emailResult = await query(
      "SELECT id FROM users WHERE email = $1 AND organization_id = $2",
      [email, organizationId]
    );
    if (emailResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists in your organization",
      });
    }

    // Check if username already exists in organization
    const usernameResult = await query(
      "SELECT id FROM users WHERE username = $1 AND organization_id = $2",
      [username, organizationId]
    );
    if (usernameResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Username already exists in your organization",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine permissions based on role
    const roleInPos = role === "admin" ? "admin" : "counter";
    const permissions = role === "admin" ? ["all"] : ["medicine:read", "order:create", "order:read"];

    // Create user
    const result = await query(
      `INSERT INTO users (
        username, email, password_hash, full_name, phone, role_in_pos,
        organization_id, is_active, permissions, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id, username, email, full_name, phone, role_in_pos, is_active, organization_id`,
      [
        username,
        email,
        hashedPassword,
        fullName,
        phone || null,
        roleInPos,
        organizationId,
        true,
        JSON.stringify(permissions),
        req.user.id,
      ]
    );

    const user = result.rows[0];

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          role: user.role_in_pos,
          isActive: user.is_active,
          organizationId: user.organization_id,
        },
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);

    // Check for duplicate key error
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

/**
 * Update user (within same organization)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, fullName, phone, role, isActive } = req.body;
    const organizationId = req.user.organization_id;

    // Check user exists and belongs to organization
    const checkResult = await query(
      "SELECT id, organization_id FROM users WHERE id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (checkResult.rows[0].organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Build SET clause for dynamic updates
    const setFields = [];
    const params = [];
    let paramIndex = 1;

    if (username) {
      setFields.push(`username = $${paramIndex}`);
      params.push(username);
      paramIndex++;
    }

    if (email) {
      setFields.push(`email = $${paramIndex}`);
      params.push(email);
      paramIndex++;
    }

    if (fullName) {
      setFields.push(`full_name = $${paramIndex}`);
      params.push(fullName);
      paramIndex++;
    }

    if (phone !== undefined) {
      setFields.push(`phone = $${paramIndex}`);
      params.push(phone || null);
      paramIndex++;
    }

    if (role) {
      const roleInPos = role === "admin" ? "admin" : "counter";
      const permissions = role === "admin" ? ["all"] : ["medicine:read", "order:create", "order:read"];
      setFields.push(`role_in_pos = $${paramIndex}`);
      params.push(roleInPos);
      paramIndex++;
      setFields.push(`permissions = $${paramIndex}`);
      params.push(JSON.stringify(permissions));
      paramIndex++;
    }

    if (isActive !== undefined) {
      setFields.push(`is_active = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }

    if (setFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    setFields.push(`updated_at = NOW()`);
    params.push(id, organizationId);

    const result = await query(
      `UPDATE users SET ${setFields.join(", ")} 
       WHERE id = $${paramIndex} AND organization_id = $${paramIndex + 1}
       RETURNING id, username, email, full_name, phone, role_in_pos, is_active, organization_id`,
      params
    );

    const user = result.rows[0];

    res.json({
      success: true,
      message: "User updated successfully",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          role: user.role_in_pos,
          isActive: user.is_active,
          organizationId: user.organization_id,
        },
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};

/**
 * Delete user (within same organization)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    // Don't allow deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    // Check user exists and belongs to organization
    const checkResult = await query(
      "SELECT id, organization_id FROM users WHERE id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (checkResult.rows[0].organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Delete user from database
    await query(
      "DELETE FROM users WHERE id = $1 AND organization_id = $2",
      [id, organizationId]
    );

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
};

/**
 * Update user status (within same organization)
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const organizationId = req.user.organization_id;

    // Don't allow deactivating yourself
    if (id === req.user.id && !isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot deactivate your own account",
      });
    }

    // Check user exists and belongs to organization
    const checkResult = await query(
      "SELECT id, organization_id FROM users WHERE id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (checkResult.rows[0].organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Update user status
    await query(
      "UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 AND organization_id = $3",
      [isActive, id, organizationId]
    );

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
    });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
};
