import { useEffect, useState, useCallback, useRef } from "react";
import { supabase, getUserProfile } from "../config/supabase";
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { setUserProfile, clearUserProfile } from "../store/slices/authSlice";
import { AUTH_CONFIG, ROLE_HIERARCHY } from "../config/constants";
import { log } from "../utils/logger";

log.auth("Supabase config initialized", {
  url: import.meta.env.VITE_SUPABASE_URL ? "Set" : "Missing",
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? "Set" : "Missing",
});

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);
  const initializationRef = useRef(false);
  const dispatch = useDispatch();

  const fetchAndSetUserProfile = useCallback(
    async (supabaseUser) => {
      if (!supabaseUser) {
        setProfile(null);
        setUser(null);
        return null;
      }
      try {
        // Add timeout to profile fetch to prevent hanging
        const profilePromise = getUserProfile(supabaseUser.id);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), AUTH_CONFIG.PROFILE_FETCH_TIMEOUT)
        );
        
        const profileData = await Promise.race([profilePromise, timeoutPromise]);
        
        if (!profileData) {
          throw new Error('Profile not found');
        }
        setProfile(profileData);
        setUser(supabaseUser);
        setIsAuthenticated(true);
        setError(null);
        dispatch(setUserProfile({ user: supabaseUser, profile: profileData }));
        return profileData;
      } catch (error) {
        log.error('Profile fetch failed:', error);
        
        if (error.message === 'Profile fetch timeout') {
          toast.error('Profile loading timed out. Please try again.');
        } else {
          toast.error('Session invalid. Please log in again.');
        }
        
        // Force sign out on failure
        await supabase.auth.signOut();
        setError('Failed to fetch user profile. Please log in again.');
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
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });
        if (signInError) throw signInError;
        // Don't call fetchAndSetUserProfile here - let onAuthStateChange handle it
        // This prevents duplicate profile fetches during login
        toast.success("Successfully signed in!");
        return data.user;
      } catch (error) {
        setError(error.message);
        setIsAuthenticated(false);
        setUser(null);
        setProfile(null);
        dispatch(clearUserProfile());
        toast.error(error.message);
        throw error;
      } finally {
        setIsAuthLoading(false);
      }
    },
    [dispatch]
  );

  const signOut = useCallback(async () => {
    try {
      setIsAuthLoading(true);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
      setError(null);
      dispatch(clearUserProfile());
      toast.success("Successfully signed out!");
    } catch (error) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;
    setIsAuthLoading(true);
    log.auth('Starting initialization...');
    
    const initializeAuth = async () => {
      try {
        log.auth('Getting session...');
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Initialization timeout')), AUTH_CONFIG.INITIALIZATION_TIMEOUT));
        const { data: { session }, error: sessionError } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (sessionError) {
          log.error('Session error:', sessionError);
          throw sessionError;
        }
        
        log.auth('Session retrieved:', !!session?.user);
        
        if (session?.user) {
          log.auth('Fetching user profile...');
          await fetchAndSetUserProfile(session.user);
          log.auth('Profile fetch completed');
        } else {
          log.auth('No session found, setting unauthenticated state');
          setIsAuthenticated(false);
          setUser(null);
          setProfile(null);
          setError(null);
          dispatch(clearUserProfile());
        }
      } catch (error) {
        log.error('Initialization error:', error);
        
        if (error.message === 'Initialization timeout') {
          log.auth('Initialization timed out, signing out');
          await supabase.auth.signOut();
          toast.error('Authentication initialization timed out. Please log in again.');
        }
        
        setError(error.message || 'An unexpected error occurred during initialization.');
        setIsAuthenticated(false);
        setUser(null);
        setProfile(null);
        dispatch(clearUserProfile());
        
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          log.error('Sign out error:', signOutError);
        }
        
        if (error.message !== 'Initialization timeout') {
          toast.error('Initialization failed. Please try logging in.');
        }
      } finally {
        log.auth('Initialization completed, setting initialized=true');
        setInitialized(true);
        setIsAuthLoading(false);
      }
    };
    // Add absolute safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      log.warn('Safety timeout triggered - forcing initialization completion');
      if (!initializationRef.current) {
        setInitialized(true);
        setIsAuthLoading(false);
      }
    }, AUTH_CONFIG.SAFETY_TIMEOUT); // Safety timeout from config
    
    initializeAuth().finally(() => {
      clearTimeout(safetyTimeout);
    });
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip auth state changes during initialization to prevent conflicts
      if (!initialized) {
        log.auth('Skipping auth state change during initialization:', event);
        return;
      }
      
      log.auth('Auth state change:', event, !!session?.user);
      setIsAuthLoading(true);
      try {
        if (event === "SIGNED_IN" && session?.user) {
          log.auth('Processing SIGNED_IN event');
          await fetchAndSetUserProfile(session.user);
        } else if (event === "SIGNED_OUT") {
          log.auth('Processing SIGNED_OUT event');
          setUser(null);
          setProfile(null);
          setIsAuthenticated(false);
          setError(null);
          dispatch(clearUserProfile());
        } else if (session?.user) {
          log.auth('Processing session with user');
          await fetchAndSetUserProfile(session.user);
        } else {
          log.auth('Processing session without user');
          setUser(null);
          setProfile(null);
          setIsAuthenticated(false);
          dispatch(clearUserProfile());
        }
      } catch (err) {
        log.error('Auth state change error:', err);
        setError(err.message || "An error occurred during auth state change.");
      } finally {
        setIsAuthLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

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
