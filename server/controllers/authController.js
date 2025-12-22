const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { query } = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
  process.exit(1);
}

const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";

// Generate unique session token
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate JWT token with session token
const generateToken = (userId, sessionToken) => {
  return jwt.sign({ userId, sessionToken }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

// Verify password
const verifyPassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

// Hash password
const hashPassword = async (password) => {
  return bcrypt.hash(password, 10);
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Query user from PostgreSQL
    const result = await query(
      `SELECT u.*, o.id as org_id, o.name as org_name, o.access_valid_till, o.is_active as org_is_active
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = $1`,
      [email]
    );

    const profile = result.rows[0];

    if (!profile) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(
      password,
      profile.password_hash
    );
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!profile.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Check if user has a valid POS role
    if (!profile.role_in_pos || profile.role_in_pos === "none") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access the POS system.",
      });
    }

    // Check organization access validity
    const now = new Date();
    if (profile.org_is_active === false) {
      return res.status(403).json({
        success: false,
        message: "Organization has been deactivated",
      });
    }

    if (
      profile.access_valid_till &&
      new Date(profile.access_valid_till) < now
    ) {
      return res.status(403).json({
        success: false,
        message: "Organization access has expired",
      });
    }

    // Generate new session token (this will invalidate previous session)
    const sessionToken = generateSessionToken();
    
    // Update last login and store new session token
    await query(
      "UPDATE users SET last_login = NOW(), session_token = $1, session_created_at = NOW() WHERE id = $2", 
      [sessionToken, profile.id]
    );

    // Generate JWT token with session token embedded
    const token = generateToken(profile.id, sessionToken);

    console.log(`✅ User ${profile.username} logged in from new session. Previous sessions invalidated.`);

    res.json({
      success: true,
      data: {
        user: {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
          role_in_pos: profile.role_in_pos,
          roleInPos: profile.role_in_pos,
          organizationId: profile.organization_id,
          permissions: profile.permissions || [],
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Error logging in",
    });
  }
};

const register = async (req, res) => {
  try {
    const { username, email, password, fullName, role, organizationId } =
      req.body;

    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Username, email, password, and fullName are required",
      });
    }

    // Check if user already exists
    const existingUser = await query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Username or email already exists",
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user in database
    const permissions =
      role === "admin"
        ? ["all"]
        : ["medicine:read", "order:create", "order:read"];

    const result = await query(
      `INSERT INTO users (username, email, password_hash, full_name, role, role_in_pos, organization_id, is_active, permissions, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, username, email, full_name, role, role_in_pos, organization_id, permissions`,
      [
        username,
        email,
        passwordHash,
        fullName,
        role || "user",
        role === "admin" ? "admin" : "counter",
        organizationId,
        true,
        JSON.stringify(permissions),
        req.user?.id || null,
      ]
    );

    const profile = result.rows[0];

    // Generate session token for new user
    const sessionToken = generateSessionToken();
    
    // Store session token
    await query(
      "UPDATE users SET session_token = $1, session_created_at = NOW() WHERE id = $2",
      [sessionToken, profile.id]
    );

    // Generate JWT token with session token
    const token = generateToken(profile.id, sessionToken);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
          role_in_pos: profile.role_in_pos,
          roleInPos: profile.role_in_pos,
          organizationId: profile.organization_id,
          permissions: profile.permissions || [],
        },
        token,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating user",
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.*, o.id as org_id, o.name as org_name, o.access_valid_till, o.is_active as org_is_active
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    const profile = result.rows[0];

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check organization access validity
    const now = new Date();
    if (profile.org_is_active === false) {
      return res.status(403).json({
        success: false,
        message: "Organization has been deactivated",
      });
    }

    if (
      profile.access_valid_till &&
      new Date(profile.access_valid_till) < now
    ) {
      return res.status(403).json({
        success: false,
        message: "Organization access has expired",
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
          role_in_pos: profile.role_in_pos,
          roleInPos: profile.role_in_pos,
          organizationId: profile.organization_id,
          permissions: profile.permissions || [],
          phone: profile.phone,
          avatar: profile.avatar,
          theme: profile.theme,
          language: profile.language,
          timezone: profile.timezone,
          preferences: profile.preferences,
          notificationSettings: profile.notification_settings,
          organization: {
            id: profile.org_id,
            name: profile.org_name,
            access_valid_till: profile.access_valid_till,
            is_active: profile.org_is_active,
          },
          organization_access_valid_till: profile.access_valid_till,
          organization_is_active: profile.org_is_active,
        },
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, email, theme, language, timezone, preferences } =
      req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingEmail = await query(
        "SELECT id FROM users WHERE email = $1 AND id != $2",
        [email, req.user.id]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (fullName) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fullName);
    }
    if (phone) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (email) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (theme) {
      updates.push(`theme = $${paramCount++}`);
      values.push(theme);
    }
    if (language) {
      updates.push(`language = $${paramCount++}`);
      values.push(language);
    }
    if (timezone) {
      updates.push(`timezone = $${paramCount++}`);
      values.push(timezone);
    }
    if (preferences) {
      updates.push(`preferences = $${paramCount++}`);
      values.push(preferences);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    values.push(req.user.id);

    const result = await query(
      `UPDATE users SET ${updates.join(
        ", "
      )}, updated_at = NOW() WHERE id = $${paramCount} RETURNING id, username, email, full_name, role, role_in_pos, organization_id, permissions, phone, avatar, theme, language, timezone, preferences, notification_settings`,
      values
    );

    const profile = result.rows[0];

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
          role_in_pos: profile.role_in_pos,
          roleInPos: profile.role_in_pos,
          organizationId: profile.organization_id,
          permissions: profile.permissions || [],
          phone: profile.phone,
          avatar: profile.avatar,
          theme: profile.theme,
          language: profile.language,
          timezone: profile.timezone,
          preferences: profile.preferences,
          notificationSettings: profile.notification_settings,
        },
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    // Get user from database
    const result = await query(
      "SELECT password_hash FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isPasswordValid = await verifyPassword(
      currentPassword,
      result.rows[0].password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [newPasswordHash, req.user.id]
    );

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Error changing password",
    });
  }
};

// Logout - invalidate current session
const logout = async (req, res) => {
  try {
    // Clear session token from database
    await query(
      "UPDATE users SET session_token = NULL, session_created_at = NULL WHERE id = $1",
      [req.user.id]
    );

    console.log(`✅ User ${req.user.username} logged out successfully`);

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Error logging out",
    });
  }
};

// Placeholder functions for password reset (requires email service setup)
const forgotPassword = async (req, res) => {
  res.json({
    success: true,
    message: "Password reset functionality coming soon",
  });
};

const resetPassword = async (req, res) => {
  res.json({
    success: true,
    message: "Password reset functionality coming soon",
  });
};

module.exports = {
  login,
  register,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
