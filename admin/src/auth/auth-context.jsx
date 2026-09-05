import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const loadMe = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      // /auth/profile works for any authenticated user; the platform gate is
      // enforced per-request on /platform/*. We additionally verify the flag.
      const { data } = await api.get('/auth/profile');
      const u = data?.data?.user || data?.user;
      setUser(u || null);
    } catch {
      tokenStore.set(null);
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const token = data?.data?.token;
    const u = data?.data?.user;
    if (!token) throw new Error('No token returned');
    tokenStore.set(token);
    // confirm this account may use the back office
    try {
      await api.get('/platform/health');
    } catch (e) {
      tokenStore.set(null);
      throw new Error(
        e?.response?.status === 403
          ? 'This account is not a platform administrator.'
          : 'Could not verify platform access.',
      );
    }
    setUser(u || null);
    return u;
  }, []);

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
    location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
