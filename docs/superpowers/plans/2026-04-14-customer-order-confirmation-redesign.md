# 고객 주문 확인 페이지 재설계 구현 플랜

> **에이전트 작업자용:** 필수 — superpowers:subagent-driven-development(서브에이전트 가능 시) 또는 superpowers:executing-plans 스킬로 이 플랜을 실행합니다. 단계는 체크박스(`- [ ]`) 문법으로 진행상황을 추적합니다.

**참조 spec:** `docs/superpowers/specs/2026-04-14-customer-order-confirmation-redesign-design.md`

**Goal:** `/o/[code]` 고객 주문 확인 페이지를 10블록 카드 구조로 재구성하고, 배송완료 시 인수자 정보(사진+필드)를 표시하며, admin/partner 양쪽에서 사진+인수자 정보를 입력할 수 있게 한다.

**Architecture:**
- 고객 페이지는 섹션별 컴포넌트로 분해하고 `page.tsx`는 조립만 담당한다.
- Admin/Partner 업로드는 각각 재사용 가능한 카드 컴포넌트(`OrderDeliveryCard`)로 추출한다.
- 신규 API는 기존 `api<T>` / `partnerApi<T>` 헬퍼 재사용, 새 도메인 파일은 `src/lib/api/admin-orders.ts` 하나만 추가한다.

**Tech Stack:** Next.js 16 + React 19 + TypeScript + TanStack Query v5 + Vitest + React Testing Library + shadcn/ui

**선행 요건 (BE Phase 1, 별도 repo)**
이 플랜은 백엔드 Phase 1 작업이 **테스트 서버에 배포된 이후** 시작 가능하다. BE 작업은 spec §9 Phase 1 수용 기준에 정의되어 있다:
- orders 테이블에 4개 컬럼 추가
- `proofs.proof_type`에 `'SCENE_PHOTO'` 지원
- 신규 엔드포인트 6개 구현 (spec §7.1)
- 기존 엔드포인트 응답 확장 (spec §7.2)

BE가 완료되면 테스트 서버에서 다음 curl 실행하여 검증:
```bash
curl -s http://49.247.46.86:8080/public/order-link/{테스트토큰} | jq '.data | keys'
curl -s http://49.247.46.86:8080/public/order-link/{테스트토큰} | jq '.data.order | keys'
```
응답에 `productName`, `senderName`, `invoiceMethod`, `funeralHall`, `hallName`, `roomNumber`, `recipientActualName`, `receivedAt`, `recipientRelationship`, `customerConfirmedAt`, `scenePhotos`가 모두 포함되어야 한다.

**파일 구조 (이 플랜에서 다루는 FE 파일)**

생성:
```
src/lib/api/admin-orders.ts
src/components/admin/order-delivery-card.tsx
src/components/customer/recipient-info-section.tsx
src/components/customer/order-info-sections.tsx
src/components/customer/action-buttons.tsx
src/__tests__/customer-order-view.test.tsx
src/__tests__/admin-order-delivery-card.test.tsx
src/__tests__/partner-order-recipient.test.tsx
src/__tests__/order-link-api.test.ts
src/__tests__/admin-orders-api.test.ts
```

수정:
```
src/lib/api/order-link.ts          (타입 확장 + confirmCustomerOrder 함수)
src/lib/api/partner.ts             (updatePartnerRecipientInfo 함수)
src/lib/types/partner.ts           (ProofItem 확장 선택)
src/app/o/[code]/page.tsx          (섹션 컴포넌트 조립)
src/app/admin/orders/[id]/page.tsx (OrderDeliveryCard 통합)
src/app/partner/orders/[id]/page.tsx (탭 + 인수자 폼)
```

**각 파일의 단일 책임**
- `order-link.ts`: 공개 API 호출 + 타입 정의
- `admin-orders.ts`: admin 주문 관련 API만 (proofs + recipient-info)
- `order-info-sections.tsx`: 고객 페이지의 순수 표시용 섹션 컴포넌트 모음 (상품/배송/받는분/리본/증빙)
- `recipient-info-section.tsx`: 배송완료 시에만 표시되는 인수자 정보 섹션 (사진 + 필드) — 자체적으로 status 게이팅
- `action-buttons.tsx`: 수정 요청 + 확인 완료 버튼 로직 (confirm mutation 포함)
- `order-delivery-card.tsx`: admin 페이지 + partner 페이지에서 공용 가능한 업로드/편집 카드

---

## Chunk 1: API 레이어 (Phase 2)

### Task 1: `order-link.ts` 타입 확장 및 confirmCustomerOrder 함수

**Files:**
- Modify: `src/lib/api/order-link.ts`
- Test: `src/__tests__/order-link-api.test.ts` (신규)

- [ ] **Step 1: 실패 테스트 작성 — 타입이 새 필드를 수락하는지**

`src/__tests__/order-link-api.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchCustomerOrderView, confirmCustomerOrder, type CustomerOrderView } from '@/lib/api/order-link';

const originalFetch = global.fetch;

describe('order-link API', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('fetchCustomerOrderView', () => {
    it('parses extended order fields', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            orderId: 1,
            editable: true,
            branchName: '강남지사',
            branchPhone: '02-1234-5678',
            order: {
              orderNo: 'ORD-001',
              receiverName: '김철수',
              receiverPhone: '010-0000-0000',
              deliveryAddress1: '서울시 강남구',
              status: 'DELIVERED',
              productName: '동양란',
              senderName: '한국전기기술인협회',
              invoiceMethod: '세금계산서',
              funeralHall: '고려대병원',
              hallName: '장례식장',
              roomNumber: '202호',
              recipientActualName: '박상덕',
              receivedAt: '2025-12-22T16:07:00',
              recipientRelationship: '친척',
              customerConfirmedAt: null,
            },
            deliveryPhotos: [{ id: 1, url: '/uploads/a.jpg', createdAt: '2025-12-22T16:00:00' }],
            scenePhotos: [{ id: 2, url: '/uploads/b.jpg', createdAt: '2025-12-22T16:05:00' }],
          },
        }),
      } as Response);

      const result = await fetchCustomerOrderView('ABC12345');
      expect(result.status).toBe('ok');
      if (result.status !== 'ok') throw new Error('unexpected');
      const view: CustomerOrderView = result.data;
      expect(view.order.productName).toBe('동양란');
      expect(view.order.senderName).toBe('한국전기기술인협회');
      expect(view.order.recipientActualName).toBe('박상덕');
      expect(view.scenePhotos).toHaveLength(1);
      expect(view.deliveryPhotos).toHaveLength(1);
    });

    it('handles missing optional fields', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            orderId: 1,
            editable: true,
            order: {
              receiverName: '김철수',
              receiverPhone: '010-0000-0000',
              deliveryAddress1: '서울',
              status: 'RECEIVED',
            },
            deliveryPhotos: [],
            scenePhotos: [],
          },
        }),
      } as Response);

      const result = await fetchCustomerOrderView('XYZ');
      expect(result.status).toBe('ok');
      if (result.status !== 'ok') throw new Error('unexpected');
      expect(result.data.order.productName).toBeUndefined();
      expect(result.data.scenePhotos).toEqual([]);
    });
  });

  describe('confirmCustomerOrder', () => {
    it('POSTs to confirm endpoint and returns timestamp', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, customerConfirmedAt: '2026-04-14T10:30:00' }),
      } as Response);

      const result = await confirmCustomerOrder('ABC12345');
      expect(result.ok).toBe(true);
      expect(result.customerConfirmedAt).toBe('2026-04-14T10:30:00');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/public/order-link/ABC12345/confirm'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('returns existing timestamp on re-call (idempotent)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, customerConfirmedAt: '2026-04-13T09:00:00' }),
      } as Response);

      const result = await confirmCustomerOrder('ABC12345');
      expect(result.customerConfirmedAt).toBe('2026-04-13T09:00:00');
    });

    it('throws on non-ok response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        json: async () => ({ message: 'server error' }),
      } as Response);

      await expect(confirmCustomerOrder('ABC')).rejects.toThrow();
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npx vitest run src/__tests__/order-link-api.test.ts`
Expected: FAIL. `confirmCustomerOrder` export 없음, 타입에 새 필드 없음.

- [ ] **Step 3: `order-link.ts` 타입 확장**

`src/lib/api/order-link.ts` 전면 수정:
```typescript
/**
 * 고객 확인 URL (/o/[code]) API 헬퍼
 *
 * 백엔드의 /public/order-link/{token} 엔드포인트를 호출.
 * token 위치에는 단축 코드(8자) 또는 레거시 긴 토큰(48자) 모두 사용 가능.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ? '/api/proxy' : '';

export interface DeliveryPhoto {
  id: number;
  url: string;
  createdAt: string;
}

export interface CustomerOrderView {
  orderId: number;
  editable: boolean;
  branchName?: string | null;
  branchPhone?: string | null;
  order: {
    orderNo?: string | null;
    orderType?: string | null;
    receiverName: string;
    receiverPhone: string;
    deliveryAddress1: string;
    deliveryAddress2?: string | null;
    deliveryMemo?: string | null;
    cardMessage?: string | null;
    ribbonRight?: string | null;
    memo?: string | null;
    desiredDate?: string | null;
    desiredTimeSlot?: string | null;
    desiredDatetime?: string | null;
    status: string;
    amountTotal?: number | null;
    createdAt?: string | null;
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
  deliveryPhotos: DeliveryPhoto[];
  scenePhotos: DeliveryPhoto[];
}

export interface ConfirmOrderResponse {
  ok: boolean;
  customerConfirmedAt: string;
}

/**
 * 고객 주문 확인 페이지 데이터 조회.
 */
export async function fetchCustomerOrderView(
  code: string,
): Promise<
  | { status: 'ok'; data: CustomerOrderView }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
> {
  try {
    const res = await fetch(`${API_BASE}/public/order-link/${encodeURIComponent(code)}`, {
      cache: 'no-store',
    });
    if (res.status === 404 || res.status === 410) {
      return { status: 'not_found' };
    }
    if (!res.ok) {
      return { status: 'error', message: `HTTP ${res.status}` };
    }
    const json = await res.json();
    if (!json?.ok || !json?.data) {
      return { status: 'not_found' };
    }
    const data = json.data as CustomerOrderView;
    // BE가 빈 배열 대신 undefined를 줄 수 있으므로 방어적으로 처리
    return {
      status: 'ok',
      data: {
        ...data,
        deliveryPhotos: data.deliveryPhotos ?? [],
        scenePhotos: data.scenePhotos ?? [],
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'network error';
    return { status: 'error', message };
  }
}

/**
 * 고객이 주문 내용에 동의하고 확인 완료 처리.
 * 멱등: 이미 확인 완료된 경우 기존 timestamp를 반환.
 */
export async function confirmCustomerOrder(code: string): Promise<ConfirmOrderResponse> {
  const res = await fetch(`${API_BASE}/public/order-link/${encodeURIComponent(code)}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = String(data.message);
    } catch {}
    throw new Error(message);
  }
  return (await res.json()) as ConfirmOrderResponse;
}

/**
 * 배달 사진 원본 URL 해석 (상대경로 → 절대 프록시 경로).
 */
export function resolvePhotoUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (base) {
    if (url.startsWith('/')) return `${base}${url}`;
    return `${base}/${url}`;
  }
  return url;
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npx vitest run src/__tests__/order-link-api.test.ts`
Expected: PASS (3건).

- [ ] **Step 5: 기존 사용부 회귀 확인 (breaking type change 검증)**

`deliveryPhotos`가 `DeliveryPhoto[] | undefined`에서 `DeliveryPhoto[]`로 바뀌었다. `undefined` 체크하는 코드가 있으면 deadcode 경고 유발 가능.

Run:
```bash
# 1. 타입 체크
npx tsc --noEmit

# 2. deliveryPhotos/scenePhotos 사용 위치 확인
```
그 후 Grep 툴로 `deliveryPhotos\|scenePhotos` 검색 → 현재 `src/app/o/[code]/page.tsx`만 사용 확인. 해당 파일의 `{deliveryPhotos && deliveryPhotos.length > 0 && ...}` 블록은 항상 배열이므로 `{deliveryPhotos.length > 0 && ...}`로 단순화 가능 (이 Task에서는 Chunk 2에서 전면 재작성하므로 수정하지 않음).

```bash
# 3. 전체 테스트 실행 (cross-file 회귀 방지)
npm test
```
Expected: 모든 기존 테스트 PASS, 신규 `order-link-api.test.ts` PASS, 타입 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/api/order-link.ts src/__tests__/order-link-api.test.ts
git commit -m "feat(order-link): CustomerOrderView 타입 확장 + confirmCustomerOrder 함수"
```

---

### Task 2: `admin-orders.ts` 신규 — admin proofs + recipient-info API

**Files:**
- Create: `src/lib/api/admin-orders.ts`
- Test: `src/__tests__/admin-orders-api.test.ts` (신규)

- [ ] **Step 1: 실패 테스트 작성**

`src/__tests__/admin-orders-api.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  presignAdminProof,
  completeAdminProof,
  listAdminProofs,
  updateAdminRecipientInfo,
} from '@/lib/api/admin-orders';

// auth store 모킹
vi.mock('@/lib/auth/store', () => ({
  useAuthStore: {
    getState: () => ({
      accessToken: 'test-token',
      refreshToken: 'refresh',
      setTokens: vi.fn(),
      logout: vi.fn(),
    }),
  },
}));

const originalFetch = global.fetch;

describe('admin-orders API', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('presignAdminProof POSTs with proofType', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        uploadUrl: 'https://s3/put',
        fileUrl: '/uploads/x.jpg',
        fileKey: 'x.jpg',
        headers: {},
      }),
    } as Response);

    const res = await presignAdminProof(123, {
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
      size: 1024,
      proofType: 'DELIVERY_PHOTO',
    });
    expect(res.uploadUrl).toBe('https://s3/put');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/admin/orders/123/proofs/presign');
    expect(call[1].method).toBe('POST');
    const body = JSON.parse(call[1].body);
    expect(body.proofType).toBe('DELIVERY_PHOTO');
  });

  it('completeAdminProof sends proofType', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);

    await completeAdminProof(123, {
      proofType: 'SCENE_PHOTO',
      fileUrl: '/uploads/a.jpg',
      fileKey: 'a.jpg',
    });
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.proofType).toBe('SCENE_PHOTO');
  });

  it('listAdminProofs returns items', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        items: [
          { proofType: 'DELIVERY_PHOTO', fileUrl: '/a.jpg' },
          { proofType: 'SCENE_PHOTO', fileUrl: '/b.jpg' },
        ],
      }),
    } as Response);

    const res = await listAdminProofs(123);
    expect(res.items).toHaveLength(2);
    expect(res.items[0].proofType).toBe('DELIVERY_PHOTO');
  });

  it('updateAdminRecipientInfo PATCHes with full payload', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);

    await updateAdminRecipientInfo(123, {
      name: '박상덕',
      receivedAt: '2026-04-14T10:00:00',
      relationship: '친척',
    });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/admin/orders/123/recipient-info');
    expect(call[1].method).toBe('PATCH');
    const body = JSON.parse(call[1].body);
    expect(body).toEqual({ name: '박상덕', receivedAt: '2026-04-14T10:00:00', relationship: '친척' });
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npx vitest run src/__tests__/admin-orders-api.test.ts`
Expected: FAIL — 파일 없음.

- [ ] **Step 3: `admin-orders.ts` 구현**

`src/lib/api/admin-orders.ts`:
```typescript
import { api } from '@/lib/api/client';
import type { ProofItem } from '@/lib/types/partner';

export type ProofType = 'DELIVERY_PHOTO' | 'SCENE_PHOTO';

export interface AdminPresignRequest {
  fileName: string;
  contentType: string;
  size: number;
  proofType: ProofType;
}

export interface AdminPresignResponse {
  uploadUrl: string;
  fileUrl: string;
  fileKey: string;
  headers?: Record<string, string>;
}

export interface AdminCompleteProofRequest {
  proofType: ProofType;
  fileUrl: string;
  fileKey?: string;
}

export interface RecipientInfoPayload {
  name: string;
  receivedAt: string;
  relationship: string;
}

function idempotencyKey() {
  return crypto.randomUUID();
}

export async function presignAdminProof(
  orderId: number,
  payload: AdminPresignRequest,
): Promise<AdminPresignResponse> {
  return api<AdminPresignResponse>(`/admin/orders/${orderId}/proofs/presign`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(payload),
  });
}

export async function completeAdminProof(
  orderId: number,
  payload: AdminCompleteProofRequest,
): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/admin/orders/${orderId}/proofs/complete`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify(payload),
  });
}

export async function listAdminProofs(
  orderId: number,
): Promise<{ ok: boolean; items: ProofItem[] }> {
  return api<{ ok: boolean; items: ProofItem[] }>(`/admin/orders/${orderId}/proofs`);
}

export async function updateAdminRecipientInfo(
  orderId: number,
  payload: RecipientInfoPayload,
): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/admin/orders/${orderId}/recipient-info`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * presigned URL로 파일 PUT 업로드.
 * partner.ts의 uploadToPresignedUrl과 동일 로직이지만 의존성 분리 목적으로 복사.
 */
export async function uploadAdminProofFile(
  uploadUrl: string,
  file: File,
  headers?: Record<string, string>,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) throw new Error('파일 업로드 실패');
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npx vitest run src/__tests__/admin-orders-api.test.ts`
Expected: PASS (4건).

- [ ] **Step 5: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/api/admin-orders.ts src/__tests__/admin-orders-api.test.ts
git commit -m "feat(admin-orders): proofs 업로드 + recipient-info API 헬퍼"
```

---

### Task 3: `partner.ts`에 `updatePartnerRecipientInfo` 추가

**Files:**
- Modify: `src/lib/api/partner.ts`
- Test: 기존 `src/__tests__/admin-orders-api.test.ts`에 비슷한 케이스 추가하거나 별도 파일

- [ ] **Step 1: 실패 테스트 작성**

`src/__tests__/partner-recipient-api.test.ts` (신규):
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updatePartnerRecipientInfo } from '@/lib/api/partner';

vi.mock('@/lib/auth/partner-store', () => ({
  usePartnerAuthStore: {
    getState: () => ({
      accessToken: 'ptoken',
      logout: vi.fn(),
    }),
  },
}));

const originalFetch = global.fetch;

describe('updatePartnerRecipientInfo', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('PATCHes /partner/orders/{id}/recipient-info', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    } as Response);

    await updatePartnerRecipientInfo(42, {
      name: '김영희',
      receivedAt: '2026-04-14T11:00:00',
      relationship: '본인',
    });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('/partner/orders/42/recipient-info');
    expect(call[1].method).toBe('PATCH');
    const body = JSON.parse(call[1].body);
    expect(body.name).toBe('김영희');
    expect(body.relationship).toBe('본인');
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npx vitest run src/__tests__/partner-recipient-api.test.ts`
Expected: FAIL — export 없음.

- [ ] **Step 3: `partner.ts`에 함수 + 타입 추가**

`src/lib/api/partner.ts` 하단(기존 `listProofs` 뒤)에 추가:
```typescript
// ─── Recipient Info ──────────────────────────────────────
export interface PartnerRecipientInfoPayload {
  name: string;
  receivedAt: string;
  relationship: string;
}

export async function updatePartnerRecipientInfo(
  orderId: number,
  payload: PartnerRecipientInfoPayload,
): Promise<{ ok: boolean }> {
  return partnerApi<{ ok: boolean }>(`/partner/orders/${orderId}/recipient-info`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npx vitest run src/__tests__/partner-recipient-api.test.ts`
Expected: PASS.

- [ ] **Step 5: 전체 타입 체크 + 기존 테스트 회귀 확인**

Run: `npx tsc --noEmit && npm test`
Expected: 모든 테스트 PASS, 타입 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add src/lib/api/partner.ts src/__tests__/partner-recipient-api.test.ts
git commit -m "feat(partner): updatePartnerRecipientInfo API 함수 추가"
```

---

(Chunk 1 끝)

---

## Chunk 2: 고객 페이지 `/o/[code]` 재구성 (Phase 3)

### Task 4a: 공유 유틸 — `_utils.ts`

**Files:**
- Create: `src/components/customer/_utils.ts`

3개 컴포넌트에서 중복되지 않도록 `formatDateTime` / `formatAmount` 유틸을 먼저 추출.

- [ ] **Step 1: 유틸 파일 생성**

`src/components/customer/_utils.ts`:
```typescript
export function formatDateTime(s?: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatAmount(n?: number | null): string {
  if (n == null) return '';
  return `${n.toLocaleString('ko-KR')}원`;
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/components/customer/_utils.ts
git commit -m "feat(customer): 날짜/금액 포맷 공유 유틸"
```

---

### Task 4: 정보 섹션 컴포넌트 분리 — `order-info-sections.tsx`

**Files:**
- Create: `src/components/customer/order-info-sections.tsx`

이 파일은 순수 표시용 섹션 컴포넌트들을 모은다 (상품/배송/받는분/리본/증빙). props만 받고 JSX 반환, 상태 없음. 테스트는 Task 8에서 통합 테스트로 커버.

- [ ] **Step 1: 컴포넌트 파일 생성**

`src/components/customer/order-info-sections.tsx`:
```tsx
import { Card, CardContent } from '@/components/ui/card';
import type { CustomerOrderView } from '@/lib/api/order-link';
import { formatAmount, formatDateTime } from '@/components/customer/_utils';

type Order = CustomerOrderView['order'];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-slate-500 shrink-0 w-20">{label}</span>
      <span className="text-sm text-slate-800 text-right flex-1 break-keep">{value}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

export function ProductInfoSection({ order }: { order: Order }) {
  return (
    <SectionCard title="상품 정보">
      <InfoRow label="상품명" value={order.productName || '-'} />
      {order.amountTotal != null && <InfoRow label="금액" value={formatAmount(order.amountTotal)} />}
    </SectionCard>
  );
}

export function DeliveryInfoSection({ order }: { order: Order }) {
  const venue = [order.funeralHall, order.hallName, order.roomNumber].filter(Boolean).join(' ');
  const address = [order.deliveryAddress1, order.deliveryAddress2].filter(Boolean).join(' ');
  return (
    <SectionCard title="배송 정보">
      <InfoRow label="배송일시" value={formatDateTime(order.desiredDatetime) || '-'} />
      <InfoRow label="배송장소" value={venue || '-'} />
      <InfoRow label="배송주소" value={address || '-'} />
    </SectionCard>
  );
}

export function ReceiverInfoSection({ order }: { order: Order }) {
  return (
    <SectionCard title="받는 분">
      <InfoRow label="받는 고객명" value={order.receiverName || '-'} />
      <InfoRow label="연락처" value={order.receiverPhone || '-'} />
    </SectionCard>
  );
}

export function RibbonMessageSection({ order }: { order: Order }) {
  const hasAny = order.cardMessage || order.ribbonRight || order.senderName || order.memo;
  if (!hasAny) return null;
  return (
    <SectionCard title="리본 / 메시지">
      {order.cardMessage && <InfoRow label="경조사어" value={order.cardMessage} />}
      {order.ribbonRight && <InfoRow label="리본(우)" value={order.ribbonRight} />}
      {order.senderName && <InfoRow label="보내는 분" value={order.senderName} />}
      {order.memo && <InfoRow label="메모" value={order.memo} />}
    </SectionCard>
  );
}

export function InvoiceInfoSection({ order }: { order: Order }) {
  if (!order.invoiceMethod) return null;
  return (
    <SectionCard title="증빙 서류">
      <InfoRow label="발행 방식" value={order.invoiceMethod} />
    </SectionCard>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/components/customer/order-info-sections.tsx
git commit -m "feat(customer): 주문 정보 섹션 컴포넌트 분리"
```

---

### Task 5: 인수자 정보 섹션 — `recipient-info-section.tsx`

**Files:**
- Create: `src/components/customer/recipient-info-section.tsx`

- [ ] **Step 1: 컴포넌트 생성**

`src/components/customer/recipient-info-section.tsx`:
```tsx
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { resolvePhotoUrl, type CustomerOrderView, type DeliveryPhoto } from '@/lib/api/order-link';
import { formatDateTime } from '@/components/customer/_utils';

const DELIVERED_STATUSES = new Set(['DELIVERED', 'ORDER_DELIVERED']);

function PhotoGrid({ photos, label }: { photos: DeliveryPhoto[]; label: string }) {
  if (photos.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-medium text-slate-600 mb-2">{label}</h3>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((p) => (
          <div
            key={p.id}
            className="relative aspect-square rounded-lg overflow-hidden border border-slate-200"
          >
            <Image
              src={resolvePhotoUrl(p.url)}
              alt={label}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover"
              unoptimized
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecipientInfoSection({ view }: { view: CustomerOrderView }) {
  if (!DELIVERED_STATUSES.has(view.order.status)) return null;

  const hasPhotos = view.deliveryPhotos.length > 0 || view.scenePhotos.length > 0;
  const hasFields =
    view.order.recipientActualName || view.order.receivedAt || view.order.recipientRelationship;
  if (!hasPhotos && !hasFields) return null;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">인수자 정보</h2>

        <PhotoGrid photos={view.deliveryPhotos} label="배송 사진" />
        <PhotoGrid photos={view.scenePhotos} label="현장 사진" />

        {hasFields && (
          <dl className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100">
            <div className="flex justify-between">
              <dt className="text-xs text-slate-500 w-20">인수자</dt>
              <dd className="text-sm text-slate-800 text-right flex-1">
                {view.order.recipientActualName || '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-xs text-slate-500 w-20">인수시간</dt>
              <dd className="text-sm text-slate-800 text-right flex-1">
                {formatDateTime(view.order.receivedAt) || '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-xs text-slate-500 w-20">관계</dt>
              <dd className="text-sm text-slate-800 text-right flex-1">
                {view.order.recipientRelationship || '-'}
              </dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/components/customer/recipient-info-section.tsx
git commit -m "feat(customer): 인수자 정보 섹션 컴포넌트 (DELIVERED 시만)"
```

---

### Task 6: 액션 버튼 — `action-buttons.tsx`

**Files:**
- Create: `src/components/customer/action-buttons.tsx`

- [ ] **Step 1: 컴포넌트 생성**

`src/components/customer/action-buttons.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { confirmCustomerOrder } from '@/lib/api/order-link';
import { formatDateTime } from '@/components/customer/_utils';

interface ActionButtonsProps {
  code: string;
  branchPhone?: string | null;
  customerConfirmedAt?: string | null;
}

export function ActionButtons({ code, branchPhone, customerConfirmedAt }: ActionButtonsProps) {
  const queryClient = useQueryClient();
  const [confirmedAt, setConfirmedAt] = useState<string | null>(customerConfirmedAt ?? null);

  const confirmMutation = useMutation({
    mutationFn: () => confirmCustomerOrder(code),
    onSuccess: (res) => {
      setConfirmedAt(res.customerConfirmedAt);
      toast.success('주문 확인이 완료되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['customer-order-view', code] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : '확인 처리 실패');
    },
  });

  const handleConfirm = () => {
    if (!window.confirm('주문 내용에 동의하고 확인 완료하시겠습니까?')) return;
    confirmMutation.mutate();
  };

  const canCall = !!branchPhone;
  const effectiveConfirmedAt = confirmedAt ?? customerConfirmedAt ?? null;

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        {/* 수정 요청 — 항상 표시. canCall 여부로 두 가지 변형 분기 */}
        {canCall ? (
          <Button asChild variant="outline" className="w-full h-12 text-base">
            <a href={`tel:${branchPhone}`} aria-label="수정 요청 전화">
              수정 요청 (전화)
            </a>
          </Button>
        ) : (
          <Button variant="outline" className="w-full h-12 text-base" disabled>
            지사 연락처 미등록
          </Button>
        )}

        {/* 주문 확인 완료 — confirmed 여부에 따라 버튼 또는 텍스트 */}
        {effectiveConfirmedAt ? (
          <div className="w-full h-12 flex items-center justify-center rounded-md bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200">
            ✓ 확인 완료됨 ({formatDateTime(effectiveConfirmedAt)})
          </div>
        ) : (
          <Button
            className="w-full h-12 text-base"
            onClick={handleConfirm}
            disabled={confirmMutation.isPending}
          >
            {confirmMutation.isPending ? '처리 중...' : '주문 확인 완료'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 필요한 shadcn 컴포넌트 존재 확인**

Run: Glob으로 `src/components/ui/button.tsx` 존재 확인.
`Button`의 `asChild` prop은 shadcn 기본이므로 존재해야 함. 없으면 `npx shadcn@latest add button`로 추가.

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/components/customer/action-buttons.tsx
git commit -m "feat(customer): 수정 요청 + 확인 완료 액션 버튼"
```

---

### Task 7: `/o/[code]/page.tsx` 재구성

**Files:**
- Modify: `src/app/o/[code]/page.tsx`

- [ ] **Step 1: page.tsx 전면 재작성**

`src/app/o/[code]/page.tsx`:
```tsx
'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fetchCustomerOrderView, type CustomerOrderView } from '@/lib/api/order-link';
import {
  ProductInfoSection,
  DeliveryInfoSection,
  ReceiverInfoSection,
  RibbonMessageSection,
  InvoiceInfoSection,
} from '@/components/customer/order-info-sections';
import { RecipientInfoSection } from '@/components/customer/recipient-info-section';
import { ActionButtons } from '@/components/customer/action-buttons';

const STATUS_LABELS: Record<string, string> = {
  UNCONFIRMED: '접수 확인 중',
  ORDER_RECEIVED: '주문 접수',
  RECEIVED: '주문 접수',
  PENDING: '대기',
  CONFIRMED: '확인',
  ASSIGNED: '화원 배정',
  PARTNER_ACCEPTED: '화원 수락',
  ACCEPTED: '화원 수락',
  PREPARING: '상품 제작 중',
  DELIVERING: '배송 중',
  DELIVERED: '배송 완료',
  ORDER_DELIVERED: '배송 완료',
  CANCELED: '주문 취소',
  ORDER_CANCELED: '주문 취소',
  NEW: '요청 접수',
  IN_PROGRESS: '처리 중',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

const STATUS_COLORS: Record<string, string> = {
  UNCONFIRMED: 'bg-gray-100 text-gray-800',
  ORDER_RECEIVED: 'bg-sky-100 text-sky-800',
  RECEIVED: 'bg-sky-100 text-sky-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ASSIGNED: 'bg-indigo-100 text-indigo-800',
  PARTNER_ACCEPTED: 'bg-violet-100 text-violet-800',
  ACCEPTED: 'bg-violet-100 text-violet-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  DELIVERING: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  ORDER_DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELED: 'bg-red-100 text-red-800',
  ORDER_CANCELED: 'bg-red-100 text-red-800',
  NEW: 'bg-sky-100 text-sky-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const TIMELINE_STEPS_ORDER = [
  { key: 'received', label: '주문 접수', matches: ['UNCONFIRMED', 'ORDER_RECEIVED', 'RECEIVED', 'PENDING', 'CONFIRMED', 'NEW'] },
  { key: 'assigned', label: '화원 배정', matches: ['ASSIGNED', 'PARTNER_ACCEPTED', 'ACCEPTED'] },
  { key: 'preparing', label: '상품 제작', matches: ['PREPARING', 'IN_PROGRESS'] },
  { key: 'delivering', label: '배송 중', matches: ['DELIVERING'] },
  { key: 'delivered', label: '배송 완료', matches: ['DELIVERED', 'ORDER_DELIVERED', 'COMPLETED'] },
];

const TIMELINE_STEPS_CONSULT = [
  { key: 'new', label: '요청 접수', matches: ['NEW'] },
  { key: 'in_progress', label: '처리 중', matches: ['IN_PROGRESS'] },
  { key: 'completed', label: '완료', matches: ['COMPLETED'] },
];

function getTimelineSteps(orderType?: string | null) {
  return orderType === 'CONSULT_REQUEST' ? TIMELINE_STEPS_CONSULT : TIMELINE_STEPS_ORDER;
}

function currentStepIndex(status: string, steps: typeof TIMELINE_STEPS_ORDER): number {
  const idx = steps.findIndex((s) => s.matches.includes(status));
  return idx < 0 ? 0 : idx;
}

function isCancelled(status: string): boolean {
  return status === 'CANCELED' || status === 'CANCELLED' || status === 'ORDER_CANCELED';
}

function formatBranchPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, '');
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  return phone;
}

export default function CustomerOrderPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer-order-view', code],
    queryFn: () => fetchCustomerOrderView(code),
    retry: false,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          주문 정보를 불러오는 중...
        </CardContent>
      </Card>
    );
  }

  if (isError || !data || data.status === 'error') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-600 font-medium">오류가 발생했습니다</p>
          <p className="text-xs text-slate-500 mt-2">잠시 후 다시 시도해 주세요</p>
        </CardContent>
      </Card>
    );
  }

  if (data.status === 'not_found') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-700 font-medium">주문 정보를 찾을 수 없습니다</p>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            확인 URL이 만료되었거나 존재하지 않는 주문입니다.
            <br />
            재조회가 필요하시면 고객센터로 문의해 주세요.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <OrderView view={data.data} code={code} />;
}

function OrderView({ view, code }: { view: CustomerOrderView; code: string }) {
  const { order, branchName, branchPhone } = view;
  const statusLabel = STATUS_LABELS[order.status] || order.status;
  const statusColor = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800';
  const cancelled = isCancelled(order.status);
  const timelineSteps = getTimelineSteps(order.orderType);
  const stepIdx = currentStepIndex(order.status, timelineSteps);
  const formattedBranchPhone = formatBranchPhone(branchPhone);

  return (
    <div className="space-y-4">
      {/* 1. 헤더 */}
      <header className="mb-6 text-center">
        <h1 className="text-lg font-bold text-slate-800">{branchName || '달려라 꽃배달'}</h1>
        <p className="text-xs text-slate-500 mt-1">주문 진행 상황</p>
      </header>

      {/* 상단 요약 */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">주문번호</span>
            <span className="text-xs text-slate-700 font-mono">{order.orderNo || '-'}</span>
          </div>
          <Badge className={cn('text-xs font-medium', statusColor)}>{statusLabel}</Badge>
        </CardContent>
      </Card>

      {/* 2. 진행 타임라인 */}
      {!cancelled && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">진행 상황</h2>
            <ol className="relative border-l-2 border-slate-200 ml-2">
              {timelineSteps.map((step, i) => {
                const active = i <= stepIdx;
                return (
                  <li key={step.key} className="mb-4 ml-4 last:mb-0">
                    <div
                      className={cn(
                        'absolute w-3 h-3 rounded-full -left-[7px]',
                        active ? 'bg-emerald-500' : 'bg-slate-300',
                      )}
                    />
                    <p
                      className={cn(
                        'text-sm',
                        active ? 'text-slate-800 font-medium' : 'text-slate-400',
                      )}
                    >
                      {step.label}
                    </p>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* 3-7. 정보 섹션들 */}
      <ProductInfoSection order={order} />
      <DeliveryInfoSection order={order} />
      <ReceiverInfoSection order={order} />
      <RibbonMessageSection order={order} />
      <InvoiceInfoSection order={order} />

      {/* 8. 인수자 정보 (DELIVERED 시만) */}
      <RecipientInfoSection view={view} />

      {/* 9. 액션 버튼 */}
      <ActionButtons
        code={code}
        branchPhone={branchPhone}
        customerConfirmedAt={order.customerConfirmedAt}
      />

      {/* 10. Footer */}
      <div className="pt-4 pb-2 text-center text-xs text-slate-500">
        {branchName && <div className="font-medium">{branchName}</div>}
        {formattedBranchPhone ? (
          <div className="mt-1">
            문의:{' '}
            <a href={`tel:${branchPhone}`} className="text-slate-700 hover:underline">
              {formattedBranchPhone}
            </a>
          </div>
        ) : (
          <div className="mt-1">문의는 주문 접수 지사로 연락 주세요.</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/o/[code]/page.tsx
git commit -m "feat(customer): /o/[code] 페이지를 10블록 카드 구조로 재구성"
```

---

### Task 8: 고객 페이지 통합 테스트

**Files:**
- Create: `src/__tests__/customer-order-view.test.tsx`

이 테스트는 `fetchCustomerOrderView`와 `confirmCustomerOrder`를 모킹하고 `CustomerOrderPage`를 렌더링하여 조건부 섹션 표시 및 액션 버튼 동작을 검증한다.

- [ ] **Step 1: 테스트 파일 작성**

`src/__tests__/customer-order-view.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// CRITICAL: vi.mock 호이스팅으로 import보다 먼저 실행됨. page.tsx의 named import가 이 mock에 바인딩됨.
// vi.spyOn(namespace) 패턴은 ESM 바인딩을 바꾸지 못하므로 사용 금지.
vi.mock('@/lib/api/order-link', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/order-link')>(
    '@/lib/api/order-link',
  );
  return {
    ...actual,
    fetchCustomerOrderView: vi.fn(),
    confirmCustomerOrder: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// next/image는 jsdom에서 fill 포지셔닝 문제로 단순 img로 교체
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import CustomerOrderPage from '@/app/o/[code]/page';
import {
  fetchCustomerOrderView,
  confirmCustomerOrder,
  type CustomerOrderView,
} from '@/lib/api/order-link';

const mockFetch = fetchCustomerOrderView as ReturnType<typeof vi.fn>;
const mockConfirm = confirmCustomerOrder as ReturnType<typeof vi.fn>;

function renderPage(code = 'ABC12345') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CustomerOrderPage params={Promise.resolve({ code })} />
    </QueryClientProvider>,
  );
}

function baseView(
  overrides: Partial<CustomerOrderView['order']> = {},
  rootOverrides: Partial<CustomerOrderView> = {},
): CustomerOrderView {
  return {
    orderId: 1,
    editable: true,
    branchName: '강남지사',
    branchPhone: '02-1234-5678',
    order: {
      orderNo: 'ORD-001',
      receiverName: '김철수',
      receiverPhone: '010-0000-0000',
      deliveryAddress1: '서울시 강남구',
      status: 'RECEIVED',
      productName: '동양란',
      amountTotal: 78000,
      ...overrides,
    },
    deliveryPhotos: [],
    scenePhotos: [],
    ...rootOverrides,
  };
}

describe('CustomerOrderPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockConfirm.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('RECEIVED 상태에서 인수자 카드는 렌더되지 않는다', async () => {
    mockFetch.mockResolvedValue({
      status: 'ok',
      data: baseView({ status: 'RECEIVED' }),
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('동양란')).toBeInTheDocument());
    expect(screen.queryByText('인수자 정보')).not.toBeInTheDocument();
  });

  it('DELIVERED 상태에서 인수자 카드 + 사진 + 필드 렌더', async () => {
    mockFetch.mockResolvedValue({
      status: 'ok',
      data: baseView(
        {
          status: 'DELIVERED',
          recipientActualName: '박상덕',
          receivedAt: '2025-12-22T16:07:00',
          recipientRelationship: '친척',
        },
        {
          deliveryPhotos: [{ id: 1, url: '/uploads/a.jpg', createdAt: '2025-12-22T16:00:00' }],
          scenePhotos: [{ id: 2, url: '/uploads/b.jpg', createdAt: '2025-12-22T16:05:00' }],
        },
      ),
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('인수자 정보')).toBeInTheDocument());
    expect(screen.getByText('배송 사진')).toBeInTheDocument();
    expect(screen.getByText('현장 사진')).toBeInTheDocument();
    expect(screen.getByText('박상덕')).toBeInTheDocument();
    expect(screen.getByText('친척')).toBeInTheDocument();
  });

  it('미확인 상태: [주문 확인 완료] 버튼 렌더, 클릭 시 confirm POST', async () => {
    mockFetch.mockResolvedValue({
      status: 'ok',
      data: baseView({ customerConfirmedAt: null }),
    });
    mockConfirm.mockResolvedValue({
      ok: true,
      customerConfirmedAt: '2026-04-14T10:30:00',
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /주문 확인 완료/ })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /주문 확인 완료/ }));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith('ABC12345'));
    await waitFor(() => expect(screen.getByText(/확인 완료됨/)).toBeInTheDocument());
  });

  it('이미 confirmed 상태: 처음부터 텍스트만 표시', async () => {
    mockFetch.mockResolvedValue({
      status: 'ok',
      data: baseView({ customerConfirmedAt: '2026-04-13T09:00:00' }),
    });

    renderPage();
    await waitFor(() => expect(screen.getByText(/확인 완료됨/)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /주문 확인 완료/ })).not.toBeInTheDocument();
  });

  it('수정 요청 링크는 confirmed 여부 무관 항상 표시', async () => {
    mockFetch.mockResolvedValue({
      status: 'ok',
      data: baseView({ customerConfirmedAt: '2026-04-13T09:00:00' }),
    });

    renderPage();
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /수정 요청 전화/ });
      expect(link).toHaveAttribute('href', 'tel:02-1234-5678');
    });
  });

  it('branchPhone null + confirmed 조합: 수정 요청 비활성 + 확인 텍스트 동시 표시', async () => {
    mockFetch.mockResolvedValue({
      status: 'ok',
      data: baseView({ customerConfirmedAt: '2026-04-13T09:00:00' }, { branchPhone: null }),
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/확인 완료됨/)).toBeInTheDocument();
      expect(screen.getByText(/지사 연락처 미등록/)).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: /수정 요청 전화/ })).not.toBeInTheDocument();
  });

  it('상품명 + 배송 장소 + 보내는 분 + 발행 방식 섹션 표시 (매트릭스)', async () => {
    mockFetch.mockResolvedValue({
      status: 'ok',
      data: baseView({
        productName: '동양란',
        senderName: '한국전기기술인협회',
        invoiceMethod: '세금계산서',
        funeralHall: '고려대병원',
        hallName: '장례식장',
        roomNumber: '202호',
      }),
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('동양란')).toBeInTheDocument());
    expect(screen.getByText('한국전기기술인협회')).toBeInTheDocument();
    expect(screen.getByText('세금계산서')).toBeInTheDocument();
    expect(screen.getByText(/고려대병원/)).toBeInTheDocument();
  });

  it('데이터 로딩 중 안내 표시', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/주문 정보를 불러오는 중/)).toBeInTheDocument();
  });

  it('not_found 상태 처리', async () => {
    mockFetch.mockResolvedValue({ status: 'not_found' });
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/주문 정보를 찾을 수 없습니다/)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: 테스트 실행 → 통과 확인**

Run: `npx vitest run src/__tests__/customer-order-view.test.tsx`
Expected: 7 PASS. 실패 시 mock, waitFor, 접근자 검토.

- [ ] **Step 3: 전체 테스트 회귀 확인**

Run: `npm test`
Expected: 전체 PASS.

- [ ] **Step 4: 커밋**

```bash
git add src/__tests__/customer-order-view.test.tsx
git commit -m "test(customer): /o/[code] 통합 테스트 (섹션 + 액션 버튼)"
```

(Chunk 2 끝)

---

## Chunk 3: Admin 배송 사진 / 인수자 정보 카드 (Phase 4)

### Task 9: `OrderDeliveryCard` 컴포넌트

**Files:**
- Create: `src/components/admin/order-delivery-card.tsx`

이 카드는 admin 주문 상세 페이지에서 사용된다. 내부 상태로 탭(DELIVERY/SCENE), 사진 목록(useQuery), 인수자 폼을 관리한다.

**Scope 주석**: spec §5.2의 `[배송완료 처리]` 버튼(주문 status → DELIVERED 전환)은 이 Task에서 **제외**한다. status 전환은 별도 admin API(`POST /admin/orders/{id}/status` 등)가 필요하고, 이 spec에는 해당 엔드포인트가 명시되어 있지 않다. v1에서는 사진+인수자 정보 입력까지만 지원하고, 배송 완료 전환은 기존 admin 경로(상태 변경 UI가 있다면 그곳)로 위임한다. 추후 작업으로 분리.

- [ ] **Step 1: 컴포넌트 생성**

`src/components/admin/order-delivery-card.tsx`:
```tsx
'use client';

import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  presignAdminProof,
  completeAdminProof,
  listAdminProofs,
  updateAdminRecipientInfo,
  uploadAdminProofFile,
  type ProofType,
} from '@/lib/api/admin-orders';
import type { ProofItem } from '@/lib/types/partner';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

function proofUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

/**
 * ISO 문자열(`2025-12-22T16:07:00Z` 또는 `2025-12-22T16:07:00+09:00`)을
 * `<input type="datetime-local">` 이 기대하는 로컬 시각 문자열(`YYYY-MM-DDTHH:mm`)로 변환.
 * 단순 slice(0,16)은 Z 접미사 있을 때 UTC → 로컬 변환을 건너뛰어 시간이 틀린다.
 */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface OrderDeliveryCardProps {
  orderId: number;
  initialRecipientName?: string | null;
  initialReceivedAt?: string | null;
  initialRecipientRelationship?: string | null;
}

export function OrderDeliveryCard({
  orderId,
  initialRecipientName,
  initialReceivedAt,
  initialRecipientRelationship,
}: OrderDeliveryCardProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProofType>('DELIVERY_PHOTO');

  // 인수자 폼 상태
  const [recipientName, setRecipientName] = useState(initialRecipientName ?? '');
  const [receivedAt, setReceivedAt] = useState(isoToLocalInput(initialReceivedAt));
  const [relationship, setRelationship] = useState(initialRecipientRelationship ?? '');

  // 초기값이 서버에서 나중에 도착하는 경우 동기화
  useEffect(() => {
    if (initialRecipientName != null) setRecipientName(initialRecipientName);
    if (initialReceivedAt != null) setReceivedAt(isoToLocalInput(initialReceivedAt));
    if (initialRecipientRelationship != null) setRelationship(initialRecipientRelationship);
  }, [initialRecipientName, initialReceivedAt, initialRecipientRelationship]);

  const { data: proofsRes } = useQuery({
    queryKey: ['admin-order-proofs', orderId],
    queryFn: () => listAdminProofs(orderId),
  });

  const proofs: ProofItem[] = proofsRes?.items ?? [];
  const deliveryPhotos = proofs.filter((p) => p.proofType === 'DELIVERY_PHOTO');
  const scenePhotos = proofs.filter((p) => p.proofType === 'SCENE_PHOTO');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const presign = await presignAdminProof(orderId, {
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        proofType: activeTab,
      });
      await uploadAdminProofFile(presign.uploadUrl, file, presign.headers);
      await completeAdminProof(orderId, {
        proofType: activeTab,
        fileUrl: presign.fileUrl,
        fileKey: presign.fileKey,
      });
      toast.success('사진이 업로드되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin-order-proofs', orderId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const saveRecipient = useMutation({
    mutationFn: () =>
      updateAdminRecipientInfo(orderId, {
        name: recipientName,
        receivedAt: receivedAt ? new Date(receivedAt).toISOString() : '',
        relationship,
      }),
    onSuccess: () => {
      toast.success('인수자 정보가 저장되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin-order', String(orderId)] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : '저장 실패');
    },
  });

  const activePhotos = activeTab === 'DELIVERY_PHOTO' ? deliveryPhotos : scenePhotos;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">배송 사진 / 인수자 정보</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 탭 */}
        <div className="flex gap-2 border-b border-slate-200">
          <TabButton
            active={activeTab === 'DELIVERY_PHOTO'}
            onClick={() => setActiveTab('DELIVERY_PHOTO')}
          >
            배송사진 ({deliveryPhotos.length})
          </TabButton>
          <TabButton
            active={activeTab === 'SCENE_PHOTO'}
            onClick={() => setActiveTab('SCENE_PHOTO')}
          >
            현장사진 ({scenePhotos.length})
          </TabButton>
          <div className="flex-1" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? '업로드 중...' : '사진 추가'}
          </Button>
        </div>

        {/* 사진 그리드 */}
        {activePhotos.length === 0 ? (
          <div className="text-center py-8 text-slate-300 text-sm">
            등록된 사진이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {activePhotos.map((p, i) => (
              <div
                key={`${p.fileUrl}-${i}`}
                className="relative aspect-square rounded-lg overflow-hidden border border-slate-200"
              >
                <Image
                  src={proofUrl(p.fileUrl)}
                  alt={`${activeTab === 'DELIVERY_PHOTO' ? '배송' : '현장'}사진 ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="33vw"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}

        {/* 인수자 폼 */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <h3 className="text-sm font-medium text-slate-700">인수자 정보</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="recipientName" className="text-xs">인수자명</Label>
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="홍길동"
              />
            </div>
            <div>
              <Label htmlFor="receivedAt" className="text-xs">인수시간</Label>
              <Input
                id="receivedAt"
                type="datetime-local"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="relationship" className="text-xs">관계</Label>
              <Input
                id="relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="본인/가족/친척 등"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => saveRecipient.mutate()}
              disabled={saveRecipient.isPending}
            >
              {saveRecipient.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm border-b-2 transition-colors ${
        active
          ? 'border-emerald-500 text-emerald-700 font-medium'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: 필요한 shadcn 컴포넌트 확인 (Input, Label)**

Run: Glob으로 `src/components/ui/input.tsx`, `src/components/ui/label.tsx` 존재 확인.
없으면: `npx shadcn@latest add input label`

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add src/components/admin/order-delivery-card.tsx
git commit -m "feat(admin): OrderDeliveryCard 컴포넌트 (탭 + 사진 + 인수자 폼)"
```

---

### Task 10: `/admin/orders/[id]` 페이지에 통합

**Files:**
- Modify: `src/app/admin/orders/[id]/page.tsx`

- [ ] **Step 1: import 추가 및 카드 삽입**

`src/app/admin/orders/[id]/page.tsx`의 기존 imports 뒤에 추가:
```tsx
import { OrderDeliveryCard } from '@/components/admin/order-delivery-card';
```

`{(order.funeralHall || order.ribbonLeft || order.venue) && (...)}` 블록 뒤, 생성/수정 메타 div 앞에 다음 추가:
```tsx
<OrderDeliveryCard
  orderId={Number(id)}
  initialRecipientName={order.recipientActualName}
  initialReceivedAt={order.receivedAt}
  initialRecipientRelationship={order.recipientRelationship}
/>
```

동시에 `order` 타입이 `any`이므로 인수자 3필드 접근이 타입 에러 없이 작동한다. (선택: 인터페이스 정의를 추가하여 안전성 향상 가능)

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/app/admin/orders/[id]/page.tsx
git commit -m "feat(admin): 주문 상세 페이지에 OrderDeliveryCard 통합"
```

---

### Task 11: `OrderDeliveryCard` 단위 테스트

**Files:**
- Create: `src/__tests__/admin-order-delivery-card.test.tsx`

- [ ] **Step 1: 테스트 작성**

`src/__tests__/admin-order-delivery-card.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/api/admin-orders', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/admin-orders')>(
    '@/lib/api/admin-orders',
  );
  return {
    ...actual,
    listAdminProofs: vi.fn(),
    presignAdminProof: vi.fn(),
    completeAdminProof: vi.fn(),
    uploadAdminProofFile: vi.fn(),
    updateAdminRecipientInfo: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { OrderDeliveryCard } from '@/components/admin/order-delivery-card';
import {
  listAdminProofs,
  presignAdminProof,
  completeAdminProof,
  uploadAdminProofFile,
  updateAdminRecipientInfo,
} from '@/lib/api/admin-orders';

const mockList = listAdminProofs as ReturnType<typeof vi.fn>;
const mockPresign = presignAdminProof as ReturnType<typeof vi.fn>;
const mockComplete = completeAdminProof as ReturnType<typeof vi.fn>;
const mockUpload = uploadAdminProofFile as ReturnType<typeof vi.fn>;
const mockUpdateRecipient = updateAdminRecipientInfo as ReturnType<typeof vi.fn>;

function renderCard(props: Partial<React.ComponentProps<typeof OrderDeliveryCard>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <OrderDeliveryCard orderId={123} {...props} />
    </QueryClientProvider>,
  );
}

describe('OrderDeliveryCard', () => {
  beforeEach(() => {
    mockList.mockReset();
    mockPresign.mockReset();
    mockComplete.mockReset();
    mockUpload.mockReset();
    mockUpdateRecipient.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('사진 0개일 때 "등록된 사진이 없습니다" 안내', async () => {
    mockList.mockResolvedValue({ ok: true, items: [] });
    renderCard();
    await waitFor(() => expect(screen.getByText(/등록된 사진이 없습니다/)).toBeInTheDocument());
  });

  it('탭별 proofType 분리 카운트 표시', async () => {
    mockList.mockResolvedValue({
      ok: true,
      items: [
        { proofType: 'DELIVERY_PHOTO', fileUrl: '/a.jpg' },
        { proofType: 'DELIVERY_PHOTO', fileUrl: '/b.jpg' },
        { proofType: 'SCENE_PHOTO', fileUrl: '/c.jpg' },
      ],
    });
    renderCard();
    await waitFor(() => expect(screen.getByText(/배송사진 \(2\)/)).toBeInTheDocument());
    expect(screen.getByText(/현장사진 \(1\)/)).toBeInTheDocument();
  });

  it('현장사진 탭 클릭 시 해당 그리드 렌더', async () => {
    mockList.mockResolvedValue({
      ok: true,
      items: [
        { proofType: 'DELIVERY_PHOTO', fileUrl: '/a.jpg' },
        { proofType: 'SCENE_PHOTO', fileUrl: '/c.jpg' },
      ],
    });
    renderCard();
    await waitFor(() => expect(screen.getByText(/배송사진 \(1\)/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /현장사진/ }));
    await waitFor(() => {
      const img = screen.getByRole('img', { name: /현장사진 1/ });
      expect(img).toHaveAttribute('src', expect.stringContaining('/c.jpg'));
    });
  });

  it('초기 인수자 값이 폼에 로드됨', async () => {
    mockList.mockResolvedValue({ ok: true, items: [] });
    renderCard({
      initialRecipientName: '박상덕',
      initialReceivedAt: '2025-12-22T16:07:00',
      initialRecipientRelationship: '친척',
    });
    await waitFor(() => {
      expect((screen.getByLabelText('인수자명') as HTMLInputElement).value).toBe('박상덕');
      expect((screen.getByLabelText('관계') as HTMLInputElement).value).toBe('친척');
    });
  });

  it('인수자 폼 저장 호출 검증', async () => {
    mockList.mockResolvedValue({ ok: true, items: [] });
    mockUpdateRecipient.mockResolvedValue({ ok: true });
    renderCard({ initialRecipientName: '김영희', initialRecipientRelationship: '본인' });

    await waitFor(() =>
      expect((screen.getByLabelText('인수자명') as HTMLInputElement).value).toBe('김영희'),
    );

    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() =>
      expect(mockUpdateRecipient).toHaveBeenCalledWith(
        123,
        expect.objectContaining({ name: '김영희', relationship: '본인' }),
      ),
    );
  });

  it('업로드: presign → upload → complete 순으로 호출 (DELIVERY_PHOTO 탭)', async () => {
    mockList.mockResolvedValue({ ok: true, items: [] });
    mockPresign.mockResolvedValue({
      uploadUrl: 'https://s3/put',
      fileUrl: '/uploads/x.jpg',
      fileKey: 'x.jpg',
      headers: {},
    });
    mockUpload.mockResolvedValue(undefined);
    mockComplete.mockResolvedValue({ ok: true });

    renderCard();
    await waitFor(() => expect(screen.getByText(/등록된 사진이 없습니다/)).toBeInTheDocument());

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(mockPresign).toHaveBeenCalledWith(
        123,
        expect.objectContaining({ proofType: 'DELIVERY_PHOTO', fileName: 'photo.jpg' }),
      );
      expect(mockUpload).toHaveBeenCalled();
      expect(mockComplete).toHaveBeenCalledWith(
        123,
        expect.objectContaining({ proofType: 'DELIVERY_PHOTO', fileUrl: '/uploads/x.jpg' }),
      );
    });
  });

  it('현장사진 탭에서 업로드 시 proofType=SCENE_PHOTO로 전송', async () => {
    mockList.mockResolvedValue({ ok: true, items: [] });
    mockPresign.mockResolvedValue({
      uploadUrl: 'https://s3/put',
      fileUrl: '/uploads/y.jpg',
      fileKey: 'y.jpg',
      headers: {},
    });
    mockUpload.mockResolvedValue(undefined);
    mockComplete.mockResolvedValue({ ok: true });

    renderCard();
    await waitFor(() => expect(screen.getByText(/현장사진 \(0\)/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /현장사진/ }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['y'], 'scene.jpg', { type: 'image/jpeg' });
    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(mockPresign).toHaveBeenCalledWith(
        123,
        expect.objectContaining({ proofType: 'SCENE_PHOTO' }),
      );
      expect(mockComplete).toHaveBeenCalledWith(
        123,
        expect.objectContaining({ proofType: 'SCENE_PHOTO' }),
      );
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 → 통과 확인**

Run: `npx vitest run src/__tests__/admin-order-delivery-card.test.tsx`
Expected: 7 PASS.

- [ ] **Step 3: 전체 회귀 확인**

Run: `npm test`
Expected: 전체 PASS.

- [ ] **Step 4: 커밋**

```bash
git add src/__tests__/admin-order-delivery-card.test.tsx
git commit -m "test(admin): OrderDeliveryCard 단위 테스트"
```

(Chunk 3 끝)

---

## Chunk 4: Partner 주문 상세 카드 확장 (Phase 5)

### Task 12: `/partner/orders/[id]` 증빙 카드에 탭 + 인수자 폼 추가

**Files:**
- Modify: `src/app/partner/orders/[id]/page.tsx`

기존 "증빙 사진" 카드를 탭(배송/현장) + 인수자 폼으로 확장. 기존 `presignProof`/`completeProof`는 proofType 파라미터 이미 받으므로 코드 시그니처 변경 없음.

- [ ] **Step 1a: React import 확장**

기존 line 3:
```tsx
import { use, useRef, useState } from 'react';
```
→
```tsx
import { use, useEffect, useRef, useState } from 'react';
```

- [ ] **Step 1b: 신규 import 추가 (기존 `@/lib/api/partner` import 블록 확장)**

기존 line 8-16의 `@/lib/api/partner` import에 `updatePartnerRecipientInfo`를 함수 목록에, `type PartnerRecipientInfoPayload`를 별도 `type` import로 추가. 그리고 `Input`, `Label` 컴포넌트 import 추가:
```tsx
import {
  // ... 기존 함수들
  updatePartnerRecipientInfo,
} from '@/lib/api/partner';
import type { PartnerRecipientInfoPayload } from '@/lib/api/partner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
```

- [ ] **Step 1c: 탭/폼 state 추가 — `uploading` 선언 바로 뒤**

기존 `const [uploading, setUploading] = useState(false);` 라인 바로 다음에 추가:
```tsx
const [activeTab, setActiveTab] = useState<'DELIVERY_PHOTO' | 'SCENE_PHOTO'>('DELIVERY_PHOTO');
const [recipientName, setRecipientName] = useState('');
const [receivedAt, setReceivedAt] = useState('');
const [relationship, setRelationship] = useState('');
```

- [ ] **Step 1d: order 응답에서 초기값 동기화 — `const proofs = proofsRes?.items ?? [];` 뒤에 추가**

```tsx
// Phase 1 BE 확장으로 order 응답에 recipient 3필드가 포함됨
const orderWithRecipient = order as
  | (typeof order & {
      recipientActualName?: string | null;
      receivedAt?: string | null;
      recipientRelationship?: string | null;
    })
  | undefined;

useEffect(() => {
  if (!orderWithRecipient) return;
  if (orderWithRecipient.recipientActualName != null) {
    setRecipientName(orderWithRecipient.recipientActualName);
  }
  if (orderWithRecipient.receivedAt != null) {
    const d = new Date(orderWithRecipient.receivedAt);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      setReceivedAt(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    }
  }
  if (orderWithRecipient.recipientRelationship != null) {
    setRelationship(orderWithRecipient.recipientRelationship);
  }
}, [
  orderWithRecipient?.recipientActualName,
  orderWithRecipient?.receivedAt,
  orderWithRecipient?.recipientRelationship,
]);
```

- [ ] **Step 2: `handlePhotoUpload` 수정하여 activeTab 사용**

기존:
```typescript
await completeProof(orderId, 'DELIVERY_PHOTO', presignRes.fileUrl, presignRes.fileKey);
```
→
```typescript
await completeProof(orderId, activeTab, presignRes.fileUrl, presignRes.fileKey);
```

- [ ] **Step 3: 인수자 저장 mutation 추가**

```tsx
const saveRecipientMutation = useMutation({
  mutationFn: () => {
    const payload: PartnerRecipientInfoPayload = {
      name: recipientName,
      receivedAt: receivedAt ? new Date(receivedAt).toISOString() : '',
      relationship,
    };
    return updatePartnerRecipientInfo(orderId, payload);
  },
  onSuccess: () => {
    toast.success('인수자 정보가 저장되었습니다.');
    queryClient.invalidateQueries({ queryKey: ['partnerOrder', orderId] });
  },
  onError: (e) => toast.error(e instanceof Error ? e.message : '저장 실패'),
});
```

- [ ] **Step 4: 배송 완료 버튼 confirm 처리**

기존 status 변경 버튼(`statusMutation.mutate('DONE')` 경로)에서 onClick을 다음으로 교체:
```tsx
onClick={() => {
  if (!recipientName || !receivedAt) {
    if (!window.confirm('인수자명 또는 인수시간이 비어 있습니다. 그래도 배송 완료 처리하시겠습니까?')) {
      return;
    }
  }
  statusMutation.mutate('DONE');
}}
```

- [ ] **Step 5: 증빙 사진 카드 JSX 교체**

`{/* Evidence Photos */}` 주석으로 시작하는 기존 Card 블록 전체(약 line 212–262)를 아래 내용으로 교체. 주석도 유지:

```tsx
{/* Evidence Photos */}
<Card className="shadow-sm border-slate-200">
  <CardHeader className="pb-3 border-b border-slate-100">
    <CardTitle className="text-base text-slate-700">증빙 사진 / 인수자 정보</CardTitle>
  </CardHeader>
  <CardContent className="pt-4 space-y-4">
    {/* 탭 + 사진 추가 */}
    <div className="flex gap-2 border-b border-slate-200">
      <button
        type="button"
        onClick={() => setActiveTab('DELIVERY_PHOTO')}
        className={`px-4 py-2 text-sm border-b-2 ${
          activeTab === 'DELIVERY_PHOTO'
            ? 'border-emerald-500 text-emerald-700 font-medium'
            : 'border-transparent text-slate-500'
        }`}
      >
        배송사진 ({proofs.filter((p) => p.proofType === 'DELIVERY_PHOTO').length})
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('SCENE_PHOTO')}
        className={`px-4 py-2 text-sm border-b-2 ${
          activeTab === 'SCENE_PHOTO'
            ? 'border-emerald-500 text-emerald-700 font-medium'
            : 'border-transparent text-slate-500'
        }`}
      >
        현장사진 ({proofs.filter((p) => p.proofType === 'SCENE_PHOTO').length})
      </button>
      <div className="flex-1" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />
      <Button
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? '업로드 중...' : '사진 추가'}
      </Button>
    </div>

    {/* 사진 그리드 */}
    {(() => {
      const active = proofs.filter((p) => p.proofType === activeTab);
      if (active.length === 0) {
        return (
          <div className="text-center py-8 text-slate-300 text-sm">
            등록된 증빙 사진이 없습니다.
          </div>
        );
      }
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {active.map((proof, i) => (
            <div
              key={`${proof.fileUrl}-${i}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-slate-200"
            >
              <Image
                src={proofUrl(proof.fileUrl)}
                alt={`${activeTab === 'DELIVERY_PHOTO' ? '배송' : '현장'}사진 ${i + 1}`}
                fill
                className="object-cover"
                sizes="33vw"
                unoptimized
              />
            </div>
          ))}
        </div>
      );
    })()}

    {/* 인수자 정보 폼 */}
    <div className="border-t border-slate-100 pt-4 space-y-3">
      <h3 className="text-sm font-medium text-slate-700">인수자 정보</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="partnerRecipientName" className="text-xs">인수자명</Label>
          <Input
            id="partnerRecipientName"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="홍길동"
          />
        </div>
        <div>
          <Label htmlFor="partnerReceivedAt" className="text-xs">인수시간</Label>
          <Input
            id="partnerReceivedAt"
            type="datetime-local"
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="partnerRelationship" className="text-xs">관계</Label>
          <Input
            id="partnerRelationship"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="본인/가족/친척 등"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => saveRecipientMutation.mutate()}
          disabled={saveRecipientMutation.isPending}
        >
          {saveRecipientMutation.isPending ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 6: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 7: 커밋**

```bash
git add src/app/partner/orders/[id]/page.tsx
git commit -m "feat(partner): 증빙 사진 카드에 탭 + 인수자 정보 폼 확장"
```

---

### Task 13: Partner 카드 단위 테스트

**Files:**
- Create: `src/__tests__/partner-order-recipient.test.tsx`

Partner 페이지는 복잡하므로 전체 통합 테스트보다는 "탭 전환 + 업로드 proofType" + "인수자 저장" 2가지 주요 회귀만 검증한다.

- [ ] **Step 1: 테스트 작성**

`src/__tests__/partner-order-recipient.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/api/partner', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/partner')>(
    '@/lib/api/partner',
  );
  return {
    ...actual,
    getPartnerOrderDetail: vi.fn(),
    listProofs: vi.fn(),
    presignProof: vi.fn(),
    uploadToPresignedUrl: vi.fn(),
    completeProof: vi.fn(),
    updatePartnerRecipientInfo: vi.fn(),
    updateOrderStatus: vi.fn(),
    acceptOrder: vi.fn(),
  };
});

vi.mock('@/lib/auth/partner-store', () => ({
  usePartnerAuthStore: {
    getState: () => ({ accessToken: 'x', logout: vi.fn() }),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

import PartnerOrderDetailPage from '@/app/partner/orders/[id]/page';
import {
  getPartnerOrderDetail,
  listProofs,
  presignProof,
  uploadToPresignedUrl,
  completeProof,
  updatePartnerRecipientInfo,
} from '@/lib/api/partner';

const mockOrder = getPartnerOrderDetail as ReturnType<typeof vi.fn>;
const mockProofs = listProofs as ReturnType<typeof vi.fn>;
const mockPresign = presignProof as ReturnType<typeof vi.fn>;
const mockUpload = uploadToPresignedUrl as ReturnType<typeof vi.fn>;
const mockComplete = completeProof as ReturnType<typeof vi.fn>;
const mockRecipient = updatePartnerRecipientInfo as ReturnType<typeof vi.fn>;

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PartnerOrderDetailPage params={Promise.resolve({ id: '42' })} />
    </QueryClientProvider>,
  );
}

describe('Partner 주문 상세 — 증빙 카드 확장', () => {
  beforeEach(() => {
    mockOrder.mockReset();
    mockProofs.mockReset();
    mockPresign.mockReset();
    mockUpload.mockReset();
    mockComplete.mockReset();
    mockRecipient.mockReset();

    mockOrder.mockResolvedValue({
      ok: true,
      item: {
        orderId: 42,
        status: 'DELIVERING',
        receiverName: '김철수',
        receiverPhone: '010-0000-0000',
        address1: '서울시 강남구 역삼동',
        recipientActualName: null,
        receivedAt: null,
        recipientRelationship: null,
      },
      events: [],
    });
    mockProofs.mockResolvedValue({ ok: true, items: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('현장사진 탭에서 업로드 시 proofType SCENE_PHOTO로 호출', async () => {
    mockPresign.mockResolvedValue({
      uploadUrl: 'https://s3/put',
      fileUrl: '/u/scene.jpg',
      fileKey: 'scene.jpg',
      headers: {},
    });
    mockUpload.mockResolvedValue(undefined);
    mockComplete.mockResolvedValue({ ok: true });

    renderPage();
    await waitFor(() => expect(screen.getByText(/현장사진/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /현장사진/ }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith(
        42,
        'SCENE_PHOTO',
        '/u/scene.jpg',
        'scene.jpg',
      );
    });
  });

  it('인수자 정보 입력 후 저장 버튼 클릭 시 API 호출', async () => {
    mockRecipient.mockResolvedValue({ ok: true });

    renderPage();
    await waitFor(() => expect(screen.getByLabelText('인수자명')).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText('인수자명'), '박상덕');
    await userEvent.type(screen.getByLabelText('관계'), '친척');
    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(mockRecipient).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ name: '박상덕', relationship: '친척' }),
      );
    });
  });

  it('초기 인수자 값이 order 응답에서 폼에 로드됨', async () => {
    mockOrder.mockResolvedValue({
      ok: true,
      item: {
        orderId: 42,
        status: 'DELIVERING',
        receiverName: '김철수',
        receiverPhone: '010-0000-0000',
        address1: '서울시 강남구',
        recipientActualName: '박상덕',
        receivedAt: '2025-12-22T16:07:00',
        recipientRelationship: '친척',
      },
      events: [],
    });

    renderPage();
    await waitFor(() => {
      expect((screen.getByLabelText('인수자명') as HTMLInputElement).value).toBe('박상덕');
      expect((screen.getByLabelText('관계') as HTMLInputElement).value).toBe('친척');
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 → 통과 확인**

Run: `npx vitest run src/__tests__/partner-order-recipient.test.tsx`
Expected: 3 PASS.

- [ ] **Step 3: 전체 회귀 확인**

Run: `npm test`
Expected: 전체 PASS. 기존 partner 관련 테스트가 있다면 그것도 PASS 유지.

- [ ] **Step 4: 커밋**

```bash
git add src/__tests__/partner-order-recipient.test.tsx
git commit -m "test(partner): 증빙 카드 확장 회귀 테스트"
```

(Chunk 4 끝)

---

## Chunk 5: 테스트 서버 검증 + 프로덕션 배포 (Phase 6-7)

### Task 14: 테스트 서버 배포 및 e2e 시나리오 검증

**Files:**
- (없음, 배포 스크립트 실행)

memory에 따르면 로컬 개발서버 실행 금지, 빌드/테스트는 서버에서 수행한다(`feedback_no_local_dev_server.md`, `feedback_build_test_server.md`).

- [ ] **Step 1: 로컬에서 전체 테스트 통과 확인**

```bash
npx tsc --noEmit
npm run lint
npm test
```
Expected: 타입/린트 에러 없음, 모든 테스트 PASS.

- [ ] **Step 2: 변경 사항 push**

```bash
git push
```

- [ ] **Step 3: 테스트 서버 배포**

```bash
bash deploy/deploy-zerodt.sh test
```
Expected: deploy script가 빌드 → symlink 전환 → pm2 reload → 헬스체크를 수행. 실패 시 자동 롤백.

- [ ] **Step 4: 테스트 서버 헬스 체크**

```bash
ssh blueadm@49.247.46.86 'pm2 list'
ssh blueadm@49.247.46.86 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3030/admin/login'
```
Expected: pm2 online, 200.

- [ ] **Step 5: 시나리오 1 — Admin 경로 수동 검증**

브라우저로 테스트 서버 접속:
1. admin 로그인
2. 임의 주문 하나 생성 (상품명, 배송지, 받는분, 리본 포함)
3. `/admin/orders/[id]` 접속 → 신규 "배송 사진 / 인수자 정보" 카드 확인
4. 배송사진 탭에서 사진 1장 업로드 → 그리드에 표시되는지 확인
5. 현장사진 탭 클릭 → 업로드 → 현장사진에만 표시되는지 확인
6. 인수자명/인수시간/관계 입력 → [저장] 클릭 → 성공 토스트 확인
7. 페이지 새로고침 → 입력값이 그대로 로드되는지 확인

- [ ] **Step 6: 시나리오 2 — 고객 URL 경로**

1. 해당 주문의 고객 확인 URL(`CustomerLinkCard`) 발급
2. 시크릿 창에서 `/o/{code}` 접속
3. 10블록 매트릭스 확인:
   - 헤더(지사명) 표시
   - 진행 타임라인
   - 상품 정보(상품명)
   - 배송 정보(일시, 장소, 주소)
   - 받는 분
   - 리본/메시지(있는 경우)
   - 증빙 서류(있는 경우)
   - 인수자 정보는 **아직 DELIVERED 아니므로 안 보여야 함**
   - 액션 버튼(수정 요청, 주문 확인 완료)
   - Footer
4. [수정 요청 (전화)] 클릭 → `tel:` 링크 동작 확인
5. [주문 확인 완료] 클릭 → confirm 다이얼로그 → 확인 → 버튼이 "확인 완료됨" 텍스트로 전환
6. 새로고침 → "확인 완료됨" 텍스트가 유지되어야 함 (BE 저장 확인)

- [ ] **Step 7: 시나리오 3 — 배송 완료 후 인수자 카드 표시**

1. admin에서 해당 주문 상태를 DELIVERED로 변경 (기존 상태 변경 경로 사용)
2. 고객 URL 새로고침 → "인수자 정보" 카드 + 사진 그리드 2개(배송/현장) + 인수자명/시간/관계가 표시되어야 함

- [ ] **Step 8: 시나리오 4 — Partner 경로**

1. partner 계정으로 로그인
2. 배정된 주문 상세 접속 → "증빙 사진 / 인수자 정보" 카드 확인
3. 탭 전환 + 사진 업로드 동작 확인
4. 인수자 저장 동작 확인
5. 배송 완료 버튼 클릭 시 인수자 필드 비어있으면 confirm 뜨는지 확인

- [ ] **Step 9: 회귀 확인 (기존 기능)**

1. 기존 admin 주문 목록 페이지 정상 로드
2. 기존 화원 관리 페이지 정상 로드
3. 기존 고객 확인 URL 페이지에서 `deliveryPhotos`만 있던 과거 주문 정상 표시 — BE 응답에 `scenePhotos` 키가 아예 없는 경우에도 에러 없이 렌더되어야 함 (`order-link.ts`의 `?? []` 방어 코드로 처리됨, 테스트 서버에서 실제 확인)
4. 기존 partner 주문 목록 정상 로드

- [ ] **Step 10: 검증 결과 기록**

각 시나리오 통과/실패를 수기로 체크. 실패 시 해당 Task로 돌아가 수정 후 재배포.

---

### Task 15: 프로덕션 배포

**Files:**
- (없음, 배포 스크립트 실행)

- [ ] **Step 1: 사용자 승인 확인**

Task 14의 모든 시나리오가 통과한 후, 사용자에게 다음 메시지로 승인 요청:

> "테스트 서버 검증 완료 (시나리오 1-4 모두 PASS). 프로덕션 배포해도 되겠습니까?"

사용자가 명시적으로 "예/OK/진행" 응답하기 전까지는 다음 단계로 진행 금지.

- [ ] **Step 2: 프로덕션 배포**

```bash
bash deploy/deploy-zerodt.sh prod
```
Expected: build → symlink 전환 → pm2 reload → 헬스체크. 실패 시 자동 롤백.

- [ ] **Step 3: 프로덕션 헬스 체크 (내부 + 외부)**

내부 (서버 직접):
```bash
ssh blueadm@49.247.206.190 'pm2 list'
ssh blueadm@49.247.206.190 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3030/admin/login'
ssh blueadm@49.247.206.190 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3030/api/proxy/admin/partners/florists'
```

외부 (nginx 경유, 이 기능의 주요 사용자 surface):
```bash
curl -s -o /dev/null -w "%{http_code}" https://seoulflower.co.kr/admin/login
# /o/{code}는 실제 유효한 code 있을 때만 검증
```
Expected: 모두 200 또는 pm2 online.

- [ ] **Step 3b: shared/.env.local 무결성 확인** (CLAUDE.md 필수 규칙)

```bash
ssh blueadm@49.247.206.190 'ls -la /home/blueadm/shared/.env.local && head -3 /home/blueadm/shared/.env.local'
```
Expected: 파일 존재, `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080` 포함 확인.

- [ ] **Step 4: 프로덕션 스모크 테스트**

1. https://seoulflower.co.kr/admin 로그인
2. 기존 주문 하나에서 `/o/{code}` 링크 접속 → 새 레이아웃 확인
3. 기존 기능 회귀 없는지 확인 (목록, 상세)

실패 시 즉시 롤백:
```bash
bash deploy/rollback-zerodt.sh prod
```

- [ ] **Step 5: 배포 완료 보고**

사용자에게 보고:
- 배포 시각
- 체크된 기능 요약
- 롤백 명령어 링크
- 후속 작업(배송완료 처리 버튼, IP 로깅 등)이 있다면 명시

(Chunk 5 끝, 플랜 완료)

---

## 플랜 완료 후

모든 Task 체크박스가 완료되면, 사용자에게 배포 결과와 함께 완료 보고를 한다. 후속 작업(배송완료 처리 버튼, 사진 lightbox, 사진 삭제, customer_confirmation_ip 로깅)은 spec §11에 out-of-scope로 명시되어 있으며, 별도 spec/plan으로 처리.
