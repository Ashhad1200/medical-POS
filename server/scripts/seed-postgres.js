const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orgCode = "default_org";
    const orgName = "Default Medical POS";

    const { rows: orgRows } = await client.query(
      `INSERT INTO organizations (code, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name,
             description = EXCLUDED.description,
             updated_at = NOW()
       RETURNING id`,
      [orgCode, orgName, "Seed organization for local development"]
    );

    const organizationId = orgRows[0].id;

    const adminEmail = "admin@medicalpos.local";
    const adminPassword = "admin123";
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await client.query(
      `INSERT INTO users (
         email,
         username,
         full_name,
         role,
         role_in_pos,
         organization_id,
         is_active,
         is_email_verified,
         password_hash
       )
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7)
       ON CONFLICT (email) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             role_in_pos = EXCLUDED.role_in_pos,
             organization_id = EXCLUDED.organization_id,
             is_active = TRUE,
             is_email_verified = TRUE,
             password_hash = EXCLUDED.password_hash,
             updated_at = NOW()`,
      [
        adminEmail,
        "admin",
        "System Administrator",
        "admin",
        "admin",
        organizationId,
        passwordHash,
      ]
    );

    await client.query("COMMIT");
    console.log("✅ PostgreSQL database seeded successfully");
    console.log(`➡️  Admin credentials: ${adminEmail} / ${adminPassword}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to seed PostgreSQL database");
    console.error(error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
