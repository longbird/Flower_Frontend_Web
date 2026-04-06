/**
 * In-memory domain mapping cache for middleware.
 * Caches the customDomain → branchCode mapping with a 5-minute TTL.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;

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

  if (!fetchPromise) {
    fetchPromise = refreshCache();
  }
  return fetchPromise;
}

export function lookupDomain(mapping: Record<string, string>, host: string): string | null {
  const domain = host.split(':')[0];
  return mapping[domain] ?? null;
}
