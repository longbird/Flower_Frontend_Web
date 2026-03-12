import { create } from 'zustand';

interface BranchUser {
  id: number;
  username: string;
  name: string;
  role: string;
  organizationId: number;
  permissions?: string[];
}

interface BranchAuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: BranchUser | null;
  isLoggedIn: boolean;

  login: (access: string, refresh: string, user: BranchUser) => void;
  logout: () => void;
  loadSession: () => void;
}

const STORAGE_KEY = 'branch_auth';

export const useBranchAuthStore = create<BranchAuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isLoggedIn: false,

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
