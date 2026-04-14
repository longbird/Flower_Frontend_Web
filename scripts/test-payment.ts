import { chromium } from 'playwright';

async function testPayment() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Capture all console messages
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    if (msg.type() === 'error' || msg.text().toLowerCase().includes('error')) {
      console.log(`BROWSER: ${text}`);
    }
  });
  page.on('pageerror', err => {
    console.log(`PAGE ERROR: ${err.message}`);
    consoleLogs.push(`[pageerror] ${err.message}`);
  });

  try {
    // 1. Load branch homepage
    console.log('1. Loading branch homepage...');
    await page.goto('https://www.seoulflower.co.kr/branch/dallyeora', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/pay-1-home.png' });
    console.log('   Homepage loaded');

    // 2. Click first product (try multiple selectors)
    console.log('2. Clicking first product...');
    const selectors = [
      '[role="button"]',
      '.cursor-pointer img',
      'img[alt]',
      'div.cursor-pointer',
    ];
    let clicked = false;
    for (const sel of selectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) {
        await el.click({ force: true, timeout: 5000 });
        clicked = true;
        console.log(`   Clicked via: ${sel}`);
        break;
      }
    }
    if (!clicked) {
      // Try clicking product grid area directly
      const imgs = page.locator('img');
      const imgCount = await imgs.count();
      console.log(`   Found ${imgCount} images, clicking 3rd...`);
      if (imgCount > 2) {
        await imgs.nth(2).click({ force: true });
        clicked = true;
      }
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'screenshots/pay-2-product-modal.png' });
    if (!clicked) {
      console.log('   No product cards found');
      await browser.close();
      return;
    }

    // 3. Click order button in modal
    console.log('3. Clicking order button...');
    const orderBtn = page.locator('button:has-text("주문하기")');
    if (await orderBtn.isVisible()) {
      await orderBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/pay-3-consult.png' });
      console.log('   Consult page loaded: ' + page.url());
    }

    // 4. Fill consult form minimally
    console.log('4. Filling form...');
    // Sender name
    const nameInputs = page.locator('input[type="text"]');
    const firstInput = nameInputs.first();
    if (await firstInput.isVisible()) {
      await firstInput.fill('테스트');
    }
    // Sender phone
    const phoneInputs = page.locator('input[type="tel"]');
    if (await phoneInputs.first().isVisible()) {
      await phoneInputs.first().fill('010-1234-5678');
    }

    // Recipient name - find in 받는분 section
    const allInputs = page.locator('input');
    const inputCount = await allInputs.count();
    console.log(`   Found ${inputCount} inputs`);

    // Fill recipient fields
    for (let i = 0; i < inputCount; i++) {
      const input = allInputs.nth(i);
      const placeholder = await input.getAttribute('placeholder');
      const type = await input.getAttribute('type');
      if (placeholder?.includes('이름') && i > 0) {
        await input.fill('받는분');
      }
      if (placeholder?.includes('연락처') && type === 'tel' && i > 1) {
        await input.fill('010-9876-5432');
      }
    }

    // Click address search - skip for now, just check if form has enough data
    await page.screenshot({ path: 'screenshots/pay-4-form-filled.png' });

    // 5. Check if payment button exists (결제하기)
    const payBtn = page.locator('button:has-text("결제하기")').first();
    const submitBtn = page.locator('button:has-text("주문 요청")').first();
    console.log(`   결제하기 button visible: ${await payBtn.isVisible().catch(() => false)}`);
    console.log(`   주문 요청 button visible: ${await submitBtn.isVisible().catch(() => false)}`);

    // 6. Scroll to bottom to see the submit button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/pay-5-bottom.png' });

    // Check privacy consent
    const checkbox = page.locator('input[type="checkbox"]');
    if (await checkbox.isVisible()) {
      await checkbox.check();
      console.log('   Privacy consent checked');
    }

    await page.screenshot({ path: 'screenshots/pay-6-ready.png' });

    // Try clicking 결제하기 (use first match - sticky footer button)
    const finalPayBtn = page.locator('button:has-text("결제하기")').first();
    if (await finalPayBtn.isVisible().catch(() => false)) {
      console.log('5. Clicking 결제하기...');
      await finalPayBtn.click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'screenshots/pay-7-payment-page.png' });
      console.log('   Current URL: ' + page.url());

      // Check for errors on payment page
      const bodyText = await page.textContent('body');
      if (bodyText?.includes('오류') || bodyText?.includes('error') || bodyText?.includes('Error')) {
        console.log('   ERROR on payment page!');
        const errorText = bodyText?.match(/결제.*오류[^.]*|error[^.]*|Error[^.]*/gi);
        if (errorText) console.log('   Error text: ' + errorText.join(', '));
      }

      // Wait for widget to load
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'screenshots/pay-8-widget-loaded.png' });
      console.log('   Widget area check...');

      // Check widget rendered
      const widgetDiv = page.locator('#payment-methods');
      const widgetHTML = await widgetDiv.innerHTML().catch(() => 'NOT_FOUND');
      console.log(`   Widget HTML length: ${widgetHTML.length}`);

      // Try clicking payment button on payment page
      const payNowBtn = page.locator('button:has-text("결제하기")').last();
      if (await payNowBtn.isVisible().catch(() => false)) {
        console.log('6. Clicking final 결제하기...');
        await payNowBtn.click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'screenshots/pay-9-after-pay.png' });
        console.log('   URL after pay: ' + page.url());
        const errorOnPage = await page.textContent('body');
        if (errorOnPage?.includes('Internal server error') || errorOnPage?.includes('오류')) {
          console.log('   !!! ERROR DETECTED !!!');
          console.log('   Page text: ' + errorOnPage?.substring(0, 300));
        }
      }
    }

    // Print all console logs
    console.log('\n=== All Browser Console Logs ===');
    for (const log of consoleLogs) {
      console.log(log);
    }

  } catch (err) {
    console.error('Test error:', err);
    await page.screenshot({ path: 'screenshots/pay-error.png' });
  }

  await browser.close();
}

testPayment().catch(console.error);
