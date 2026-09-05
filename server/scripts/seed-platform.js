/**
 * Seeds the platform operator account for the back office (/api/platform/*).
 * Creates a hidden "__platform__" organization to satisfy users.organization_id
 * NOT NULL, then an is_platform_admin user.
 *
 *   npm run seed:platform
 *
 * Credentials: owner@medicalpos.local / owner123   (override with env vars below)
 */
const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

const EMAIL = process.env.PLATFORM_ADMIN_EMAIL || "owner@medicalpos.local";
const USERNAME = process.env.PLATFORM_ADMIN_USERNAME || "owner";
const PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || "owner123";

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const org = await client.query(
      `INSERT INTO organizations (code, name, description, is_active)
       VALUES ('__platform__', 'Platform Operations', 'Internal — SaaS operator tenant', true)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const organizationId = org.rows[0].id;

    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    await client.query(
      `INSERT INTO users
         (username, email, password_hash, full_name, role, role_in_pos,
          organization_id, is_active, is_email_verified, is_platform_admin, permissions)
       VALUES ($1, $2, $3, 'Platform Owner', 'admin', 'admin', $4, true, true, true, '["all"]'::jsonb)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             is_platform_admin = true,
             is_active = true,
             updated_at = now()`,
      [USERNAME, EMAIL, passwordHash, organizationId]
    );

    await client.query("COMMIT");
    console.log("✅ Platform operator seeded");
    console.log(`➡️  ${EMAIL} / ${PASSWORD}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ seed:platform failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
