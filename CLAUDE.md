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

- 개발/프로덕션 모두: `NEXT_PUBLIC_API_BASE_URL=http://<backend>:8080` 설정 → Next.js rewrites로 `/api/proxy/*` → 백엔드 프록시
- 개발: `NEXT_PUBLIC_API_BASE_URL=http://49.247.46.86:8080` (로컬 .env.local)
- 프로덕션: `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080` (서버 .env.local)
- **주의**: 이 값이 비어있으면 API 호출이 Next.js 라우터로 가서 404 발생 (nginx에는 백엔드 API 경로 프록시 없음)

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

## 서버 인프라 & 백업

### 서버 구성

| 서버 | 호스트 | 용도 |
|------|--------|------|
| 로컬 (dev) | `49.247.46.86:3030` | 개발/테스트 서버 |
| 원격 (prod) | `seoulflower.co.kr` | 프로덕션 서버 |

### 원격 서버 디스크

| 디바이스 | 용량 | 마운트 | 용도 |
|----------|------|--------|------|
| `/dev/vda1` | 48GB | `/` | OS + 앱 + DB |
| `/dev/vdb` | 100GB | `/mnt/backup` | 백업 전용 스토리지 (fstab 등록, 자동 마운트) |

### 원격 서버 데이터 위치

| 데이터 | 위치 | 크기 |
|--------|------|------|
| 화원 이미지 원본 | `/data/run-flower/uploads/florist_photos/` | ~5.9GB (12,455개) |
| Run Flower DB (MariaDB, Docker) | `docker_mariadb_data` 볼륨 | - |
| BRM 카드결제 DB (PostgreSQL 16) | 네이티브 설치 | - |

### 백업 스케줄 (원격 서버 crontab)

| 시간 | 스크립트 | 대상 | 보관 |
|------|----------|------|------|
| 02:00 | `/home/blueadm/backend/docker/backup.sh` | Run Flower MariaDB → `.sql.gz` | 7일 |
| 03:00 | `/home/blueadm/brmcard/scripts/backup.sh --cleanup` | BRM PostgreSQL → `.sql.gz` | 30일 |
| 05:00 | `/mnt/backup/backup-to-storage.sh` | 이미지 + DB 백업 → 별도 스토리지 rsync | - |

### 백업 스케줄 (로컬 서버 crontab)

| 시간 | 스크립트 | 대상 | 보관 |
|------|----------|------|------|
| 04:00 | `~/backups/sync-remote-backups.sh` | 원격 DB 백업 → 로컬 `~/backups/remote-seoulflower/` rsync | 30일 |

### 백업 저장 위치 요약

| 백업 대상 | 원격 1차 (같은 디스크) | 원격 2차 (별도 스토리지) | 로컬 (분산) |
|-----------|:---:|:---:|:---:|
| 화원 이미지 (5.9GB) | - | `/mnt/backup/images/` | - |
| Run Flower DB | `backend/docker/backups/` | `/mnt/backup/db/run_flower/` | `~/backups/remote-seoulflower/run_flower/` |
| BRM DB | `brmcard/backups/` | `/mnt/backup/db/brmcard/` | `~/backups/remote-seoulflower/brmcard/` |

## 배포 규칙 (CRITICAL)

### 배포 방법 (수동 배포 절차)

```bash
# 1. 로컬에서 아카이브 생성 (node_modules, .next, .git, .env.local 제외)
tar czf /tmp/frontend_deploy.tar.gz --exclude=node_modules --exclude=.next --exclude=.git --exclude=.env.local .

# 2. 서버로 전송
scp /tmp/frontend_deploy.tar.gz blueadm@49.247.206.190:/home/blueadm/frontend_web_deploy.tar.gz

# 3. 서버에서 추출 + 빌드 + 재시작 (.env.local 보존!)
ssh blueadm@49.247.206.190 'cd /home/blueadm/frontend_web && \
  cp .env.local /tmp/.env.local.bak && \
  rm -rf app components lib public src *.json *.ts *.js *.mjs 2>/dev/null; \
  tar xzf /home/blueadm/frontend_web_deploy.tar.gz && \
  cp /tmp/.env.local.bak .env.local && \
  npm install --production=false && \
  npx next build && \
  pm2 restart admin-web'
```

### 절대 금지 사항

- **`.env.local`을 덮어쓰지 마라** — 서버의 `.env.local`은 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080` 값이 필수. 빈 값이면 API 호출 전체 실패
- **`echo "..." > .env.local`로 새로 생성하지 마라** — 기존 값을 백업 후 복원할 것
- **`--exclude=.env.local`을 빼먹지 마라** — tar 아카이브에 로컬 .env.local이 포함되면 서버 설정을 덮어씀

### 프로덕션 .env.local 필수 값

```bash
API_BASE_URL=http://127.0.0.1:8080
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080
```

### 배포 후 검증

```bash
# 1. PM2 상태 확인
ssh blueadm@49.247.206.190 'pm2 status admin-web'

# 2. 헬스체크 (307 = 로그인 리다이렉트, 정상)
ssh blueadm@49.247.206.190 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3030/admin/login'

# 3. API 프록시 확인 (401 = 인증 필요, 프록시 정상)
ssh blueadm@49.247.206.190 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3030/api/proxy/admin/partners/florists'

# 4. .env.local 값 확인
ssh blueadm@49.247.206.190 'cat /home/blueadm/frontend_web/.env.local'
```

### 아키텍처 요약

```
Browser → nginx (443) → Next.js (3030)
                            ├─ 페이지 렌더링 (/admin/*, /partner/*)
                            └─ API 프록시 (/api/proxy/*) → Backend (8080)
```

- nginx에는 백엔드 API 경로 프록시가 **없음** (uploads, public 제외)
- 모든 API 호출은 Next.js rewrites를 통해 백엔드로 프록시됨
- `NEXT_PUBLIC_API_BASE_URL`이 비어있으면 rewrites 비활성화 → API 404
