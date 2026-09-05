import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api, tokenStore } from '@/lib/api';
import { authServices } from '@/lib/services';

const AuthContext = createContext(null);

function accessValidity(profile) {
  if (profile?.organization_is_active === false) {
    return { valid: false, message: 'Your organization has been deactivated.' };
  }
  const till = profile?.organization_access_valid_till;
  if (till && new Date(till) < new Date()) {
    return {
      valid: false,
      message:
        'Your organization access has expired. Contact your administrator to extend it.',
    };
  }
  return { valid: true, message: null };
}

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!tokenStore.get()) {
      setProfile(null);
      setReady(true);
      return;
    }
    try {
      const { data } = await authServices.getProfile();
      setProfile(data?.data?.user || data?.data || null);
    } catch {
      tokenStore.set(null);
      setProfile(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const login = useCallback(async (email, password) => {
    const { data } = await authServices.login({ email, password });
    const token = data?.data?.token;
    if (!token) throw new Error('No token returned');
    tokenStore.set(token);
    const { data: pd } = await authServices.getProfile();
    const p = pd?.data?.user || pd?.data;
    const check = accessValidity(p);
    if (!check.valid) {
      tokenStore.set(null);
      throw new Error(check.message);
    }
    setProfile(p);
    return p;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authServices.logout();
    } catch {
      /* ignore */
    }
    tokenStore.set(null);
    setProfile(null);
    location.href = '/login';
  }, []);

  const value = useMemo(() => {
    const access = accessValidity(profile);
    return {
      profile,
      ready,
      isAuthenticated: !!profile,
      role: profile?.role_in_pos || null,
      isAccessValid: profile ? access.valid : true,
      accessMessage: access.message,
      login,
      logout,
      reloadProfile: loadProfile,
    };
  }, [profile, ready, login, logout, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export { api };
