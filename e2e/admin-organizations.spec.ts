import { test, expect } from '@playwright/test';

const API_BASE = 'http://49.247.46.86:3030/api/proxy';

test.describe('Admin Organizations API (H1 검증)', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_BASE}/admin/auth/login`, {
      data: { username: 'admin', password: 'admin1234' },
    });
    const data = await res.json();
    token = data.accessToken;
  });

  test('should return homepageDesign and enableOnlinePayment for branches', async ({ request }) => {
    const res = await request.get(`${API_BASE}/admin/organizations?type=BRANCH`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const orgs = await res.json();

    expect(Array.isArray(orgs)).toBe(true);
    expect(orgs.length).toBeGreaterThan(0);

    const branch = orgs[0];
    expect(branch).toHaveProperty('homepageDesign');
    expect(branch).toHaveProperty('enableOnlinePayment');
    expect(typeof branch.homepageDesign).toBe('string');
    expect(typeof branch.enableOnlinePayment).toBe('boolean');
  });

  test('should support updating homepageDesign', async ({ request }) => {
    const headers = { Authorization: `Bearer ${token}` };

    // 현재 값 조회
    const res = await request.get(`${API_BASE}/admin/organizations?type=BRANCH`, { headers });
    const orgs = await res.json();
    const branch = orgs[0];
    const original = branch.homepageDesign;

    // 변경
    const testVal = original === 'green' ? 'navy' : 'green';
    const updateRes = await request.put(`${API_BASE}/admin/organizations/${branch.id}`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: { homepageDesign: testVal },
    });
    const updated = await updateRes.json();
    expect(updated.homepageDesign).toBe(testVal);

    // 원복
    await request.put(`${API_BASE}/admin/organizations/${branch.id}`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: { homepageDesign: original },
    });
  });

  test('should support updating enableOnlinePayment', async ({ request }) => {
    const headers = { Authorization: `Bearer ${token}` };

    const res = await request.get(`${API_BASE}/admin/organizations?type=BRANCH`, { headers });
    const orgs = await res.json();
    const branch = orgs[0];
    const original = branch.enableOnlinePayment;

    // 토글
    const updateRes = await request.put(`${API_BASE}/admin/organizations/${branch.id}`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: { enableOnlinePayment: !original },
    });
    const updated = await updateRes.json();
    expect(updated.enableOnlinePayment).toBe(!original);

    // 원복
    await request.put(`${API_BASE}/admin/organizations/${branch.id}`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: { enableOnlinePayment: original },
    });
  });
});
