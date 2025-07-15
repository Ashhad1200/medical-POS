const { createClient } = require("@supabase/supabase-js");

// Test Supabase configuration
function testSupabaseConfig() {
  console.log("🔍 Testing Supabase Configuration...\n");

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("Environment Variables:");
  console.log(
    "✅ NEXT_PUBLIC_SUPABASE_URL:",
    supabaseUrl ? "Set" : "❌ Missing"
  );
  console.log(
    "✅ SUPABASE_SERVICE_ROLE_KEY:",
    supabaseServiceKey ? "Set" : "❌ Missing"
  );
  console.log(
    "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY:",
    supabaseAnonKey ? "Set" : "❌ Missing"
  );

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.log("\n❌ Missing environment variables!");
    console.log("\nPlease create a .env file in the server directory with:");
    console.log(`
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server Configuration
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
    `);
    return false;
  }

  console.log("\n✅ All environment variables are set!");

  // Test Supabase connection
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("\n🔗 Testing Supabase connection...");

    // Test a simple query
    supabase
      .from("organizations")
      .select("id")
      .limit(1)
      .then(({ data, error }) => {
        if (error) {
          if (error.code === "42P01") {
            console.log(
              "⚠️  Tables do not exist yet - run setup script after configuring environment"
            );
          } else {
            console.log("❌ Connection error:", error.message);
          }
        } else {
          console.log("✅ Supabase connection successful!");
          console.log("✅ Database is accessible");
        }
      })
      .catch((error) => {
        console.log("❌ Connection failed:", error.message);
      });
  } catch (error) {
    console.log("❌ Failed to create Supabase client:", error.message);
    return false;
  }

  return true;
}

// Show setup instructions
function showSetupInstructions() {
  console.log("\n📋 Setup Instructions:");
  console.log("\n1. Create Supabase Project:");
  console.log("   - Go to https://supabase.com");
  console.log("   - Create a new project");
  console.log("   - Note down your project URL and API keys");

  console.log("\n2. Configure Environment:");
  console.log("   - Create .env file in server directory");
  console.log("   - Add your Supabase credentials");

  console.log("\n3. Run Setup Script:");
  console.log("   - node scripts/setup-complete-supabase.js");

  console.log("\n4. Test the System:");
  console.log("   - Start server: npm run dev");
  console.log("   - Start client: cd ../client && npm run dev");

  console.log("\n5. Login with Demo Credentials:");
  console.log("   - Admin: admin@moizmedical.com / admin123");
  console.log("   - Counter: counter@moizmedical.com / counter123");
  console.log("   - Warehouse: warehouse@moizmedical.com / warehouse123");
}

// Show client setup instructions
function showClientSetupInstructions() {
  console.log("\n📱 Client Setup:");
  console.log("\n1. Create .env file in client directory:");
  console.log(`
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# API Configuration
VITE_API_URL=http://localhost:5000/api

# App Configuration
VITE_APP_NAME="Medical Store POS"
VITE_APP_VERSION="1.0.0"
VITE_ENVIRONMENT=development
  `);

  console.log("\n2. Install dependencies:");
  console.log("   cd ../client && npm install @supabase/supabase-js");

  console.log("\n3. Start the client:");
  console.log("   npm run dev");
}

// Main function
function main() {
  console.log("🚀 Medical POS - Supabase Setup Test\n");

  const configOk = testSupabaseConfig();

  if (!configOk) {
    showSetupInstructions();
    showClientSetupInstructions();
  } else {
    console.log("\n✅ Configuration looks good!");
    console.log("\nNext steps:");
    console.log("1. Run: node scripts/setup-complete-supabase.js");
    console.log("2. Start the server: npm run dev");
    console.log("3. Start the client: cd ../client && npm run dev");
  }

  console.log(
    "\n📚 For detailed instructions, see: SUPABASE_SETUP_COMPLETE.md"
  );
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { testSupabaseConfig };
