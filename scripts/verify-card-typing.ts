import { chromium } from 'playwright';

const TEST_BASE = 'http://49.247.46.86:3030';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
  const page = await ctx.newPage();

  await page.goto(`${TEST_BASE}/admin/login`);
  await page.fill('input[placeholder="Enter your ID"]', 'admin');
  await page.fill('input[type="password"]', 'admin1234');
  await Promise.all([
    page.waitForURL(/\/admin\/(?!login)/, { timeout: 15000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(800);
  await page.goto(`${TEST_BASE}/admin/payments/key-in`);
  await page.waitForLoadState('networkidle').catch(() => null);
  await page.locator('button:has-text("신규 전화주문")').click();
  await page.waitForTimeout(300);

  // 16자리 마스터카드 시뮬: 5523 8679 4380 8906
  // press() 로 한 글자씩 타이핑 (실제 키보드 입력 시뮬)
  await page.locator('input#cardNumber').click();
  for (const ch of '5523867943808906') {
    await page.keyboard.press(ch);
    await page.waitForTimeout(20);
  }
  // 점프 후 month input 에 들어가는지 확인하기 위해 한 번 더 타이핑
  await page.keyboard.press('1');
  await page.keyboard.press('2');

  const cardVal = await page.locator('input#cardNumber').inputValue();
  const monthVal = await page.locator('input#cardExpirationMonth').inputValue();
  console.log('=== 16자리 마스터카드 타이핑 결과 ===');
  console.log('cardNumber input:', JSON.stringify(cardVal), '(raw digits:', cardVal.replace(/\D/g, '').length + ')');
  console.log('expMonth input:  ', JSON.stringify(monthVal));
  console.log(cardVal.replace(/\D/g, '') === '5523867943808906' && monthVal === '12'
    ? 'PASS — 16자리 모두 들어가고 점프 후 month 가 12'
    : 'FAIL — 위 값 비교');

  // 두 번째 케이스: Amex 15자리 시뮬 (37로 시작)
  await page.locator('input#cardNumber').click();
  await page.locator('input#cardNumber').fill('');
  await page.locator('input#cardExpirationMonth').fill('');
  for (const ch of '378282246310005') {
    await page.keyboard.press(ch);
    await page.waitForTimeout(20);
  }
  await page.keyboard.press('0');
  await page.keyboard.press('5');

  const cardVal2 = await page.locator('input#cardNumber').inputValue();
  const monthVal2 = await page.locator('input#cardExpirationMonth').inputValue();
  console.log('=== Amex 15자리 타이핑 결과 ===');
  console.log('cardNumber input:', JSON.stringify(cardVal2), '(raw digits:', cardVal2.replace(/\D/g, '').length + ')');
  console.log('expMonth input:  ', JSON.stringify(monthVal2));
  console.log(cardVal2.replace(/\D/g, '') === '378282246310005' && monthVal2 === '05'
    ? 'PASS — Amex 15자리 모두 들어가고 점프 후 month 가 05'
    : 'FAIL');

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
