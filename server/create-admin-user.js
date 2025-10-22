#!/usr/bin/env node

/**
 * Script to create a new admin user in the POS system
 * Usage: node create-admin-user.js [email] [password] [fullName] [organizationId]
 *
 * Examples:
 *   node create-admin-user.js admin@example.com password123 "Admin User" 1
 *   node create-admin-user.js (interactive mode)
 */

const { query } = require("./config/database");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) =>
  new Promise((resolve) => rl.question(prompt, resolve));

async function createAdminUser() {
  try {
    console.log("🔐 POS System - Create Admin User");
    console.log("==================================\n");

    let email, password, fullName, organizationId, username;

    // Get command line arguments or prompt interactively
    if (process.argv.length >= 4) {
      email = process.argv[2];
      password = process.argv[3];
      fullName = process.argv[4] || email.split("@")[0];
      organizationId = process.argv[5] || 1;
    } else {
      // Interactive mode
      email = await question("📧 Email address: ");
      password = await question("🔑 Password (min 6 characters): ");
      fullName = await question("👤 Full name: ");
      organizationId = await question("🏢 Organization ID (default: 1): ");

      organizationId = organizationId || "1";
    }

    // Validation
    if (!email || !password || !fullName) {
      console.error("\n❌ Email, password, and full name are required!");
      rl.close();
      process.exit(1);
    }

    if (password.length < 6) {
      console.error("\n❌ Password must be at least 6 characters long!");
      rl.close();
      process.exit(1);
    }

    // Generate username from email
    username = email.split("@")[0];

    console.log("\n✓ Validating inputs...");

    // Check if email already exists
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);

    if (existingUser.rows.length > 0) {
      console.error(`\n❌ User with email '${email}' already exists!`);
      rl.close();
      process.exit(1);
    }

    // Check if organization exists
    const orgExists = await query(
      "SELECT id, name FROM organizations WHERE id = $1",
      [organizationId]
    );

    if (orgExists.rows.length === 0) {
      console.error(`\n❌ Organization with ID '${organizationId}' not found!`);

      // List available organizations
      const orgs = await query("SELECT id, name FROM organizations");
      if (orgs.rows.length > 0) {
        console.log("\n📋 Available organizations:");
        orgs.rows.forEach((org) => {
          console.log(`   - ID: ${org.id}, Name: ${org.name}`);
        });
      }

      rl.close();
      process.exit(1);
    }

    const orgName = orgExists.rows[0].name;
    console.log(`✓ Organization: ${orgName}`);

    // Hash password
    console.log("🔒 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare permissions
    const permissions = JSON.stringify(["all"]);

    // Create user
    console.log("💾 Creating user in database...");
    const result = await query(
      `INSERT INTO users (
        username, email, password_hash, full_name, role_in_pos,
        organization_id, is_active, permissions, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, username, email, full_name, role_in_pos, organization_id, is_active, created_at`,
      [
        username,
        email,
        hashedPassword,
        fullName,
        "admin",
        organizationId,
        true,
        permissions,
      ]
    );

    const createdUser = result.rows[0];

    console.log("\n✅ Admin user created successfully!\n");
    console.log("📊 User Details:");
    console.log(`   ID:              ${createdUser.id}`);
    console.log(`   Username:        ${createdUser.username}`);
    console.log(`   Email:           ${createdUser.email}`);
    console.log(`   Full Name:       ${createdUser.full_name}`);
    console.log(`   Role:            ${createdUser.role_in_pos}`);
    console.log(
      `   Status:          ${createdUser.is_active ? "Active" : "Inactive"}`
    );
    console.log(`   Organization ID: ${createdUser.organization_id}`);
    console.log(`   Created:         ${createdUser.created_at}`);

    console.log("\n🔐 Login Credentials:");
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);

    console.log("\n📝 Next Steps:");
    console.log(`   1. Start the server: npm start`);
    console.log(`   2. Login with these credentials`);
    console.log(`   3. You now have full admin access\n`);

    rl.close();
  } catch (error) {
    console.error("\n❌ Error creating admin user:", error.message);
    console.error(error);
    rl.close();
    process.exit(1);
  }
}

createAdminUser();
