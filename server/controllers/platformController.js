const bcrypt = require("bcryptjs");
const { query, withTransaction } = require("../config/database");

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const ok = (res, data, message = "OK", extra = {}) =>
  res.json({ success: true, message, data, ...extra });

const fail = (res, status, message, code) =>
  res.status(status).json({ success: false, message, ...(code ? { code } : {}) });

const parsePaging = (q) => {
  const page = Math.max(parseInt(q.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(q.limit) || 20, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const logEvent = (client, orgId, type, performedBy, extra = {}) =>
  client.query(
    `INSERT INTO subscription_events
       (organization_id, event_type, from_plan_id, to_plan_id, notes, metadata, performed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      orgId,
      type,
      extra.fromPlanId || null,
      extra.toPlanId || null,
      extra.notes || null,
      JSON.stringify(extra.metadata || {}),
      performedBy || null,
    ]
  );

// ---------------------------------------------------------------------------
// overview / health
// ---------------------------------------------------------------------------
const getOverview = async (req, res) => {
  try {
    const [orgs, users, mrr, planDist, recent] = await Promise.all([
      query(`SELECT
               COUNT(*)                                        AS total,
               COUNT(*) FILTER (WHERE is_active)               AS active,
               COUNT(*) FILTER (WHERE plan_status = 'trialing') AS trialing,
               COUNT(*) FILTER (WHERE plan_status = 'suspended') AS suspended,
               COUNT(*) FILTER (WHERE access_valid_till IS NOT NULL
                                 AND access_valid_till < now()) AS expired
             FROM organizations
             WHERE code <> '__platform__'`),
      query(`SELECT COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE is_active) AS active
             FROM users WHERE is_platform_admin = false`),
      query(`SELECT COALESCE(SUM(p.price_monthly), 0) AS mrr
             FROM organizations o
             JOIN plans p ON p.id = o.plan_id
             WHERE o.is_active AND o.plan_status IN ('active','trialing')`),
      query(`SELECT p.code, p.name, COUNT(o.id) AS organizations
             FROM plans p
             LEFT JOIN organizations o ON o.plan_id = p.id
             GROUP BY p.id ORDER BY p.sort_order`),
      query(`SELECT se.*, o.name AS organization_name
             FROM subscription_events se
             JOIN organizations o ON o.id = se.organization_id
             ORDER BY se.created_at DESC LIMIT 10`),
    ]);

    ok(res, {
      organizations: orgs.rows[0],
      users: users.rows[0],
      mrr: Number(mrr.rows[0].mrr),
      planDistribution: planDist.rows,
      recentEvents: recent.rows,
    });
  } catch (e) {
    console.error("platform getOverview:", e);
    fail(res, 500, "Failed to load overview");
  }
};

const getHealth = async (req, res) => {
  try {
    const start = Date.now();
    await query("SELECT 1");
    const dbLatencyMs = Date.now() - start;

    const counts = await query(`
      SELECT
        (SELECT COUNT(*) FROM organizations) AS organizations,
        (SELECT COUNT(*) FROM users)          AS users,
        (SELECT COUNT(*) FROM orders)         AS orders,
        (SELECT COUNT(*) FROM products)       AS products
    `);

    ok(res, {
      status: "ok",
      db: { connected: true, latencyMs: dbLatencyMs },
      counts: counts.rows[0],
      server: {
        uptimeSeconds: Math.round(process.uptime()),
        nodeVersion: process.version,
        env: process.env.NODE_ENV || "development",
        memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("platform getHealth:", e);
    res.status(503).json({
      success: false,
      message: "Database unreachable",
      data: { status: "degraded", db: { connected: false } },
    });
  }
};

// ---------------------------------------------------------------------------
// plans
// ---------------------------------------------------------------------------
const listPlans = async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM organizations o WHERE o.plan_id = p.id) AS organization_count
       FROM plans p
       ORDER BY p.sort_order, p.price_monthly`
    );
    ok(res, result.rows);
  } catch (e) {
    console.error("platform listPlans:", e);
    fail(res, 500, "Failed to list plans");
  }
};

const getPlan = async (req, res) => {
  try {
    const result = await query("SELECT * FROM plans WHERE id = $1", [
      req.params.id,
    ]);
    if (!result.rows.length) return fail(res, 404, "Plan not found");
    ok(res, result.rows[0]);
  } catch (e) {
    console.error("platform getPlan:", e);
    fail(res, 500, "Failed to load plan");
  }
};

const PLAN_FIELDS = [
  "code",
  "name",
  "description",
  "price_monthly",
  "price_yearly",
  "currency",
  "max_users",
  "max_products",
  "trial_days",
  "features",
  "is_active",
  "is_public",
  "sort_order",
];

const createPlan = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.code || !b.name)
      return fail(res, 400, "code and name are required", "VALIDATION_ERROR");

    const cols = PLAN_FIELDS.filter((f) => b[f] !== undefined);
    const values = cols.map((f) =>
      f === "features" ? JSON.stringify(b[f] || {}) : b[f]
    );
    const placeholders = cols.map((_, i) => `$${i + 1}`);

    const result = await query(
      `INSERT INTO plans (${cols.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING *`,
      values
    );
    res
      .status(201)
      .json({ success: true, message: "Plan created", data: result.rows[0] });
  } catch (e) {
    if (e.code === "23505") return fail(res, 409, "A plan with that code already exists");
    console.error("platform createPlan:", e);
    fail(res, 500, "Failed to create plan");
  }
};

const updatePlan = async (req, res) => {
  try {
    const b = req.body || {};
    const cols = PLAN_FIELDS.filter((f) => b[f] !== undefined);
    if (!cols.length) return fail(res, 400, "No fields to update");

    const sets = cols.map((f, i) => `${f} = $${i + 1}`);
    const values = cols.map((f) =>
      f === "features" ? JSON.stringify(b[f] || {}) : b[f]
    );
    values.push(req.params.id);

    const result = await query(
      `UPDATE plans SET ${sets.join(", ")}, updated_at = now()
       WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows.length) return fail(res, 404, "Plan not found");
    ok(res, result.rows[0], "Plan updated");
  } catch (e) {
    if (e.code === "23505") return fail(res, 409, "A plan with that code already exists");
    console.error("platform updatePlan:", e);
    fail(res, 500, "Failed to update plan");
  }
};

const deletePlan = async (req, res) => {
  try {
    const inUse = await query(
      "SELECT COUNT(*) AS c FROM organizations WHERE plan_id = $1",
      [req.params.id]
    );
    if (Number(inUse.rows[0].c) > 0) {
      // keep referential history intact — just retire it
      const result = await query(
        `UPDATE plans SET is_active = false, is_public = false, updated_at = now()
         WHERE id = $1 RETURNING *`,
        [req.params.id]
      );
      if (!result.rows.length) return fail(res, 404, "Plan not found");
      return ok(res, result.rows[0], "Plan retired (still assigned to organizations)");
    }
    const result = await query("DELETE FROM plans WHERE id = $1 RETURNING id", [
      req.params.id,
    ]);
    if (!result.rows.length) return fail(res, 404, "Plan not found");
    ok(res, { id: req.params.id }, "Plan deleted");
  } catch (e) {
    console.error("platform deletePlan:", e);
    fail(res, 500, "Failed to delete plan");
  }
};

// ---------------------------------------------------------------------------
// organizations
// ---------------------------------------------------------------------------
const listOrganizations = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaging(req.query);
    const { search = "", status = "all", planId } = req.query;

    const where = ["o.code <> '__platform__'"];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(o.name ILIKE $${params.length} OR o.code ILIKE $${params.length} OR o.email ILIKE $${params.length})`
      );
    }
    if (status === "active") where.push("o.is_active = true");
    if (status === "inactive") where.push("o.is_active = false");
    if (status === "suspended") where.push("o.plan_status = 'suspended'");
    if (status === "trialing") where.push("o.plan_status = 'trialing'");
    if (status === "expired")
      where.push("o.access_valid_till IS NOT NULL AND o.access_valid_till < now()");
    if (planId) {
      params.push(planId);
      where.push(`o.plan_id = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const totalResult = await query(
      `SELECT COUNT(*) AS c FROM organizations o ${whereSql}`,
      params
    );
    const total = Number(totalResult.rows[0].c);

    params.push(limit, offset);
    const result = await query(
      `SELECT o.id, o.name, o.code, o.email, o.phone, o.is_active,
              o.plan_status, o.access_valid_till, o.plan_current_period_end,
              o.created_at,
              p.id AS plan_id, p.code AS plan_code, p.name AS plan_name,
              p.max_users, p.price_monthly,
              (SELECT COUNT(*) FROM users u
                 WHERE u.organization_id = o.id AND u.is_active = true) AS active_users
       FROM organizations o
       LEFT JOIN plans p ON p.id = o.plan_id
       ${whereSql}
       ORDER BY o.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    ok(res, result.rows, "OK", {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("platform listOrganizations:", e);
    fail(res, 500, "Failed to list organizations");
  }
};

const getOrganization = async (req, res) => {
  try {
    const org = await query(
      `SELECT o.*, p.code AS plan_code, p.name AS plan_name, p.features AS plan_features,
              p.max_users AS plan_max_users, p.max_products AS plan_max_products
       FROM organizations o
       LEFT JOIN plans p ON p.id = o.plan_id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (!org.rows.length) return fail(res, 404, "Organization not found");

    const [users, usage, events] = await Promise.all([
      query(
        `SELECT id, username, email, full_name, role_in_pos, is_active, last_login, created_at
         FROM users WHERE organization_id = $1 ORDER BY created_at`,
        [req.params.id]
      ),
      query(
        `SELECT
           (SELECT COUNT(*) FROM users    WHERE organization_id = $1 AND is_active = true) AS users,
           (SELECT COUNT(*) FROM products WHERE organization_id = $1)                       AS products,
           (SELECT COUNT(*) FROM orders   WHERE organization_id = $1)                       AS orders`,
        [req.params.id]
      ),
      query(
        `SELECT * FROM subscription_events WHERE organization_id = $1
         ORDER BY created_at DESC LIMIT 25`,
        [req.params.id]
      ),
    ]);

    ok(res, {
      organization: org.rows[0],
      users: users.rows,
      usage: usage.rows[0],
      events: events.rows,
    });
  } catch (e) {
    console.error("platform getOrganization:", e);
    fail(res, 500, "Failed to load organization");
  }
};

const createOrganization = async (req, res) => {
  try {
    const {
      name,
      code,
      email,
      phone,
      planCode = "basic",
      orgType = "pharmacy",
      admin = {},
      trialDays,
    } = req.body || {};

    if (!name || !code)
      return fail(res, 400, "Organization name and code are required", "VALIDATION_ERROR");
    if (!["pharmacy", "supplier"].includes(orgType))
      return fail(res, 400, "orgType must be 'pharmacy' or 'supplier'", "VALIDATION_ERROR");
    if (!admin.email || !admin.password || !admin.username)
      return fail(
        res,
        400,
        "admin.username, admin.email and admin.password are required",
        "VALIDATION_ERROR"
      );

    const data = await withTransaction(async (client) => {
      const plan = await client.query("SELECT * FROM plans WHERE code = $1", [
        planCode,
      ]);
      if (!plan.rows.length) throw Object.assign(new Error("Unknown plan code"), { status: 400 });
      const planRow = plan.rows[0];

      const days = trialDays != null ? Number(trialDays) : planRow.trial_days;
      const accessValidTill =
        days > 0 ? new Date(Date.now() + days * 86400000) : null;

      const orgResult = await client.query(
        `INSERT INTO organizations
           (name, code, email, phone, plan_id, plan_status, plan_started_at,
            plan_current_period_end, access_valid_till, subscription_tier, max_users,
            org_type, is_active)
         VALUES ($1,$2,$3,$4,$5,$6, now(), $7, $7, $8, $9, $10, true)
         RETURNING *`,
        [
          name,
          code,
          email || null,
          phone || null,
          planRow.id,
          days > 0 ? "trialing" : "active",
          accessValidTill,
          planRow.code,
          planRow.max_users,
          orgType,
        ]
      );
      const org = orgResult.rows[0];

      const passwordHash = await bcrypt.hash(admin.password, 10);
      const userResult = await client.query(
        `INSERT INTO users
           (username, email, password_hash, full_name, role, role_in_pos,
            organization_id, is_active, is_email_verified, permissions)
         VALUES ($1,$2,$3,$4,'admin','admin',$5,true,true,'["all"]'::jsonb)
         RETURNING id, username, email, full_name, role_in_pos`,
        [
          admin.username,
          admin.email,
          passwordHash,
          admin.fullName || admin.full_name || admin.username,
          org.id,
        ]
      );

      await client.query(
        `UPDATE organizations SET current_users = 1 WHERE id = $1`,
        [org.id]
      );

      await logEvent(client, org.id, "created", req.platformAdmin.id, {
        toPlanId: planRow.id,
        notes: `Provisioned on ${planRow.name}`,
      });

      return { organization: org, admin: userResult.rows[0] };
    });

    res
      .status(201)
      .json({ success: true, message: "Organization created", data });
  } catch (e) {
    if (e.code === "23505")
      return fail(res, 409, "An organization or user with those details already exists");
    if (e.status === 400) return fail(res, 400, e.message, "VALIDATION_ERROR");
    console.error("platform createOrganization:", e);
    fail(res, 500, "Failed to create organization");
  }
};

const ORG_FIELDS = [
  "name",
  "email",
  "phone",
  "website",
  "address",
  "billing_email",
  "currency",
  "timezone",
];

const updateOrganization = async (req, res) => {
  try {
    const b = req.body || {};
    const cols = ORG_FIELDS.filter((f) => b[f] !== undefined);
    if (!cols.length) return fail(res, 400, "No fields to update");
    const sets = cols.map((f, i) => `${f} = $${i + 1}`);
    const values = cols.map((f) => b[f]);
    values.push(req.params.id);

    const result = await query(
      `UPDATE organizations SET ${sets.join(", ")}, updated_at = now()
       WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows.length) return fail(res, 404, "Organization not found");
    ok(res, result.rows[0], "Organization updated");
  } catch (e) {
    console.error("platform updateOrganization:", e);
    fail(res, 500, "Failed to update organization");
  }
};

const setOrganizationPlan = async (req, res) => {
  try {
    const { planCode, planId, notes } = req.body || {};
    if (!planCode && !planId)
      return fail(res, 400, "planCode or planId is required", "VALIDATION_ERROR");

    const data = await withTransaction(async (client) => {
      const cur = await client.query(
        "SELECT plan_id FROM organizations WHERE id = $1",
        [req.params.id]
      );
      if (!cur.rows.length)
        throw Object.assign(new Error("Organization not found"), { status: 404 });

      const plan = await client.query(
        `SELECT * FROM plans WHERE ${planId ? "id" : "code"} = $1`,
        [planId || planCode]
      );
      if (!plan.rows.length)
        throw Object.assign(new Error("Plan not found"), { status: 404 });
      const planRow = plan.rows[0];

      const updated = await client.query(
        `UPDATE organizations
         SET plan_id = $1, subscription_tier = $2, max_users = $3,
             plan_status = CASE WHEN plan_status = 'suspended' THEN 'suspended' ELSE 'active' END,
             updated_at = now()
         WHERE id = $4 RETURNING *`,
        [planRow.id, planRow.code, planRow.max_users, req.params.id]
      );

      await logEvent(client, req.params.id, "plan_changed", req.platformAdmin.id, {
        fromPlanId: cur.rows[0].plan_id,
        toPlanId: planRow.id,
        notes,
      });

      return updated.rows[0];
    });

    ok(res, data, "Plan updated");
  } catch (e) {
    if (e.status) return fail(res, e.status, e.message);
    console.error("platform setOrganizationPlan:", e);
    fail(res, 500, "Failed to change plan");
  }
};

const setOrganizationAccess = async (req, res) => {
  try {
    const { accessValidTill, extendDays, notes } = req.body || {};

    let till = null;
    if (extendDays != null) {
      const cur = await query(
        "SELECT access_valid_till FROM organizations WHERE id = $1",
        [req.params.id]
      );
      if (!cur.rows.length) return fail(res, 404, "Organization not found");
      const base =
        cur.rows[0].access_valid_till && new Date(cur.rows[0].access_valid_till) > new Date()
          ? new Date(cur.rows[0].access_valid_till)
          : new Date();
      till = new Date(base.getTime() + Number(extendDays) * 86400000);
    } else if (accessValidTill !== undefined) {
      till = accessValidTill ? new Date(accessValidTill) : null;
    } else {
      return fail(res, 400, "accessValidTill or extendDays is required", "VALIDATION_ERROR");
    }

    const data = await withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE organizations
         SET access_valid_till = $1::timestamptz,
             plan_current_period_end = $1::timestamptz,
             plan_status = CASE
               WHEN $1::timestamptz IS NOT NULL AND $1::timestamptz > now()
                    AND plan_status IN ('past_due','suspended')
               THEN 'active' ELSE plan_status END,
             updated_at = now()
         WHERE id = $2 RETURNING *`,
        [till, req.params.id]
      );
      if (!updated.rows.length)
        throw Object.assign(new Error("Organization not found"), { status: 404 });
      await logEvent(client, req.params.id, "access_extended", req.platformAdmin.id, {
        notes,
        metadata: { accessValidTill: till },
      });
      return updated.rows[0];
    });

    ok(res, data, "Access window updated");
  } catch (e) {
    if (e.status) return fail(res, e.status, e.message);
    console.error("platform setOrganizationAccess:", e);
    fail(res, 500, "Failed to update access window");
  }
};

const setOrganizationStatus = async (req, res) => {
  try {
    const { action, notes } = req.body || {};
    if (!["suspend", "reactivate"].includes(action))
      return fail(res, 400, "action must be 'suspend' or 'reactivate'", "VALIDATION_ERROR");

    const suspend = action === "suspend";

    const data = await withTransaction(async (client) => {
      const updated = await client.query(
        `UPDATE organizations
         SET is_active = $1,
             plan_status = $2,
             updated_at = now()
         WHERE id = $3 RETURNING *`,
        [!suspend, suspend ? "suspended" : "active", req.params.id]
      );
      if (!updated.rows.length)
        throw Object.assign(new Error("Organization not found"), { status: 404 });

      if (suspend) {
        // force every member to re-authenticate (and be blocked by middleware/auth.js)
        await client.query(
          `UPDATE users SET session_token = NULL, session_created_at = NULL
           WHERE organization_id = $1`,
          [req.params.id]
        );
      }

      await logEvent(
        client,
        req.params.id,
        suspend ? "suspended" : "reactivated",
        req.platformAdmin.id,
        { notes }
      );
      return updated.rows[0];
    });

    ok(res, data, suspend ? "Organization suspended" : "Organization reactivated");
  } catch (e) {
    if (e.status) return fail(res, e.status, e.message);
    console.error("platform setOrganizationStatus:", e);
    fail(res, 500, "Failed to update status");
  }
};

// ---------------------------------------------------------------------------
// users (cross-tenant)
// ---------------------------------------------------------------------------
const listUsers = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaging(req.query);
    const { search = "", organizationId, role, isActive } = req.query;

    const where = ["u.is_platform_admin = false"];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      where.push(
        `(u.username ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`
      );
    }
    if (organizationId) {
      params.push(organizationId);
      where.push(`u.organization_id = $${params.length}`);
    }
    if (role) {
      params.push(role);
      where.push(`u.role_in_pos = $${params.length}`);
    }
    if (isActive !== undefined) {
      params.push(isActive === "true");
      where.push(`u.is_active = $${params.length}`);
    }
    const whereSql = `WHERE ${where.join(" AND ")}`;

    const totalResult = await query(
      `SELECT COUNT(*) AS c FROM users u ${whereSql}`,
      params
    );
    const total = Number(totalResult.rows[0].c);

    params.push(limit, offset);
    const result = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.role_in_pos, u.is_active,
              u.last_login, u.created_at, u.session_token IS NOT NULL AS has_session,
              o.id AS organization_id, o.name AS organization_name
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       ${whereSql}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    ok(res, result.rows, "OK", {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("platform listUsers:", e);
    fail(res, 500, "Failed to list users");
  }
};

const revokeUserSession = async (req, res) => {
  try {
    const result = await query(
      `UPDATE users SET session_token = NULL, session_created_at = NULL
       WHERE id = $1 RETURNING id, username, email`,
      [req.params.id]
    );
    if (!result.rows.length) return fail(res, 404, "User not found");
    ok(res, result.rows[0], "Session revoked — the user must log in again");
  } catch (e) {
    console.error("platform revokeUserSession:", e);
    fail(res, 500, "Failed to revoke session");
  }
};

const setUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body || {};
    if (typeof isActive !== "boolean")
      return fail(res, 400, "isActive (boolean) is required", "VALIDATION_ERROR");
    const result = await query(
      `UPDATE users
       SET is_active = $1,
           session_token = CASE WHEN $1 = false THEN NULL ELSE session_token END,
           updated_at = now()
       WHERE id = $2 AND is_platform_admin = false
       RETURNING id, username, email, is_active`,
      [isActive, req.params.id]
    );
    if (!result.rows.length) return fail(res, 404, "User not found");
    ok(res, result.rows[0], `User ${isActive ? "activated" : "deactivated"}`);
  } catch (e) {
    console.error("platform setUserStatus:", e);
    fail(res, 500, "Failed to update user");
  }
};

// ---------------------------------------------------------------------------
// audit
// ---------------------------------------------------------------------------
const listAuditLogs = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaging(req.query);
    const { organizationId, action, entity } = req.query;

    const where = [];
    const params = [];
    if (organizationId) {
      params.push(organizationId);
      where.push(`al.organization_id = $${params.length}`);
    }
    if (action) {
      params.push(action);
      where.push(`al.action = $${params.length}`);
    }
    if (entity) {
      params.push(entity);
      where.push(`al.entity = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const totalResult = await query(
      `SELECT COUNT(*) AS c FROM audit_logs al ${whereSql}`,
      params
    );
    const total = Number(totalResult.rows[0].c);

    params.push(limit, offset);
    const result = await query(
      `SELECT al.id, al.action, al.entity, al.entity_id, al.user_id,
              al.organization_id, al.old_values, al.new_values, al.created_at,
              o.name AS organization_name, u.username AS user_name
       FROM audit_logs al
       LEFT JOIN organizations o ON o.id = al.organization_id
       LEFT JOIN users u ON u.id = al.user_id
       ${whereSql}
       ORDER BY al.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    ok(res, result.rows, "OK", {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("platform listAuditLogs:", e);
    fail(res, 500, "Failed to list audit logs");
  }
};

module.exports = {
  getOverview,
  getHealth,
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  setOrganizationPlan,
  setOrganizationAccess,
  setOrganizationStatus,
  listUsers,
  revokeUserSession,
  setUserStatus,
  listAuditLogs,
};
