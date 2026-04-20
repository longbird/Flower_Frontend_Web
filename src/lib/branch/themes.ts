/** 지사 홈페이지 테마 정의 */

export type ThemeKey = 'green' | 'green-landing' | 'rose' | 'navy';

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

const greenLandingTheme: BranchTheme = {
  key: 'green-landing',
  name: 'Green Landing',
  description: '랜딩 페이지 스타일 그린 톤',
  fontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  headingFontFamily: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serifFontFamily: "'Playfair Display', Georgia, serif",
  variables: {
    '--branch-green': '#1E4632',
    '--branch-green-hover': '#0E2F20',
    '--branch-green-light': '#DEE8E1',
    '--branch-bg': '#F7F5F0',
    '--branch-bg-alt': '#ECE7DC',
    '--branch-white': '#FFFFFF',
    '--branch-text': '#0E1A14',
    '--branch-text-secondary': '#5E6659',
    '--branch-text-muted': '#5E6659',
    '--branch-text-subtle': '#9AA295',
    '--branch-border': '#DDD6C8',
    '--branch-star': '#1E4632',
    '--branch-footer-bg': '#0B1510',
    '--branch-serif-font': "'Playfair Display', Georgia, serif",
    '--branch-primary-deep': '#0B1F16',
    '--branch-surface': '#FFFFFF',
    '--branch-bg-deep': '#0E1A14',
    '--branch-wheat': '#D9C9AE',
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
    '--branch-green': '#A8596E',
    '--branch-green-hover': '#873E53',
    '--branch-green-light': '#F3DDE2',
    '--branch-bg': '#FAF2E9',
    '--branch-bg-alt': '#F3E4D6',
    '--branch-white': '#FFFFFF',
    '--branch-text': '#3A2629',
    '--branch-text-secondary': '#7A6365',
    '--branch-text-muted': '#7A6365',
    '--branch-text-subtle': '#A89496',
    '--branch-border': '#E8D4D2',
    '--branch-star': '#A8596E',
    '--branch-footer-bg': '#2E1F21',
    '--branch-serif-font': "'Noto Serif KR', Georgia, serif",
    '--branch-primary-deep': '#4C2430',
    '--branch-surface': '#FFFCF7',
    '--branch-bg-deep': '#2E1F21',
    '--branch-wheat': '#D4A853',
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
    '--branch-bg-alt': '#F1F4F9',
    '--branch-white': '#FFFFFF',
    '--branch-text': '#0F1A2E',
    '--branch-text-secondary': '#54607A',
    '--branch-text-muted': '#54607A',
    '--branch-text-subtle': '#8C94A6',
    '--branch-border': '#D6DCE5',
    '--branch-star': '#D4A853',
    '--branch-footer-bg': '#0A1322',
    '--branch-serif-font': "'Playfair Display', Georgia, serif",
    '--branch-primary-deep': '#0A1A30',
    '--branch-surface': '#FFFFFF',
    '--branch-bg-deep': '#0F1A2E',
    '--branch-wheat': '#D4A853',
  },
};

const themes: Record<ThemeKey, BranchTheme> = {
  green: greenTheme,
  'green-landing': greenLandingTheme,
  rose: roseTheme,
  navy: navyTheme,
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
  return [greenTheme, greenLandingTheme, roseTheme, navyTheme];
}
