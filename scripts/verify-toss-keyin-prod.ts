import { chromium } from 'playwright';
import * as fs from 'fs';

const PROD = 'https://seoulflower.co.kr';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
  const page = await ctx.newPage();

  const apiCalls: string[] = [];
  page.on('request', (r) => {
    const u = r.url();
    if (u.includes('/api/payments/key-in') || u.includes('tosspayments')) {
      apiCalls.push(`${r.method()} ${u}`);
    }
  });

  console.log('1) admin/login 진입');
  await page.goto(`${PROD}/admin/login`);
  await page.waitForLoadState('networkidle').catch(() => null);

  await page.fill('input[placeholder="Enter your ID"]', 'admin');
  await page.fill('input[type="password"]', 'admin1234');
  await Promise.all([
    page.waitForURL(/\/admin\/(?!login)/, { timeout: 15000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1500);
  console.log('   현재 URL:', page.url());

  console.log('2) /admin/payments/key-in 진입');
  await page.goto(`${PROD}/admin/payments/key-in`);
  await page.waitForLoadState('networkidle').catch(() => null);
  await page.waitForTimeout(1000);

  // 페이지 인디케이터 확인
  const title = await page.locator('h1').first().textContent().catch(() => null);
  const tossBadge = await page.locator('text=토스 카드 결제').count();
  const tabExisting = await page.locator('text=기존 주문 연결').count();
  const tabNew = await page.locator('text=신규 전화주문').count();
  console.log('   h1:', title);
  console.log('   "토스 카드 결제" 배지:', tossBadge ? '있음' : '없음');
  console.log('   탭 (기존 주문 / 신규 전화주문):', tabExisting, '/', tabNew);

  // 신규 전화주문 탭 클릭 → 카드 입력 폼 노출 확인
  if (tabNew) {
    await page.locator('button:has-text("신규 전화주문")').click();
    await page.waitForTimeout(400);
  }

  const cardInput = await page.locator('input#cardNumber').count();
  const expMonth = await page.locator('input#cardExpirationMonth').count();
  const expYear = await page.locator('input#cardExpirationYear').count();
  const idNum = await page.locator('input#customerIdentityNumber').count();
  const submitBtn = await page.locator('button[type="submit"]').count();
  console.log('   카드 입력 필드 (number/month/year/idNumber/submit):', cardInput, expMonth, expYear, idNum, submitBtn);

  // 스크린샷
  fs.mkdirSync('/tmp/screenshots', { recursive: true });
  await page.screenshot({ path: '/tmp/screenshots/prod-keyin.png', fullPage: true });
  console.log('   screenshot → /tmp/screenshots/prod-keyin.png');

  // 실제 라우트 도달성 — 의도적 invalid 카드로 401/검증 응답 확인 (Toss 비용 발생 없음)
  console.log('3) /api/payments/key-in 라우트 도달성 — 일부러 잘못된 카드로 호출');
  await page.fill('input[placeholder="고객명을 입력하세요"]', '연동확인');
  await page.fill('input[placeholder="상품명을 입력하세요"]', '연동확인');
  await page.fill('input[type="number"]', '1000');
  await page.locator('input#cardNumber').fill('5260450000000001'); // Toss 테스트 카드
  await page.locator('input#cardExpirationMonth').fill('12');
  await page.locator('input#cardExpirationYear').fill('29');
  await page.locator('input#customerIdentityNumber').fill('900101');

  const respPromise = page.waitForResponse(r => r.url().includes('/api/payments/key-in'), { timeout: 20000 }).catch(() => null);
  await page.locator('button:has-text("결제하기")').last().click();
  const resp = await respPromise;
  if (resp) {
    const status = resp.status();
    const body = await resp.text().catch(() => '');
    console.log('   응답 상태:', status);
    console.log('   응답 본문 (앞 400자):', body.slice(0, 400));
  } else {
    console.log('   key-in API 응답 캡처 실패');
  }

  console.log('4) 캡처된 호출 흐름:');
  apiCalls.forEach(c => console.log('  ', c));

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
