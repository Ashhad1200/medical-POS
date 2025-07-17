const { supabase } = require("../config/supabase");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Supabase signInWithPassword error:", error.message); // Log the specific error
      return res.status(401).json({
        success: false,
        message: error.message || "Invalid credentials",
      });
    }

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email) // Changed from supabaseUid to email for profile lookup
      .single();

    if (profileError || !profile) {
      return res.status(401).json({
        success: false,
        message: "User profile not found",
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

    // Update last login
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", profile.id);

    res.json({
      success: true,
      data: {
        user: {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
          roleInPos: profile.role_in_pos,
          organizationId: profile.organization_id,
          permissions: profile.permissions || [],
        },
        session: data.session,  // Changed from token to full session
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
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .or(`username.eq.${username},email.eq.${email}`)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username or email already exists",
      });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          full_name: fullName,
          role: role || "user",
        },
      });

    if (authError) {
      return res.status(400).json({
        success: false,
        message: authError.message,
      });
    }

    // Create user profile in database
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .insert({
        supabase_uid: authData.user.id,
        username,
        email,
        full_name: fullName,
        role: role || "user",
        role_in_pos: role === "admin" ? "admin" : "counter", // Set default POS role
        organization_id: organizationId,
        is_active: true,
        permissions:
          role === "admin"
            ? ["all"]
            : ["medicine:read", "order:create", "order:read"],
        created_by: req.user?.id,
      })
      .select()
      .single();

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({
        success: false,
        message: "Error creating user profile",
      });
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: profile.id,
          username: profile.username,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
          roleInPos: profile.role_in_pos,
          organizationId: profile.organization_id,
          permissions: profile.permissions || [],
        },
        token: authData.user.id, // Return user ID as token for now
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
    const { data: profile, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error || !profile) {
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

    const updateData = {};
    if (fullName) updateData.full_name = fullName;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;
    if (theme) updateData.theme = theme;
    if (language) updateData.language = language;
    if (timezone) updateData.timezone = timezone;
    if (preferences) updateData.preferences = preferences;

    const { data: profile, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", req.user.id)
      .select()
      .single();

    if (error || !profile) {
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
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Error changing password",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending password reset link",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Error resetting password",
    });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
