const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
        code: "INVALID_TOKEN",
      });
    }

    // Get user profile from database with organization data
    const result = await query(
      `SELECT u.*, o.id as org_id, o.name as org_name, o.access_valid_till, o.is_active as org_is_active
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    const profile = result.rows[0];

    if (!profile) {
      console.error("User profile not found for ID:", decoded.userId);
      return res.status(401).json({
        success: false,
        message: "User profile not found. Your session may be invalid. Please log out and log in again.",
        code: "USER_PROFILE_NOT_FOUND",
      });
    }

    // SINGLE SESSION CHECK: Verify session token matches
    if (decoded.sessionToken !== profile.session_token) {
      console.warn(`⚠️ Session token mismatch for user ${profile.username}. User logged in from another location.`);
      return res.status(401).json({
        success: false,
        message: "Your session has been invalidated because you logged in from another device or browser.",
        code: "SESSION_INVALIDATED",
        requiresLogout: true,
      });
    }

    if (!profile.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Check organization access validity
    const now = new Date();
    const orgAccessValidTill = profile.access_valid_till;
    const isOrgActive = profile.org_is_active;

    if (isOrgActive === false) {
      return res.status(403).json({
        success: false,
        message: "Organization has been deactivated",
      });
    }

    if (orgAccessValidTill && new Date(orgAccessValidTill) < now) {
      return res.status(403).json({
        success: false,
        message: "Organization access has expired",
      });
    }

    req.token = token;
    req.user = {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      role_in_pos: profile.role_in_pos,
      organization_id: profile.organization_id,
      permissions: profile.permissions,
      is_active: profile.is_active,
      organization: {
        id: profile.org_id,
        name: profile.org_name,
        access_valid_till: profile.access_valid_till,
        is_active: profile.org_is_active,
      },
    };

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

    if (!roles.includes(req.user.role_in_pos)) {
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
      try {
        const decoded = jwt.verify(token, JWT_SECRET);

        const result = await query(
          `SELECT u.*, o.id as org_id, o.name as org_name, o.access_valid_till, o.is_active as org_is_active
           FROM users u
           LEFT JOIN organizations o ON u.organization_id = o.id
           WHERE u.id = $1`,
          [decoded.userId]
        );

        const profile = result.rows[0];

        if (profile && profile.is_active) {
          // Check organization access validity for optional auth too
          const now = new Date();
          const orgAccessValidTill = profile.access_valid_till;
          const isOrgActive = profile.org_is_active;

          if (
            isOrgActive !== false &&
            (!orgAccessValidTill || new Date(orgAccessValidTill) >= now)
          ) {
            req.token = token;
            req.user = {
              id: profile.id,
              username: profile.username,
              email: profile.email,
              full_name: profile.full_name,
              role: profile.role,
              role_in_pos: profile.role_in_pos,
              organization_id: profile.organization_id,
              permissions: profile.permissions,
              is_active: profile.is_active,
              organization: {
                id: profile.org_id,
                name: profile.org_name,
                access_valid_till: profile.access_valid_till,
                is_active: profile.org_is_active,
              },
            };
          }
        }
      } catch (error) {
        // Continue without auth if token is invalid
        console.log("Optional auth - token invalid, continuing without auth");
      }
    }

    next();
  } catch (error) {
    // Continue without auth if token is invalid
    next();
  }
};

module.exports = { auth, checkRole, optionalAuth };
