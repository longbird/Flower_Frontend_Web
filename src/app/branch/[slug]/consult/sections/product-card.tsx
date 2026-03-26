'use client';

import { formatPrice, photoUrl } from '../utils';
import type { RecommendedPhoto } from '@/lib/branch/types';

interface Props {
  product: RecommendedPhoto | null;
  loading: boolean;
}

export function ProductCard({ product, loading }: Props) {
  if (loading) {
    return (
      <section className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
        <div className="flex gap-4">
          <div className="w-24 h-24 rounded-xl bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded w-1/2" />
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-sm text-gray-500 text-center">
          상품 정보를 불러올 수 없습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex gap-4">
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
          {product.imageUrl ? (
            <img
              src={photoUrl(product.imageUrl)}
              alt={product.name || '상품'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900 truncate">
            {product.name || '상품'}
          </h3>
          {product.sellingPrice != null && product.sellingPrice > 0 && (
            <p className="text-lg font-bold text-gray-900 mt-0.5">
              {formatPrice(product.sellingPrice)}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge label="당일배송 가능" />
            <Badge label="리본 무료작성" />
            <Badge label="실물사진 제공" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-[var(--branch-green)] font-medium">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
      {label}
    </span>
  );
}
