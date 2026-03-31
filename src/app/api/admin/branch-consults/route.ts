import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(parseInt(sp.get('page') || '1', 10), 1);
  const size = Math.min(Math.max(parseInt(sp.get('size') || '20', 10), 1), 100);
  const offset = (page - 1) * size;
  const status = sp.get('status') || '';
  const q = sp.get('q') || '';

  const pool = getPool();

  let where = '1=1';
  const params: unknown[] = [];

  if (status) {
    where += ' AND cr.status = ?';
    params.push(status);
  }
  if (q) {
    where += ' AND (cr.customer_name LIKE ? OR cr.customer_phone LIKE ? OR cr.product_name LIKE ? OR o.name LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM branch_consult_requests cr JOIN organizations o ON cr.branch_id = o.id WHERE ${where}`,
    params,
  );
  const total = countRows[0]?.total || 0;

  const dataParams = [...params, size, offset];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT cr.id, cr.branch_id, o.name as branch_name, cr.customer_name, cr.customer_phone,
            cr.product_code, cr.product_name, cr.desired_date, cr.message, cr.status,
            cr.created_at, cr.updated_at
     FROM branch_consult_requests cr
     JOIN organizations o ON cr.branch_id = o.id
     WHERE ${where}
     ORDER BY cr.created_at DESC
     LIMIT ? OFFSET ?`,
    dataParams,
  );

  // Collect product codes to match images
  const productCodes = (rows || []).map((r) => r.product_code).filter(Boolean);
  const imageMap: Record<string, { imageUrl: string; category: string; grade: string; sellingPrice: number; costPrice: number; floristName: string }> = {};

  if (productCodes.length > 0) {
    const placeholders = productCodes.map(() => '?').join(',');
    const [photoRows] = await pool.query<RowDataPacket[]>(
      `SELECT fp.id, fp.category, fp.grade, fp.selling_price, fp.cost_price,
              CONCAT('/uploads/', fp.file_path) AS image_url,
              fs.name AS florist_name
       FROM florist_photos fp
       JOIN flower_shops fs ON CAST(REPLACE(fp.florist_id, 'fs_', '') AS UNSIGNED) = fs.id
       WHERE fp.id IN (${placeholders})`,
      productCodes,
    );
    for (const p of photoRows || []) {
      imageMap[String(p.id)] = {
        imageUrl: p.image_url,
        category: p.category,
        grade: p.grade,
        sellingPrice: p.selling_price,
        costPrice: p.cost_price,
        floristName: p.florist_name,
      };
    }
  }

  const items = (rows || []).map((r) => {
    const product = r.product_code ? imageMap[String(r.product_code)] : null;
    return {
      id: r.id,
      branchId: r.branch_id,
      branchName: r.branch_name,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      productCode: r.product_code,
      productName: r.product_name,
      desiredDate: r.desired_date,
      message: r.message,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      productImageUrl: product?.imageUrl || null,
      productCategory: product?.category || null,
      productGrade: product?.grade || null,
      productSellingPrice: product?.sellingPrice || null,
      productCostPrice: product?.costPrice || null,
      productFloristName: product?.floristName || null,
    };
  });

  return NextResponse.json({ items, total, page, size });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  }

  const validStatuses = ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const pool = getPool();
  await pool.query(
    'UPDATE branch_consult_requests SET status = ?, updated_at = NOW() WHERE id = ?',
    [status, id],
  );

  return NextResponse.json({ ok: true });
}
