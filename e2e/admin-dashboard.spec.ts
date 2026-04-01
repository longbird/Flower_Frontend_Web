import { test, expect } from '@playwright/test';
import { adminLogin } from './helpers/auth';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('should load dashboard after login', async ({ page }) => {
    await page.goto('/admin');
    // 대시보드 h1 또는 sidebar 텍스트
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible({ timeout: 15_000 });
  });

  test('should display florist status section', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('화원 현황')).toBeVisible({ timeout: 15_000 });
  });

  test('should display florist cards with capability badges', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('화원 현황')).toBeVisible({ timeout: 15_000 });

    // 역량 Badge (outline variant, text-[11px])
    const capBadges = page.locator('.flex.flex-wrap.gap-1 span');
    const count = await capBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to monitoring page', async ({ page }) => {
    await page.goto('/admin/monitoring');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: '모니터링' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('CPU')).toBeVisible({ timeout: 15_000 });
  });
});
