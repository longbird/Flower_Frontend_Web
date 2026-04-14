/**
 * 백엔드 정적 파일 URL(/uploads/...) 등을 브라우저가 접근할 수 있는
 * Next.js rewrites 프록시 경로(/api/proxy/uploads/...)로 변환.
 *
 * 이전에는 `${NEXT_PUBLIC_API_BASE_URL}${url}` 형태로 만들었지만,
 * 테스트/운영 서버의 NEXT_PUBLIC_API_BASE_URL이 `http://127.0.0.1:8080`이라
 * 브라우저가 자기 컴퓨터의 127.0.0.1로 시도해서 깨짐.
 *
 * 규칙:
 * - 절대 URL(http/https)이면 그대로 반환
 * - NEXT_PUBLIC_API_BASE_URL이 설정되어 있으면 `/api/proxy${url}`로 변환
 * - 그렇지 않으면 url 그대로 반환 (개발 dev 서버 동일 origin)
 */
export function toProxyUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) return url;
  return url.startsWith('/') ? `/api/proxy${url}` : `/api/proxy/${url}`;
}
