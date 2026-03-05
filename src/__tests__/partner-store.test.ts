import { describe, it, expect, beforeEach } from 'vitest';
import { usePartnerAuthStore } from '@/lib/auth/partner-store';

describe('Partner Auth Store', () => {
  beforeEach(() => {
    usePartnerAuthStore.getState().logout();
    localStorage.clear();
  });

  it('should start logged out', () => {
    const state = usePartnerAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('should login and store partner info', () => {
    const user = {
      id: 1,
      accountId: 'florist01',
      name: '꽃나라',
      type: 'FLORIST' as const,
      partnerId: 10,
      partnerName: '꽃나라 화원',
    };
    usePartnerAuthStore.getState().login('access', 'refresh', user);

    const state = usePartnerAuthStore.getState();
    expect(state.isLoggedIn).toBe(true);
    expect(state.accessToken).toBe('access');
    expect(state.user?.partnerName).toBe('꽃나라 화원');
  });

  it('should persist to localStorage', () => {
    const user = {
      id: 1,
      accountId: 'florist01',
      name: '꽃나라',
      type: 'FLORIST' as const,
      partnerId: 10,
      partnerName: '꽃나라 화원',
    };
    usePartnerAuthStore.getState().login('access', 'refresh', user);

    const stored = JSON.parse(localStorage.getItem('partner_auth') || '{}');
    expect(stored.accessToken).toBe('access');
  });

  it('should clear on logout', () => {
    const user = {
      id: 1,
      accountId: 'florist01',
      name: '꽃나라',
      type: 'FLORIST' as const,
      partnerId: 10,
      partnerName: '꽃나라 화원',
    };
    usePartnerAuthStore.getState().login('access', 'refresh', user);
    usePartnerAuthStore.getState().logout();

    expect(usePartnerAuthStore.getState().isLoggedIn).toBe(false);
    expect(localStorage.getItem('partner_auth')).toBeNull();
  });

  it('should load session from localStorage', () => {
    localStorage.setItem(
      'partner_auth',
      JSON.stringify({
        accessToken: 'stored-token',
        refreshToken: 'stored-refresh',
        user: {
          id: 1,
          accountId: 'florist01',
          name: '꽃나라',
          type: 'FLORIST',
          partnerId: 10,
          partnerName: '꽃나라 화원',
        },
      })
    );

    usePartnerAuthStore.getState().loadSession();
    const state = usePartnerAuthStore.getState();
    expect(state.isLoggedIn).toBe(true);
    expect(state.accessToken).toBe('stored-token');
  });
});
