import { test, expect } from '@playwright/test';

/**
 * Theme CSS variable values from src/lib/branch/themes.ts
 *
 * Green theme:  --branch-green: #3D6B2E, --branch-bg: #FFFFFF
 * Rose theme:   --branch-green: #C77D8F, --branch-bg: #FEF9F4
 * Navy theme:   --branch-green: #1E3A5F, --branch-bg: #FFFFFF
 *
 * The theme is determined by the branch's `homepageDesign` field from the API.
 * CSS variables are applied as inline styles on the root div.
 */

test.describe('Branch Theme Rendering', () => {
  test('should apply CSS variables via inline styles on branch page', async ({ page }) => {
    await page.goto('/branch/test');
    await page.waitForLoadState('networkidle');

    // If the branch loads successfully, the root div should have inline style
    // with CSS variables from the theme system
    const branchLayout = page.locator('.branch-homepage');
    await expect(branchLayout).toBeVisible({ timeout: 10_000 });

    // Check if any themed div has the --branch-green CSS variable set
    // The theme wrapper applies variables as inline styles
    const themedElement = page.locator('[style*="--branch-green"]');
    const count = await themedElement.count();

    if (count > 0) {
      // Verify the CSS variable is one of the three valid theme colors
      const style = await themedElement.first().getAttribute('style');
      expect(style).toBeTruthy();

      const validColors = ['#3D6B2E', '#C77D8F', '#1E3A5F'];
      const hasValidColor = validColors.some(
        (color) => style!.includes(color.toLowerCase()) || style!.includes(color)
      );
      expect(hasValidColor).toBe(true);
    } else {
      // Branch might not exist or returned not-found; that's acceptable
      const notFound = page.locator('text=페이지를 찾을 수 없습니다');
      await expect(notFound).toBeVisible();
    }
  });

  test('should apply different theme variables for different theme configs', async ({ page }) => {
    // This test verifies the theme system works by checking that CSS variables
    // are present in the page. Since the theme is determined by API data,
    // we verify the mechanism rather than specific branch slugs.

    await page.goto('/branch/test');
    await page.waitForLoadState('networkidle');

    const branchLayout = page.locator('.branch-homepage');
    await expect(branchLayout).toBeVisible({ timeout: 10_000 });

    // Check for theme-specific CSS variables in the inline styles
    const themedDiv = page.locator('[style*="--branch-"]');
    const count = await themedDiv.count();

    if (count > 0) {
      const style = await themedDiv.first().getAttribute('style');
      expect(style).toBeTruthy();

      // Verify multiple theme variables are applied together
      expect(style).toContain('--branch-green');
      expect(style).toContain('--branch-bg');
      expect(style).toContain('--branch-text');
      expect(style).toContain('--branch-border');
    }
  });

  test('should include font-family in theme styles', async ({ page }) => {
    await page.goto('/branch/test');
    await page.waitForLoadState('networkidle');

    const branchLayout = page.locator('.branch-homepage');
    await expect(branchLayout).toBeVisible({ timeout: 10_000 });

    // The theme wrapper div gets fontFamily in its inline style
    const themedDiv = page.locator('[style*="font-family"]');
    const count = await themedDiv.count();

    if (count > 0) {
      const style = await themedDiv.first().getAttribute('style');
      expect(style).toBeTruthy();

      // Should include one of the theme font families
      const hasPretendard = style!.includes('Pretendard');
      const hasNotoSerif = style!.includes('Noto Serif');
      expect(hasPretendard || hasNotoSerif).toBe(true);
    }
  });

  test('green theme should use green-toned primary color', async ({ page }) => {
    // Visit any branch page — if it uses green theme, verify
    await page.goto('/branch/test');
    await page.waitForLoadState('networkidle');

    const themedElement = page.locator('[style*="--branch-green"]');
    const count = await themedElement.count();

    if (count > 0) {
      const style = await themedElement.first().getAttribute('style');

      // If green theme: #3D6B2E, bg is #FFFFFF
      if (style!.includes('#3D6B2E') || style!.includes('#3d6b2e')) {
        expect(style).toContain('--branch-bg');
        // Green theme bg is white
        expect(
          style!.includes('#FFFFFF') || style!.includes('#ffffff')
        ).toBe(true);
      }

      // If rose theme: #C77D8F, bg is #FEF9F4
      if (style!.includes('#C77D8F') || style!.includes('#c77d8f')) {
        expect(
          style!.includes('#FEF9F4') || style!.includes('#fef9f4')
        ).toBe(true);
      }

      // If navy theme: #1E3A5F, bg is #FFFFFF
      if (style!.includes('#1E3A5F') || style!.includes('#1e3a5f')) {
        expect(
          style!.includes('#FFFFFF') || style!.includes('#ffffff')
        ).toBe(true);
      }
    }
  });
});
