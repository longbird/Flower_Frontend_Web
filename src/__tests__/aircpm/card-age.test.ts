import { describe, it, expect } from 'vitest';
import { getCardAgeLevel } from '@/lib/aircpm/card-age';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

describe('getCardAgeLevel', () => {
  it('29일 이내 → normal', () => {
    expect(getCardAgeLevel(isoDaysAgo(0))).toBe('normal');
    expect(getCardAgeLevel(isoDaysAgo(29))).toBe('normal');
  });
  it('30~59일 → warn', () => {
    expect(getCardAgeLevel(isoDaysAgo(30))).toBe('warn');
    expect(getCardAgeLevel(isoDaysAgo(59))).toBe('warn');
  });
  it('60일 이상 → danger', () => {
    expect(getCardAgeLevel(isoDaysAgo(60))).toBe('danger');
    expect(getCardAgeLevel(isoDaysAgo(100))).toBe('danger');
  });
  it('빈 문자열 → normal (방어)', () => {
    expect(getCardAgeLevel('')).toBe('normal');
  });
});
