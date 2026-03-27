import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchBranchInfo,
  fetchBranchProducts,
  fetchRecommendedPhotos,
  fetchRecommendedPhotoById,
  sendPhoneVerification,
  verifyPhoneCode,
  submitOrderRequest,
  submitConsultRequest,
} from '@/lib/branch/api';
import type { ConsultRequestForm } from '@/lib/branch/types';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

// ---------------------------------------------------------------------------
// fetchBranchInfo
// ---------------------------------------------------------------------------
describe('fetchBranchInfo', () => {
  it('should fetch branch info and return data on success', async () => {
    const branchData = { id: 1, name: '서울지사', code: 'seoul' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: branchData }),
    });

    const result = await fetchBranchInfo('seoul');

    expect(mockFetch).toHaveBeenCalledWith('/public/branch/seoul');
    expect(result).toEqual(branchData);
  });

  it('should return null when response is not ok (e.g. 404)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const result = await fetchBranchInfo('nonexistent');

    expect(result).toBeNull();
  });

  it('should return null when json.data is undefined', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await fetchBranchInfo('seoul');

    expect(result).toBeNull();
  });

  it('should return null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchBranchInfo('seoul');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchBranchProducts
// ---------------------------------------------------------------------------
describe('fetchBranchProducts', () => {
  it('should fetch products and return array on success', async () => {
    const products = [
      { id: 1, sku: 'P001', name: '장미', basePrice: 50000, price: 55000, surcharge: 0, sortOrder: 1 },
      { id: 2, sku: 'P002', name: '백합', basePrice: 40000, price: 45000, surcharge: 0, sortOrder: 2 },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: products }),
    });

    const result = await fetchBranchProducts('seoul');

    expect(mockFetch).toHaveBeenCalledWith('/public/branch/seoul/products');
    expect(result).toEqual(products);
  });

  it('should return empty array when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const result = await fetchBranchProducts('seoul');

    expect(result).toEqual([]);
  });

  it('should return empty array when json.data is undefined', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await fetchBranchProducts('seoul');

    expect(result).toEqual([]);
  });

  it('should return empty array on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchBranchProducts('seoul');

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fetchRecommendedPhotos
// ---------------------------------------------------------------------------
describe('fetchRecommendedPhotos', () => {
  it('should fetch recommended photos without params', async () => {
    const photos = [{ id: 1, category: 'FLOWER', imageUrl: '/img/1.jpg' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: photos, total: 1, page: 1, size: 40 }),
    });

    const result = await fetchRecommendedPhotos('seoul');

    expect(mockFetch).toHaveBeenCalledWith('/public/branch/seoul/recommended-photos');
    expect(result).toEqual({ data: photos, total: 1, page: 1, size: 40 });
  });

  it('should append query params when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], total: 0, page: 2, size: 20 }),
    });

    await fetchRecommendedPhotos('seoul', { page: 2, size: 20, category: 'FLOWER', serviceArea: '서울' });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('size=20');
    expect(calledUrl).toContain('category=FLOWER');
    expect(calledUrl).toContain('serviceArea=');
  });

  it('should wrap array response into PaginatedResponse', async () => {
    const photos = [
      { id: 1, category: 'FLOWER' },
      { id: 2, category: 'CELEBRATION' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: photos }),
    });

    const result = await fetchRecommendedPhotos('seoul', { page: 3, size: 10 });

    expect(result).toEqual({
      data: photos,
      total: 2,
      page: 3,
      size: 10,
    });
  });

  it('should return object response as-is when data is not an array', async () => {
    const paginatedResp = {
      data: { nested: 'value' },
      total: 1,
      page: 1,
      size: 40,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => paginatedResp,
    });

    const result = await fetchRecommendedPhotos('seoul');

    expect(result).toEqual(paginatedResp);
  });

  it('should return empty paginated response when not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const result = await fetchRecommendedPhotos('seoul', { size: 20 });

    expect(result).toEqual({ data: [], total: 0, page: 1, size: 20 });
  });

  it('should return default size=40 in error response when no params', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const result = await fetchRecommendedPhotos('seoul');

    expect(result).toEqual({ data: [], total: 0, page: 1, size: 40 });
  });

  it('should return empty paginated response on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchRecommendedPhotos('seoul', { size: 15 });

    expect(result).toEqual({ data: [], total: 0, page: 1, size: 15 });
  });
});

// ---------------------------------------------------------------------------
// fetchRecommendedPhotoById
// ---------------------------------------------------------------------------
describe('fetchRecommendedPhotoById', () => {
  it('should return the matching photo by id', async () => {
    const photos = [
      { id: 1, category: 'FLOWER' },
      { id: 2, category: 'CELEBRATION' },
      { id: 3, category: 'CONDOLENCE' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: photos, total: 3 }),
    });

    const result = await fetchRecommendedPhotoById('seoul', 2);

    expect(result).toEqual({ id: 2, category: 'CELEBRATION' });
    // Verify it requested size=200
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('size=200');
  });

  it('should return null when photo id is not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 1, category: 'FLOWER' }], total: 1 }),
    });

    const result = await fetchRecommendedPhotoById('seoul', 999);

    expect(result).toBeNull();
  });

  it('should return null when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const result = await fetchRecommendedPhotoById('seoul', 1);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// sendPhoneVerification
// ---------------------------------------------------------------------------
describe('sendPhoneVerification', () => {
  it('should send POST with phone in JSON body and return ok on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Sent' }),
    });

    const result = await sendPhoneVerification('seoul', '01012345678');

    expect(mockFetch).toHaveBeenCalledWith('/public/branch/seoul/verify/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '01012345678' }),
    });
    expect(result).toEqual({ ok: true });
  });

  it('should return error message from server on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '일일 발송 한도 초과' }),
    });

    const result = await sendPhoneVerification('seoul', '01012345678');

    expect(result).toEqual({ ok: false, message: '일일 발송 한도 초과' });
  });

  it('should return default error message when server provides none', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const result = await sendPhoneVerification('seoul', '01012345678');

    expect(result).toEqual({ ok: false, message: '인증번호 발송에 실패했습니다.' });
  });

  it('should return network error message on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await sendPhoneVerification('seoul', '01012345678');

    expect(result).toEqual({ ok: false, message: '네트워크 오류가 발생했습니다.' });
  });
});

// ---------------------------------------------------------------------------
// verifyPhoneCode
// ---------------------------------------------------------------------------
describe('verifyPhoneCode', () => {
  it('should send POST with phone and code and return ok on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Verified' }),
    });

    const result = await verifyPhoneCode('seoul', '01012345678', '123456');

    expect(mockFetch).toHaveBeenCalledWith('/public/branch/seoul/verify/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '01012345678', code: '123456' }),
    });
    expect(result).toEqual({ ok: true });
  });

  it('should return error message from server on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '인증번호가 만료되었습니다.' }),
    });

    const result = await verifyPhoneCode('seoul', '01012345678', '000000');

    expect(result).toEqual({ ok: false, message: '인증번호가 만료되었습니다.' });
  });

  it('should return default error message when server provides none', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const result = await verifyPhoneCode('seoul', '01012345678', '000000');

    expect(result).toEqual({ ok: false, message: '인증번호가 올바르지 않습니다.' });
  });

  it('should return network error message on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await verifyPhoneCode('seoul', '01012345678', '123456');

    expect(result).toEqual({ ok: false, message: '네트워크 오류가 발생했습니다.' });
  });
});

// ---------------------------------------------------------------------------
// submitOrderRequest
// ---------------------------------------------------------------------------
describe('submitOrderRequest', () => {
  it('should send POST with FormData (no Content-Type header) and return ok on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Created' }),
    });

    const formData = new FormData();
    formData.append('customerName', '홍길동');
    formData.append('customerPhone', '01012345678');

    const result = await submitOrderRequest('seoul', formData);

    expect(mockFetch).toHaveBeenCalledWith('/public/branch/seoul/consult', {
      method: 'POST',
      body: formData,
    });
    // Verify no Content-Type header is set (browser sets it automatically for FormData)
    const callArgs = mockFetch.mock.calls[0][1] as Record<string, unknown>;
    expect(callArgs).toBeDefined();
    expect(callArgs).not.toHaveProperty('headers');
    expect(result).toEqual({ ok: true });
  });

  it('should return error message from server on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '필수 항목이 누락되었습니다.' }),
    });

    const result = await submitOrderRequest('seoul', new FormData());

    expect(result).toEqual({ ok: false, message: '필수 항목이 누락되었습니다.' });
  });

  it('should return default error message when server provides none', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const result = await submitOrderRequest('seoul', new FormData());

    expect(result).toEqual({ ok: false, message: '요청에 실패했습니다.' });
  });

  it('should return network error message on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await submitOrderRequest('seoul', new FormData());

    expect(result).toEqual({ ok: false, message: '네트워크 오류가 발생했습니다.' });
  });
});

// ---------------------------------------------------------------------------
// submitConsultRequest
// ---------------------------------------------------------------------------
describe('submitConsultRequest', () => {
  const consultForm: ConsultRequestForm = {
    customerName: '김철수',
    customerPhone: '01098765432',
    productCode: 'P001',
    productName: '장미 꽃다발',
    desiredDate: '2026-04-01',
    message: '배송 전 연락 부탁드립니다.',
  };

  it('should send POST with JSON body and return ok on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Created' }),
    });

    const result = await submitConsultRequest('seoul', consultForm);

    expect(mockFetch).toHaveBeenCalledWith('/public/branch/seoul/consult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(consultForm),
    });
    expect(result).toEqual({ ok: true });
  });

  it('should return error message from server on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '중복 요청입니다.' }),
    });

    const result = await submitConsultRequest('seoul', consultForm);

    expect(result).toEqual({ ok: false, message: '중복 요청입니다.' });
  });

  it('should return default error message when server provides none', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const result = await submitConsultRequest('seoul', consultForm);

    expect(result).toEqual({ ok: false, message: '요청에 실패했습니다.' });
  });

  it('should return network error message on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await submitConsultRequest('seoul', consultForm);

    expect(result).toEqual({ ok: false, message: '네트워크 오류가 발생했습니다.' });
  });
});
