import { type Page } from '@playwright/test';

/** 실제 로그인 폼을 통한 관리자 인증 */
export async function adminLogin(page: Page, username = 'admin', password = 'admin1234') {
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');

  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();

  // 로그인 성공 후 /admin/florists로 리다이렉트 대기
  await page.waitForURL('**/admin/florists', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
}
