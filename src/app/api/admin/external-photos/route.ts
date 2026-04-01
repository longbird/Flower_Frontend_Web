import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(parseInt(sp.get('page') || '1', 10), 1);
  const size = Math.min(Math.max(parseInt(sp.get('size') || '20', 10), 1), 100);
  const offset = (page - 1) * size;
  const source = sp.get('source') || '';

  const pool = getPool();

  let where = '1=1';
  const params: unknown[] = [];

  if (source) {
    where += ' AND source = ?';
    params.push(source);
  }

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM external_photos WHERE ${where}`,
    params,
  );
  const total = countRows[0]?.total || 0;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, source, post_id, title, image_url, post_url, author, posted_at, scraped_at
     FROM external_photos
     WHERE ${where}
     ORDER BY scraped_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, size, offset],
  );

  const data = (rows || []).map((r) => ({
    id: r.id,
    source: r.source,
    postId: r.post_id,
    title: r.title,
    imageUrl: r.image_url,
    postUrl: r.post_url,
    author: r.author,
    postedAt: r.posted_at,
    scrapedAt: r.scraped_at,
  }));

  return NextResponse.json({ ok: true, data, total, page, size });
}
