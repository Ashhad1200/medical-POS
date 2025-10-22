#!/usr/bin/env node

/**
 * Script to update a user's role in the POS system
 * Usage: node update-user-role.js [email] [role]
 *
 * Roles: admin, manager, counter, warehouse
 */

const { query } = require("./config/database");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) =>
  new Promise((resolve) => rl.question(prompt, resolve));

const VALID_ROLES = ["admin", "manager", "counter", "warehouse"];

async function updateUserRole() {
  try {
    console.log("👤 POS System - Update User Role");
    console.log("================================\n");

    let email = process.argv[2];
    let newRole = process.argv[3];

    if (!email) {
      email = await question("📧 Enter email: ");
    }

    if (!newRole) {
      console.log("\n📋 Available roles:");
      VALID_ROLES.forEach((role) => console.log(`   - ${role}`));
      newRole = await question("\n🔄 Enter new role: ");
    }

    // Validation
    if (!email) {
      console.error("\n❌ Email is required!");
      rl.close();
      process.exit(1);
    }

    if (!VALID_ROLES.includes(newRole)) {
      console.error(
        `\n❌ Invalid role '${newRole}'. Valid roles: ${VALID_ROLES.join(", ")}`
      );
      rl.close();
      process.exit(1);
    }

    console.log("\n🔍 Finding user...");

    // Check if user exists
    const userResult = await query(
      "SELECT id, email, full_name, role_in_pos FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error(`\n❌ User with email '${email}' not found!`);
      rl.close();
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`✓ Found: ${user.full_name} (${user.email})`);
    console.log(`✓ Current role: ${user.role_in_pos}`);

    // Update role
    console.log(`\n⏳ Updating role to '${newRole}'...`);

    // Determine permissions based on role
    let permissions;
    switch (newRole) {
      case "admin":
        permissions = JSON.stringify(["all"]);
        break;
      case "manager":
        permissions = JSON.stringify([
          "medicine:read",
          "medicine:create",
          "medicine:update",
          "order:read",
          "order:create",
          "supplier:read",
          "reports:read",
        ]);
        break;
      case "counter":
        permissions = JSON.stringify(["medicine:read", "order:create"]);
        break;
      case "warehouse":
        permissions = JSON.stringify(["medicine:read", "order:read"]);
        break;
    }

    await query(
      "UPDATE users SET role_in_pos = $1, permissions = $2, updated_at = NOW() WHERE email = $3",
      [newRole, permissions, email]
    );

    console.log("\n✅ User role updated successfully!\n");
    console.log("📊 Updated Details:");
    console.log(`   Email:      ${email}`);
    console.log(`   New Role:   ${newRole}`);
    console.log(`   Updated At: ${new Date().toISOString()}`);

    if (newRole === "admin") {
      console.log("\n🔐 Admin Notes:");
      console.log("   - User now has full system access");
      console.log("   - Can manage all medicines, orders, and suppliers");
      console.log("   - Can view all reports");
    }

    console.log(
      "\n💡 Tip: User needs to log out and log back in to see role changes\n"
    );

    rl.close();
  } catch (error) {
    console.error("\n❌ Error updating user role:", error.message);
    console.error(error);
    rl.close();
    process.exit(1);
  }
}

updateUserRole();
