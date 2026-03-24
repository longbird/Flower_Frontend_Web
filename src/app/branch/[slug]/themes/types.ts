import type { BranchInfo, RecommendedPhoto, PaginatedResponse } from '@/lib/branch/types';

/** 모든 테마 컴포넌트가 받는 공통 Props */
export interface BranchThemeProps {
  branch: BranchInfo;
  slug: string;
  products: PaginatedResponse<RecommendedPhoto>;
  onProductClick: (product: RecommendedPhoto) => void;
}
