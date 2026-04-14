export function formatDateTime(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 금액을 한국 표준 표시(쉼표 + "원")로 변환.
 * 백엔드 DECIMAL 컬럼은 mysql2가 문자열("78000.00")로 반환하므로 string도 수용.
 */
export function formatAmount(n?: number | string | null): string {
  if (n == null || n === '') return '';
  const num = typeof n === 'number' ? n : Number(n);
  if (isNaN(num)) return '';
  return `${Math.round(num).toLocaleString('ko-KR')}원`;
}
