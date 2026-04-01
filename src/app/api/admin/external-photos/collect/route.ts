import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { scrape468 } from '@/lib/scrapers/scraper-468';
import { scrapeEbestflower } from '@/lib/scrapers/scraper-ebestflower';
import type { ScrapedPhoto, ScrapeResult } from '@/lib/scrapers/types';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

async function getKnownPostIds(source: string): Promise<Set<string>> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT DISTINCT post_id FROM external_photos WHERE source = ?',
    [source],
  );
  return new Set((rows || []).map((r) => String(r.post_id)));
}

async function savePhotos(photos: ScrapedPhoto[], result: ScrapeResult): Promise<void> {
  if (photos.length === 0) return;

  const pool = getPool();

  for (const photo of photos) {
    try {
      const [res] = await pool.query<ResultSetHeader>(
        `INSERT IGNORE INTO external_photos
          (source, post_id, title, image_url, post_url, author, posted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          photo.source,
          photo.postId,
          photo.title,
          photo.imageUrl,
          photo.postUrl,
          photo.author,
          photo.postedAt,
        ],
      );

      if (res.affectedRows > 0) {
        result.inserted++;
      } else {
        result.skipped++;
      }
    } catch (err) {
      result.errors.push(`Save error (${photo.postId}): ${err instanceof Error ? err.message : String(err)}`);
      result.skipped++;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    let source = 'all';
    let limit: number | undefined;
    try {
      const body = await req.json();
      if (body.source) source = body.source;
      if (body.limit) limit = Math.max(1, Math.min(Number(body.limit), 500));
    } catch {
      // empty body = defaults
    }

    const results: ScrapeResult[] = [];

    if (source === 'all' || source === '468') {
      const knownPostIds = await getKnownPostIds('468');
      const { photos, result } = await scrape468(knownPostIds, limit);
      await savePhotos(photos, result);
      results.push(result);
    }

    if (source === 'all' || source === 'ebestflower') {
      const { photos, result } = await scrapeEbestflower(limit);
      await savePhotos(photos, result);
      results.push(result);
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error('[external-photos/collect] Error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
