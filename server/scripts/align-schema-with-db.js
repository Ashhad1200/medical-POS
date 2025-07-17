const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function alignSchemaWithDb() {
  try {
    console.log("🔄 Starting schema alignment with db.txt...");

    // 1. Update medicines table to match db.txt schema
    console.log("📋 Updating medicines table schema...");
    await supabase.rpc('exec_sql', {
      sql: `
        -- Add missing columns to medicines table if they don't exist
        DO $$ 
        BEGIN
          -- Add generic_name if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medicines' AND column_name='generic_name') THEN
            ALTER TABLE medicines ADD COLUMN generic_name VARCHAR;
          END IF;
          
          -- Add batch_number if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medicines' AND column_name='batch_number') THEN
            ALTER TABLE medicines ADD COLUMN batch_number VARCHAR;
          END IF;
          
          -- Add dosage_form if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medicines' AND column_name='dosage_form') THEN
            ALTER TABLE medicines ADD COLUMN dosage_form VARCHAR;
          END IF;
          
          -- Add strength if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medicines' AND column_name='strength') THEN
            ALTER TABLE medicines ADD COLUMN strength VARCHAR;
          END IF;
          
          -- Add pack_size if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medicines' AND column_name='pack_size') THEN
            ALTER TABLE medicines ADD COLUMN pack_size VARCHAR;
          END IF;
          
          -- Add storage_conditions if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medicines' AND column_name='storage_conditions') THEN
            ALTER TABLE medicines ADD COLUMN storage_conditions VARCHAR;
          END IF;
          
          -- Add prescription_required if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='medicines' AND column_name='prescription_required') THEN
            ALTER TABLE medicines ADD COLUMN prescription_required BOOLEAN DEFAULT false;
          END IF;
        END $$;
      `
    });

    // 2. Update orders table to match db.txt schema
    console.log("📋 Updating orders table schema...");
    await supabase.rpc('exec_sql', {
      sql: `
        -- Add missing columns to orders table if they don't exist
        DO $$ 
        BEGIN
          -- Add order_number if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='order_number') THEN
            ALTER TABLE orders ADD COLUMN order_number VARCHAR UNIQUE;
          END IF;
          
          -- Add customer_name if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_name') THEN
            ALTER TABLE orders ADD COLUMN customer_name VARCHAR;
          END IF;
          
          -- Add customer_phone if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_phone') THEN
            ALTER TABLE orders ADD COLUMN customer_phone VARCHAR;
          END IF;
          
          -- Add customer_email if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_email') THEN
            ALTER TABLE orders ADD COLUMN customer_email VARCHAR;
          END IF;
          
          -- Add discount_percent if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='discount_percent') THEN
            ALTER TABLE orders ADD COLUMN discount_percent NUMERIC DEFAULT 0;
          END IF;
          
          -- Add payment_status if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_status') THEN
            ALTER TABLE orders ADD COLUMN payment_status VARCHAR DEFAULT 'pending';
          END IF;
          
          -- Add notes if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='notes') THEN
            ALTER TABLE orders ADD COLUMN notes TEXT;
          END IF;
        END $$;
      `
    });

    // 3. Update order_items table to match db.txt schema
    console.log("📋 Updating order_items table schema...");
    await supabase.rpc('exec_sql', {
      sql: `
        -- Add missing columns to order_items table if they don't exist
        DO $$ 
        BEGIN
          -- Add discount_percent if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='discount_percent') THEN
            ALTER TABLE order_items ADD COLUMN discount_percent NUMERIC DEFAULT 0;
          END IF;
          
          -- Add cost_price if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='cost_price') THEN
            ALTER TABLE order_items ADD COLUMN cost_price NUMERIC NOT NULL DEFAULT 0;
          END IF;
          
          -- Add profit if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='profit') THEN
            ALTER TABLE order_items ADD COLUMN profit NUMERIC DEFAULT 0;
          END IF;
          
          -- Add gst_amount if not exists
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='gst_amount') THEN
            ALTER TABLE order_items ADD COLUMN gst_amount NUMERIC DEFAULT 0;
          END IF;
        END $$;
      `
    });

    // 4. Create customers table if it doesn't exist
    console.log("📋 Creating customers table if not exists...");
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS customers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR NOT NULL,
          phone VARCHAR,
          email VARCHAR,
          address TEXT,
          city VARCHAR,
          state VARCHAR,
          country VARCHAR,
          postal_code VARCHAR,
          date_of_birth DATE,
          gender VARCHAR,
          medical_history TEXT,
          allergies TEXT,
          emergency_contact VARCHAR,
          emergency_phone VARCHAR,
          is_active BOOLEAN DEFAULT true,
          organization_id UUID NOT NULL REFERENCES organizations(id),
          created_by UUID REFERENCES users(id),
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `
    });

    // 5. Update existing data to generate order numbers for orders without them
    console.log("📋 Generating order numbers for existing orders...");
    await supabase.rpc('exec_sql', {
      sql: `
        UPDATE orders 
        SET order_number = 'ORD-' || extract(epoch from created_at)::bigint || '-' || substr(md5(random()::text), 1, 8)
        WHERE order_number IS NULL;
      `
    });

    // 6. Enable RLS on new tables
    console.log("🔒 Enabling RLS on tables...");
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policies for customers
        CREATE POLICY IF NOT EXISTS "Users can view customers in their organization" ON customers
          FOR SELECT USING (organization_id = auth.jwt() ->> 'organization_id'::text);
        
        CREATE POLICY IF NOT EXISTS "Users can insert customers in their organization" ON customers
          FOR INSERT WITH CHECK (organization_id = auth.jwt() ->> 'organization_id'::text);
        
        CREATE POLICY IF NOT EXISTS "Users can update customers in their organization" ON customers
          FOR UPDATE USING (organization_id = auth.jwt() ->> 'organization_id'::text);
      `
    });

    console.log("✅ Schema alignment completed successfully!");
    console.log("📊 Summary of changes:");
    console.log("   - Updated medicines table with additional fields");
    console.log("   - Updated orders table with customer info and order numbers");
    console.log("   - Updated order_items table with cost tracking");
    console.log("   - Created customers table");
    console.log("   - Generated order numbers for existing orders");
    console.log("   - Enabled RLS policies");

  } catch (error) {
    console.error("❌ Error aligning schema:", error.message);
    process.exit(1);
  }
}

// Run the alignment
alignSchemaWithDb();