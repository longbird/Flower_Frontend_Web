---
name: playwright
description: Use Playwright for browser automation, E2E testing, screenshots, PDF generation, and web scraping. Activate when tasks involve browser interaction, page testing, visual capture, or external site automation.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# Playwright Skill

This project has Playwright installed (`playwright` + `@playwright/test` in devDependencies).
Browsers (Chromium, Firefox, WebKit) are installed at `~/.cache/ms-playwright/`.

## 1. E2E Testing

### Config

Create or use `playwright.config.ts` at project root:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
```

### Writing Tests

Place E2E tests in `e2e/` directory with `.spec.ts` extension:

```ts
import { test, expect } from '@playwright/test';

test('page title', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await expect(page).toHaveTitle(/dashboard/i);
});

test('login flow', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin1234');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/dashboard/);
});
```

### Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run a specific test file
npx playwright test e2e/login.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run with UI mode
npx playwright test --ui

# Show HTML report
npx playwright show-report
```

## 2. Screenshots & PDF Capture

### Standalone Script Pattern

For one-off screenshots or PDF generation, use a standalone script (NOT @playwright/test):

```ts
// scripts/screenshot.ts
import { chromium } from 'playwright';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  await page.goto('http://localhost:3000/admin/dashboard');
  await page.waitForLoadState('networkidle');

  // Screenshot
  await page.screenshot({
    path: 'output/dashboard.png',
    fullPage: true,
  });

  // PDF (Chromium only)
  await page.pdf({
    path: 'output/dashboard.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
  });

  await browser.close();
}

capture();
```

Run with: `npx tsx scripts/screenshot.ts`

### Capturing HTML files

```ts
import { chromium } from 'playwright';

async function captureHtml(htmlPath: string, outputPath: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`file://${htmlPath}`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: outputPath, fullPage: true });
  await browser.close();
}
```

## 3. Web Scraping & External Site Automation

### Session-based automation (login required sites)

```ts
import { chromium, type BrowserContext } from 'playwright';

async function automateExternalSite() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  await page.goto('https://example.com/login');
  await page.fill('#username', 'user');
  await page.fill('#password', 'pass');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();

  // Extract data
  const data = await page.evaluate(() => {
    return document.querySelector('.content')?.textContent;
  });

  // Fill and submit forms
  await page.goto('https://example.com/form');
  await page.fill('#field1', 'value1');
  await page.selectOption('#dropdown', 'option1');
  await page.click('#submit');

  // Wait for response
  const response = await page.waitForResponse(
    resp => resp.url().includes('/api/submit')
  );
  const result = await response.json();

  await browser.close();
  return result;
}
```

### Handling different encodings (e.g., EUC-KR)

For sites like ebestflower.co.kr that use EUC-KR:

```ts
// Playwright handles encoding automatically in the browser context
// No manual iconv needed — the browser renders correctly
await page.goto('http://ebestflower.co.kr/some-page', {
  waitUntil: 'domcontentloaded',
});
// page.content() returns UTF-8 regardless of page encoding
const html = await page.content();
```

### Intercepting network requests

```ts
await page.route('**/api/**', route => {
  console.log('Request:', route.request().url());
  route.continue();
});

// Wait for specific API response
const [response] = await Promise.all([
  page.waitForResponse('**/api/orders'),
  page.click('#submit-order'),
]);
```

## 4. Key Patterns for This Project

### Korean text handling
- This project uses Korean UI (font-size: 19px base)
- Use `page.getByText('한국어 텍스트')` for locating elements
- Use `page.getByRole('button', { name: '등록' })` for accessible selectors

### Authentication in tests
- Admin login: POST `/admin/auth/login` with `{"username":"admin","password":"admin1234"}`
- Store auth state with `storageState` for reuse across tests:

```ts
// Save auth state
await page.context().storageState({ path: 'e2e/.auth/admin.json' });

// Reuse in config
use: { storageState: 'e2e/.auth/admin.json' }
```

### Dev server URLs
- Local dev: `http://localhost:3000`
- Dev deployment: `http://49.247.46.86:3030`
- Production: `https://seoulflower.co.kr`

## 5. Common Commands Reference

```bash
# Run all tests
npx playwright test

# Run specific test
npx playwright test e2e/orders.spec.ts

# Debug mode (step through)
npx playwright test --debug

# Generate test code by recording
npx playwright codegen http://localhost:3000

# Screenshot via CLI
npx playwright screenshot http://localhost:3000 output.png

# PDF via CLI
npx playwright pdf http://localhost:3000 output.pdf

# Run standalone script
npx tsx scripts/my-script.ts

# List installed browsers
npx playwright install --dry-run
```

## 6. File Organization

```
e2e/                          # E2E test files
  *.spec.ts                   # Test specs
  .auth/                      # Saved auth states (gitignored)
scripts/                      # Standalone automation scripts
  screenshot.ts
  scrape.ts
playwright.config.ts          # Test configuration
```

## Important Notes

- Always use `headless: true` on this server (no display available)
- For long-running automations, consider timeouts: `page.setDefaultTimeout(60000)`
- Screenshots go to `public/downloads/` if they need to be served via the app
- Use `page.waitForLoadState('networkidle')` before capturing screenshots
- This server is Linux (Ubuntu) — all three browsers are installed
