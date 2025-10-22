#!/usr/bin/env node

const { query } = require("../config/database");

/**
 * Execute database migration to fix missing columns
 */
async function executeMigration() {
  try {
    console.log("🔄 Starting database migration...\n");

    let successCount = 0;
    let errorCount = 0;

    // Migrations to execute
    const migrations = [
      {
        name: "Add quantity_in_stock to medicines",
        sql: `ALTER TABLE medicines ADD COLUMN IF NOT EXISTS quantity_in_stock INTEGER DEFAULT 0;`,
      },
      {
        name: "Add supplier_code to suppliers",
        sql: `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_code VARCHAR(100) UNIQUE;`,
      },
      {
        name: "Add city to suppliers",
        sql: `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city VARCHAR(100);`,
      },
      {
        name: "Add state to suppliers",
        sql: `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state VARCHAR(100);`,
      },
      {
        name: "Add postal_code to suppliers",
        sql: `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);`,
      },
      {
        name: "Add country to suppliers",
        sql: `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Pakistan';`,
      },
      {
        name: "Add tax_number to suppliers",
        sql: `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50);`,
      },
      {
        name: "Add credit_limit to suppliers",
        sql: `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0;`,
      },
      {
        name: "Add payment_terms to suppliers",
        sql: `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30;`,
      },
      {
        name: "Add notes to suppliers",
        sql: `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes TEXT;`,
      },
      {
        name: "Add customer_id to orders",
        sql: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;`,
      },
      {
        name: "Add updated_at to order_items",
        sql: `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`,
      },
      {
        name: "Add discount_percent to order_items",
        sql: `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0;`,
      },
      {
        name: "Add cost_price to order_items",
        sql: `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC;`,
      },
      {
        name: "Add profit to order_items",
        sql: `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS profit NUMERIC DEFAULT 0;`,
      },
      {
        name: "Add gst_amount to order_items",
        sql: `ALTER TABLE order_items ADD COLUMN IF NOT EXISTS gst_amount NUMERIC DEFAULT 0;`,
      },
      {
        name: "Create refactored_purchase_orders table",
        sql: `CREATE TABLE IF NOT EXISTS refactored_purchase_orders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          po_number VARCHAR(100) NOT NULL UNIQUE,
          supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          total_amount NUMERIC NOT NULL,
          tax_amount NUMERIC DEFAULT 0,
          discount NUMERIC DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending',
          order_date DATE NOT NULL DEFAULT CURRENT_DATE,
          expected_delivery DATE,
          actual_delivery DATE,
          notes TEXT,
          created_by UUID REFERENCES users(id),
          approved_by UUID REFERENCES users(id),
          approved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );`,
      },
      {
        name: "Create supplier_audit_log table",
        sql: `CREATE TABLE IF NOT EXISTS supplier_audit_log (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
          action VARCHAR(50) NOT NULL,
          new_values JSONB,
          changed_by UUID REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`,
      },
      {
        name: "Create indexes",
        sql: `CREATE INDEX IF NOT EXISTS idx_medicines_quantity_in_stock ON medicines(quantity_in_stock);
             CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_code ON suppliers(supplier_code);
             CREATE INDEX IF NOT EXISTS idx_suppliers_city ON suppliers(city);
             CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
             CREATE INDEX IF NOT EXISTS idx_refactored_purchase_orders_org ON refactored_purchase_orders(organization_id);
             CREATE INDEX IF NOT EXISTS idx_refactored_purchase_orders_supplier ON refactored_purchase_orders(supplier_id);
             CREATE INDEX IF NOT EXISTS idx_refactored_purchase_orders_status ON refactored_purchase_orders(status);
             CREATE INDEX IF NOT EXISTS idx_supplier_audit_log_supplier ON supplier_audit_log(supplier_id);`,
      },
    ];

    // Execute migrations
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      try {
        console.log(`📝 ${i + 1}. ${migration.name}...`);
        await query(migration.sql);
        console.log(`   ✅ Completed\n`);
        successCount++;
      } catch (error) {
        if (
          error.message.includes("already exists") ||
          error.message.includes("DUPLICATE") ||
          error.message.includes("column")
        ) {
          console.log(`   ⚠️  Skipped (already exists)\n`);
        } else {
          console.error(`   ❌ Error:`, error.message, "\n");
          errorCount++;
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("Migration Summary:");
    console.log("=".repeat(60));
    console.log(`✅ Successful: ${successCount}/${migrations.length}`);
    console.log(`❌ Errors: ${errorCount}/${migrations.length}`);

    // Verify the columns were created
    console.log("\n🔍 Verifying migration...\n");

    try {
      // Check medicines table
      const medicinesCheck = await query(
        `SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'medicines' AND column_name = 'quantity_in_stock'`
      );
      console.log(
        medicinesCheck.rows.length > 0
          ? "✅ medicines.quantity_in_stock: EXISTS"
          : "❌ medicines.quantity_in_stock: MISSING"
      );

      // Check suppliers table columns
      const suppliersCheck = await query(
        `SELECT COUNT(*) as count FROM information_schema.columns 
        WHERE table_name = 'suppliers' 
        AND column_name IN ('supplier_code', 'city', 'country', 'credit_limit', 'payment_terms')`
      );
      console.log(
        `✅ suppliers table: ${suppliersCheck.rows[0].count} new columns verified`
      );

      // Check orders table
      const ordersCheck = await query(
        `SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'customer_id'`
      );
      console.log(
        ordersCheck.rows.length > 0
          ? "✅ orders.customer_id: EXISTS"
          : "⚠️  orders.customer_id: May already be in use"
      );

      // Check order_items table
      const orderItemsCheck = await query(
        `SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'order_items' AND column_name = 'updated_at'`
      );
      console.log(
        orderItemsCheck.rows.length > 0
          ? "✅ order_items.updated_at: EXISTS"
          : "❌ order_items.updated_at: MISSING"
      );

      // Check refactored_purchase_orders table
      const poTableCheck = await query(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'refactored_purchase_orders'
        )`
      );
      console.log(
        poTableCheck.rows[0].exists
          ? "✅ refactored_purchase_orders: TABLE EXISTS"
          : "❌ refactored_purchase_orders: TABLE MISSING"
      );
    } catch (verifyError) {
      console.error("⚠️  Verification error:", verifyError.message);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Database migration completed!");
    console.log("=".repeat(60) + "\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
executeMigration();
