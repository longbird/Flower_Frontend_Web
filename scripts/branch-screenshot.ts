import { chromium } from 'playwright';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const url = 'http://49.247.46.86:3030/branch/main';

  // Desktop full page
  const desktopPage = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await desktopPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await desktopPage.waitForTimeout(2000); // wait for animations
  await desktopPage.screenshot({
    path: 'screenshots/branch-desktop-full.png',
    fullPage: true,
  });

  // Desktop hero area only
  await desktopPage.screenshot({
    path: 'screenshots/branch-desktop-hero.png',
    fullPage: false,
  });
  await desktopPage.close();

  // Mobile full page
  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await mobilePage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({
    path: 'screenshots/branch-mobile-full.png',
    fullPage: true,
  });
  await mobilePage.screenshot({
    path: 'screenshots/branch-mobile-hero.png',
    fullPage: false,
  });
  await mobilePage.close();

  await browser.close();
  console.log('Screenshots saved to screenshots/');
}

capture().catch(console.error);
