# 고객 주문 확인 페이지 재설계 + 인수자 정보/사진 업로드

**Date:** 2026-04-14
**Status:** Draft (awaiting review)
**Scope:** 프론트엔드(이 repo) + 백엔드(별도 repo) 협업

---

## 1. 배경

현재 `/o/[code]` 고객 주문 확인 페이지는 주문 정보·진행 타임라인·배달 사진을 표시하지만, 다음이 부족하다:

1. **수정 요청 액션 없음** — 고객이 잘못된 정보를 발견했을 때 연결 수단이 footer 텍스트뿐이라 발견하기 어렵다.
2. **배송 완료 후 인수자 정보 미표시** — 누가 언제 어떤 관계로 받았는지, 현장 사진은 무엇인지 확인 불가.
3. **고객 확인(consent) 기록 없음** — 추후 분쟁 발생 시 고객이 주문 내용을 확인했다는 근거가 없다.
4. **상품명·발행방식·보내는분·배송장소** 등 목업에 있는 항목들이 응답에 포함되지 않거나 노출되지 않는다.

또한 배송사진 업로드는 현재 partner 페이지에만 존재한다. admin이 직접 처리하는 주문에는 업로드 수단이 없다.

## 2. 목표

- `/o/[code]` 페이지를 8개 섹션 카드 구조로 재구성하고, 목업 디자인의 정보 항목을 모두 흡수한다.
- 배송 완료 시 인수자 정보(배송사진, 현장사진, 인수자명, 인수시간, 관계)를 보여준다.
- 고객이 "주문 확인 완료"를 누르면 timestamp + 동의가 기록된다.
- "수정 요청" 버튼은 해당 지사 전화로 직접 연결된다 (`tel:` 링크).
- admin/partner 양쪽에서 사진 + 인수자 정보를 입력할 수 있다.

## 3. 비목표

- 고객이 페이지에서 직접 정보를 수정하는 기능 (수정은 모두 전화로 처리).
- 고객 인증/로그인 (현재처럼 단축 코드 토큰만 사용).
- 사진 편집/회전/주석.
- 알림(SMS/카톡) 발송.

## 4. 사용자 시나리오

### 4.1 고객 (주문 확인)
1. 지사로부터 받은 단축 URL 접속 → `/o/{code}`
2. 주문 정보 8개 섹션을 확인
3. 잘못된 부분이 있으면 [수정 요청] 버튼 → 지사 전화 연결
4. 정상이면 [주문 확인 완료] 버튼 → confirm 다이얼로그 → 확인 시점이 백엔드에 기록되고 버튼이 disabled로 전환
5. 배송 완료 후 다시 접속하면 인수자 정보 카드(배송사진, 현장사진, 인수자명/시간/관계)가 추가로 보임

### 4.2 Admin (직접 처리하는 주문)
1. `/admin/orders/[id]` 진입
2. 신규 "배송 사진 / 인수자 정보" 카드에서:
   - 배송사진/현장사진 탭 전환
   - 사진 추가 (presign → S3-like upload → complete)
   - 인수자명/시간/관계 입력 → 저장
3. (선택) [배송완료 처리] 버튼으로 주문 status를 DELIVERED로 전환

### 4.3 Partner (배정받은 주문)
1. `/partner/orders/[id]` 진입
2. 기존 "증빙 사진" 카드에 사진 type 탭이 추가됨
3. 사진 업로드 + 인수자 정보 입력 + 저장
4. 기존 "배송 완료" 버튼 동작 유지 (단, 인수자명/시간 미입력 시 confirm)

## 5. 화면 설계

### 5.1 고객 페이지 `/o/[code]` — 8개 섹션 카드

| # | 섹션 | 표시 조건 | 데이터 |
|---|---|---|---|
| 1 | 헤더 (지사명 + 주문번호 + 상태 배지) | 항상 | branchName, orderNo, status |
| 2 | 진행 타임라인 (compact) | 취소 외 | status |
| 3 | 상품 정보 | 항상 | productName, amountTotal |
| 4 | 배송 정보 | 항상 | desiredDatetime, funeralHall+hallName+roomNumber, deliveryAddress1+2 |
| 5 | 받는 분 | 항상 | receiverName, receiverPhone |
| 6 | 리본/메시지 | 있을 때 | cardMessage, ribbonRight, senderName, memo |
| 7 | 증빙 서류 (발행 방식) | 있을 때 | invoiceMethod |
| 8 | 인수자 정보 | DELIVERED일 때만 | deliveryPhotos, scenePhotos, recipientActualName, receivedAt, recipientRelationship |
| 9 | 액션 버튼 | customerConfirmedAt 없을 때 | branchPhone, code |
| 10 | Footer (지사 전화) | 항상 | branchName, branchPhone |

**액션 버튼 동작**
- **수정 요청**: `<a href={`tel:${branchPhone}`}>` outline 버튼. branchPhone 없으면 비활성화 + "지사 연락처 미등록" 안내.
- **주문 확인 완료**: 클릭 → confirm 다이얼로그("주문 내용에 동의하고 확인 완료하시겠습니까?") → `POST /public/order-link/{code}/confirm` → 성공 시 버튼 영역이 "✓ 확인 완료됨 (yyyy-mm-dd hh:mm)" 텍스트로 교체됨. 이미 confirmed라면 처음부터 텍스트 표시.

**인수자 정보 섹션**
- 배송사진/현장사진 두 그리드 (각 2열). 각 그룹 라벨 명시.
- 사진 없음이면 그룹 자체 숨김.
- 인수자명/인수시간/관계는 InfoRow로 표시. null이면 "-".

### 5.2 Admin 주문 상세 — 신규 카드

`/admin/orders/[id]`의 기존 카드들 아래에 추가:

```
┌─ 배송 사진 / 인수자 정보 ──────────────────┐
│  [탭] 배송사진(N) | 현장사진(M)              │
│  ┌────┬────┬────┬─────┐                    │
│  │img │img │img │  +  │  ← 추가 버튼        │
│  └────┴────┴────┴─────┘                    │
│                                             │
│  인수자명     [____________]                 │
│  인수시간     [____________] (datetime-local)│
│  관계         [____________]                 │
│                                             │
│              [저장] [배송완료 처리]          │
└─────────────────────────────────────────────┘
```

- 탭은 단순 state. 활성 탭의 proofType으로 업로드.
- 사진 클릭 시 lightbox는 v1에 포함하지 않음 (탭에서 미리보기 정도).
- [배송완료 처리]: status가 이미 DELIVERED면 숨김. 인수자명/시간 비어있으면 toast 안내 후 confirm.

### 5.3 Partner 주문 상세 — 기존 카드 확장

기존 "증빙 사진" 카드:
- 사진 추가 버튼 옆에 [탭] 배송사진/현장사진 추가
- 카드 하단에 "─── 인수자 정보 ───" 구분선 + 3필드 + [저장]
- 기존 "배송 완료" 버튼 동작 유지. 단, 인수자명/시간 빈 경우 confirm 후 진행.

## 6. 데이터 모델 (백엔드 변경)

### 6.1 orders 테이블 신규 컬럼
```sql
ALTER TABLE orders
  ADD COLUMN recipient_actual_name      VARCHAR(100) NULL,
  ADD COLUMN received_at                DATETIME     NULL,
  ADD COLUMN recipient_relationship     VARCHAR(50)  NULL,
  ADD COLUMN customer_confirmed_at      DATETIME     NULL,
  ADD COLUMN customer_confirmation_ip   VARCHAR(45)  NULL;
```

### 6.2 proofs 테이블
- `proof_type` 컬럼이 enum이라면 `SCENE_PHOTO` 추가. string이면 별도 변경 없음.
- 기존 `DELIVERY_PHOTO`는 그대로 유지.

### 6.3 백엔드 NestJS DTO 주의
`feedback_backend_dto_whitelist.md`에 따라 NestJS whitelist가 DTO에 없는 필드를 자동 제거한다. 신규 필드는 모두 명시적으로 추가:
- `CustomerOrderViewDto` (응답)
- `RecipientInfoDto` (요청 body)
- `ConfirmOrderDto` (요청 body, 빈 body 가능)
- admin/partner proof DTO

## 7. API 설계

### 7.1 신규 엔드포인트

| Method | Path | Body | 응답 | 권한 |
|---|---|---|---|---|
| POST | `/admin/orders/{id}/proofs/presign` | `{fileName, contentType, size, proofType}` | `{uploadUrl, fileUrl, fileKey, headers}` | admin |
| POST | `/admin/orders/{id}/proofs/complete` | `{proofType, fileUrl, fileKey?}` | `{ok:true}` | admin |
| GET | `/admin/orders/{id}/proofs` | - | `{ok, items: ProofItem[]}` | admin |
| PATCH | `/admin/orders/{id}/recipient-info` | `{name, receivedAt, relationship}` | `{ok:true}` | admin |
| PATCH | `/partner/orders/{id}/recipient-info` | `{name, receivedAt, relationship}` | `{ok:true}` | partner |
| POST | `/public/order-link/{token}/confirm` | `{}` | `{ok:true, customerConfirmedAt}` | public + token |

### 7.2 기존 엔드포인트 확장

`GET /public/order-link/{token}` 응답에 다음 필드 추가:
```ts
{
  // ... 기존 필드
  order: {
    // ... 기존
    productName?: string | null;
    senderName?: string | null;
    invoiceMethod?: string | null;
    funeralHall?: string | null;
    hallName?: string | null;
    roomNumber?: string | null;
    recipientActualName?: string | null;
    receivedAt?: string | null;
    recipientRelationship?: string | null;
    customerConfirmedAt?: string | null;
  };
  deliveryPhotos: DeliveryPhoto[];   // proofType=DELIVERY_PHOTO
  scenePhotos: DeliveryPhoto[];      // proofType=SCENE_PHOTO  ← 신규
}
```

### 7.3 멱등성
- `customer_confirmed_at`은 한 번 기록되면 재호출 시 무시 (200 + 기존 값 반환). idempotent.
- proofs 업로드는 기존 partner 패턴(`Idempotency-Key` 헤더) 그대로 사용.

## 8. 프론트엔드 변경 파일

### 8.1 수정
```
src/lib/api/order-link.ts
  - CustomerOrderView 타입 확장
  - confirmCustomerOrder(code) 추가

src/lib/api/partner.ts
  - updatePartnerRecipientInfo(orderId, payload) 추가

src/app/o/[code]/page.tsx
  - 8섹션 카드 구조로 재구성
  - 액션 버튼 영역 추가
  - 인수자 정보 섹션 추가 (DELIVERED 시)

src/app/admin/orders/[id]/page.tsx
  - OrderDeliveryCard 컴포넌트 통합

src/app/partner/orders/[id]/page.tsx
  - 증빙 카드에 탭 + 인수자 폼 추가
```

### 8.2 신규
```
src/lib/api/admin-orders.ts
  - presignAdminProof, completeAdminProof, listAdminProofs
  - updateAdminRecipientInfo

src/components/admin/order-delivery-card.tsx
  - 탭 + 사진 그리드 + 인수자 폼 + 저장

src/components/customer/recipient-info-section.tsx
  - 두 사진 그룹 + 인수자 정보 표시
```

### 8.3 테스트
```
src/__tests__/customer-order-view.test.tsx
  - DELIVERED 상태에서 인수자 카드 렌더
  - 미확인 상태에서 액션 버튼 렌더, confirm 후 disabled로 전환
  - 수정 요청 버튼 href=tel:{phone}
  - branchPhone 없을 때 안내
  - 8개 섹션 표시 조건 검증

src/__tests__/admin-order-delivery-card.test.tsx
  - 탭 전환 시 proofType 분리
  - 인수자 폼 저장 호출 검증

src/__tests__/partner-order-recipient.test.tsx
  - 인수자 정보 저장
  - 배송완료 시 미입력 confirm
```

## 9. 단계별 구현 순서

```
Phase 1 (BE) ──► Phase 2 (FE API) ──► Phase 3,4,5 (FE UI, 병렬) ──► Phase 6 ──► Phase 7
```

| Phase | 작업 | 의존 |
|---|---|---|
| 1 | 백엔드 마이그레이션 + DTO + 6 신규 엔드포인트 + 응답 확장 + 테스트 서버 배포 | - |
| 2 | FE 타입/API 레이어 (`order-link.ts`, `admin-orders.ts`, `partner.ts`) | Phase 1 |
| 3 | 고객 페이지 `/o/[code]` 재구성 + 단위 테스트 | Phase 2 |
| 4 | Admin 업로드 카드 + 단위 테스트 | Phase 2 |
| 5 | Partner 카드 확장 + 단위 테스트 | Phase 2 |
| 6 | 테스트 서버 e2e 시나리오 검증 (admin/partner 업로드 → 고객 페이지 확인 → confirm) | Phase 3,4,5 |
| 7 | 프로덕션 배포 (사용자 승인 후 `bash deploy/deploy-zerodt.sh prod`) | Phase 6 |

## 10. 위험 요소 & 대응

| 위험 | 대응 |
|---|---|
| NestJS whitelist가 신규 응답 필드를 제거 | Phase 1에서 Postman/curl로 응답 키 직접 확인 |
| 기존 `proofs.proof_type=DELIVERY_PHOTO` 데이터와의 호환 | 마이그레이션 없음. 기존 데이터는 그대로 DELIVERY_PHOTO로 노출됨 |
| 고객이 같은 token으로 confirm을 여러 번 호출 | idempotent 처리 (첫 호출만 기록) |
| 인수자명/시간 비어있는 채로 배송완료 처리 | confirm 다이얼로그로 사용자 의사 재확인 |
| `branchPhone` 미등록 지사 | 수정 요청 버튼 disabled + 안내 텍스트 |
| 사진 업로드 중 페이지 이탈 | uploading 상태 동안 버튼 disabled (기존 partner 패턴 유지) |

## 11. 명시적으로 다루지 않는 것 (out of scope, 후속 작업)

- 고객 페이지에서 사진 lightbox/zoom
- 사진 다운로드 버튼
- "확인 완료" 후 SMS/카톡 통지
- 수정 요청 통화 로깅
- 모바일 카메라 직접 캡처 UI 최적화
