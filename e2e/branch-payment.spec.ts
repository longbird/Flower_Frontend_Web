import { test, expect } from '@playwright/test';

test.describe('Branch Payment Flow', () => {
  const BRANCH_SLUG = 'main';

  test('should load payment page', async ({ page }) => {
    await page.goto(`/branch/${BRANCH_SLUG}/payment`);
    await page.waitForLoadState('networkidle');

    const content = page.locator('.branch-homepage');
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test('should render payment fail page with cancel message', async ({ page }) => {
    await page.goto(`/branch/${BRANCH_SLUG}/payment/fail?code=PAY_PROCESS_CANCELED&message=사용자가 결제를 취소했습니다`);
    await page.waitForLoadState('networkidle');

    // 기본 메시지: "결제가 취소되었습니다"
    await expect(page.locator('text=취소')).toBeVisible({ timeout: 10_000 });
  });

  test('should show error on success page without payment params', async ({ page }) => {
    await page.goto(`/branch/${BRANCH_SLUG}/payment/success`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=결제 정보가 올바르지 않습니다')).toBeVisible({ timeout: 10_000 });
  });

  test('should show error on success page without order data', async ({ page }) => {
    await page.goto(`/branch/${BRANCH_SLUG}/payment/success?paymentKey=test&orderId=test&amount=1000`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=주문 정보를 찾을 수 없습니다')).toBeVisible({ timeout: 15_000 });
  });

  test('P1: sessionStorage should preserve order data across navigation', async ({ page }) => {
    await page.goto(`/branch/${BRANCH_SLUG}`);
    await page.waitForLoadState('domcontentloaded');

    // sessionStorage에 persist 형식으로 결제 데이터 설정
    await page.evaluate(() => {
      const mockData = {
        state: {
          orderData: {
            slug: 'test',
            customerName: '테스트고객',
            customerPhone: '01012345678',
            productId: 1,
            productName: '테스트 상품',
            productPrice: 50000,
            desiredDate: '2026-04-02',
            deliveryPurpose: '축하',
            deliveryTime: '10:00',
            recipientName: '받는분',
            recipientPhone: '01087654321',
            address: '서울시 강남구',
            ribbonText: '축하합니다',
            memo: '',
            invoiceType: 'NONE',
            cashReceiptPhone: '',
            message: '[주문자] 테스트고객 / 01012345678',
          },
          ribbonImage: null,
          businessRegFile: null,
        },
        version: 0,
      };
      sessionStorage.setItem('payment-order-data', JSON.stringify(mockData));
    });

    // 다른 페이지로 이동
    await page.goto(`/branch/${BRANCH_SLUG}/consult`);
    await page.waitForLoadState('domcontentloaded');

    // sessionStorage 데이터 유지 확인
    const preserved = await page.evaluate(() => {
      const stored = sessionStorage.getItem('payment-order-data');
      if (!stored) return null;
      return JSON.parse(stored).state?.orderData?.customerName;
    });

    expect(preserved).toBe('테스트고객');
  });
});
