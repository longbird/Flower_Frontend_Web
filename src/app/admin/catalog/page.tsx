'use client';

import { useState } from 'react';
import type { TabKey } from './types';
import { ProductsTab } from './products-tab';
import { BranchSettingsTab } from './branch-settings-tab';
import { SurchargesTab } from './surcharges-tab';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'products', label: '상품 관리' },
  { key: 'branch-settings', label: '지사별 설정' },
  { key: 'surcharges', label: '추가 요금' },
];

export default function AdminCatalogPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('products');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">상품 카탈로그</h1>
        <p className="text-sm text-slate-500 mt-1">
          표준 상품의 이미지, 카테고리, 가격을 관리합니다. 지사 홈페이지에 표시됩니다.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <div className="flex gap-0 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#5B7A3D] text-[#5B7A3D]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'products' && <ProductsTab />}
      {activeTab === 'branch-settings' && <BranchSettingsTab />}
      {activeTab === 'surcharges' && <SurchargesTab />}
    </div>
  );
}
