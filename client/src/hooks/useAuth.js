import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";
import api from "../services/api";
import { setUserProfile, clearUserProfile } from "../store/slices/authSlice";
import { AUTH_CONFIG, ROLE_HIERARCHY } from "../config/constants";
import { log } from "../utils/logger";

log.auth("PostgreSQL API initialized for authentication");

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);
  const initializationRef = useRef(false);
  const dispatch = useDispatch();

  // Helper function to check if organization access has expired
  const checkAccessValidity = useCallback((profileData) => {
    // Check if organization is active
    if (profileData?.organization_is_active === false) {
      return {
        isValid: false,
        message:
          "Your organization has been deactivated. Please contact your administrator.",
      };
    }

    // Check organization access expiry
    if (!profileData?.organization_access_valid_till) {
      return { isValid: true }; // No expiry set, access is valid
    }

    const now = new Date();
    const accessValidTill = new Date(
      profileData.organization_access_valid_till
    );

    if (now > accessValidTill) {
      return {
        isValid: false,
        message:
          "Your organization access has expired. Please contact your administrator to extend your access.",
      };
    }

    return { isValid: true };
  }, []);

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
          setTimeout(
            () => reject(new Error("Profile fetch timeout")),
            AUTH_CONFIG.PROFILE_FETCH_TIMEOUT
          )
        );

        const response = await Promise.race([profilePromise, timeoutPromise]);
        const profileData = response.data.data.user || response.data.data;

        if (!profileData) {
          throw new Error("Profile not found");
        }

        // Check if user access has expired
        const accessCheck = checkAccessValidity(profileData);
        if (!accessCheck.isValid) {
          toast.error(accessCheck.message);
          // Clear token for expired access
          localStorage.removeItem("token");
          setError(accessCheck.message);
          setIsAuthenticated(false);
          setUser(null);
          setProfile(null);
          dispatch(clearUserProfile());
          return null;
        }

        setProfile(profileData);
        setUser(userData);
        setIsAuthenticated(true);
        setError(null);
        dispatch(setUserProfile({ user: userData, profile: profileData }));
        return profileData;
      } catch (error) {
        log.error("Profile fetch failed:", error);

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
    [dispatch, checkAccessValidity]
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

        // Fetch user profile after setting token
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
    [dispatch, fetchAndSetUserProfile]
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
    log.auth("Starting authentication initialization...");

    const initializeAuth = async () => {
      try {
        log.auth("Checking for existing token...");
        const token = localStorage.getItem("token");

        if (!token) {
          log.auth("No token found, setting unauthenticated state");
          setIsAuthenticated(false);
          setUser(null);
          setProfile(null);
          setError(null);
          dispatch(clearUserProfile());
          return;
        }

        log.auth("Token found, fetching user profile...");

        // Add timeout to prevent hanging
        const profilePromise = api.get("/auth/profile");
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Initialization timeout")),
            AUTH_CONFIG.INITIALIZATION_TIMEOUT
          )
        );

        const response = await Promise.race([profilePromise, timeoutPromise]);
        const profileData = response.data.data.user || response.data.data;

        // Create a minimal user object
        const userData = { id: profileData.id, email: profileData.email };

        // Check access validity
        const accessCheck = checkAccessValidity(profileData);
        if (!accessCheck.isValid) {
          log.auth("User access expired:", accessCheck.message);
          localStorage.removeItem("token");
          setError(accessCheck.message);
          setIsAuthenticated(false);
          setUser(null);
          setProfile(null);
          dispatch(clearUserProfile());
          return;
        }

        setProfile(profileData);
        setUser(userData);
        setIsAuthenticated(true);
        setError(null);
        dispatch(setUserProfile({ user: userData, profile: profileData }));
        log.auth("Profile fetch completed");
      } catch (error) {
        log.error("Initialization error:", error);

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
        log.auth("Initialization completed");
        setInitialized(true);
        setIsAuthLoading(false);
      }
    };

    initializeAuth();
  }, [dispatch, checkAccessValidity]);

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    try {
      await fetchAndSetUserProfile(user);
      toast.success("Profile refreshed!");
    } catch (error) {
      toast.error("Failed to refresh profile.");
    }
  }, [isAuthenticated, user, fetchAndSetUserProfile]);

  // Permission helpers
  const hasPermission = useCallback((profileData, permission) => {
    return profileData?.permissions?.includes(permission);
  }, []);
  const canAccessRole = useCallback((userRole, requiredRole) => {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
  }, []);
  const getUserRoleLevel = useCallback(() => {
    return ROLE_HIERARCHY[profile?.role_in_pos] || 0;
  }, [profile]);

  // Check current access validity
  const currentAccessCheck = checkAccessValidity(profile);

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
    accessValidTill: profile?.organization_access_valid_till,
    isAccessValid: currentAccessCheck.isValid,
    accessExpiredMessage: currentAccessCheck.message,
    hasPermission,
    canAccessRole,
    getUserRoleLevel,
    checkAccessValidity,
  };
};
