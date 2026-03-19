export interface FloristSummary {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  sido?: string;
  gugun?: string;
  remarks?: string;
  status: string; // 'ACTIVE' | 'INACTIVE'
  branchId?: number | null;
  branchName?: string | null;
  serviceAreas?: string[];
  capabilities?: string[];
  source?: string;
  priority?: number;
  grade?: number;
  profileUrl?: string | null;
  rateMemo?: string | null;
  basePrice?: number | null;
}

export interface FloristListResponse {
  ok: boolean;
  data: FloristSummary[];
  total: number;
  page: number;
  size: number;
}

export type PhotoCategory =
  | 'CELEBRATION'
  | 'CONDOLENCE'
  | 'FLOWER'
  | 'FOLIAGE'
  | 'FRUIT'
  | 'OBJET'
  | 'ORIENTAL'
  | 'OTHER'
  | 'RICE'
  | 'WESTERN';

export type PhotoGrade = 'PREMIUM' | 'HIGH' | 'STANDARD';

export interface FloristPhoto {
  id: number;
  floristId: string;
  fileUrl: string;
  category: PhotoCategory;
  grade?: PhotoGrade | null;
  isHidden: boolean;
  isRecommended: boolean;
  costPrice?: number | null;
  sellingPrice?: number | null;
  memo?: string | null;
  description?: string | null;
  internalMemo?: string | null;
  createdAt?: string;
}

export interface FloristPhotoSearchItem {
  id: number;
  floristId: string;
  floristName: string;
  floristPhone?: string;
  floristAddress?: string;
  floristServiceAreas: string[];
  category: PhotoCategory;
  grade?: PhotoGrade | null;
  isHidden?: boolean;
  isRecommended: boolean;
  fileUrl: string;
  thumbnailUrl?: string;
  costPrice?: number | null;
  sellingPrice?: number | null;
  memo?: string | null;
  description?: string | null;
  internalMemo?: string | null;
  createdAt: string;
}

export interface FloristPhotoSearchResponse {
  ok: boolean;
  data: FloristPhotoSearchItem[];
  total: number;
  page: number;
  size: number;
}

export interface FloristPhotoListResponse {
  ok: boolean;
  data: FloristPhoto[];
  total: number;
}
