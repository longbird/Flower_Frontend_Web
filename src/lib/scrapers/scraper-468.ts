import { JSDOM } from 'jsdom';
import type { ScrapedPhoto, ScrapeResult } from './types';

const BASE_URL = 'https://www.468.co.kr';
const BOARD_URL = `${BASE_URL}/post/board/47`;
const MAX_PAGES = 40;
const PAGE_DELAY_MS = 500;
const DETAIL_DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface PostInfo {
  postId: string;
  title: string | null;
  postUrl: string;
  author: string | null;
  postedAt: Date | null;
}

function parseGalleryPage(html: string): PostInfo[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const items = doc.querySelectorAll('.board-gallery-sub-list li');
  const posts: PostInfo[] = [];

  for (const li of items) {
    const anchor = li.querySelector('a.bg-thum-box');
    if (!anchor) continue;

    const href = anchor.getAttribute('href') || '';
    const postIdMatch = href.match(/\/post\/(\d+)/);
    if (!postIdMatch) continue;

    const postId = postIdMatch[1];
    const postUrl = `${BASE_URL}/post/${postId}`;

    const titleEl = li.querySelector('.bg-thum-tit');
    const title = titleEl?.textContent?.trim() || null;

    const metaEls = li.querySelectorAll('.bg-thum-area span, .bg-thum-area p');
    let author: string | null = null;
    let postedAt: Date | null = null;

    for (const el of metaEls) {
      const text = el.textContent?.trim() || '';
      const dateMatch = text.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
      if (dateMatch) {
        postedAt = new Date(`${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`);
      } else if (!author && text && text !== title) {
        author = text;
      }
    }

    posts.push({ postId, title, postUrl, author, postedAt });
  }

  return posts;
}

async function fetchPostOriginalImages(postUrl: string): Promise<string[]> {
  const res = await fetch(postUrl);
  if (!res.ok) return [];

  const html = await res.text();
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const images: string[] = [];

  const imgEls = doc.querySelectorAll('img');
  for (const img of imgEls) {
    const src = img.getAttribute('src') || '';
    if (src.includes('file-download/')) {
      const cleanUrl = src.split('?')[0];
      if (!images.includes(cleanUrl)) {
        images.push(cleanUrl);
      }
    }
  }

  return images;
}

export async function scrape468(
  knownPostIds?: Set<string>,
  maxPosts?: number,
): Promise<{ photos: ScrapedPhoto[]; result: ScrapeResult }> {
  const allPhotos: ScrapedPhoto[] = [];
  const result: ScrapeResult = { source: '468', inserted: 0, skipped: 0, errors: [] };
  const known = knownPostIds ?? new Set<string>();
  const limit = maxPosts ?? MAX_PAGES * 16;
  let processedPosts = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    if (processedPosts >= limit) break;

    try {
      const url = `${BOARD_URL}?page=${page}`;
      const res = await fetch(url);

      if (!res.ok) {
        result.errors.push(`Page ${page}: HTTP ${res.status}`);
        break;
      }

      const html = await res.text();
      const posts = parseGalleryPage(html);

      if (posts.length === 0) break;

      const newPosts = posts.filter((p) => !known.has(p.postId));

      if (newPosts.length === 0) break;

      for (const post of newPosts) {
        if (processedPosts >= limit) break;

        try {
          const imageUrls = await fetchPostOriginalImages(post.postUrl);

          for (const imageUrl of imageUrls) {
            allPhotos.push({
              source: '468',
              postId: post.postId,
              title: post.title,
              imageUrl,
              postUrl: post.postUrl,
              author: post.author,
              postedAt: post.postedAt,
            });
          }

          processedPosts++;
          await delay(DETAIL_DELAY_MS);
        } catch (err) {
          result.errors.push(`Post ${post.postId}: ${err instanceof Error ? err.message : String(err)}`);
        }
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
