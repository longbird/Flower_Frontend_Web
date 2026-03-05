import { create } from 'zustand';
import type { PartnerUser } from '@/lib/types/partner';

interface PartnerAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: PartnerUser | null;
  isLoggedIn: boolean;

  login: (access: string, refresh: string, user: PartnerUser) => void;
  logout: () => void;
  loadSession: () => void;
}

const STORAGE_KEY = 'partner_auth';

export const usePartnerAuthStore = create<PartnerAuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isLoggedIn: false,

  login: (access, refresh, user) => {
    set({ accessToken: access, refreshToken: refresh, user, isLoggedIn: true });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: access, refreshToken: refresh, user }));
    } catch {}
  },

  logout: () => {
    set({ accessToken: null, refreshToken: null, user: null, isLoggedIn: false });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
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
