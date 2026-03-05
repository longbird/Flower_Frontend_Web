import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api, ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/lib/auth/store';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('should make GET requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    });

    const result = await api('/test');
    expect(result).toEqual({ data: 'test' });
    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should include auth token in headers', async () => {
    useAuthStore.getState().login('my-token', 'refresh', {
      id: 1,
      username: 'admin',
      name: 'Admin',
      role: 'ADMIN',
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await api('/test');
    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      })
    );
  });

  it('should throw ApiError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ message: '잘못된 요청입니다.' }),
    });

    try {
      await api('/test');
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(400);
      expect((e as ApiError).message).toBe('잘못된 요청입니다.');
    }
  });

  it('should handle 204 No Content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const result = await api('/test');
    expect(result).toBeUndefined();
  });

  it('should not set Content-Type for FormData', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['test']), 'test.jpg');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 1 }),
    });

    await api('/upload', { method: 'POST', body: formData });

    const calledHeaders = mockFetch.mock.calls[0][1].headers;
    expect(calledHeaders['Content-Type']).toBeUndefined();
  });
});
