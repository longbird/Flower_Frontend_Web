import { describe, it, expect } from 'vitest';
import { formatAmount, formatDateTime } from '@/components/customer/_utils';

describe('formatAmount', () => {
  it('number 78000 → "78,000원"', () => {
    expect(formatAmount(78000)).toBe('78,000원');
  });

  it('string "78000.00" (DECIMAL 컬럼) → "78,000원"', () => {
    expect(formatAmount('78000.00')).toBe('78,000원');
  });

  it('string "1234567" → "1,234,567원"', () => {
    expect(formatAmount('1234567')).toBe('1,234,567원');
  });

  it('null → 빈 문자열', () => {
    expect(formatAmount(null)).toBe('');
  });

  it('undefined → 빈 문자열', () => {
    expect(formatAmount(undefined)).toBe('');
  });

  it('빈 문자열 → 빈 문자열', () => {
    expect(formatAmount('')).toBe('');
  });

  it('NaN 변환 가능한 garbage → 빈 문자열', () => {
    expect(formatAmount('abc')).toBe('');
  });

  it('소수점 이하 반올림', () => {
    expect(formatAmount('99.6')).toBe('100원');
    expect(formatAmount('99.4')).toBe('99원');
  });
});

describe('formatDateTime', () => {
  it('ISO 문자열 → "yyyy-mm-dd hh:mm"', () => {
    const result = formatDateTime('2025-12-22T16:07:00');
    expect(result).toMatch(/2025-12-22 \d{2}:\d{2}/);
  });

  it('null → 빈 문자열', () => {
    expect(formatDateTime(null)).toBe('');
  });

  it('잘못된 문자열 → 원본 반환', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });
});
