# Branch Custom Domain Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable branches to register custom domains that route to their homepage via Next.js middleware, managed from both HQ admin and branch admin settings.

**Architecture:** Add `customDomain` field to branch types and API. Extend Next.js middleware to check Host header against a cached domain mapping from backend. Admin UI and branch settings both get domain input fields.

**Tech Stack:** Next.js middleware, TanStack Query, Zustand, shadcn/ui, nginx

**Spec:** `docs/superpowers/specs/2026-04-06-branch-custom-domain-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/branch/types.ts` | Modify | Add `customDomain` to `BranchInfo` |
| `src/lib/branch/branch-api.ts` | Modify | Add `customDomain` to `MyBranchInfo` + `updateMyBranchInfo` params |
| `src/lib/branch/api.ts` | Modify | Add `fetchDomainMapping()` function |
| `src/lib/branch/domain-cache.ts` | Create | Domain mapping cache with TTL for middleware |
| `src/middleware.ts` | Modify | Add custom domain lookup + rewrite |
| `src/app/admin/branches/[id]/page.tsx` | Modify | Add domain field in homepage info section + edit dialog |
| `src/app/branch/[slug]/manage/settings/page.tsx` | Modify | Add domain input field |
| `deploy/nginx-branch-domains.conf` | Create | Catch-all nginx server block for custom domains |
| `deploy/add-domain-ssl.sh` | Create | SSL automation script |

---

## Chunk 1: Types and API Layer

### Task 1: Add `customDomain` to type definitions

**Files:**
- Modify: `src/lib/branch/types.ts:2-28`
- Modify: `src/lib/branch/branch-api.ts:67-87`

- [ ] **Step 1: Add `customDomain` to `BranchInfo`**

In `src/lib/branch/types.ts`, add after line 13 (`homepageDesign`):

```typescript
  /** 커스텀 도메인 (예: example.co.kr) */
  customDomain?: string;
```

- [ ] **Step 2: Add `customDomain` to `MyBranchInfo`**

In `src/lib/branch/branch-api.ts`, add after line 70 (`code`):

```typescript
  customDomain?: string;
```

- [ ] **Step 3: Add `customDomain` to `updateMyBranchInfo` params**

In `src/lib/branch/branch-api.ts`, add to the body type (after line 109, `partnershipEmail`):

```typescript
  customDomain?: string;
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/branch/types.ts src/lib/branch/branch-api.ts
git commit -m "feat: add customDomain field to branch types"
```

### Task 2: Add domain mapping fetch function

**Files:**
- Modify: `src/lib/branch/api.ts`
- Create: `src/lib/branch/domain-cache.ts`

- [ ] **Step 1: Add `fetchDomainMapping` to `api.ts`**

Add at the end of `src/lib/branch/api.ts`:

```typescript
/** 커스텀 도메인 → 지사코드 매핑 조회 (미들웨어용, 인증 불필요) */
export async function fetchDomainMapping(apiBase: string): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${apiBase}/public/domain-mapping`);
    if (!res.ok) return {};
    const json = await res.json();
    return json.data ?? {};
  } catch {
    return {};
  }
}
```

Note: This function takes `apiBase` as parameter because middleware runs on the edge and cannot use the proxy route. It calls the backend directly.

- [ ] **Step 2: Create domain cache module**

Create `src/lib/branch/domain-cache.ts`:

```typescript
/**
 * In-memory domain mapping cache for middleware.
 * Caches the customDomain → branchCode mapping with a 5-minute TTL.
 * Middleware calls getDomainMapping() on each request for non-seoulflower domains.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedMapping: Record<string, string> = {};
let cacheTimestamp = 0;
let fetchPromise: Promise<Record<string, string>> | null = null;

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

async function refreshCache(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${BACKEND_URL}/public/domain-mapping`);
    if (!res.ok) return cachedMapping;
    const json = await res.json();
    cachedMapping = json.data ?? {};
    cacheTimestamp = Date.now();
    return cachedMapping;
  } catch {
    return cachedMapping;
  } finally {
    fetchPromise = null;
  }
}

export async function getDomainMapping(): Promise<Record<string, string>> {
  if (!BACKEND_URL) return {};

  const now = Date.now();
  if (now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedMapping;
  }

  // Deduplicate concurrent requests
  if (!fetchPromise) {
    fetchPromise = refreshCache();
  }
  return fetchPromise;
}

export function lookupDomain(mapping: Record<string, string>, host: string): string | null {
  // Strip port if present
  const domain = host.split(':')[0];
  return mapping[domain] ?? null;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/branch/api.ts src/lib/branch/domain-cache.ts
git commit -m "feat: add domain mapping cache for middleware"
```

---

## Chunk 2: Middleware Extension

### Task 3: Add custom domain routing to middleware

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Import domain cache**

Add import at top of `src/middleware.ts`:

```typescript
import { getDomainMapping, lookupDomain } from './lib/branch/domain-cache';
```

- [ ] **Step 2: Change middleware to async and add custom domain logic**

Replace the current middleware function. The key change: after checking for `*.seoulflower.co.kr` subdomain and `?branch=` query param, add a third check for custom domains using the cached mapping.

Replace the full `middleware` function (lines 10-54):

```typescript
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Skip static files, API routes, Next.js internals, and already-rewritten branch paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/partner') ||
    pathname.startsWith('/branch') ||
    pathname.includes('.') // static files (favicon, etc.)
  ) {
    return NextResponse.next();
  }

  const hostname = request.headers.get('host') || '';

  // Extract subdomain
  let branchSlug: string | null = null;

  // Production: *.seoulflower.co.kr
  if (hostname.endsWith('.seoulflower.co.kr')) {
    branchSlug = hostname.replace('.seoulflower.co.kr', '');
  }

  // Development: ?branch=slug query parameter
  if (!branchSlug && searchParams.get('branch')) {
    branchSlug = searchParams.get('branch');
  }

  // Custom domain lookup (e.g., 15885555.co.kr → branch code)
  if (!branchSlug && !hostname.includes('seoulflower.co.kr') && !hostname.startsWith('localhost') && !hostname.match(/^\d+\.\d+\.\d+\.\d+/)) {
    const mapping = await getDomainMapping();
    branchSlug = lookupDomain(mapping, hostname);
  }

  // No subdomain → pass through to default app
  if (!branchSlug || branchSlug === 'www' || branchSlug === 'admin') {
    return NextResponse.next();
  }

  // Rewrite to branch pages
  // / → /branch/[slug]
  // /consult → /branch/[slug]/consult
  // /manage/* → /branch/[slug]/manage/*
  const branchPath = pathname === '/' ? '' : pathname;
  const url = request.nextUrl.clone();
  url.pathname = `/branch/${branchSlug}${branchPath}`;

  return NextResponse.rewrite(url);
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds (middleware compiles without edge runtime errors)

Note: If `getDomainMapping` uses Node.js APIs not available in edge runtime, we may need to adjust. The implementation uses only `fetch()` which is available in edge runtime.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: extend middleware for custom domain routing"
```

---

## Chunk 3: Admin UI - Homepage Info Section

### Task 4: Add custom domain to admin branch detail page

**Files:**
- Modify: `src/app/admin/branches/[id]/page.tsx`

- [ ] **Step 1: Add `customDomain` to `homepageForm` state**

Change lines 64-66 from:

```typescript
const [homepageForm, setHomepageForm] = useState({
  code: '',
});
```

to:

```typescript
const [homepageForm, setHomepageForm] = useState({
  code: '',
  customDomain: '',
});
```

- [ ] **Step 2: Add `customDomain` to `openEditHomepage` function**

Change lines 105-111 from:

```typescript
const openEditHomepage = () => {
  if (!branch) return;
  setHomepageForm({
    code: branch.code || '',
  });
  setShowEditHomepage(true);
};
```

to:

```typescript
const openEditHomepage = () => {
  if (!branch) return;
  setHomepageForm({
    code: branch.code || '',
    customDomain: branch.customDomain || '',
  });
  setShowEditHomepage(true);
};
```

- [ ] **Step 3: Add `customDomain` to `handleUpdateHomepage` function**

In `handleUpdateHomepage` (line 114), add after `code`:

```typescript
const body: Record<string, unknown> = {
  code: homepageForm.code.trim() || undefined,
  customDomain: homepageForm.customDomain.trim() || null,
};
```

Also add field preservation (after line 137):

```typescript
if (branch.customDomain) body.customDomain = body.customDomain ?? branch.customDomain;
```

Wait - actually the `customDomain` is already set from the form, so we just need the initial `body` assignment. The field preservation block preserves fields NOT in the form. Since `customDomain` IS in the form, we don't need to preserve it separately. The body line is sufficient.

- [ ] **Step 4: Add `customDomain` display in homepage info card**

After the 관리자 페이지 URL `<div>` (after line 280), add:

```tsx
<div>
  <dt className="text-slate-400 text-xs">커스텀 도메인</dt>
  <dd>
    {branch.customDomain ? (
      <a
        href={`https://${branch.customDomain}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {branch.customDomain}
      </a>
    ) : (
      <span className="text-slate-300">-</span>
    )}
  </dd>
</div>
```

- [ ] **Step 5: Add `customDomain` input in edit dialog**

After the code input `<div>` in the edit dialog (after line 447), add:

```tsx
<div>
  <Label>커스텀 도메인</Label>
  <Input
    value={homepageForm.customDomain}
    onChange={e => setHomepageForm(f => ({ ...f, customDomain: e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, '') }))}
    placeholder="example.co.kr"
  />
  <p className="text-xs text-slate-400 mt-1">
    도메인 등록업체에서 A 레코드를 서버 IP로 설정해야 합니다.
  </p>
</div>
```

- [ ] **Step 6: Add field preservation in `handleUpdate` (지사 정보 수정)**

In `handleUpdate` function (around line 186), add after the existing field preservations:

```typescript
if (branch?.customDomain) body.customDomain = branch.customDomain;
```

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/branches/[id]/page.tsx
git commit -m "feat: add custom domain management to admin branch detail"
```

---

## Chunk 4: Branch Admin Settings

### Task 5: Add custom domain to branch manage settings

**Files:**
- Modify: `src/app/branch/[slug]/manage/settings/page.tsx`

- [ ] **Step 1: Add `customDomain` state**

After line 31 (`serviceAreaInput`), add:

```typescript
const [customDomain, setCustomDomain] = useState('');
```

- [ ] **Step 2: Load `customDomain` in `loadInfo`**

After line 51 (`setEnableOnlinePayment`), add:

```typescript
setCustomDomain(res.data.customDomain || '');
```

- [ ] **Step 3: Add `customDomain` to `handleSave`**

In `handleSave`, add `customDomain` to the `updateMyBranchInfo` call (after line 86, `enableOnlinePayment`):

```typescript
customDomain: customDomain.trim() || undefined,
```

- [ ] **Step 4: Add domain input field in UI**

After the 관리자 페이지 URL display (after line 161), add:

```tsx
{/* 커스텀 도메인 */}
<div>
  <label className="block text-sm font-medium text-[var(--branch-text)] mb-1.5">
    커스텀 도메인
  </label>
  <input
    type="text"
    value={customDomain}
    onChange={(e) => setCustomDomain(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''))}
    placeholder="example.co.kr"
    className={inputClass}
  />
  <p className="mt-1 text-xs text-[var(--branch-text-light)]">
    자체 도메인을 연결하려면 도메인 등록업체에서 A 레코드를 서버 IP로 설정 후 입력하세요.
  </p>
  {customDomain && (
    <div className="mt-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
      <p className="text-xs text-blue-700">
        연결 URL: https://{customDomain}
      </p>
    </div>
  )}
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/app/branch/[slug]/manage/settings/page.tsx
git commit -m "feat: add custom domain setting to branch manage page"
```

---

## Chunk 5: Deployment Scripts

### Task 6: Create nginx config and SSL automation script

**Files:**
- Create: `deploy/nginx-branch-domains.conf`
- Create: `deploy/add-domain-ssl.sh`

- [ ] **Step 1: Create nginx catch-all config**

Create `deploy/nginx-branch-domains.conf`:

```nginx
# Catch-all server block for custom branch domains
# Include this in the nginx http block alongside the main seoulflower.co.kr config
#
# Usage:
#   1. Each branch domain needs a DNS A record pointing to this server
#   2. Run deploy/add-domain-ssl.sh <domain> to issue SSL cert
#   3. nginx will proxy the domain to Next.js, which uses middleware to route

# HTTP → HTTPS redirect for custom domains
server {
    listen 80 default_server;
    server_name _;
    return 301 https://$host$request_uri;
}

# HTTPS catch-all for custom branch domains
server {
    listen 443 ssl default_server;
    server_name _;

    # Fallback certificate (used before domain-specific cert is issued)
    ssl_certificate /etc/letsencrypt/live/seoulflower.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seoulflower.co.kr/privkey.pem;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy to Next.js — middleware handles domain → branch routing
    location / {
        proxy_pass http://127.0.0.1:3030;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Serve uploaded images directly from backend
    location /uploads/ {
        proxy_pass http://127.0.0.1:8080;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # Public API proxy (for branch homepage API calls)
    location /public/ {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

- [ ] **Step 2: Create SSL automation script**

Create `deploy/add-domain-ssl.sh`:

```bash
#!/bin/bash
# Issue SSL certificate for a custom branch domain
# Usage: bash deploy/add-domain-ssl.sh <domain>
#
# Prerequisites:
#   - Domain A record must point to this server
#   - certbot must be installed
#   - nginx must be running with the catch-all config

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="admin@seoulflower.co.kr"

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain>"
    echo "Example: $0 15885555.co.kr"
    exit 1
fi

# Check if cert already exists
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "Certificate already exists for $DOMAIN"
    echo "To renew: certbot renew --cert-name $DOMAIN"
    exit 0
fi

echo "Issuing SSL certificate for $DOMAIN..."
certbot certonly \
    --nginx \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    -m "$EMAIL"

echo "Testing nginx configuration..."
nginx -t

echo "Reloading nginx..."
systemctl reload nginx

echo "Done! $DOMAIN is now SSL-enabled."
echo "Verify: curl -I https://$DOMAIN"
```

- [ ] **Step 3: Make script executable and commit**

```bash
chmod +x deploy/add-domain-ssl.sh
git add deploy/nginx-branch-domains.conf deploy/add-domain-ssl.sh
git commit -m "feat: add nginx config and SSL script for custom domains"
```

---

## Summary of Changes

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add `customDomain` to types | `types.ts`, `branch-api.ts` |
| 2 | Add domain mapping fetch + cache | `api.ts`, `domain-cache.ts` (new) |
| 3 | Extend middleware for custom domains | `middleware.ts` |
| 4 | Admin UI: domain in homepage section | `admin/branches/[id]/page.tsx` |
| 5 | Branch settings: domain input | `branch/[slug]/manage/settings/page.tsx` |
| 6 | Deployment: nginx + SSL script | `deploy/` (2 new files) |

## Backend Prerequisites

Before this feature works end-to-end, the backend needs:
1. `customDomain` column added to the Organization entity
2. `customDomain` field in the Organization DTO (so NestJS whitelist doesn't strip it)
3. `GET /public/domain-mapping` endpoint returning `{ data: { "domain.kr": "branchCode", ... } }`

The frontend changes can be deployed first — the field will simply be empty until the backend supports it.
