import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBranchAuthStore } from '@/lib/branch/auth-store';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
const mockLogout = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockLogout.mockReset();
  vi.stubGlobal('fetch', mockFetch);

  // Set up auth store with a valid token
  useBranchAuthStore.setState({
    accessToken: 'test-token-123',
    refreshToken: 'refresh-token-123',
    user: {
      id: 1,
      username: 'branch_admin',
      name: '지사관리자',
      role: 'BRANCH_ADMIN',
      organizationId: 10,
    },
    isLoggedIn: true,
    logout: mockLogout,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// We need to import dynamically after setting up env, or set env before import
// Since API_BASE depends on NEXT_PUBLIC_API_BASE_URL at module load time,
// and tests run in jsdom where it's empty by default, API_BASE = ''
import {
  branchAdminLogin,
  fetchMyBranchInfo,
  updateMyBranchInfo,
  fetchConsultRequests,
  updateConsultRequestStatus,
  fetchBranchProducts as fetchBranchProductsAdmin,
  updateBranchProduct,
  bulkUpdateBranchSurcharge,
  fetchBranchSurcharges,
} from '@/lib/branch/branch-api';

// ===========================================================================
// branchAdminLogin
// ===========================================================================
describe('branchAdminLogin', () => {
  it('should login successfully with BRANCH_ADMIN role', async () => {
    const loginResponse = {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      admin: { id: 1, username: 'admin', role: 'BRANCH_ADMIN', organization: { id: 10 } },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => loginResponse,
    });

    const result = await branchAdminLogin('admin', 'password123');

    expect(mockFetch).toHaveBeenCalledWith('/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' }),
    });
    expect(result.admin.organizationId).toBe(10);
    expect(result.admin.role).toBe('BRANCH_ADMIN');
  });

  it('should map organization.id to organizationId when not present', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accessToken: 'tok',
        admin: { id: 1, role: 'BRANCH_ADMIN', organization: { id: 5 } },
      }),
    });

    const result = await branchAdminLogin('user', 'pass');

    expect(result.admin.organizationId).toBe(5);
  });

  it('should not overwrite existing organizationId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accessToken: 'tok',
        admin: { id: 1, role: 'BRANCH_ADMIN', organizationId: 99, organization: { id: 5 } },
      }),
    });

    const result = await branchAdminLogin('user', 'pass');

    // organizationId already present, should not be overwritten
    expect(result.admin.organizationId).toBe(99);
  });

  it('should throw error when role is not BRANCH_ADMIN', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accessToken: 'tok',
        admin: { id: 1, role: 'SUPER_ADMIN' },
      }),
    });

    await expect(branchAdminLogin('user', 'pass')).rejects.toThrow(
      '지사 관리자 계정이 아닙니다.'
    );
  });

  it('should throw error when admin.role is undefined', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        accessToken: 'tok',
        admin: { id: 1 },
      }),
    });

    await expect(branchAdminLogin('user', 'pass')).rejects.toThrow(
      '지사 관리자 계정이 아닙니다.'
    );
  });

  it('should throw error with server message on failed response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '비밀번호가 일치하지 않습니다.' }),
    });

    await expect(branchAdminLogin('user', 'wrong')).rejects.toThrow(
      '비밀번호가 일치하지 않습니다.'
    );
  });

  it('should throw default error when server provides no message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await expect(branchAdminLogin('user', 'wrong')).rejects.toThrow(
      '로그인에 실패했습니다.'
    );
  });

  it('should throw default error when json parsing fails on error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => { throw new Error('invalid json'); },
    });

    await expect(branchAdminLogin('user', 'wrong')).rejects.toThrow(
      '로그인에 실패했습니다.'
    );
  });

  it('should throw on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(branchAdminLogin('user', 'pass')).rejects.toThrow('Network error');
  });
});

// ===========================================================================
// branchApi (tested through exported functions)
// ===========================================================================
describe('branchApi - auth header and error handling', () => {
  it('should include Authorization header with access token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: { id: 1, name: 'Test Branch' } }),
    });

    await fetchMyBranchInfo();

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer test-token-123');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should not include Authorization header when no token', async () => {
    useBranchAuthStore.setState({
      accessToken: null,
      logout: mockLogout,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: { id: 1, name: 'Test' } }),
    });

    await fetchMyBranchInfo();

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('should call logout and throw on 401 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    await expect(fetchMyBranchInfo()).rejects.toThrow('인증이 만료되었습니다.');
    expect(mockLogout).toHaveBeenCalledOnce();
  });

  it('should throw server error message on non-401 failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: '서버 오류가 발생했습니다.' }),
    });

    await expect(fetchMyBranchInfo()).rejects.toThrow('서버 오류가 발생했습니다.');
  });

  it('should throw default error message when server provides none', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({}),
    });

    await expect(fetchMyBranchInfo()).rejects.toThrow('요청에 실패했습니다.');
  });

  it('should throw default error when json parsing fails on error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('invalid json'); },
    });

    await expect(fetchMyBranchInfo()).rejects.toThrow('요청에 실패했습니다.');
  });
});

// ===========================================================================
// fetchMyBranchInfo
// ===========================================================================
describe('fetchMyBranchInfo', () => {
  it('should fetch from /branch/me with GET method', async () => {
    const branchData = { id: 1, name: '서울지사', code: 'seoul' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: branchData }),
    });

    const result = await fetchMyBranchInfo();

    expect(mockFetch).toHaveBeenCalledWith('/branch/me', expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-token-123',
        'Content-Type': 'application/json',
      }),
    }));
    expect(result).toEqual({ ok: true, data: branchData });
  });
});

// ===========================================================================
// updateMyBranchInfo
// ===========================================================================
describe('updateMyBranchInfo', () => {
  it('should send PATCH with body to /branch/me', async () => {
    const updateBody = {
      ownerName: '김철수',
      email: 'test@example.com',
      phone: '010-1234-5678',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: { id: 1, ...updateBody } }),
    });

    const result = await updateMyBranchInfo(updateBody);

    expect(mockFetch).toHaveBeenCalledWith('/branch/me', expect.objectContaining({
      method: 'PATCH',
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-token-123',
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(updateBody),
    }));
    expect(result.ok).toBe(true);
  });

  it('should handle partial update with single field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: { id: 1, defaultSurcharge: 5000 } }),
    });

    const result = await updateMyBranchInfo({ defaultSurcharge: 5000 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ defaultSurcharge: 5000 });
    expect(result.ok).toBe(true);
  });

  it('should throw on server error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: '유효하지 않은 입력입니다.' }),
    });

    await expect(updateMyBranchInfo({ email: 'invalid' })).rejects.toThrow(
      '유효하지 않은 입력입니다.'
    );
  });
});

// ===========================================================================
// fetchConsultRequests
// ===========================================================================
describe('fetchConsultRequests', () => {
  const rawConsult = {
    id: 1,
    branch_id: 10,
    customer_name: '홍길동',
    customer_phone: '01012345678',
    product_code: 'P001',
    product_name: '장미 꽃다발',
    desired_date: '2026-04-01',
    delivery_purpose: '까지',
    delivery_time: '오전',
    recipient_name: '김영희',
    recipient_phone: '01087654321',
    address: '서울시 강남구',
    ribbon_text: '축하합니다',
    memo: '조심히 배달',
    invoice_type: 'NONE',
    cash_receipt_phone: null,
    ribbon_image_path: null,
    business_reg_path: null,
    message: '잘 부탁드립니다',
    status: 'NEW',
    created_at: '2026-03-27T10:00:00Z',
    updated_at: '2026-03-27T12:00:00Z',
  };

  it('should fetch consult requests without params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: [rawConsult], total: 1, page: 1, size: 20 }),
    });

    const result = await fetchConsultRequests();

    expect(mockFetch).toHaveBeenCalledWith('/branch/consults', expect.any(Object));
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('should append query params when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: [], total: 0, page: 2, size: 10 }),
    });

    await fetchConsultRequests({ status: 'NEW', page: 2, size: 10 });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('status=NEW');
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('size=10');
  });

  it('should not append params when they are undefined', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: [], total: 0, page: 1, size: 20 }),
    });

    await fetchConsultRequests({});

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toBe('/branch/consults');
  });

  it('should map snake_case response to camelCase ConsultRequest', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: [rawConsult], total: 1, page: 1, size: 20 }),
    });

    const result = await fetchConsultRequests();
    const consult = result.data[0];

    expect(consult.id).toBe(1);
    expect(consult.branchId).toBe(10);
    expect(consult.customerName).toBe('홍길동');
    expect(consult.customerPhone).toBe('01012345678');
    expect(consult.productCode).toBe('P001');
    expect(consult.productName).toBe('장미 꽃다발');
    expect(consult.desiredDate).toBe('2026-04-01');
    expect(consult.deliveryPurpose).toBe('까지');
    expect(consult.deliveryTime).toBe('오전');
    expect(consult.recipientName).toBe('김영희');
    expect(consult.recipientPhone).toBe('01087654321');
    expect(consult.address).toBe('서울시 강남구');
    expect(consult.ribbonText).toBe('축하합니다');
    expect(consult.memo).toBe('조심히 배달');
    expect(consult.invoiceType).toBe('NONE');
    expect(consult.message).toBe('잘 부탁드립니다');
    expect(consult.status).toBe('NEW');
    expect(consult.createdAt).toBe('2026-03-27T10:00:00Z');
    expect(consult.updatedAt).toBe('2026-03-27T12:00:00Z');
  });

  it('should handle camelCase response (already mapped by server)', async () => {
    const camelConsult = {
      id: 2,
      branchId: 10,
      customerName: '이순신',
      customerPhone: '01011112222',
      status: 'IN_PROGRESS',
      createdAt: '2026-03-27T10:00:00Z',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: [camelConsult], total: 1, page: 1, size: 20 }),
    });

    const result = await fetchConsultRequests();
    const consult = result.data[0];

    expect(consult.branchId).toBe(10);
    expect(consult.customerName).toBe('이순신');
  });

  it('should return empty data array when response data is undefined', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: undefined, total: 0, page: 1, size: 20 }),
    });

    const result = await fetchConsultRequests();

    expect(result.data).toEqual([]);
  });

  it('should default status to NEW when not provided', async () => {
    const rawNoStatus = { id: 3, customer_name: '테스트', created_at: '2026-01-01T00:00:00Z' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: [rawNoStatus], total: 1, page: 1, size: 20 }),
    });

    const result = await fetchConsultRequests();

    expect(result.data[0].status).toBe('NEW');
  });

  it('should default createdAt to empty string when not provided', async () => {
    const rawNoDate = { id: 4, customer_name: '테스트' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: [rawNoDate], total: 1, page: 1, size: 20 }),
    });

    const result = await fetchConsultRequests();

    expect(result.data[0].createdAt).toBe('');
  });
});

// ===========================================================================
// updateConsultRequestStatus
// ===========================================================================
describe('updateConsultRequestStatus', () => {
  it('should send PATCH with status body to correct endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: { id: 5, status: 'COMPLETED' } }),
    });

    const result = await updateConsultRequestStatus(5, 'COMPLETED');

    expect(mockFetch).toHaveBeenCalledWith('/branch/consults/5/status', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' }),
    }));
    expect(result.ok).toBe(true);
    expect(result.data.status).toBe('COMPLETED');
  });

  it('should throw on server error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: '유효하지 않은 상태입니다.' }),
    });

    await expect(updateConsultRequestStatus(5, 'INVALID')).rejects.toThrow(
      '유효하지 않은 상태입니다.'
    );
  });

  it('should call logout on 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    await expect(updateConsultRequestStatus(5, 'COMPLETED')).rejects.toThrow(
      '인증이 만료되었습니다.'
    );
    expect(mockLogout).toHaveBeenCalledOnce();
  });
});

// ===========================================================================
// fetchBranchProducts (admin - from branch-api.ts)
// ===========================================================================
describe('fetchBranchProducts (admin)', () => {
  it('should fetch products from /branch/products', async () => {
    const products = [
      { id: 1, name: '장미', sku: 'P001', basePrice: 50000, isVisible: true, sellingPrice: 55000, surcharge: 0 },
      { id: 2, name: '백합', sku: 'P002', basePrice: 40000, isVisible: false, sellingPrice: null, surcharge: 5000 },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: products }),
    });

    const result = await fetchBranchProductsAdmin();

    expect(mockFetch).toHaveBeenCalledWith('/branch/products', expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-token-123',
      }),
    }));
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe('장미');
  });

  it('should throw on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchBranchProductsAdmin()).rejects.toThrow('Network error');
  });
});

// ===========================================================================
// updateBranchProduct
// ===========================================================================
describe('updateBranchProduct', () => {
  it('should send PATCH to /branch/products/:id with body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const result = await updateBranchProduct(1, { isVisible: false, surcharge: 3000 });

    expect(mockFetch).toHaveBeenCalledWith('/branch/products/1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ isVisible: false, surcharge: 3000 }),
    }));
    expect(result.ok).toBe(true);
  });

  it('should handle sellingPrice as null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await updateBranchProduct(2, { sellingPrice: null });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.sellingPrice).toBeNull();
  });

  it('should throw on server error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: '상품을 찾을 수 없습니다.' }),
    });

    await expect(updateBranchProduct(999, { isVisible: true })).rejects.toThrow(
      '상품을 찾을 수 없습니다.'
    );
  });
});

// ===========================================================================
// bulkUpdateBranchSurcharge
// ===========================================================================
describe('bulkUpdateBranchSurcharge', () => {
  it('should send PATCH to /branch/products/bulk-surcharge', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, updated: 15 }),
    });

    const result = await bulkUpdateBranchSurcharge(5000);

    expect(mockFetch).toHaveBeenCalledWith(
      '/branch/products/bulk-surcharge',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ surcharge: 5000 }),
      })
    );
    expect(result.ok).toBe(true);
    expect(result.updated).toBe(15);
  });

  it('should handle zero surcharge', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, updated: 10 }),
    });

    await bulkUpdateBranchSurcharge(0);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.surcharge).toBe(0);
  });

  it('should throw on server error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: '서버 내부 오류' }),
    });

    await expect(bulkUpdateBranchSurcharge(5000)).rejects.toThrow('서버 내부 오류');
  });
});

// ===========================================================================
// fetchBranchSurcharges
// ===========================================================================
describe('fetchBranchSurcharges', () => {
  it('should fetch surcharges from /branch/surcharges', async () => {
    const surcharges = [
      { id: 1, surchargeType: 'DELIVERY', name: '배송비', amount: 3000 },
      { id: 2, surchargeType: 'HOLIDAY', name: '공휴일 추가금', amount: 5000 },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: surcharges }),
    });

    const result = await fetchBranchSurcharges();

    expect(mockFetch).toHaveBeenCalledWith('/branch/surcharges', expect.objectContaining({
      headers: expect.objectContaining({
        'Authorization': 'Bearer test-token-123',
      }),
    }));
    expect(result.ok).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].surchargeType).toBe('DELIVERY');
    expect(result.data[1].amount).toBe(5000);
  });

  it('should throw on server error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(fetchBranchSurcharges()).rejects.toThrow('요청에 실패했습니다.');
  });

  it('should throw on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchBranchSurcharges()).rejects.toThrow('Network error');
  });
});

// ===========================================================================
// 204 No Content handling
// ===========================================================================
describe('branchApi 204 No Content handling', () => {
  it('should return undefined for 204 responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => { throw new Error('No content'); },
    });

    // We use updateBranchProduct as a proxy to test 204 handling
    const result = await updateBranchProduct(1, { isVisible: true });

    expect(result).toBeUndefined();
  });
});
