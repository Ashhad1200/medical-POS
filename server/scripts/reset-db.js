const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetDatabase() {
  try {
    console.log("🔥 Resetting database...");

    const schemaSQL = fs.readFileSync(path.join(__dirname, "create-supabase-schema.sql"), "utf8");
    const dropStatements = schemaSQL.match(/DROP TABLE IF EXISTS .*?;/g);

    if (dropStatements) {
      for (const statement of dropStatements) {
        console.log(`Executing: ${statement}`);
        const { error } = await supabase.rpc("exec_sql", { sql: statement });
        if (error) {
          console.warn(`⚠️  Error executing drop statement: ${statement}`, error.message);
        }
      }
    }

    console.log("✅ Database reset complete.");
  } catch (error) {
    console.error("❌ Error resetting database:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  resetDatabase();
}
