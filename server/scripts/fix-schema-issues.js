const { query } = require("../config/database");

async function fixSchemaIssues() {
  try {
    console.log("Starting database schema fixes...\n");

    // 1. Add reorder_level column to medicines if missing
    console.log("1. Adding reorder_level column to medicines...");
    try {
      await query(
        `ALTER TABLE medicines ADD COLUMN reorder_level INTEGER DEFAULT 10`
      );
      console.log("✓ Added reorder_level column\n");
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log("✓ reorder_level column already exists\n");
      } else {
        throw err;
      }
    }

    // 2. Create refactored_suppliers table if missing
    console.log("2. Creating refactored_suppliers table...");
    try {
      await query(
        `CREATE TABLE IF NOT EXISTS refactored_suppliers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(20),
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(100),
          postal_code VARCHAR(20),
          country VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id)
        )`
      );
      console.log("✓ Created refactored_suppliers table\n");
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log("✓ refactored_suppliers table already exists\n");
      } else {
        throw err;
      }
    }

    // 3. Create refactored_purchase_orders table if missing
    console.log("3. Creating refactored_purchase_orders table...");
    try {
      await query(
        `CREATE TABLE IF NOT EXISTS refactored_purchase_orders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL,
          supplier_id UUID NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          approval_status VARCHAR(50),
          order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expected_delivery_date TIMESTAMP,
          subtotal DECIMAL(10, 2),
          tax_percent DECIMAL(5, 2),
          tax_amount DECIMAL(10, 2),
          discount_amount DECIMAL(10, 2),
          total_amount DECIMAL(10, 2),
          approved_amount DECIMAL(10, 2),
          approved_by UUID,
          approved_by_notes TEXT,
          created_by UUID,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id),
          FOREIGN KEY (supplier_id) REFERENCES refactored_suppliers(id),
          FOREIGN KEY (approved_by) REFERENCES users(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        )`
      );
      console.log("✓ Created refactored_purchase_orders table\n");
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log("✓ refactored_purchase_orders table already exists\n");
      } else {
        throw err;
      }
    }

    // 4. Create refactored_purchase_order_items table if missing
    console.log("4. Creating refactored_purchase_order_items table...");
    try {
      await query(
        `CREATE TABLE IF NOT EXISTS refactored_purchase_order_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          purchase_order_id UUID NOT NULL,
          medicine_id UUID NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10, 2) NOT NULL,
          total_price DECIMAL(10, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (purchase_order_id) REFERENCES refactored_purchase_orders(id),
          FOREIGN KEY (medicine_id) REFERENCES medicines(id)
        )`
      );
      console.log("✓ Created refactored_purchase_order_items table\n");
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log("✓ refactored_purchase_order_items table already exists\n");
      } else {
        throw err;
      }
    }

    // 5. Verify order_items table has updated_at
    console.log("5. Ensuring order_items has all required columns...");
    try {
      await query(
        `ALTER TABLE order_items ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
      );
      console.log("✓ Added updated_at to order_items\n");
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log("✓ order_items.updated_at already exists\n");
      } else {
        throw err;
      }
    }

    // 6. Verify orders table has all required columns
    console.log("6. Ensuring orders table has all required columns...");
    const ordersColumns = await query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'orders'
    `);
    const columnNames = ordersColumns.rows.map((r) => r.column_name);

    if (!columnNames.includes("customer_name")) {
      await query(`ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255)`);
      console.log("  + Added customer_name column");
    }
    if (!columnNames.includes("order_number")) {
      await query(
        `ALTER TABLE orders ADD COLUMN order_number VARCHAR(50) UNIQUE`
      );
      console.log("  + Added order_number column");
    }
    if (!columnNames.includes("total_amount")) {
      await query(
        `ALTER TABLE orders ADD COLUMN total_amount DECIMAL(10, 2) DEFAULT 0`
      );
      console.log("  + Added total_amount column");
    }
    console.log("✓ Verified orders table structure\n");

    console.log("✅ All schema fixes completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing schema:", error);
    process.exit(1);
  }
}

fixSchemaIssues();
