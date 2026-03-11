import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// GET: 로그 조회
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get('action');
  const floristId = searchParams.get('floristId');
  const keyword = searchParams.get('keyword');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const size = parseInt(searchParams.get('size') || '50', 10);

  try {
    const pool = getPool();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }
    if (floristId) {
      conditions.push('florist_id = ?');
      params.push(floristId);
    }
    if (keyword) {
      conditions.push('(actor LIKE ? OR category LIKE ? OR CAST(photo_id AS CHAR) LIKE ?)');
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    if (from) {
      conditions.push('created_at >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('created_at <= ?');
      params.push(to + ' 23:59:59');
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * size;

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM photo_audit_logs ${where}`,
      params
    );
    const total = (countRows as { total: number }[])[0]?.total || 0;

    const [rows] = await pool.query(
      `SELECT id, action, photo_type, photo_id, florist_id, file_path, category, grade,
              before_json, after_json, actor, ip, created_at
       FROM photo_audit_logs ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, size, offset]
    );

    const data = (rows as Record<string, unknown>[]).map((row) => ({
      id: String(row.id),
      timestamp: row.created_at,
      action: row.action,
      floristId: row.florist_id || '',
      floristName: '',
      photoId: row.photo_id,
      category: row.category,
      grade: row.grade,
      filePath: row.file_path,
      before: row.before_json ? JSON.parse(row.before_json as string) : null,
      after: row.after_json ? JSON.parse(row.after_json as string) : null,
      userName: row.actor || '',
      ip: row.ip,
    }));

    return NextResponse.json({ ok: true, data, total, page, size });
  } catch (e) {
    console.error('photo-logs GET error:', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// POST: 로그 추가
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pool = getPool();

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';

    await pool.query(
      `INSERT INTO photo_audit_logs
        (action, photo_type, photo_id, florist_id, file_path, category, grade, before_json, after_json, actor, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.action || 'UPDATE',
        'FLORIST',
        body.photoId || null,
        body.floristId || null,
        body.after?.fileUrl || body.before?.fileUrl || null,
        body.after?.category || body.before?.category || null,
        body.after?.grade || body.before?.grade || null,
        body.before ? JSON.stringify(body.before) : null,
        body.after ? JSON.stringify(body.after) : null,
        body.userName || null,
        ip,
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('photo-logs POST error:', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
