const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addAccessValidTillColumn() {
  try {
    console.log("🔄 Adding access_valid_till column to organizations table...");

    await supabase.rpc('exec_sql', {
      sql: `
        -- Add access_valid_till column to organizations table if it doesn't exist
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='access_valid_till') THEN
            ALTER TABLE organizations ADD COLUMN access_valid_till TIMESTAMPTZ;
            COMMENT ON COLUMN organizations.access_valid_till IS 'Date and time when organization access expires for POS control';
          END IF;
        END $$;
      `
    });

    console.log("✅ Successfully added access_valid_till column to organizations table!");
    console.log("📊 Summary of changes:");
    console.log("   - Added access_valid_till column (TIMESTAMPTZ) to organizations table");
    console.log("   - This field will control POS access for organizations");
    console.log("   - Field is nullable to allow unlimited access when not set");

  } catch (error) {
    console.error("❌ Error adding access_valid_till column:", error.message);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  addAccessValidTillColumn()
    .then(() => {
      console.log("🎉 Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { addAccessValidTillColumn };