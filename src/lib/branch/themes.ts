/** 지사 홈페이지 테마 정의 */

export type ThemeKey = 'green' | 'green-landing' | 'rose' | 'navy' | 'editorial';

export interface BranchTheme {
  key: ThemeKey;
  name: string;
  description: string;
  fontFamily: string;
  headingFontFamily: string;
  serifFontFamily: string;
  variables: Record<string, string>;
}

const greenTheme: BranchTheme = {
  key: 'green',
  name: 'Modern Green',
  description: '깔끔하고 모던한 그린 톤',
  fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  headingFontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serifFontFamily: "'Playfair Display', Georgia, serif",
  variables: {
    '--branch-green': '#3D6B2E',
    '--branch-green-hover': '#2D5420',
    '--branch-green-light': '#E8F0E3',
    '--branch-bg': '#FFFFFF',
    '--branch-bg-alt': '#F5F5F2',
    '--branch-white': '#FFFFFF',
    '--branch-text': '#1C1C18',
    '--branch-text-secondary': '#5F5F58',
    '--branch-text-muted': '#94948C',
    '--branch-border': '#E5E3DE',
    '--branch-star': '#3D6B2E',
    '--branch-footer-bg': '#1C1F18',
    '--branch-serif-font': "'Playfair Display', Georgia, serif",
  },
};

const greenLandingTheme: BranchTheme = {
  key: 'green-landing',
  name: 'Green Landing',
  description: '랜딩 페이지 스타일 그린 톤',
  fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  headingFontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serifFontFamily: "'Playfair Display', Georgia, serif",
  variables: {
    '--branch-green': '#3D6B2E',
    '--branch-green-hover': '#2D5420',
    '--branch-green-light': '#E8F0E3',
    '--branch-bg': '#FFFFFF',
    '--branch-bg-alt': '#F5F5F2',
    '--branch-white': '#FFFFFF',
    '--branch-text': '#1C1C18',
    '--branch-text-secondary': '#5F5F58',
    '--branch-text-muted': '#94948C',
    '--branch-border': '#E5E3DE',
    '--branch-star': '#3D6B2E',
    '--branch-footer-bg': '#1C1F18',
    '--branch-serif-font': "'Playfair Display', Georgia, serif",
  },
};

const roseTheme: BranchTheme = {
  key: 'rose',
  name: 'Classic Rose',
  description: '따뜻하고 우아한 로즈 톤',
  fontFamily: "'Noto Serif KR', 'Pretendard Variable', serif",
  headingFontFamily: "'Noto Serif KR', 'Pretendard Variable', serif",
  serifFontFamily: "'Noto Serif KR', Georgia, serif",
  variables: {
    '--branch-green': '#C77D8F',
    '--branch-green-hover': '#A8596E',
    '--branch-green-light': '#F8EBF0',
    '--branch-bg': '#FEF9F4',
    '--branch-bg-alt': '#FDF3EC',
    '--branch-white': '#FFFFFF',
    '--branch-text': '#3D2C2E',
    '--branch-text-secondary': '#7A6365',
    '--branch-text-muted': '#A89496',
    '--branch-border': '#EDDBDF',
    '--branch-star': '#C77D8F',
    '--branch-footer-bg': '#2E1F21',
    '--branch-serif-font': "'Noto Serif KR', Georgia, serif",
  },
};

const navyTheme: BranchTheme = {
  key: 'navy',
  name: 'Navy Premium',
  description: '고급스럽고 신뢰감 있는 네이비 톤',
  fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  headingFontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serifFontFamily: "'Playfair Display', Georgia, serif",
  variables: {
    '--branch-green': '#1E3A5F',
    '--branch-green-hover': '#152C4A',
    '--branch-green-light': '#E3EBF3',
    '--branch-bg': '#FFFFFF',
    '--branch-bg-alt': '#F4F6F9',
    '--branch-white': '#FFFFFF',
    '--branch-text': '#1A1A2E',
    '--branch-text-secondary': '#555570',
    '--branch-text-muted': '#8888A0',
    '--branch-border': '#D8DCE5',
    '--branch-star': '#D4A853',
    '--branch-footer-bg': '#0F1A2E',
    '--branch-serif-font': "'Playfair Display', Georgia, serif",
  },
};

/** 에디토리얼 부티크 — 신규 레이아웃 (editorial-home.tsx). 그린 팔레트 기반에
 * 깊이감 있는 딥톤, 페이퍼 질감 bg, 워밍 악센트 확장 토큰 포함. */
const editorialTheme: BranchTheme = {
  key: 'editorial',
  name: 'Editorial Boutique',
  description: '에디토리얼 부티크 · 세리프 디스플레이와 스토리텔링 섹션',
  fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  headingFontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serifFontFamily: "'Playfair Display', Georgia, serif",
  variables: {
    '--branch-green': '#3D6B2E',
    '--branch-green-hover': '#2D5420',
    '--branch-green-light': '#E8F0E3',
    '--branch-bg': '#FAFAF6',
    '--branch-bg-alt': '#F2EFE8',
    '--branch-white': '#FFFFFF',
    '--branch-text': '#1C1C18',
    '--branch-text-secondary': '#5F5F58',
    '--branch-text-muted': '#6B6B63',
    '--branch-text-subtle': '#9E9E96',
    '--branch-border': '#DFDAD0',
    '--branch-star': '#3D6B2E',
    '--branch-footer-bg': '#161912',
    '--branch-serif-font': "'Playfair Display', Georgia, serif",
    '--branch-primary-deep': '#1F3816',
    '--branch-surface': '#FFFFFF',
    '--branch-bg-deep': '#1F241A',
    '--branch-wheat': '#C4A57B',
  },
};

const themes: Record<ThemeKey, BranchTheme> = {
  green: greenTheme,
  'green-landing': greenLandingTheme,
  rose: roseTheme,
  navy: navyTheme,
  editorial: editorialTheme,
};

/** 테마 키로 테마 설정 조회. 없으면 green 기본값 반환. */
export function getTheme(key?: string | null): BranchTheme {
  if (key && key in themes) {
    return themes[key as ThemeKey];
  }
  return themes.green;
}

/** CSS 변수를 inline style 객체로 변환 */
export function themeToStyle(theme: BranchTheme): React.CSSProperties {
  const style: Record<string, string> = {};
  for (const [k, v] of Object.entries(theme.variables)) {
    style[k] = v;
  }
  return style as React.CSSProperties;
}

/** 모든 테마 목록 (설정 UI용) */
export function getAllThemes(): BranchTheme[] {
  return [greenTheme, greenLandingTheme, roseTheme, navyTheme, editorialTheme];
}
