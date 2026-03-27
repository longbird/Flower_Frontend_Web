import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatPhone,
  formatPrice,
  validateFile,
  todayString,
  tomorrowString,
  formatDateWithDay,
  photoUrl,
  MAX_FILE_SIZE,
} from '@/app/branch/[slug]/consult/utils';

// ─── formatPhone ────────────────────────────────────────
describe('formatPhone', () => {
  it('should return digits as-is when 3 or fewer', () => {
    expect(formatPhone('010')).toBe('010');
    expect(formatPhone('01')).toBe('01');
    expect(formatPhone('0')).toBe('0');
  });

  it('should format with one dash for 4-7 digits', () => {
    expect(formatPhone('0101')).toBe('010-1');
    expect(formatPhone('0101234')).toBe('010-1234');
  });

  it('should format full phone number with two dashes', () => {
    expect(formatPhone('01012345678')).toBe('010-1234-5678');
  });

  it('should strip non-digit characters before formatting', () => {
    expect(formatPhone('010-1234-5678')).toBe('010-1234-5678');
    expect(formatPhone('(010) 1234 5678')).toBe('010-1234-5678');
    expect(formatPhone('abc010def1234ghi5678')).toBe('010-1234-5678');
  });

  it('should truncate digits beyond 11', () => {
    expect(formatPhone('010123456789999')).toBe('010-1234-5678');
  });

  it('should return empty string for empty input', () => {
    expect(formatPhone('')).toBe('');
  });
});

// ─── formatPrice ────────────────────────────────────────
describe('formatPrice', () => {
  it('should format price with Korean locale and 원 suffix', () => {
    expect(formatPrice(50000)).toBe('50,000원');
  });

  it('should format zero', () => {
    expect(formatPrice(0)).toBe('0원');
  });

  it('should format large numbers with commas', () => {
    expect(formatPrice(1000000)).toBe('1,000,000원');
  });

  it('should handle small numbers without commas', () => {
    expect(formatPrice(999)).toBe('999원');
  });
});

// ─── validateFile ───────────────────────────────────────
describe('validateFile', () => {
  function makeFile(name: string, size: number): File {
    const buffer = new ArrayBuffer(size);
    return new File([buffer], name, { type: 'application/octet-stream' });
  }

  it('should return null for valid jpg file under 5MB', () => {
    expect(validateFile(makeFile('photo.jpg', 1024))).toBeNull();
  });

  it('should return null for valid jpeg file', () => {
    expect(validateFile(makeFile('photo.jpeg', 1024))).toBeNull();
  });

  it('should return null for valid png file', () => {
    expect(validateFile(makeFile('image.png', 1024))).toBeNull();
  });

  it('should return null for valid pdf file', () => {
    expect(validateFile(makeFile('doc.pdf', 1024))).toBeNull();
  });

  it('should reject file exceeding 5MB', () => {
    const result = validateFile(makeFile('big.jpg', MAX_FILE_SIZE + 1));
    expect(result).toBe('파일 크기는 5MB 이하만 가능합니다.');
  });

  it('should accept file exactly at 5MB', () => {
    expect(validateFile(makeFile('exact.jpg', MAX_FILE_SIZE))).toBeNull();
  });

  it('should reject unsupported extension', () => {
    const result = validateFile(makeFile('file.gif', 1024));
    expect(result).toBe('jpg, png, pdf 파일만 가능합니다.');
  });

  it('should reject file with no extension', () => {
    const result = validateFile(makeFile('noext', 1024));
    expect(result).toBe('jpg, png, pdf 파일만 가능합니다.');
  });

  it('should be case-insensitive for extensions', () => {
    expect(validateFile(makeFile('photo.JPG', 1024))).toBeNull();
    expect(validateFile(makeFile('photo.PNG', 1024))).toBeNull();
  });

  it('should check size before extension', () => {
    // A file that is both too large AND has a bad extension
    // should return the size error (checked first)
    const result = validateFile(makeFile('bad.gif', MAX_FILE_SIZE + 1));
    expect(result).toBe('파일 크기는 5MB 이하만 가능합니다.');
  });
});

// ─── Date helpers (deterministic) ───────────────────────
describe('Date helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('todayString', () => {
    it('should return today as YYYY-MM-DD', () => {
      expect(todayString()).toBe('2026-03-27');
    });

    it('should zero-pad single-digit month and day', () => {
      vi.setSystemTime(new Date('2026-01-05T12:00:00'));
      expect(todayString()).toBe('2026-01-05');
    });
  });

  describe('tomorrowString', () => {
    it('should return tomorrow as YYYY-MM-DD', () => {
      expect(tomorrowString()).toBe('2026-03-28');
    });

    it('should handle month boundary', () => {
      vi.setSystemTime(new Date('2026-03-31T12:00:00'));
      expect(tomorrowString()).toBe('2026-04-01');
    });

    it('should handle year boundary', () => {
      vi.setSystemTime(new Date('2026-12-31T12:00:00'));
      expect(tomorrowString()).toBe('2027-01-01');
    });
  });

  describe('formatDateWithDay', () => {
    it('should format date with Korean day of week', () => {
      // 2026-03-27 is a Friday (금요일)
      expect(formatDateWithDay('2026-03-27')).toBe('2026-03-27 (금요일)');
    });

    it('should handle Sunday', () => {
      // 2026-03-29 is a Sunday (일요일)
      expect(formatDateWithDay('2026-03-29')).toBe('2026-03-29 (일요일)');
    });

    it('should handle Wednesday', () => {
      // 2026-03-25 is a Wednesday (수요일)
      expect(formatDateWithDay('2026-03-25')).toBe('2026-03-25 (수요일)');
    });

    it('should return empty string for empty input', () => {
      expect(formatDateWithDay('')).toBe('');
    });
  });
});

// ─── photoUrl ───────────────────────────────────────────
describe('photoUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
  });

  it('should return empty string for empty url', () => {
    expect(photoUrl('')).toBe('');
  });

  it('should return url as-is if it starts with http', () => {
    expect(photoUrl('http://example.com/img.jpg')).toBe('http://example.com/img.jpg');
    expect(photoUrl('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
  });

  it('should prepend /api/proxy when NEXT_PUBLIC_API_BASE_URL is set', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:8080';
    expect(photoUrl('/uploads/photo.jpg')).toBe('/api/proxy/uploads/photo.jpg');
  });

  it('should return path as-is when NEXT_PUBLIC_API_BASE_URL is empty', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = '';
    expect(photoUrl('/uploads/photo.jpg')).toBe('/uploads/photo.jpg');
  });
});
