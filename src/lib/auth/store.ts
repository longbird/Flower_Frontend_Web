import { create } from 'zustand';
import type { AdminUser } from '@/lib/types/auth';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AdminUser | null;
  isLoggedIn: boolean;

  setTokens: (access: string, refresh: string) => void;
  setUser: (user: AdminUser) => void;
  login: (access: string, refresh: string, user: AdminUser) => void;
  logout: () => void;
  loadSession: () => void;
}

const STORAGE_KEY = 'admin_auth';

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isLoggedIn: false,

  setTokens: (access, refresh) => {
    set({ accessToken: access, refreshToken: refresh });
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      stored.accessToken = access;
      stored.refreshToken = refresh;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {}
  },

  setUser: (user) => set({ user }),

  login: (access, refresh, user) => {
    set({ accessToken: access, refreshToken: refresh, user, isLoggedIn: true });
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ accessToken: access, refreshToken: refresh, user })
      );
    } catch {}
  },

  logout: () => {
    set({ accessToken: null, refreshToken: null, user: null, isLoggedIn: false });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  },

  loadSession: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const { accessToken, refreshToken, user } = JSON.parse(stored);
      if (accessToken && user) {
        set({ accessToken, refreshToken, user, isLoggedIn: true });
      }
    } catch {}
  },
}));
