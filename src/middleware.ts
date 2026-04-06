import { NextRequest, NextResponse } from 'next/server';
import { getDomainMapping, lookupDomain } from './lib/branch/domain-cache';

/**
 * Subdomain + custom domain routing middleware
 * *.seoulflower.co.kr → branch homepage (subdomain)
 * custom domains (e.g., 15885555.co.kr) → branch homepage (DB lookup)
 * seoulflower.co.kr (no subdomain) → admin/partner app
 *
 * Development: uses ?branch=slug query param for testing
 */
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

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (Next.js internals)
     * - static files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
