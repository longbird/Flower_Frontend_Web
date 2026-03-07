# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

"달려라 꽃배달" 꽃 배달 서비스의 관리자(admin) + 파트너(partner) 웹 프론트엔드.
Flutter admin_web에서 Next.js로 컨버전된 프로젝트. 한국어 UI.

## 주요 명령어

```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint (next/core-web-vitals + typescript)
npm test             # vitest run (단일 실행)
npm run test:watch   # vitest (watch 모드)
npx vitest run src/__tests__/auth-store.test.ts   # 단일 테스트 파일 실행
```

## 기술 스택

- **Next.js 16** (App Router) + React 19 + TypeScript 5
- **Tailwind CSS 4** + **shadcn/ui** (new-york 스타일, lucide 아이콘)
- **TanStack Query v5** (서버 상태) + **Zustand** (클라이언트 인증 상태)
- **react-hook-form** + **zod** (폼 유효성 검사)
- **Vitest** + jsdom + React Testing Library (테스트)

## 아키텍처

### 두 개의 독립 앱 (라우트 그룹)

- `/admin/*` — 관리자 웹 (화원 관리, 상품 검색)
- `/partner/*` — 파트너 웹 (주문 접수/처리, 증빙 업로드)

각 앱은 독립된 레이아웃, 인증 가드, 인증 스토어를 가짐.

### 인증 흐름

| 구분 | 스토어 | API 클라이언트 | 토큰 갱신 |
|------|--------|---------------|----------|
| Admin | `useAuthStore` (`lib/auth/store.ts`) | `api()` (`lib/api/client.ts`) | 401시 자동 refresh |
| Partner | `usePartnerAuthStore` (`lib/auth/partner-store.ts`) | `partnerApi()` (`lib/api/partner.ts`) | 401시 logout |

- 인증 상태는 localStorage에 persist (`admin_auth`, `partner_auth` 키)
- Admin은 `AuthGuard` 컴포넌트로 보호, Partner는 layout에서 직접 리다이렉트
- Partner 로그인은 2FA(step1→step2) 또는 simple login 두 가지 경로

### API 프록시

- 개발: `NEXT_PUBLIC_API_BASE_URL`이 설정되면 Next.js rewrites로 `/api/proxy/*` → 백엔드 프록시 (CORS 우회)
- 프로덕션: 환경변수 빈 문자열, nginx가 same-origin 프록시 처리

### 상태 관리 패턴

- **서버 상태**: TanStack Query (`useQuery`로 데이터 fetch, `queryClient.invalidateQueries`로 캐시 무효화)
- **클라이언트 상태**: Zustand 스토어 (인증 전용, `getState()`로 API 클라이언트에서 동기적 접근)

### UI 컴포넌트

- `src/components/ui/` — shadcn/ui 컴포넌트 (직접 수정 가능하나 `npx shadcn add`로 추가)
- `src/components/admin/` — 관리자 전용 컴포넌트
- `cn()` 유틸리티 (`lib/utils.ts`) — clsx + tailwind-merge 조합

### 타입 시스템

- `src/lib/types/` — 도메인 타입 정의
  - `auth.ts` — AdminUser, LoginResponse, TokenRefreshResponse
  - `partner.ts` — PartnerUser, 2FA 응답, 주문, 증빙 업로드
  - `florist.ts` — 화원 정보, 사진 카테고리/등급
  - `order.ts` — 주문 상태, 주문 타입

### 테스트

- 테스트 파일 위치: `src/__tests__/`
- 설정: `vitest.config.ts` (jsdom 환경, `@/` alias, `src/__tests__/setup.ts`)
- API 모킹: `vi.fn()` + fetch mock 패턴
- 컴포넌트 테스트: React Testing Library

### 경로 alias

`@/*` → `./src/*` (tsconfig.json + vitest.config.ts 양쪽에 설정됨)
