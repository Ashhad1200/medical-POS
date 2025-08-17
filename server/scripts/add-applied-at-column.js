const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addAppliedAtColumn() {
  try {
    console.log('🔧 Adding applied_at column to purchase_orders table...');
    
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          -- Add applied_at column if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_orders' AND column_name='applied_at') THEN
            ALTER TABLE purchase_orders ADD COLUMN applied_at TIMESTAMP WITH TIME ZONE;
            RAISE NOTICE 'Added applied_at column to purchase_orders table';
          ELSE
            RAISE NOTICE 'applied_at column already exists in purchase_orders table';
          END IF;
        END $$;
      `
    });

    if (error) {
      console.error('❌ Error adding applied_at column:', error.message);
      process.exit(1);
    }

    console.log('✅ Successfully added applied_at column to purchase_orders table');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
addAppliedAtColumn();