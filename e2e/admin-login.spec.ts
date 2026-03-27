import { test, expect } from '@playwright/test';

test.describe('Admin Login Page', () => {
  test('should load the login page with correct title', async ({ page }) => {
    await page.goto('/admin/login');

    // Verify page loads with the admin title text
    await expect(page.locator('h1')).toHaveText('달려라 꽃배달 관리자');
  });

  test('should display login form elements', async ({ page }) => {
    await page.goto('/admin/login');

    // Verify username input exists
    const usernameInput = page.locator('#username');
    await expect(usernameInput).toBeVisible();
    await expect(usernameInput).toHaveAttribute('placeholder', 'Enter your ID');

    // Verify password input exists
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Verify login button exists
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toHaveText('로그인');
  });

  test('should show error message when submitting empty form', async ({ page }) => {
    await page.goto('/admin/login');

    // Click login button without entering credentials
    await page.locator('button[type="submit"]').click();

    // Verify error message appears
    const errorMessage = page.locator('text=아이디와 비밀번호를 입력해주세요.');
    await expect(errorMessage).toBeVisible();
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    await page.goto('/admin/login');

    // Enter invalid credentials
    await page.locator('#username').fill('invalid_user');
    await page.locator('#password').fill('wrong_password');

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Button should show loading state briefly
    await expect(page.locator('button[type="submit"]')).toContainText('로그인 중...');

    // Wait for error message to appear (API returns error)
    const errorContainer = page.locator('.text-red-700');
    await expect(errorContainer).toBeVisible({ timeout: 10_000 });
  });

  test('should display subtitle text', async ({ page }) => {
    await page.goto('/admin/login');

    await expect(page.locator('text=관리자 대시보드에 로그인하세요')).toBeVisible();
  });

  test('should display form labels in Korean', async ({ page }) => {
    await page.goto('/admin/login');

    await expect(page.locator('text=아이디 (ID)')).toBeVisible();
    await expect(page.locator('text=비밀번호 (PASSWORD)')).toBeVisible();
  });
});
