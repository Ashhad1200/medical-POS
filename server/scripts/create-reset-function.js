const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createResetFunction() {
  console.log("✨ Creating get_public_tables function...");

  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION get_public_tables()
        RETURNS TABLE(tablename text) AS $$
        BEGIN
          RETURN QUERY SELECT t.tablename::text FROM pg_catalog.pg_tables t WHERE t.schemaname = 'public';
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (error) {
      console.error("❌ Error creating function:", error.message);
      return;
    }

    console.log("✅ get_public_tables function created successfully!");
  } catch (error) {
    console.error("❌ Error creating function:", error.message);
  }
}

createResetFunction();
