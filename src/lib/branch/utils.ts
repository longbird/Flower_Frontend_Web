/** service_areas DB 컬럼 값(JSON 배열 문자열 또는 레거시 콤마 구분 문자열)을 배열로 파싱 */
export function parseServiceAreas(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    if (typeof parsed === 'string') return parsed.split(',').map((s) => s.trim()).filter(Boolean);
  } catch {}
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}
