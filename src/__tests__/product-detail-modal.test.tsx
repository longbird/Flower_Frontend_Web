import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { ProductDetailModal } from '@/app/branch/[slug]/themes/shared';
import type { RecommendedPhoto } from '@/lib/branch/types';

// ─── Helpers ────────────────────────────────────────────────────

function makeProduct(overrides: Partial<RecommendedPhoto> = {}): RecommendedPhoto {
  return {
    id: 1,
    name: '축하 꽃바구니',
    sellingPrice: 55000,
    imageUrl: '/uploads/flowers/basket.jpg',
    category: 'CELEBRATION',
    grade: 'PREMIUM',
    ...overrides,
  };
}

const defaultProps = {
  slug: 'seoul',
  onClose: vi.fn(),
};

beforeEach(() => {
  defaultProps.onClose = vi.fn();
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:8080';
});

// ─── Rendering ──────────────────────────────────────────────────

describe('ProductDetailModal', () => {
  describe('product name rendering', () => {
    it('should render product name when provided', () => {
      render(<ProductDetailModal product={makeProduct()} {...defaultProps} />);
      expect(screen.getByText('축하 꽃바구니')).toBeInTheDocument();
    });

    it('should fall back to category label when name is missing', () => {
      render(
        <ProductDetailModal
          product={makeProduct({ name: undefined, category: 'CONDOLENCE' })}
          {...defaultProps}
        />
      );
      // The h2 heading should show the category label as fallback name
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('근조');
    });

    it('should fall back to "상품" when both name and category are missing', () => {
      render(
        <ProductDetailModal
          product={makeProduct({ name: undefined, category: undefined })}
          {...defaultProps}
        />
      );
      expect(screen.getByText('상품')).toBeInTheDocument();
    });
  });

  describe('price rendering', () => {
    it('should render price formatted in Korean locale with "원" suffix', () => {
      render(<ProductDetailModal product={makeProduct()} {...defaultProps} />);
      expect(screen.getByText('55,000원')).toBeInTheDocument();
    });

    it('should render large prices with correct comma formatting', () => {
      render(
        <ProductDetailModal
          product={makeProduct({ sellingPrice: 1234567 })}
          {...defaultProps}
        />
      );
      expect(screen.getByText('1,234,567원')).toBeInTheDocument();
    });

    it('should NOT render price when sellingPrice is null', () => {
      render(
        <ProductDetailModal
          product={makeProduct({ sellingPrice: undefined })}
          {...defaultProps}
        />
      );
      expect(screen.queryByText(/원$/)).not.toBeInTheDocument();
    });

    it('should NOT render price when sellingPrice is 0', () => {
      render(
        <ProductDetailModal
          product={makeProduct({ sellingPrice: 0 })}
          {...defaultProps}
        />
      );
      expect(screen.queryByText('0원')).not.toBeInTheDocument();
    });
  });

  describe('product image', () => {
    it('should render product image with correct src and alt', () => {
      render(<ProductDetailModal product={makeProduct()} {...defaultProps} />);
      const img = screen.getByAltText('축하 꽃바구니');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/api/proxy/uploads/flowers/basket.jpg');
    });

    it('should NOT render image section when imageUrl is missing', () => {
      render(
        <ProductDetailModal
          product={makeProduct({ imageUrl: undefined })}
          {...defaultProps}
        />
      );
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('should use absolute URL as-is for http images', () => {
      render(
        <ProductDetailModal
          product={makeProduct({ imageUrl: 'https://cdn.example.com/flower.jpg' })}
          {...defaultProps}
        />
      );
      const img = screen.getByAltText('축하 꽃바구니');
      expect(img).toHaveAttribute('src', 'https://cdn.example.com/flower.jpg');
    });
  });

  describe('category and grade badges', () => {
    it('should render category label when category is provided', () => {
      render(<ProductDetailModal product={makeProduct()} {...defaultProps} />);
      expect(screen.getByText('축하')).toBeInTheDocument();
    });

    it('should render grade label when grade is provided', () => {
      render(<ProductDetailModal product={makeProduct()} {...defaultProps} />);
      expect(screen.getByText('프리미엄')).toBeInTheDocument();
    });

    it('should NOT render category badge when category is missing', () => {
      render(
        <ProductDetailModal
          product={makeProduct({ category: undefined })}
          {...defaultProps}
        />
      );
      expect(screen.queryByText('축하')).not.toBeInTheDocument();
    });

    it('should NOT render grade badge when grade is missing', () => {
      render(
        <ProductDetailModal
          product={makeProduct({ grade: undefined })}
          {...defaultProps}
        />
      );
      expect(screen.queryByText('프리미엄')).not.toBeInTheDocument();
    });
  });

  describe('static badges', () => {
    it('should render all three service badges', () => {
      render(<ProductDetailModal product={makeProduct()} {...defaultProps} />);
      expect(screen.getByText('당일배송 가능')).toBeInTheDocument();
      expect(screen.getByText('리본 무료작성')).toBeInTheDocument();
      expect(screen.getByText('실물사진 제공')).toBeInTheDocument();
    });
  });

  // ─── Interactions ──────────────────────────────────────────────

  describe('close button', () => {
    it('should call onClose when close button is clicked', () => {
      render(<ProductDetailModal product={makeProduct()} {...defaultProps} />);
      // The close button is the one inside the modal panel (not the order button)
      const buttons = screen.getAllByRole('button');
      // First button is the close button (top-right X)
      fireEvent.click(buttons[0]);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('backdrop click', () => {
    it('should call onClose when backdrop overlay is clicked', () => {
      const { container } = render(
        <ProductDetailModal product={makeProduct()} {...defaultProps} />
      );
      // The backdrop is the div with bg-black/40 class (second child of root)
      const root = container.firstElementChild!;
      const backdrop = root.querySelector('.backdrop-blur-sm')!;
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('order button', () => {
    it('should render "주문하기" button', () => {
      render(<ProductDetailModal product={makeProduct()} {...defaultProps} />);
      expect(screen.getByText('주문하기')).toBeInTheDocument();
    });

    it('should call onOrder with product when onOrder is provided', () => {
      const onOrder = vi.fn();
      const product = makeProduct();
      render(
        <ProductDetailModal product={product} {...defaultProps} onOrder={onOrder} />
      );
      fireEvent.click(screen.getByText('주문하기'));
      expect(onOrder).toHaveBeenCalledWith(product);
    });

    it('should call onClose when onOrder is not provided', () => {
      render(<ProductDetailModal product={makeProduct()} {...defaultProps} />);
      fireEvent.click(screen.getByText('주문하기'));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  // ─── Full Image Viewer integration ─────────────────────────────

  describe('full image viewer', () => {
    it('should open full image viewer when product image is clicked', () => {
      render(<ProductDetailModal product={makeProduct()} {...defaultProps} />);
      // Click the image container area (the div wrapping the img)
      const img = screen.getByAltText('축하 꽃바구니');
      fireEvent.click(img.parentElement!);
      // After clicking, the FullImageViewer should appear with a "큰 이미지" alt
      expect(screen.getByAltText('큰 이미지')).toBeInTheDocument();
    });

    it('should NOT show full image viewer when imageUrl is missing', () => {
      render(
        <ProductDetailModal
          product={makeProduct({ imageUrl: undefined })}
          {...defaultProps}
        />
      );
      // No image to click, so no full viewer
      expect(screen.queryByAltText('큰 이미지')).not.toBeInTheDocument();
    });
  });

  // ─── Graceful handling of minimal data ─────────────────────────

  describe('minimal product data', () => {
    it('should render without crashing when product has only id', () => {
      const minimalProduct: RecommendedPhoto = { id: 99 };
      render(
        <ProductDetailModal product={minimalProduct} {...defaultProps} />
      );
      // Should fall back to "상품" for the name
      expect(screen.getByText('상품')).toBeInTheDocument();
      // Should still render the order button
      expect(screen.getByText('주문하기')).toBeInTheDocument();
    });
  });
});
