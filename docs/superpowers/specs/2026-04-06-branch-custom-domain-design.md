# Branch Custom Domain Management

## Overview

Enable branches to use their own custom domains (e.g., `15885555.co.kr`) that display the branch homepage while keeping the domain in the address bar. Managed from both HQ admin and branch admin interfaces.

## Architecture

```
User → 15885555.co.kr (DNS A → server IP)
  → nginx catch-all (SSL termination)
  → Next.js middleware (Host header → DB lookup → /branch/{code} rewrite)
  → Branch homepage rendering
```

## Components

### 1. Backend Changes

**Entity**: Add `customDomain` (nullable string) to Organization entity.

**DTO**: Include `customDomain` in update DTOs for:
- `PATCH /admin/organizations/{id}` (HQ admin)
- `PATCH /branch/me` (branch admin)

**New Public Endpoint**: `GET /public/domain-mapping`
- Returns all custom domain → branch code mappings
- Response: `{ "15885555.co.kr": "15885555", "other.kr": "gangnam" }`
- No auth required (public, for middleware consumption)

### 2. Frontend Type Changes

Add `customDomain?: string` to `BranchInfo` in `src/lib/branch/types.ts`.

### 3. Admin UI (`/admin/branches/[id]`)

In the homepage info section (홈페이지 정보), add:
- "커스텀 도메인" text input field
- Placeholder: `example.co.kr`
- Validation: domain format only (no protocol prefix)
- Help text: DNS A record must point to server IP
- Saved via existing `PUT /admin/organizations/{id}` endpoint

### 4. Branch Admin Settings (`/branch/[slug]/manage/settings`)

Add domain field in settings page:
- Same input format and validation as admin UI
- Saved via existing `PATCH /branch/me` endpoint

### 5. Next.js Middleware Extension

Current middleware handles `*.seoulflower.co.kr` subdomains. Extend to:

```
Check Host header:
  → seoulflower.co.kr / *.seoulflower.co.kr → existing logic
  → localhost / IP → existing logic
  → Other domains → look up in domain mapping cache
    → Match found → rewrite to /branch/{code}
    → No match → pass through (404)
```

**Domain Mapping Cache**: API Route at `/api/domain-cache`
- Fetches from backend `GET /public/domain-mapping`
- In-memory cache with 5-minute TTL
- Middleware calls this on each custom domain request
- Edge-compatible (no Node.js-only APIs in middleware)

Since Next.js middleware runs on the edge and cannot directly call internal API routes, the approach is:
- Store domain mapping in a module-level variable in middleware
- Refresh from backend API directly (not via API route) with TTL
- Use `fetch()` to backend `/public/domain-mapping` endpoint

### 6. nginx Changes

Add a catch-all server block to handle unknown domains:

```nginx
# Catch-all for custom branch domains
server {
    listen 80 default_server;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl default_server;
    server_name _;
    ssl_certificate /etc/letsencrypt/live/seoulflower.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seoulflower.co.kr/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3030;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Same static file and upload proxying as main config
    location /uploads/ {
        proxy_pass http://127.0.0.1:8080;
    }
}
```

### 7. SSL Automation

Script at `/home/blueadm/scripts/add-domain-ssl.sh`:

```bash
#!/bin/bash
DOMAIN=$1
if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain>"
    exit 1
fi
certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@seoulflower.co.kr
nginx -t && systemctl reload nginx
```

Trigger options:
- Manual: SSH and run script after registering domain in admin
- Automated: Backend calls script via exec after domain save
- Cron: Periodic check for domains without certificates

## Data Flow

### Domain Registration
1. Admin enters `15885555.co.kr` in branch homepage settings
2. Frontend sends PATCH/PUT with `customDomain: "15885555.co.kr"`
3. Backend saves to Organization entity
4. Admin configures DNS A record at domain registrar → server IP
5. Run certbot for SSL certificate
6. Next time middleware cache refreshes (<=5 min), domain starts working

### Request Routing
1. Browser requests `https://15885555.co.kr`
2. nginx catch-all receives request, terminates SSL
3. Proxies to Next.js at `127.0.0.1:3030` with original Host header
4. Middleware reads Host: `15885555.co.kr`
5. Looks up in cached domain mapping → finds code `15885555`
6. Rewrites request to `/branch/15885555`
7. Branch homepage renders with theme

## Validation Rules

- Domain format: alphanumeric + hyphens + dots, no protocol prefix
- Uniqueness: one domain per branch (backend enforces)
- Reserved: `seoulflower.co.kr`, `www.seoulflower.co.kr` cannot be used

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/branch/types.ts` | Add `customDomain` to BranchInfo |
| `src/app/admin/branches/[id]/page.tsx` | Add domain field in homepage section |
| `src/app/branch/[slug]/manage/settings/page.tsx` | Add domain field in settings |
| `src/middleware.ts` | Add custom domain lookup and rewrite |
| `deploy/nginx-branch-domains.conf` | New catch-all server block |
| `deploy/add-domain-ssl.sh` | New SSL automation script |

## Out of Scope

- Wildcard SSL certificates
- Domain verification (TXT record check)
- Automatic DNS configuration
- Multiple domains per branch
