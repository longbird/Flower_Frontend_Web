import { JSDOM } from 'jsdom';
import type { ScrapedPhoto, ScrapeResult } from './types';

const BASE_URL = 'http://ebestflower.co.kr';
const BOARD_URL = `${BASE_URL}/bbs.htm`;
const BOARD_PARAMS = 'urlkey=bbs/jpic/board.html&uid=7';
const MAX_PAGES = 20;
const PAGE_DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login(id: string, pw: string): Promise<string | null> {
  try {
    // Step 1: GET the login page to obtain initial PHPSESSID
    const indexRes = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
    const indexCookies = indexRes.headers.getSetCookie?.() ?? [];
    let sessionId: string | null = null;
    for (const cookie of indexCookies) {
      const m = cookie.match(/PHPSESSID=([^;]+)/);
      if (m) { sessionId = m[1]; break; }
    }
    if (!sessionId) {
      const fallback = indexRes.headers.get('set-cookie') || '';
      const m = fallback.match(/PHPSESSID=([^;]+)/);
      if (m) sessionId = m[1];
    }

    // Step 2: POST login with sid/spw fields
    const loginUrl = `${BASE_URL}/login/login.htm`;
    const body = new URLSearchParams({ sid: id, spw: pw, admin_save: 'N' });

    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(sessionId ? { Cookie: `PHPSESSID=${sessionId}` } : {}),
      },
      body: body.toString(),
      redirect: 'manual',
    });

    // Check for updated session cookie
    const cookies = res.headers.getSetCookie?.() ?? [];
    for (const cookie of cookies) {
      const match = cookie.match(/PHPSESSID=([^;]+)/);
      if (match) return match[1];
    }
    const singleCookie = res.headers.get('set-cookie') || '';
    const match = singleCookie.match(/PHPSESSID=([^;]+)/);
    if (match) return match[1];

    // If no new session cookie, the initial one may now be authenticated
    return sessionId;
  } catch (err) {
    console.error('[ebestflower] Login failed:', err);
    return null;
  }
}

async function fetchPage(url: string, sessionId: string): Promise<string> {
  const res = await fetch(url, {
    headers: { Cookie: `PHPSESSID=${sessionId}` },
  });
  const buf = await res.arrayBuffer();
  return new TextDecoder('euc-kr').decode(buf);
}

function parseGalleryPage(html: string): ScrapedPhoto[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const photos: ScrapedPhoto[] = [];

  const imgElements = doc.querySelectorAll('img');

  for (const img of imgElements) {
    const src = img.getAttribute('src') || '';
    if (!src || src.includes('icon') || src.includes('btn') || src.includes('logo')) continue;

    const fullUrl = src.startsWith('http') ? src : `${BASE_URL}/${src.replace(/^\//, '')}`;

    if (!fullUrl.includes('/bbs/') && !fullUrl.includes('/upload/') && !fullUrl.includes('/jpic/')) continue;

    // Convert thumbnail URL to original: /picture/imgs/xxx.jpg -> /picture/xxx.jpg
    const originalUrl = fullUrl.replace('/picture/imgs/', '/picture/');

    const anchor = img.closest('a');
    const href = anchor?.getAttribute('href') || '';
    const postIdMatch = href.match(/uid=(\d+)/);
    const postId = postIdMatch ? postIdMatch[1] : `img_${src.replace(/\W/g, '_').slice(0, 40)}`;

    const altText = img.getAttribute('alt') || '';
    const titleEl = img.closest('td')?.querySelector('a, span, b');
    const title = altText || titleEl?.textContent?.trim() || null;

    photos.push({
      source: 'ebestflower',
      postId,
      title,
      imageUrl: originalUrl,
      postUrl: href ? (href.startsWith('http') ? href : `${BASE_URL}/${href.replace(/^\//, '')}`) : null,
      author: null,
      postedAt: null,
    });
  }

  return photos;
}

export async function scrapeEbestflower(
  maxPhotos?: number,
): Promise<{ photos: ScrapedPhoto[]; result: ScrapeResult }> {
  const result: ScrapeResult = { source: 'ebestflower', inserted: 0, skipped: 0, errors: [] };
  const allPhotos: ScrapedPhoto[] = [];

  const id = process.env.EBESTFLOWER_ID;
  const pw = process.env.EBESTFLOWER_PW;

  if (!id || !pw) {
    result.errors.push('EBESTFLOWER_ID or EBESTFLOWER_PW not configured');
    return { photos: allPhotos, result };
  }

  const sessionId = await login(id, pw);
  if (!sessionId) {
    result.errors.push('Login failed - could not obtain session');
    return { photos: allPhotos, result };
  }

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const url = `${BOARD_URL}?${BOARD_PARAMS}&page=${page}`;
      const html = await fetchPage(url, sessionId);

      if (html.includes('등록된 이미지가 없습니다') || html.includes('로그인')) {
        if (page === 1) {
          result.errors.push('Session invalid or no images found');
        }
        break;
      }

      const photos = parseGalleryPage(html);
      if (photos.length === 0) break;

      allPhotos.push(...photos);

      if (maxPhotos && allPhotos.length >= maxPhotos) {
        allPhotos.length = maxPhotos;
        break;
      }

      if (page < MAX_PAGES) {
        await delay(PAGE_DELAY_MS);
      }
    } catch (err) {
      result.errors.push(`Page ${page}: ${err instanceof Error ? err.message : String(err)}`);
      break;
    }
  }

  return { photos: allPhotos, result };
}
