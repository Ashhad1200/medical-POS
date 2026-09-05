const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { query, withTransaction } = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

// GET /api/public/plans — plans shown on the marketing site
const getPublicPlans = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT code, name, description, price_monthly, price_yearly, currency,
              max_users, max_products, trial_days, features
       FROM plans
       WHERE is_active = true AND is_public = true
       ORDER BY sort_order, price_monthly`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error("getPublicPlans:", e);
    res.status(500).json({ success: false, message: "Failed to load plans" });
  }
};

// POST /api/public/signup — self-serve tenant creation
const signup = async (req, res) => {
  try {
    const {
      organizationName,
      fullName,
      email,
      password,
      planCode = "basic",
      phone,
    } = req.body || {};

    if (!organizationName || !fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "organizationName, fullName, email and password are required",
      });
    }
    if (String(password).length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const emailNorm = String(email).toLowerCase().trim();

    const existing = await query(
      "SELECT id FROM users WHERE email = $1",
      [emailNorm]
    );
    if (existing.rows.length) {
      return res
        .status(409)
        .json({ success: false, message: "An account with that email already exists" });
    }

    const data = await withTransaction(async (client) => {
      const plan = await client.query(
        "SELECT * FROM plans WHERE code = $1 AND is_active = true AND is_public = true",
        [planCode]
      );
      if (!plan.rows.length)
        throw Object.assign(new Error("That plan is not available"), {
          status: 400,
        });
      const planRow = plan.rows[0];

      // unique org code
      let baseCode = slugify(organizationName) || "org";
      let code = baseCode;
      for (let i = 1; ; i++) {
        const clash = await client.query(
          "SELECT 1 FROM organizations WHERE code = $1",
          [code]
        );
        if (!clash.rows.length) break;
        code = `${baseCode}-${i}`;
      }

      const trialDays = planRow.trial_days || 0;
      const accessValidTill =
        trialDays > 0 ? new Date(Date.now() + trialDays * 86400000) : null;

      const orgResult = await client.query(
        `INSERT INTO organizations
           (name, code, email, phone, plan_id, plan_status, plan_started_at,
            plan_current_period_end, access_valid_till, subscription_tier,
            max_users, current_users, is_active)
         VALUES ($1,$2,$3,$4,$5,$6, now(), $7, $7, $8, $9, 1, true)
         RETURNING id, name, code, plan_status, access_valid_till`,
        [
          organizationName,
          code,
          emailNorm,
          phone || null,
          planRow.id,
          trialDays > 0 ? "trialing" : "active",
          accessValidTill,
          planRow.code,
          planRow.max_users,
        ]
      );
      const org = orgResult.rows[0];

      const username = (() => {
        const u = emailNorm.split("@")[0].replace(/[^a-z0-9_.-]/g, "");
        return u || `user-${crypto.randomBytes(3).toString("hex")}`;
      })();

      const passwordHash = await bcrypt.hash(password, 10);
      const sessionToken = crypto.randomBytes(32).toString("hex");

      const userResult = await client.query(
        `INSERT INTO users
           (username, email, password_hash, full_name, phone, role, role_in_pos,
            organization_id, is_active, is_email_verified, is_trial_user,
            permissions, session_token, session_created_at)
         VALUES ($1,$2,$3,$4,$5,'admin','admin',$6,true,false,true,'["all"]'::jsonb,$7, now())
         RETURNING id, username, email, full_name, role_in_pos, organization_id`,
        [username, emailNorm, passwordHash, fullName, phone || null, org.id, sessionToken]
      );
      const user = userResult.rows[0];

      await client.query(
        `INSERT INTO subscription_events
           (organization_id, event_type, to_plan_id, notes, metadata)
         VALUES ($1, 'created', $2, $3, $4)`,
        [
          org.id,
          planRow.id,
          `Self-serve signup on ${planRow.name}`,
          JSON.stringify({ source: "landing" }),
        ]
      );

      const token = jwt.sign({ userId: user.id, sessionToken }, JWT_SECRET, {
        expiresIn: JWT_EXPIRY,
      });

      return { token, user, organization: org, plan: planRow.code };
    });

    res.status(201).json({
      success: true,
      message: "Welcome aboard",
      data: {
        token: data.token,
        user: {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          fullName: data.user.full_name,
          role_in_pos: data.user.role_in_pos,
          roleInPos: data.user.role_in_pos,
          organizationId: data.user.organization_id,
        },
        organization: data.organization,
        plan: data.plan,
      },
    });
  } catch (e) {
    if (e.code === "23505")
      return res
        .status(409)
        .json({ success: false, message: "An organization or account with those details already exists" });
    if (e.status === 400)
      return res.status(400).json({ success: false, message: e.message });
    console.error("signup:", e);
    res.status(500).json({ success: false, message: "Could not create your account" });
  }
};

module.exports = { getPublicPlans, signup };
