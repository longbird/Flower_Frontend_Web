/**
 * Idempotency key 생성.
 *
 * `crypto.randomUUID()`는 secure context(HTTPS / localhost)에서만 동작하므로
 * 테스트 서버 같은 HTTP 환경에서 throw된다. 폴백으로 timestamp + random 조합 사용.
 */
export function idempotencyKey(): string {
  // crypto.randomUUID 우선
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // secure context 아니면 throw — fallthrough
    }
  }

  // 폴백: timestamp(36진법) + 두 개의 random(36진법) 조합
  // 충돌 가능성은 매우 낮고 멱등성 보장에는 충분
  const ts = Date.now().toString(36);
  const r1 = Math.random().toString(36).slice(2, 10);
  const r2 = Math.random().toString(36).slice(2, 10);
  return `${ts}-${r1}-${r2}`;
}
