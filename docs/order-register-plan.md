# 주문 등록 페이지 개선 계획

> 상태: **디자인 검토 중** (2026-03-07 작성)
> 검토 완료 후 바로 구현 착수 가능

---

## 1. 배경

- 현재 주문 등록 페이지(`/admin/order-register`)는 텍스트 파싱 textarea 스텁만 존재
- 경쟁사(ebestflower.co.kr, 468.co.kr) 분석 기반으로 본격적인 주문 등록 폼 구현 필요

## 2. 경쟁사 분석 요약

### ebestflower.co.kr (베스트플라워) — 본부발주 폼
- PHP 기반 테이블 레이아웃, 30+ 상품 카테고리
- 옵션 상품 체크박스 8종 (케익/샴페인/사탕/초콜렛/떡케익/와인/빼빼로/기타)
- 경조사어 추가/삭제 + 자주쓰는 경조사어 검색
- 카드 메시지 24종 카테고리 + textarea
- 해피콜/현장사진 요청 옵션
- 배달시간: 즉시~22시 드롭다운 + 용도(예식/행사/도착/까지)
- 주소검색 팝업 + 병원/예식장 검색
- 모바일 미지원

### 468.co.kr (꽃비 파트너스)
- 로그인 후에도 주문등록 페이지 접근 제한 (권한 문제)
- PHP 기반, ebestflower와 유사한 전통적 폼 방식으로 추정

## 3. 디자인 산출물

| 파일 | 설명 | URL (dev) | URL (prod) |
|------|------|-----------|------------|
| 디자인 이미지 (PNG) | 전체 폼 스크린샷 | http://49.247.46.86:3030/api/downloads/order-register-design.png | https://seoulflower.co.kr/api/downloads/order-register-design.png |
| 파워포인트 (PPTX) | 9슬라이드 제안서 | http://49.247.46.86:3030/api/downloads/order-register-proposal.pptx | https://seoulflower.co.kr/api/downloads/order-register-proposal.pptx |
| 인터랙티브 목업 (HTML) | 브라우저에서 확인 | http://49.247.46.86:3030/api/downloads/order-register-mockup.html | https://seoulflower.co.kr/api/downloads/order-register-mockup.html |

### PPTX 슬라이드 구성 (9장)
1. 표지
2. 현황 요약 (우리 vs 꽃비 vs 베스트 비교 카드)
3. 폼 필드 비교표 (13개 항목)
4. 핵심 개선 포인트 10가지
5. 화면 구조 설계 (7개 섹션 와이어프레임)
6. 상품 카테고리 & 옵션 상품
7. 경조사어 프리셋 15종 + 카드 메시지 카테고리 24종
8. 기술 스택 & 4단계 구현 계획
9. 요약 — 6대 차별화 포인트

## 4. 화면 구조 (7섹션)

```
[메시지 파싱 바] — 카카오톡/SMS 붙여넣기로 자동 필드 채움

① 상품 선택     — 칩 버튼 18종, 상세 상품명, 수량, 사진
② 주문자 정보    — 이름, 전화, 핸드폰 (자동 하이픈)
③ 받는 분 정보   — 이름*, 전화*, 핸드폰
④ 배달 정보     — 날짜, 시간, 주소검색+상세, [조건부] 장례/예식 필드
⑤ 리본/카드     — 유형 선택, 경조사어 프리셋, 리본 좌/우, 카드 textarea
⑥ 금액         — 상품가, 배송비, 옵션 체크박스 8종, 총 결제액 자동합산
⑦ 추가 정보     — 해피콜/사진 체크박스, 요구사항 textarea
```

## 5. 핵심 개선 포인트 (경쟁사 대비)

| # | 개선 사항 | 설명 |
|---|----------|------|
| 1 | 카카오톡 메시지 파싱 | 경쟁사에 없는 고유 기능 |
| 2 | 모던 카드 기반 UI | 테이블 탈피, 큰 글씨 19px |
| 3 | 조건부 필드 표시 | 근조→장례식장/고인/상주, 축하→예식장/홀 |
| 4 | Daum 주소 인라인 검색 | 팝업 없이 인라인 자동완성 |
| 5 | 실시간 금액 계산 | 상품+옵션+배송비 자동 합산 |
| 6 | 경조사어 프리셋 | 10종 원클릭 선택 |
| 7 | 전화번호 자동 포맷 | 자동 하이픈 |
| 8 | 최근 발주 불러오기 | 이전 주문 기반 자동 채움 |
| 9 | zod 유효성 검사 | 실시간 에러 피드백 |
| 10 | 모바일 반응형 | 경쟁사 모바일 미지원 |

## 6. 구현 단계

### Phase 1: UI 구현 (바로 착수 가능)
- [x] zod 스키마 준비 (`src/lib/types/order-register.ts`)
- [x] API 함수 준비 (`src/lib/api/admin.ts` → `createOrder`)
- [ ] 주문 등록 폼 페이지 구현 (`src/app/admin/order-register/page.tsx`)
  - 7개 섹션 카드 레이아웃
  - react-hook-form + zod resolver
  - 칩 버튼 상품 선택
  - 조건부 필드 (근조/축하)
  - 금액 자동 계산
  - 전화번호 자동 포맷

### Phase 2: API 연동
- [ ] `POST /admin/orders` 백엔드 API 확인/구현
- [ ] Daum 주소 검색 API 연동 (Postcode API)
- [ ] 폼 제출 → API 호출 → 성공/에러 처리

### Phase 3: 고급 기능
- [ ] 카카오톡 메시지 파싱 엔진 (정규식 기반)
- [ ] 최근 발주 불러오기 (GET /admin/orders?size=5&sort=createdAt)
- [ ] 경조사어/카드 메시지 프리셋 데이터

### Phase 4: 배포 & QA
- [ ] 빌드 + 로컬 배포 (dev 3030)
- [ ] 프로덕션 배포 (seoulflower.co.kr)
- [ ] Git commit & push
- [ ] 실사용 테스트 & 피드백

## 7. 기술 스택

- **폼**: react-hook-form + @hookform/resolvers/zod
- **유효성 검사**: zod 스키마
- **UI**: shadcn/ui (Card, Input, Button, Badge, Select, Textarea)
- **상태**: TanStack Query (useMutation으로 주문 생성)
- **주소 검색**: Daum Postcode API (인라인)

## 8. 사전 준비된 코드

- `src/lib/types/order-register.ts` — zod 스키마 + 타입 + 상수 (상품목록, 옵션, 경조사어 등)
- `src/lib/api/admin.ts` — `createOrder()` 함수 추가
- `src/app/api/downloads/[filename]/route.ts` — 디자인 파일 다운로드 API

## 9. 백엔드 확인 필요 사항

- [ ] `POST /admin/orders` 엔드포인트 존재 여부 확인
- [ ] 요청 body 필드 명세 확인 (현재는 order detail 페이지 기반으로 추정)
- [ ] 응답 형식 확인

## 10. 재개 시 참고 사항 (Claude Code 컨텍스트 복원용)

> **디자인 검토가 완료되면 이 문서를 읽고 Phase 1부터 구현을 시작합니다.**

### 현재 관련 파일 위치
```
docs/order-register-plan.md          ← 이 문서
src/lib/types/order-register.ts      ← zod 스키마, 상수 18종 상품/8종 옵션/15종 경조사어/24종 카드 카테고리, 헬퍼 함수
src/lib/api/admin.ts                 ← createOrder(), listOrders(), getOrder() 함수 (line 189~)
src/app/admin/order-register/page.tsx ← 현재 스텁 (textarea만 있음, 이 파일을 교체)
src/app/api/downloads/[filename]/route.ts ← 디자인 파일 다운로드 API
public/downloads/                    ← 디자인 PNG, PPTX, HTML 목업
```

### 백엔드 기존 주문 필드 (GET /admin/orders/:id 응답 기준)
```
orderNo, id, status, receiverName, receiverPhone,
customerPhone, senderPhone, totalPrice,
addressLine1, addressLine2, deliveryAt, memo,
floristName, floristPhone, funeralHall, roomNumber,
deceasedName, chiefMourner, ribbonLeft, ribbonRight,
venue, hallName, createdAt, updatedAt
```

### 주문 상태값 (admin)
```
UNCONFIRMED, RECEIVED, PENDING, CONFIRMED, ASSIGNED,
ACCEPTED, PREPARING, DELIVERING, DELIVERED, CANCELED
```

### 경쟁사 ebestflower.co.kr 로그인 정보
- ID: best6434 / PW: b1599@
- 본부발주 URL: http://ebestflower.co.kr/gomenu.htm?urlkey=bonbalju

### 구현 시작 명령어
```bash
# docs/order-register-plan.md 를 읽고
# src/app/admin/order-register/page.tsx 를 새로 구현
# npm run build → 로컬 배포 → 프로덕션 배포 → git commit & push
```
