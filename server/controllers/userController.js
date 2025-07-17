const { supabase } = require("../config/supabase");
const User = require("../models/supabase/User");

// Get all users for the current organization
const getUsers = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
      });
    }

    // Get users from the same organization
    const users = await User.findByOrganization(organizationId, {
      isActive: true, // Only get active users by default
    });

    // Format users for frontend
    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role_in_pos || user.role,
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
      error: error.message,
    });
  }
};

// Get user by ID (within same organization)
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user belongs to the same organization
    if (user.organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          role: user.role_in_pos || user.role,
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
      error: error.message,
    });
  }
};

// Create user (within same organization)
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

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return res.status(400).json({
        success: false,
        message: "Failed to create user account",
        error: authError.message,
      });
    }

    // Create user profile in database
    const userData = {
      supabase_uid: authData.user.id,
      username,
      email,
      full_name: fullName,
      phone,
      role: role || "user",
      role_in_pos: role === "admin" ? "admin" : "counter",
      organization_id: organizationId,
      is_active: true,
      permissions: role === "admin" ? ["all"] : ["medicine:read", "order:create", "order:read"],
      created_by: req.user.id,
    };

    const user = await User.create(userData);

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
          role: user.role_in_pos || user.role,
          isActive: user.is_active,
          organizationId: user.organization_id,
        },
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message,
    });
  }
};

// Update user (within same organization)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, fullName, phone, role, isActive } = req.body;
    const organizationId = req.user.organization_id;

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user belongs to the same organization
    if (user.organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Update user data
    if (username) user.username = username;
    if (email) user.email = email;
    if (fullName) user.full_name = fullName;
    if (phone !== undefined) user.phone = phone;
    if (role) {
      user.role = role;
      user.role_in_pos = role === "admin" ? "admin" : "counter";
      user.permissions = role === "admin" ? ["all"] : ["medicine:read", "order:create", "order:read"];
    }
    if (isActive !== undefined) user.is_active = isActive;

    const updatedUser = await user.save();

    res.json({
      success: true,
      message: "User updated successfully",
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          fullName: updatedUser.full_name,
          phone: updatedUser.phone,
          role: updatedUser.role_in_pos || updatedUser.role,
          isActive: updatedUser.is_active,
          organizationId: updatedUser.organization_id,
        },
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
};

// Delete user (within same organization)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user belongs to the same organization
    if (user.organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Don't allow deleting yourself
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    // Delete from Supabase Auth
    if (user.supabase_uid) {
      await supabase.auth.admin.deleteUser(user.supabase_uid);
    }

    // Delete from database
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

// Update user status (within same organization)
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const organizationId = req.user.organization_id;

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user belongs to the same organization
    if (user.organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Don't allow deactivating yourself
    if (user.id === req.user.id && !isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot deactivate your own account",
      });
    }

    user.is_active = isActive;
    const updatedUser = await user.save();

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          fullName: updatedUser.full_name,
          phone: updatedUser.phone,
          role: updatedUser.role_in_pos || updatedUser.role,
          isActive: updatedUser.is_active,
          organizationId: updatedUser.organization_id,
        },
      },
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message,
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