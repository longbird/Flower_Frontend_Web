import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.resolve(__dirname, '../docs/innopay-guide-raw');
const BASE_URL = 'https://web.innopay.co.kr/guide/';
const TARGET_URL = 'https://web.innopay.co.kr/guide/vbank_api/';

async function extractPage(page: any, url: string, slug: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle').catch(() => {});

  const title = await page.title();
  await fs.writeFile(path.join(OUTPUT_DIR, `${slug}.html`), await page.content(), 'utf8');
  await page
    .screenshot({ path: path.join(OUTPUT_DIR, `${slug}.png`), fullPage: true })
    .catch(() => {});

  // Extract main article body text. WordPress Salient theme uses .main-content > article
  const text = await page.evaluate(() => {
    const article = document.querySelector('article, .main-content, #ajax-content-wrap, .container-wrap');
    const root = article ?? document.body;
    // Remove obviously irrelevant blocks
    root.querySelectorAll('script, style, nav, header, footer, .nectar-megamenu, .search-box').forEach((n) => n.remove());
    return (root as HTMLElement).innerText.replace(/\n{3,}/g, '\n\n').trim();
  });
  await fs.writeFile(path.join(OUTPUT_DIR, `${slug}.txt`), text, 'utf8');

  // Extract code blocks separately (better fidelity)
  const codes = await page.evaluate(() => {
    const out: { lang: string | null; text: string }[] = [];
    document.querySelectorAll('pre, code, .wp-block-kevinbatdorf-code-block-pro').forEach((el) => {
      const lang = el.getAttribute('data-language') ?? el.getAttribute('class')?.match(/language-(\w+)/)?.[1] ?? null;
      const t = (el as HTMLElement).innerText.trim();
      if (t.length > 0) out.push({ lang, text: t });
    });
    return out;
  });
  await fs.writeFile(path.join(OUTPUT_DIR, `${slug}-code.json`), JSON.stringify(codes, null, 2), 'utf8');

  // Extract links to discover related sub-pages
  const links = await page.evaluate(() => {
    const arr: { text: string; href: string }[] = [];
    document.querySelectorAll('article a, .main-content a').forEach((a) => {
      const href = (a as HTMLAnchorElement).href;
      const t = (a.textContent || '').trim();
      if (href && t) arr.push({ text: t, href });
    });
    return arr;
  });

  console.log(
    `[${slug}] title="${title}" textLen=${text.length} codes=${codes.length} links=${links.length}`,
  );
  return { title, text, codes, links };
}

const LOGIN_ID = 'testpay01';
const LOGIN_PW = 'ars123!@#';

async function login(page: any) {
  console.log('[login] Going to', TARGET_URL);
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});

  // wpmem_login_form: input[name=log], input[name=pwd], input[name=Submit]
  const idInput = page.locator('#wpmem_login_form input[name="log"]').first();
  const pwInput = page.locator('#wpmem_login_form input[name="pwd"]').first();
  const submit = page.locator('#wpmem_login_form input[type="submit"][name="Submit"]').first();

  await idInput.waitFor({ state: 'visible', timeout: 15_000 });
  await idInput.fill(LOGIN_ID);
  await pwInput.fill(LOGIN_PW);
  await Promise.all([page.waitForLoadState('networkidle').catch(() => {}), submit.click()]);
  console.log('[login] after click url:', page.url());
  await page.waitForTimeout(1500);
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 2400 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);

  try {
    await login(page);

    const main = await extractPage(page, TARGET_URL, 'vbank_api');

    // Walk to a few related guide pages discovered via main links (filter to /guide/* under same host)
    const interesting = main.links.filter(
      (l: { text: string; href: string }) =>
        l.href.startsWith(BASE_URL) &&
        !l.href.endsWith('vbank_api/') &&
        !l.href.endsWith('/guide/') &&
        !l.href.includes('#'),
    );
    const dedup = Array.from(new Map(interesting.map((l: { text: string; href: string }) => [l.href, l])).values()).slice(0, 12);

    for (const l of dedup as Array<{ text: string; href: string }>) {
      const slug = l.href.replace(BASE_URL, '').replace(/\/$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'page';
      try {
        await extractPage(page, l.href, slug);
      } catch (e: any) {
        console.error(`[${slug}] error:`, e?.message ?? e);
      }
    }

    // Index file
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'INDEX.md'),
      `# 이노페이 가이드 raw\n\n수집 시각: ${new Date().toISOString()}\n\n## 메인\n- vbank_api.txt / .html / -code.json\n\n## 관련 페이지\n${(dedup as Array<{ text: string; href: string }>).map((l) => `- ${l.text} — ${l.href}`).join('\n')}\n`,
      'utf8',
    );
    console.log('Saved INDEX.md.');
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
