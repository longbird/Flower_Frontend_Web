import { describe, it, expect } from 'vitest';
import { businessDayToday } from '@/app/aircpm/calls/business-day';

// 백엔드 businessDayOf 와 동일 공식(KST+9, 업무일 08:00 시작) 검증.
describe('businessDayToday', () => {
  it('낮 시간(KST 18:30) → 당일 업무일', () => {
    // 2026-07-08T09:30Z = 2026-07-08 18:30 KST
    expect(businessDayToday(new Date('2026-07-08T09:30:00Z'))).toBe('2026-07-08');
  });

  it('자정 이후·08:00 이전(KST 07:30) → 전일 업무일', () => {
    // 2026-07-08T22:30Z = 2026-07-09 07:30 KST → 아직 07-08 업무일
    expect(businessDayToday(new Date('2026-07-08T22:30:00Z'))).toBe('2026-07-08');
  });

  it('정확히 08:00 KST → 당일 업무일 시작', () => {
    // 2026-07-08T23:00Z = 2026-07-09 08:00 KST → 07-09 업무일
    expect(businessDayToday(new Date('2026-07-08T23:00:00Z'))).toBe('2026-07-09');
  });

  it('08:00 이후(KST 08:30) → 당일 업무일', () => {
    // 2026-07-08T23:30Z = 2026-07-09 08:30 KST → 07-09 업무일
    expect(businessDayToday(new Date('2026-07-08T23:30:00Z'))).toBe('2026-07-09');
  });
});
