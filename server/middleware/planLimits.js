const { query } = require("../config/database");

/**
 * Blocks tenant user creation when the organization has reached its plan's
 * max_users. Attach BEFORE the create handler on tenant routes.
 * Fails open on limiter errors so a plumbing bug never locks a tenant out.
 */
const enforceUserLimit = async (req, res, next) => {
  try {
    const orgId = req.user && req.user.organization_id;
    if (!orgId) return next();

    const { rows } = await query(
      `SELECT p.max_users,
              (SELECT COUNT(*) FROM users u
                 WHERE u.organization_id = o.id AND u.is_active = true) AS active_users
       FROM organizations o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.id = $1`,
      [orgId]
    );

    const row = rows[0];
    if (row && row.max_users != null && Number(row.active_users) >= Number(row.max_users)) {
      return res.status(403).json({
        success: false,
        message: `Your plan allows up to ${row.max_users} active users. Upgrade the plan to add more.`,
        code: "PLAN_LIMIT_USERS",
      });
    }
    next();
  } catch (err) {
    console.error("enforceUserLimit error (allowing request):", err);
    next();
  }
};

/**
 * Guard a route by a boolean feature flag in the org's plan.features JSON.
 *   router.use(requireFeature("ai_analytics"))
 */
const requireFeature = (featureKey) => async (req, res, next) => {
  try {
    const orgId = req.user && req.user.organization_id;
    if (!orgId) return next();

    const { rows } = await query(
      `SELECT COALESCE(p.features ->> $2, 'false') AS enabled
       FROM organizations o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.id = $1`,
      [orgId, featureKey]
    );

    if (rows[0] && rows[0].enabled === "true") return next();
    return res.status(403).json({
      success: false,
      message: `Your plan does not include "${featureKey}".`,
      code: "PLAN_FEATURE_LOCKED",
    });
  } catch (err) {
    console.error("requireFeature error (allowing request):", err);
    next();
  }
};

module.exports = { enforceUserLimit, requireFeature };
