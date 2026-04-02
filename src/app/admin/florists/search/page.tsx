'use client';

import { Suspense } from 'react';
import ProductSearch from '../product-search';

function SearchPageContent() {
  return (
    <div className="min-h-screen bg-gray-50 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between bg-transparent">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">상품 검색</h1>
      </div>

      <div className="rounded-xl shadow-sm overflow-hidden bg-gray-50 p-3 md:p-6">
        <ProductSearch />
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">로딩 중...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
