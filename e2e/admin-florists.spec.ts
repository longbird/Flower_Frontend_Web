import { test, expect } from '@playwright/test';
import { adminLogin } from './helpers/auth';

test.describe('Admin Florists', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('should load florists list page', async ({ page }) => {
    // adminLogin 후 이미 /admin/florists에 있음
    await expect(page.getByRole('heading', { name: '화원 관리' })).toBeVisible({ timeout: 15_000 });
  });

  test('should display florist data', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '화원 관리' })).toBeVisible({ timeout: 15_000 });

    // 화원 데이터 로드 대기 — 화원 목록 카드 또는 이미지
    const floristCard = page.locator('[data-slot="card"]').first();
    await expect(floristCard).toBeVisible({ timeout: 15_000 });
  });

  test('should have input fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '화원 관리' })).toBeVisible({ timeout: 15_000 });

    const inputs = page.locator('input');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });
});
