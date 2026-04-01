import { test, expect } from '@playwright/test';

test.describe('Branch Consult (Order Form)', () => {
  const BRANCH_SLUG = 'main';

  test('should show product selection prompt without productId', async ({ page }) => {
    await page.goto(`/branch/${BRANCH_SLUG}/consult`);
    await page.waitForLoadState('networkidle');

    // productId 없이 접근하면 상품 선택 안내
    await expect(page.locator('text=상품을 선택해 주세요')).toBeVisible({ timeout: 10_000 });
  });

  test('should load consult form with productId', async ({ page }) => {
    // 추천 상품 API로 상품 ID 조회
    const res = await page.request.get(
      `http://49.247.46.86:3030/api/proxy/public/branch/${BRANCH_SLUG}/recommended-products`,
    );
    const data = await res.json();
    const products = data.data || data;

    if (!Array.isArray(products) || products.length === 0) {
      test.skip();
      return;
    }

    const productId = products[0].id;
    await page.goto(`/branch/${BRANCH_SLUG}/consult?productId=${productId}`);
    await page.waitForLoadState('networkidle');

    // 폼이 로드되면 브랜치 이름이 표시됨
    const branchContent = page.locator('.branch-homepage');
    await expect(branchContent).toBeVisible({ timeout: 10_000 });

    // 입력 필드가 존재
    const inputs = page.locator('input');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(3);
  });

  test('should have address search and delivery date options', async ({ page }) => {
    const res = await page.request.get(
      `http://49.247.46.86:3030/api/proxy/public/branch/${BRANCH_SLUG}/recommended-products`,
    );
    const data = await res.json();
    const products = data.data || data;

    if (!Array.isArray(products) || products.length === 0) {
      test.skip();
      return;
    }

    await page.goto(`/branch/${BRANCH_SLUG}/consult?productId=${products[0].id}`);
    await page.waitForLoadState('networkidle');

    // 주소 검색 버튼
    const addressBtn = page.locator('button:has-text("주소")');
    await expect(addressBtn.first()).toBeVisible({ timeout: 10_000 });

    // 배송일 관련 UI
    const dateUI = page.locator('text=오늘, text=내일, text=배송');
    await expect(dateUI.first()).toBeVisible({ timeout: 5_000 });
  });
});
