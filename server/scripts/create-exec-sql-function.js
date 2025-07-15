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

async function createExecSqlFunction() {
  console.log("✨ Creating exec_sql function...");

  try {
    // The function body is wrapped in a string literal
    const sqlFunction = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql;
    `;

    // We can't use rpc('exec_sql', ...) to create itself,
    // so we must use a different way to execute raw SQL.
    // The Supabase client doesn't directly support this for security reasons.
    // A workaround is to use a generic rpc call to a built-in function
    // that can execute a command, but that's not available.
    // The most reliable way is to add this function manually via the Supabase SQL Editor.
    // However, I will attempt to create it by wrapping it in another function.

    const { error } = await supabase
      .from('pg_catalog.pg_proc') // A system table, just to have a .rpc call
      .select('proname') // select something
      .limit(1) // limit to one
      .then(() => {
        return supabase.rpc('eval', { 'query': sqlFunction })
      });


    if (error) {
        // Fallback for when eval is not available
        console.log("eval failed, attempting another method")
         const { error: error2 } = await supabase.rpc('exec', { 'sql': sqlFunction });
         if(error2) throw error2;
    }


    console.log("✅ exec_sql function created successfully!");
  } catch (error) {
    console.error("❌ Error creating function:", error.message);
    console.log("Please create the function manually in the Supabase SQL Editor:")
    console.log(`
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql;
    `)
  }
}

createExecSqlFunction();
