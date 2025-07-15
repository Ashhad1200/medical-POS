const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables");
}

// Create Supabase client with service role for server-side operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      "x-client-info": "medical-pos-server/1.0.0",
    },
  },
});

// Create public client for client-side operations
const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      "x-client-info": "medical-pos-client/1.0.0",
    },
  },
});

// Database connection class
class SupabaseConnection {
  constructor() {
    this.isConnected = false;
    this.client = supabase;
    this.publicClient = supabasePublic;
  }

  async connect() {
    try {
      if (this.isConnected) {
        console.log("Supabase already connected");
        return;
      }

      // Test connection by querying a simple table
      const { data, error } = await this.client
        .from("organizations")
        .select("id")
        .limit(1);

      if (error) {
        throw new Error(`Supabase connection test failed: ${error.message}`);
      }

      this.isConnected = true;
      console.log("✅ Connected to Supabase");

      return this.client;
    } catch (error) {
      console.error("❌ Supabase connection error:", error.message);
      throw error;
    }
  }

  async disconnect() {
    try {
      // Supabase doesn't require explicit disconnection
      this.isConnected = false;
      console.log("🔌 Disconnected from Supabase");
    } catch (error) {
      console.error("Error disconnecting from Supabase:", error);
      throw error;
    }
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      url: SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      hasAnonKey: !!SUPABASE_ANON_KEY,
    };
  }

  // Get client for server-side operations
  getClient() {
    return this.client;
  }

  // Get public client for client-side operations
  getPublicClient() {
    return this.publicClient;
  }
}

// Create singleton instance
const supabaseConnection = new SupabaseConnection();

module.exports = {
  supabase,
  supabasePublic,
  supabaseConnection,
  connectDB: () => supabaseConnection.connect(),
  disconnectDB: () => supabaseConnection.disconnect(),
};
