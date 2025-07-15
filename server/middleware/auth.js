const { supabase } = require("../config/supabase");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("supabase_uid", user.id)
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

    req.token = token;
    req.user = profile;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Please authenticate",
    });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied - insufficient permissions",
      });
    }
    next();
  };
};

// Optional middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (token) {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (!error && user) {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("supabase_uid", user.id)
          .single();

        if (profile && profile.is_active) {
          req.token = token;
          req.user = profile;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without auth if token is invalid
    next();
  }
};

module.exports = { auth, checkRole, optionalAuth };
