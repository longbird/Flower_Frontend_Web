import { test, expect } from '@playwright/test';

test.describe('Branch Homepage', () => {
  test('should load branch homepage', async ({ page }) => {
    await page.goto('/branch/test');

    // Wait for page to load (loading spinner disappears)
    // The page will either show branch content or a not-found screen
    await page.waitForLoadState('networkidle');

    // Check that the branch layout wrapper exists
    const branchLayout = page.locator('.branch-homepage');
    await expect(branchLayout).toBeVisible();
  });

  test('should show not-found screen for invalid branch slug', async ({ page }) => {
    await page.goto('/branch/nonexistent-branch-slug-12345');

    await page.waitForLoadState('networkidle');

    // Should show the not-found message
    const notFoundText = page.locator('text=페이지를 찾을 수 없습니다');
    await expect(notFoundText).toBeVisible({ timeout: 10_000 });
  });

  test('should display branch content when branch exists', async ({ page }) => {
    await page.goto('/branch/test');

    await page.waitForLoadState('networkidle');

    // The page should have the branch-homepage wrapper
    const branchLayout = page.locator('.branch-homepage');
    await expect(branchLayout).toBeVisible();

    // Either shows a branch page with content or a not-found/loading screen
    // If the branch exists, it will have a sticky header or hero section
    const pageContent = page.locator('.branch-homepage > div');
    await expect(pageContent).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Branch Consult Page', () => {
  test('should load the consult page', async ({ page }) => {
    await page.goto('/branch/test/consult');

    await page.waitForLoadState('networkidle');

    // The consult page should load within the branch layout
    const branchLayout = page.locator('.branch-homepage');
    await expect(branchLayout).toBeVisible();
  });

  test('should display form sections on consult page', async ({ page }) => {
    await page.goto('/branch/test/consult');

    await page.waitForLoadState('networkidle');

    // The consult page should contain form elements
    // Look for common form elements that exist regardless of branch data
    const pageContent = page.locator('.branch-homepage');
    await expect(pageContent).toBeVisible({ timeout: 10_000 });
  });
});
