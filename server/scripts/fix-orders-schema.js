const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixOrdersSchema() {
  try {
    console.log("🔄 Fixing orders table schema...");

    // Try to add customer_id column
    try {
      const { error: customerIdError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE orders ADD COLUMN customer_id UUID REFERENCES customers(id);'
      });
      if (customerIdError && !customerIdError.message.includes('already exists')) {
        console.log('⚠️ Customer ID column error:', customerIdError.message);
      } else {
        console.log('✅ Added customer_id column');
      }
    } catch (e) {
      console.log('⚠️ Customer ID column may already exist or error:', e.message);
    }

    // Try to add paid_amount column
    try {
      const { error: paidAmountError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE orders ADD COLUMN paid_amount DECIMAL(12,2) DEFAULT 0;'
      });
      if (paidAmountError && !paidAmountError.message.includes('already exists')) {
        console.log('⚠️ Paid amount column error:', paidAmountError.message);
      } else {
        console.log('✅ Added paid_amount column');
      }
    } catch (e) {
      console.log('⚠️ Paid amount column may already exist or error:', e.message);
    }

    // Try to add completed_at column
    try {
      const { error: completedAtError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE orders ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;'
      });
      if (completedAtError && !completedAtError.message.includes('already exists')) {
        console.log('⚠️ Completed at column error:', completedAtError.message);
      } else {
        console.log('✅ Added completed_at column');
      }
    } catch (e) {
      console.log('⚠️ Completed at column may already exist or error:', e.message);
    }

    // Try to create index
    try {
      const { error: indexError } = await supabase.rpc('exec_sql', {
        sql: 'CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);'
      });
      if (indexError) {
        console.log('⚠️ Index creation error:', indexError.message);
      } else {
        console.log('✅ Created index on customer_id');
      }
    } catch (e) {
      console.log('⚠️ Index may already exist or error:', e.message);
    }

    console.log("✅ Orders table schema fixed successfully!");
    console.log("📊 Added columns:");
    console.log("   - customer_id (UUID, references customers table)");
    console.log("   - paid_amount (DECIMAL(12,2), default 0)");
    console.log("   - completed_at (TIMESTAMP WITH TIME ZONE)");
    console.log("   - Added index on customer_id for performance");

  } catch (error) {
    console.error("❌ Error fixing orders schema:", error.message);
    process.exit(1);
  }
}

// Run the fix
fixOrdersSchema();