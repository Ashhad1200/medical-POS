import { useEffect, useState, useCallback } from "react";
import {
  supabase,
  getUserProfile,
  hasPermission,
  canAccessRole,
} from "../config/supabase";
import { toast } from "react-hot-toast";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false); // New state
  const [error, setError] = useState(null);

  // Fetch user profile from database
  const fetchUserProfile = useCallback(async (userId) => {
    try {
      const profileData = await getUserProfile(userId);
      setProfile(profileData);
      setUser(profileData);
      setIsAuthenticated(true);
      setError(null);
      return profileData;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setError("Failed to fetch user profile");
      setIsAuthenticated(false);
      setUser(null);
      setProfile(null);
      throw error;
    }
  }, []);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // Get current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError(sessionError.message);
          return;
        }

        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
        setInitialized(true); // Set initialized to true after initial check
      }
    };

    initializeAuth();
  }, []); // Remove fetchUserProfile dependency

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session?.user?.id);

      if (event === "SIGNED_IN" && session?.user) {
        try {
          setIsLoading(true);
          await fetchUserProfile(session.user.id);
          toast.success("Successfully signed in");
        } catch (error) {
          console.error("Error during sign in:", error);
          toast.error("Failed to load user profile");
          await signOut();
        } finally {
          setIsLoading(false);
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
        setError(null);
        toast.success("Successfully signed out");
      } else if (event === "TOKEN_REFRESHED") {
        console.log("Token refreshed");
      } else if (event === "USER_UPDATED") {
        console.log("User updated");
        if (session?.user) {
          try {
            await fetchUserProfile(session.user.id);
          } catch (error) {
            console.error("Error updating user profile:", error);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Remove fetchUserProfile dependency

  // Sign in function
  const signIn = useCallback(async (email, password) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        toast.error(error.message);
        throw error;
      }

      // Profile will be fetched by the auth state change listener
      return data;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out error:", error);
        toast.error("Error signing out");
        throw error;
      }

      // State will be cleared by the auth state change listener
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if user has specific permission
  const hasUserPermission = useCallback(
    (permission) => {
      return hasPermission(profile, permission);
    },
    [profile]
  );

  // Check if user can access specific role
  const canUserAccessRole = useCallback(
    (requiredRole) => {
      return canAccessRole(profile?.role_in_pos, requiredRole);
    },
    [profile]
  );

  // Get user role level
  const getUserRoleLevel = useCallback(() => {
    const roleHierarchy = {
      admin: 4,
      manager: 3,
      counter: 2,
      warehouse: 1,
    };

    return roleHierarchy[profile?.role_in_pos] || 0;
  }, [profile]);

  // Refresh user profile
  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  }, [isAuthenticated, fetchUserProfile]);

  return {
    // State
    user,
    profile,
    isLoading,
    isAuthenticated,
    initialized, // Expose initialized state
    error,

    // Actions
    signIn,
    signOut,
    refreshProfile,

    // Permissions
    hasPermission: hasUserPermission,
    canAccessRole: canUserAccessRole,
    getUserRoleLevel,

    // User info
    userId: profile?.id,
    username: profile?.username,
    email: profile?.email,
    fullName: profile?.full_name,
    role: profile?.role,
    roleInPos: profile?.role_in_pos,
    organizationId: profile?.organization_id,
    permissions: profile?.permissions || [],
    isAdmin: profile?.role === "admin",
    isManager: profile?.role === "manager",
    isCounter: profile?.role_in_pos === "counter",
    isWarehouse: profile?.role_in_pos === "warehouse",

    // Organization info
    organization: profile?.organization,

    // Preferences
    theme: profile?.theme || "light",
    language: profile?.language || "en",
    timezone: profile?.timezone || "UTC",
  };
};
