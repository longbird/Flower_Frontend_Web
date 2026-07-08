// 백엔드 businessDayOf(callpass.business-day.ts) 미러 — KST(+9), 업무일은 08:00 KST 시작.
//
// 콜 조회 기간 초기값을 이 값으로 채우면, 서버의 "기간 미지정" 기본값
// (resolveYmdRange → businessDayOf(now))과 동일한 [D, D] 범위가 되어
// 초기 목록이 비지 않는다. 사용자가 캘린더 '오늘'을 직접 고르면 업무일 경계
// (00:00~08:00 KST는 전일 업무일)나 타임존 차이로 데이터와 어긋날 수 있어,
// 서버와 같은 공식으로 계산한다.
const KST_OFFSET_MS = 9 * 3_600_000;
const BUSINESS_START_HOUR = 8;

export function businessDayToday(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + KST_OFFSET_MS - BUSINESS_START_HOUR * 3_600_000);
  return shifted.toISOString().slice(0, 10);
}
