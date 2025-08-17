import { createClient } from "@supabase/supabase-js";

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables:");
  console.error("VITE_SUPABASE_URL:", supabaseUrl ? "Set" : "Missing");
  console.error("VITE_SUPABASE_ANON_KEY:", supabaseAnonKey ? "Set" : "Missing");
  throw new Error(
    "Missing Supabase environment variables. Please check your .env file."
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: "medical-pos-auth",
  },
  global: {
    headers: {
      "x-client-info": "medical-pos-client/1.0.0",
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper function to get user profile with organization data
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        organization:organizations!inner(
          id,
          name,
          access_valid_till,
          is_active
        )
      `)
      .eq("supabase_uid", userId)
      .single();

    if (error) throw error;
    
    // Flatten organization data for easier access
    if (data && data.organization) {
      data.organization_access_valid_till = data.organization.access_valid_till;
      data.organization_is_active = data.organization.is_active;
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};

// Helper function to check if user has permission
export const hasPermission = (user, permission) => {
  if (!user || !user.permissions) return false;

  // Admin has all permissions
  if (user.role === "admin" || user.permissions.includes("all")) return true;

  return user.permissions.includes(permission);
};

// Helper function to get user role hierarchy
export const getUserRoleLevel = (role) => {
  const roleHierarchy = {
    admin: 4,
    manager: 3,
    counter: 2,
    warehouse: 1,
  };

  return roleHierarchy[role] || 0;
};

// Helper function to check if user can access role
export const canAccessRole = (userRole, requiredRole) => {
  return getUserRoleLevel(userRole) >= getUserRoleLevel(requiredRole);
};
