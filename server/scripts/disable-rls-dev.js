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

async function disableRLSForDev() {
  console.log("🔓 Disabling RLS for development...");

  try {
    // Disable RLS on medicines table
    const { error } = await supabase.rpc("exec_sql", {
      sql: `
        ALTER TABLE medicines DISABLE ROW LEVEL SECURITY;
        GRANT ALL PRIVILEGES ON medicines TO service_role, authenticated, anon;
      `,
    });

    if (error) {
      console.error("❌ Error disabling RLS:", error);
      process.exit(1);
    }

    console.log("✅ RLS disabled on medicines table for development");
    console.log("⚠️  Remember to re-enable RLS for production!");
  } catch (error) {
    console.error("❌ Script error:", error);
    process.exit(1);
  }
}

disableRLSForDev();