const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 800 } });
  await page.goto('file:///home/blueadm/frontend_web/public/downloads/order-register-mockup.html');
  await page.waitForLoadState('networkidle');

  // Full page screenshot
  await page.screenshot({
    path: '/home/blueadm/frontend_web/public/downloads/order-register-design.png',
    fullPage: true,
  });

  console.log('Screenshot saved!');
  await browser.close();
})();
