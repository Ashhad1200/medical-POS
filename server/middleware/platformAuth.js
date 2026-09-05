const jwt = require("jsonwebtoken");
const { query } = require("../config/database");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

/**
 * Gate for /api/platform/* — the SaaS operator back office.
 * Requires a valid JWT belonging to a user with users.is_platform_admin = true.
 * Unlike middleware/auth.js this is NOT scoped to an organization and does not
 * apply tenant access-window / org-active checks.
 */
const platformAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Access token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
        code: "INVALID_TOKEN",
      });
    }

    const result = await query(
      `SELECT id, username, email, full_name, role, is_platform_admin,
              is_active, session_token
       FROM users WHERE id = $1`,
      [decoded.userId]
    );
    const user = result.rows[0];

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User profile not found" });
    }

    // Honour single-session enforcement when the token carries a session id
    if (
      decoded.sessionToken &&
      user.session_token &&
      decoded.sessionToken !== user.session_token
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Your session has been invalidated because you logged in elsewhere.",
        code: "SESSION_INVALIDATED",
        requiresLogout: true,
      });
    }

    if (!user.is_active) {
      return res
        .status(401)
        .json({ success: false, message: "Account is deactivated" });
    }

    if (!user.is_platform_admin) {
      return res.status(403).json({
        success: false,
        message: "Platform administrator access required",
      });
    }

    req.token = token;
    req.platformAdmin = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
    };

    next();
  } catch (error) {
    console.error("platformAuth error:", error);
    res.status(401).json({ success: false, message: "Please authenticate" });
  }
};

module.exports = { platformAuth };
