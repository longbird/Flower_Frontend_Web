import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/lib/auth/store';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store between tests
    useAuthStore.getState().logout();
    localStorage.clear();
  });

  it('should start logged out', () => {
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('should login and store tokens', () => {
    const user = { id: 1, username: 'admin', name: '관리자', role: 'ADMIN' };
    useAuthStore.getState().login('access-token', 'refresh-token', user);

    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(true);
    expect(state.accessToken).toBe('access-token');
    expect(state.refreshToken).toBe('refresh-token');
    expect(state.user?.username).toBe('admin');
  });

  it('should persist to localStorage on login', () => {
    const user = { id: 1, username: 'admin', name: '관리자', role: 'ADMIN' };
    useAuthStore.getState().login('access-token', 'refresh-token', user);

    const stored = JSON.parse(localStorage.getItem('admin_auth') || '{}');
    expect(stored.accessToken).toBe('access-token');
    expect(stored.user.username).toBe('admin');
  });

  it('should clear on logout', () => {
    const user = { id: 1, username: 'admin', name: '관리자', role: 'ADMIN' };
    useAuthStore.getState().login('access-token', 'refresh-token', user);
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(localStorage.getItem('admin_auth')).toBeNull();
  });

  it('should load session from localStorage', () => {
    localStorage.setItem(
      'admin_auth',
      JSON.stringify({
        accessToken: 'stored-token',
        refreshToken: 'stored-refresh',
        user: { id: 1, username: 'admin', name: '관리자', role: 'ADMIN' },
      })
    );

    useAuthStore.getState().loadSession();
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(true);
    expect(state.accessToken).toBe('stored-token');
  });

  it('should update tokens', () => {
    const user = { id: 1, username: 'admin', name: '관리자', role: 'ADMIN' };
    useAuthStore.getState().login('old-access', 'old-refresh', user);
    useAuthStore.getState().setTokens('new-access', 'new-refresh');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new-access');
    expect(state.refreshToken).toBe('new-refresh');
  });
});
