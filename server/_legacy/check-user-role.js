#!/usr/bin/env node

/**
 * Debug script to check user role in database
 * Usage: node check-user-role.js [email]
 */

const { query } = require("./config/database");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) =>
  new Promise((resolve) => rl.question(prompt, resolve));

async function checkUserRole() {
  try {
    console.log("🔍 POS System - Check User Role");
    console.log("================================\n");

    let email = process.argv[2];

    if (!email) {
      email = await question("📧 Enter email to check: ");
    }

    if (!email) {
      console.error("\n❌ Email is required!");
      rl.close();
      process.exit(1);
    }

    console.log("\n📊 Fetching user data...\n");

    const result = await query(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.role,
        u.role_in_pos,
        u.permissions,
        u.organization_id,
        u.is_active,
        o.name as org_name
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.error(`❌ User with email '${email}' not found!`);
      rl.close();
      process.exit(1);
    }

    const user = result.rows[0];

    console.log("✅ User Found:\n");
    console.log(`   ID:                ${user.id}`);
    console.log(`   Username:          ${user.username}`);
    console.log(`   Email:             ${user.email}`);
    console.log(`   Full Name:         ${user.full_name}`);
    console.log(`   Role (legacy):     ${user.role || "N/A"}`);
    console.log(`   Role in POS:       ${user.role_in_pos}`);
    console.log(
      `   Organization:      ${user.org_name} (ID: ${user.organization_id})`
    );
    console.log(`   Is Active:         ${user.is_active ? "Yes" : "No"}`);
    console.log(
      `   Permissions:       ${JSON.stringify(user.permissions, null, 2)}`
    );

    // Check if role_in_pos is correctly set to 'admin'
    console.log("\n📋 Role Validation:");
    if (user.role_in_pos === "admin") {
      console.log("   ✅ User is correctly set as ADMIN");
    } else {
      console.log(`   ⚠️  User role is '${user.role_in_pos}', NOT admin!\n`);
      console.log(
        "   This might be why the app is not recognizing them as admin."
      );
      console.log(
        "   To fix, run: node update-user-role.js " + email + " admin"
      );
    }

    console.log("\n");
    rl.close();
  } catch (error) {
    console.error("\n❌ Error checking user role:", error.message);
    console.error(error);
    rl.close();
    process.exit(1);
  }
}

checkUserRole();
