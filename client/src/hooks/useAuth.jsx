import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";
import api from "../services/api";
import { setUserProfile, clearUserProfile } from "../store/slices/authSlice";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);
  const initializationRef = useRef(false);
  const dispatch = useDispatch();

  // Fetch user profile from PostgreSQL API
  const fetchAndSetUserProfile = useCallback(
    async (userData) => {
      if (!userData) {
        setProfile(null);
        setUser(null);
        return null;
      }
      try {
        // Add timeout to profile fetch to prevent hanging
        const profilePromise = api.get("/auth/profile");
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Profile fetch timeout")), 8000)
        );

        const response = await Promise.race([profilePromise, timeoutPromise]);
        const profileData = response.data.data.user || response.data.data;

        if (!profileData) {
          throw new Error("Profile not found");
        }
        setProfile(profileData);
        setUser(userData);
        setIsAuthenticated(true);
        setError(null);
        dispatch(setUserProfile({ user: userData, profile: profileData }));
        return profileData;
      } catch (error) {
        console.error("Profile fetch failed:", error);

        if (error.message === "Profile fetch timeout") {
          toast.error("Profile loading timed out. Please try again.");
        } else {
          toast.error("Session invalid. Please log in again.");
        }

        // Clear auth on failure
        localStorage.removeItem("token");
        setError("Failed to fetch user profile. Please log in again.");
        setIsAuthenticated(false);
        setUser(null);
        setProfile(null);
        dispatch(clearUserProfile());
        return null;
      }
    },
    [dispatch]
  );

  const signIn = useCallback(
    async (email, password) => {
      try {
        setIsAuthLoading(true);
        setError(null);
        const response = await api.post("/auth/login", { email, password });
        const { token, user: userData } = response.data.data;

        if (token) {
          localStorage.setItem("token", token);
        }

        await fetchAndSetUserProfile(userData);
        toast.success("Successfully signed in!");
        return userData;
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        setError(errorMsg);
        setIsAuthenticated(false);
        setUser(null);
        setProfile(null);
        dispatch(clearUserProfile());
        toast.error(errorMsg);
        throw error;
      } finally {
        setIsAuthLoading(false);
      }
    },
    [fetchAndSetUserProfile, dispatch]
  );

  const signOut = useCallback(async () => {
    try {
      setIsAuthLoading(true);
      await api.post("/auth/logout");
      localStorage.removeItem("token");
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
      setError(null);
      dispatch(clearUserProfile());
      toast.success("Successfully signed out!");
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsAuthLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;
    setIsAuthLoading(true);
    console.log("[useAuth] Starting initialization...");

    const initializeAuth = async () => {
      try {
        console.log("[useAuth] Checking for existing token...");
        const token = localStorage.getItem("token");

        if (!token) {
          console.log(
            "[useAuth] No token found, setting unauthenticated state"
          );
          setIsAuthenticated(false);
          setUser(null);
          setProfile(null);
          setError(null);
          dispatch(clearUserProfile());
          return;
        }

        console.log("[useAuth] Token found, fetching user profile...");

        // Add timeout to prevent hanging
        const profilePromise = api.get("/auth/profile");
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Initialization timeout")), 10000)
        );

        const response = await Promise.race([profilePromise, timeoutPromise]);
        const profileData = response.data.data.user || response.data.data;

        // Create a minimal user object
        const userData = { id: profileData.id, email: profileData.email };

        setProfile(profileData);
        setUser(userData);
        setIsAuthenticated(true);
        setError(null);
        dispatch(setUserProfile({ user: userData, profile: profileData }));
        console.log("[useAuth] Profile fetch completed");
      } catch (error) {
        console.error("[useAuth] Initialization error:", error);

        // Clear invalid token
        localStorage.removeItem("token");

        setError(
          error.message || "An unexpected error occurred during initialization."
        );
        setIsAuthenticated(false);
        setUser(null);
        setProfile(null);
        dispatch(clearUserProfile());

        if (error.message !== "Initialization timeout") {
          toast.error("Initialization failed. Please try logging in.");
        }
      } finally {
        console.log("[useAuth] Initialization completed");
        setInitialized(true);
        setIsAuthLoading(false);
      }
    };

    initializeAuth();
  }, [dispatch]);

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    try {
      const response = await api.get("/auth/profile");
      const profileData = response.data.data.user || response.data.data;
      setProfile(profileData);
      dispatch(setUserProfile({ user, profile: profileData }));
      toast.success("Profile refreshed!");
    } catch (error) {
      toast.error("Failed to refresh profile.");
    }
  }, [isAuthenticated, user, dispatch]);

  // Permission helpers
  const hasPermission = useCallback((profileData, permission) => {
    return profileData?.permissions?.includes(permission);
  }, []);

  const canAccessRole = useCallback((userRole, requiredRole) => {
    const roleHierarchy = { admin: 4, manager: 3, counter: 2, warehouse: 1 };
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }, []);

  const getUserRoleLevel = useCallback(() => {
    const roleHierarchy = { admin: 4, manager: 3, counter: 2, warehouse: 1 };
    return roleHierarchy[profile?.role_in_pos] || 0;
  }, [profile]);

  return {
    user,
    profile,
    isLoading: isAuthLoading,
    isAuthenticated,
    initialized,
    error,
    signIn,
    signOut,
    refreshProfile,
    userId: profile?.id,
    username: profile?.username,
    email: profile?.email,
    fullName: profile?.full_name,
    role: profile?.role_in_pos,
    roleInPos: profile?.role_in_pos,
    organizationId: profile?.organization_id,
    permissions: profile?.permissions || [],
    isAdmin: profile?.role_in_pos === "admin",
    isManager: profile?.role_in_pos === "manager",
    isCounter: profile?.role_in_pos === "counter",
    isWarehouse: profile?.role_in_pos === "warehouse",
    organization: profile?.organization,
    theme: profile?.theme || "light",
    language: profile?.language || "en",
    timezone: profile?.timezone || "UTC",
    hasPermission,
    canAccessRole,
    getUserRoleLevel,
  };
};
