const { query, withTransaction } = require("../config/database");
const bcrypt = require("bcryptjs");

async function seedAdmin() {
    console.log("🌱 Seeding Admin User (Native Postgres)...");

    try {
        await withTransaction(async (client) => {
            // 1. Create Organization
            const orgRes = await client.query(`
        INSERT INTO organizations (name, address, phone, email, type, status)
        VALUES ('Moiz Med Store', '123 Pharma St', '555-0199', 'admin@moiz.com', 'pharmacy', 'active')
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `);
            const orgId = orgRes.rows[0].id;
            console.log("✅ Organization ID:", orgId);

            // 2. Create Admin User
            const email = "admin@medicalstore.com";
            const password = await bcrypt.hash("admin123", 10);

            // Check if exists
            const userCheck = await client.query("SELECT id FROM users WHERE email = $1", [email]);

            if (userCheck.rows.length > 0) {
                console.log("ℹ️  User already exists. Updating password/org...");
                await client.query(
                    "UPDATE users SET password = $1, organization_id = $2, role_in_pos = 'admin' WHERE email = $3",
                    [password, orgId, email]
                );
            } else {
                await client.query(`
          INSERT INTO users (
            full_name, email, password, role_in_pos, organization_id, phone, status, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, ["System Admin", email, password, "admin", orgId, "555-ADMIN", "active", true]);
                console.log("🎉 User created.");
            }
        });

        console.log("✅ Seed Complete. Login: admin@medicalstore.com / admin123");
        process.exit(0);

    } catch (error) {
        console.error("❌ Seed Failed:", error);
        process.exit(1);
    }
}

seedAdmin();
