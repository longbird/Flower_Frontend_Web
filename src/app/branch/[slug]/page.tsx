'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchBranchInfo, fetchRecommendedPhotos } from '@/lib/branch/api';
import type { BranchInfo, RecommendedPhoto, PaginatedResponse } from '@/lib/branch/types';
import { getTheme, themeToStyle } from '@/lib/branch/themes';
import { GreenHomePage } from './themes/green';
import { RoseHomePage } from './themes/rose';
import { NavyHomePage } from './themes/navy';

// ─── Utility screens ──────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-4 border-2 border-[var(--branch-green)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--branch-text-muted)] text-sm tracking-wider">로딩 중...</p>
      </div>
    </div>
  );
}

function NotFoundScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center p-8">
        <svg className="w-16 h-16 mx-auto mb-6 text-[var(--branch-text-muted)] opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="text-2xl font-bold text-[var(--branch-text)] mb-3">페이지를 찾을 수 없습니다</h1>
        <p className="text-[var(--branch-text-secondary)] text-sm">
          요청하신 지사 페이지가 존재하지 않거나 현재 서비스 중이 아닙니다.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function BranchHomePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [products, setProducts] = useState<PaginatedResponse<RecommendedPhoto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!slug) return;

    async function load() {
      setLoading(true);
      const [branchData, photosData] = await Promise.all([
        fetchBranchInfo(slug),
        fetchRecommendedPhotos(slug, { page: 1, size: 40 }),
      ]);

      if (!branchData) {
        setNotFound(true);
      } else {
        setBranch(branchData);
        setProducts(photosData);
      }
      setLoading(false);
    }

    load();
  }, [slug]);

  if (loading) return <LoadingScreen />;
  if (notFound || !branch) return <NotFoundScreen />;

  const theme = getTheme(branch.homepageDesign);
  const themeStyle = {
    ...themeToStyle(theme),
    fontFamily: theme.fontFamily,
  } as React.CSSProperties;

  const ThemeComponent = (() => {
    switch (theme.key) {
      case 'rose': return RoseHomePage;
      case 'navy': return NavyHomePage;
      default: return GreenHomePage;
    }
  })();

  return (
    <div style={themeStyle}>
      <ThemeComponent
        branch={branch}
        slug={slug}
        products={products!}
        onProductClick={(product: RecommendedPhoto) => {
          router.push(`/branch/${slug}/consult?productId=${product.id}`);
        }}
      />
    </div>
  );
}
