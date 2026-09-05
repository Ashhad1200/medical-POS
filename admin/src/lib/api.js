import axios from 'axios';

// Default to a relative path so the Vite dev proxy (see vite.config.js) handles
// it; set VITE_API_URL for a deployed build.
const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL });

const TOKEN_KEY = 'medpos_platform_token';

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t) => {
    try {
      t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

api.interceptors.request.use((config) => {
  const t = tokenStore.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && tokenStore.get()) {
      tokenStore.set(null);
      if (!location.pathname.startsWith('/login')) location.href = '/login';
    }
    return Promise.reject(error);
  },
);

/** Pull the human-readable message out of an axios error. */
export const apiError = (e) =>
  e?.response?.data?.message || e?.message || 'Something went wrong';
