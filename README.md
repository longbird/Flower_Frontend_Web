# frontend-next

Flutter admin_web + partner 기능을 Next.js로 재구현한 웹 전용 프로젝트.

## Tech Stack

- Next.js 15 (App Router), TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- TanStack Query v5 (서버 상태), Zustand (클라이언트 상태)
- Vitest + React Testing Library (테스트)

## Quick Start

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 테스트 실행
npm run build        # 프로덕션 빌드
```

## Environment

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | API URL. 로컬: `http://49.247.46.86:8080`, 프로덕션: 빈 문자열 (nginx) |

## Routes

| Path | Description |
|------|-------------|
| `/admin/login` | 관리자 로그인 |
| `/admin/florists` | 화원 목록 |
| `/admin/florists/[id]` | 화원 상세 + 사진 갤러리 |
| `/partner/login` | 파트너 로그인 (2FA 지원) |
| `/partner/orders` | 파트너 주문 목록 |
| `/partner/orders/[id]` | 주문 상세 + 증빙 업로드 |
