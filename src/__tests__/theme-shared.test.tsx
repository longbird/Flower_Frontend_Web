import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import {
  formatPrice,
  formatPhone,
  gradeLabel,
  categoryLabel,
  photoUrl,
  StarRating,
  FullImageViewer,
} from '@/app/branch/[slug]/themes/shared';

// ─── Utility Functions ──────────────────────────────────────────

describe('formatPrice', () => {
  it('should format price with Korean locale and "원" suffix', () => {
    expect(formatPrice(50000)).toBe('50,000원');
  });

  it('should format zero', () => {
    expect(formatPrice(0)).toBe('0원');
  });

  it('should format large numbers', () => {
    expect(formatPrice(1234567)).toBe('1,234,567원');
  });

  it('should handle small numbers without comma', () => {
    expect(formatPrice(999)).toBe('999원');
  });
});

describe('formatPhone', () => {
  it('should return digits as-is when 3 or fewer', () => {
    expect(formatPhone('010')).toBe('010');
    expect(formatPhone('01')).toBe('01');
  });

  it('should format 4-7 digit phone numbers with one dash', () => {
    expect(formatPhone('0101234')).toBe('010-1234');
    expect(formatPhone('0101')).toBe('010-1');
  });

  it('should format full 11-digit phone number', () => {
    expect(formatPhone('01012345678')).toBe('010-1234-5678');
  });

  it('should strip non-digit characters before formatting', () => {
    expect(formatPhone('010-1234-5678')).toBe('010-1234-5678');
    expect(formatPhone('(010) 1234 5678')).toBe('010-1234-5678');
  });

  it('should truncate digits beyond 11', () => {
    expect(formatPhone('010123456789999')).toBe('010-1234-5678');
  });

  it('should handle empty string', () => {
    expect(formatPhone('')).toBe('');
  });
});

describe('gradeLabel', () => {
  it('should map PREMIUM to 프리미엄', () => {
    expect(gradeLabel('PREMIUM')).toBe('프리미엄');
  });

  it('should map HIGH to 고급형', () => {
    expect(gradeLabel('HIGH')).toBe('고급형');
  });

  it('should map STANDARD to 실속형', () => {
    expect(gradeLabel('STANDARD')).toBe('실속형');
  });

  it('should return the code itself for unknown grades', () => {
    expect(gradeLabel('UNKNOWN')).toBe('UNKNOWN');
    expect(gradeLabel('A')).toBe('A');
  });
});

describe('categoryLabel', () => {
  it('should map known category codes to Korean labels', () => {
    expect(categoryLabel('CELEBRATION')).toBe('축하');
    expect(categoryLabel('CONDOLENCE')).toBe('근조');
    expect(categoryLabel('OBJET')).toBe('오브제');
    expect(categoryLabel('ORIENTAL')).toBe('동양란');
    expect(categoryLabel('WESTERN')).toBe('서양란');
    expect(categoryLabel('FLOWER')).toBe('꽃');
    expect(categoryLabel('FOLIAGE')).toBe('관엽');
    expect(categoryLabel('RICE')).toBe('쌀');
    expect(categoryLabel('FRUIT')).toBe('과일');
    expect(categoryLabel('OTHER')).toBe('기타');
  });

  it('should return the code itself for unknown categories', () => {
    expect(categoryLabel('NOPE')).toBe('NOPE');
  });
});

describe('photoUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
  });

  it('should return empty string for empty url', () => {
    expect(photoUrl('')).toBe('');
  });

  it('should return the url as-is when it starts with http', () => {
    expect(photoUrl('http://example.com/img.jpg')).toBe('http://example.com/img.jpg');
    expect(photoUrl('https://cdn.example.com/img.png')).toBe('https://cdn.example.com/img.png');
  });

  it('should prepend /api/proxy when NEXT_PUBLIC_API_BASE_URL is set', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:8080';
    expect(photoUrl('/uploads/photo.jpg')).toBe('/api/proxy/uploads/photo.jpg');
  });

  it('should return url as-is when NEXT_PUBLIC_API_BASE_URL is empty', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = '';
    expect(photoUrl('/uploads/photo.jpg')).toBe('/uploads/photo.jpg');
  });
});

// ─── React Components ───────────────────────────────────────────

describe('StarRating', () => {
  it('should render 5 stars by default', () => {
    const { container } = render(<StarRating />);
    const stars = container.querySelectorAll('svg');
    expect(stars).toHaveLength(5);
  });

  it('should render 0 stars when count is 0', () => {
    const { container } = render(<StarRating count={0} />);
    const stars = container.querySelectorAll('svg');
    expect(stars).toHaveLength(0);
  });

  it('should render 1 star when count is 1', () => {
    const { container } = render(<StarRating count={1} />);
    const stars = container.querySelectorAll('svg');
    expect(stars).toHaveLength(1);
  });

  it('should render 3 stars when count is 3', () => {
    const { container } = render(<StarRating count={3} />);
    const stars = container.querySelectorAll('svg');
    expect(stars).toHaveLength(3);
  });
});

describe('FullImageViewer', () => {
  it('should render image with correct src and alt', () => {
    const onClose = vi.fn();
    render(<FullImageViewer src="/test.jpg" onClose={onClose} />);

    const img = screen.getByAltText('큰 이미지');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/test.jpg');
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<FullImageViewer src="/test.jpg" onClose={onClose} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);
    // Button click triggers onClose directly; event also bubbles to backdrop
    // which also calls onClose, so it fires at least once
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<FullImageViewer src="/test.jpg" onClose={onClose} />);

    // The outermost div is the backdrop
    const backdrop = container.firstElementChild!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('should NOT call onClose when image itself is clicked (stopPropagation)', () => {
    const onClose = vi.fn();
    render(<FullImageViewer src="/test.jpg" onClose={onClose} />);

    const img = screen.getByAltText('큰 이미지');
    fireEvent.click(img);
    // Image click calls stopPropagation, so onClose should NOT be triggered
    expect(onClose).not.toHaveBeenCalled();
  });
});
