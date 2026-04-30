'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth/store';
import { adminLogout } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  color: string;
  items: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry;
}

const DashboardIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>;
const OrderIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>;
const FloristIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>;
const BranchIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const AgentIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const StatsIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const CommissionIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CallIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
const AuditIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
const SessionIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const MonitorIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm10 0a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" /></svg>;
const BackupIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>;
const CidIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const AnnouncementIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>;
const CatalogIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const PaymentIcon = () => <svg className="w-[18px] h-[18px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const ChevronIcon = ({ open }: { open: boolean }) => <svg className={cn('w-4 h-4 transition-transform', open && 'rotate-90')} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
const CollapseIcon = ({ collapsed }: { collapsed: boolean }) => <svg className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>;

const navEntries: NavEntry[] = [
  { href: '/admin/dashboard', label: '대시보드', icon: <DashboardIcon /> },
  { href: '/admin/orders', label: '주문', icon: <OrderIcon /> },
  {
    label: '결제',
    icon: <PaymentIcon />,
    color: 'text-violet-600',
    items: [
      // 토스 결제
      { href: '/admin/payments', label: '결제 관리', icon: <PaymentIcon /> },
      { href: '/admin/payments/key-in', label: '수동 결제', icon: <PaymentIcon /> },
      // 이노페이 가상계좌 (UI 배포, 백엔드는 보류 중)
      { href: '/admin/payments/vbank', label: '가상계좌 결제', icon: <PaymentIcon /> },
      { href: '/admin/innopay-credentials', label: '가상계좌 설정', icon: <PaymentIcon /> },
    ],
  },
  {
    label: '화원',
    icon: <FloristIcon />,
    color: 'text-[#5B7A3D]',
    items: [
      { href: '/admin/florists', label: '화원 목록', icon: <FloristIcon /> },
      { href: '/admin/florists/search', label: '상품 검색', icon: <CatalogIcon /> },
    ],
  },
  {
    label: '관리',
    icon: <BranchIcon />,
    color: 'text-[#5B7A3D]',
    items: [
      { href: '/admin/branches', label: '지사', icon: <BranchIcon /> },
      { href: '/admin/catalog', label: '상품', icon: <CatalogIcon /> },
      { href: '/admin/agents', label: '상담원', icon: <AgentIcon /> },
    ],
  },
  {
    label: '통계',
    icon: <StatsIcon />,
    color: 'text-red-500',
    items: [
      { href: '/admin/statistics', label: '통계', icon: <StatsIcon /> },
      { href: '/admin/commission', label: '수수료', icon: <CommissionIcon /> },
    ],
  },
  {
    label: '감사',
    icon: <AuditIcon />,
    color: 'text-blue-500',
    items: [
      { href: '/admin/call-logs', label: '통화내역', icon: <CallIcon /> },
      { href: '/admin/audit', label: '감사로그', icon: <AuditIcon /> },
      { href: '/admin/sessions', label: '세션', icon: <SessionIcon /> },
      { href: '/admin/monitoring', label: '모니터링', icon: <MonitorIcon /> },
      { href: '/admin/backup-status', label: '백업현황', icon: <BackupIcon /> },
    ],
  },
  {
    label: '설정',
    icon: <CidIcon />,
    color: 'text-slate-500',
    items: [
      { href: '/admin/cid-settings', label: 'CID설정', icon: <CidIcon /> },
      { href: '/admin/announcements', label: '공지사항', icon: <AnnouncementIcon /> },
    ],
  },
];

/**
 * navEntries 전체 중 pathname 과 가장 길게 일치하는 leaf href를 반환.
 * `/admin/payments/vbank` 일 때 `/admin/payments` 가 아닌 정확한 leaf 만 활성으로 처리.
 */
function getActiveHref(pathname: string, allHrefs: string[]): string | null {
  const matching = allHrefs.filter(
    (h) => pathname === h || pathname.startsWith(h + '/'),
  );
  if (matching.length === 0) return null;
  return matching.sort((a, b) => b.length - a.length)[0];
}

/* ── 축소 모드: 아이콘만 표시하는 단일 항목 ── */
function CollapsedNavItem({ entry, activeHref, onNavClick }: { entry: NavItem; activeHref: string | null; onNavClick: () => void }) {
  const isActive = activeHref === entry.href;
  return (
    <Link
      href={entry.href}
      onClick={onNavClick}
      title={entry.label}
      className={cn(
        'flex items-center justify-center rounded-lg w-10 h-10 transition-all',
        isActive
          ? 'bg-[#E8F0E0] text-[#5B7A3D]'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      )}
    >
      {entry.icon}
    </Link>
  );
}

/* ── 축소 모드: 그룹 → 호버 시 하위 메뉴 팝업 ── */
function CollapsedNavGroup({ group, activeHref, onNavClick }: { group: NavGroup; activeHref: string | null; onNavClick: () => void }) {
  const hasActiveChild = group.items.some((item) => activeHref === item.href);
  const [hover, setHover] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        title={group.label}
        className={cn(
          'flex items-center justify-center rounded-lg w-10 h-10 cursor-pointer transition-all',
          hasActiveChild
            ? 'bg-[#E8F0E0] text-[#5B7A3D]'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
        )}
      >
        <span className={cn('opacity-70', group.color)}>{group.icon}</span>
      </div>

      {/* 플라이아웃 메뉴 */}
      {hover && (
        <div className="absolute left-full top-0 ml-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px]">
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase">{group.label}</div>
          {group.items.map((item) => {
            const isActive = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavClick}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm transition-all',
                  isActive
                    ? 'bg-[#E8F0E0] text-[#5B7A3D] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <span className="opacity-60">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── 확장 모드: 그룹 (기존) ── */
function NavGroupItem({ group, activeHref, onNavClick }: { group: NavGroup; activeHref: string | null; onNavClick: () => void }) {
  const hasActiveChild = group.items.some((item) => activeHref === item.href);
  const [open, setOpen] = useState(hasActiveChild);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium transition-all w-full',
          hasActiveChild ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
        )}
      >
        <span className={cn('opacity-70', group.color)}>{group.icon}</span>
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-200 pl-2">
          {group.items.map((item) => {
            const isActive = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavClick}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-base transition-all',
                  isActive
                    ? 'bg-[#E8F0E0] text-[#5B7A3D] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <span className="opacity-60">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══ 메인 사이드바 ══ */
const COLLAPSED_KEY = 'sidebar_collapsed';

export function AdminSidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, refreshToken, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  // 모든 leaf href를 모아서 longest matching href를 활성으로 처리.
  // /admin/payments/vbank 일 때 /admin/payments 가 활성되지 않도록.
  const allHrefs = navEntries.flatMap((e) =>
    isGroup(e) ? e.items.map((i) => i.href) : [(e as NavItem).href],
  );
  const activeHref = getActiveHref(pathname, allHrefs);

  // localStorage에서 축소 상태 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved === 'true') setCollapsed(true);
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, String(next)); } catch {}
  };

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await adminLogout(refreshToken);
      }
    } catch {
      // ignore
    }
    logout();
    toast.info('로그아웃 되었습니다.');
    router.replace('/admin/login');
  };

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <>
      {/* 모바일 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-out md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'w-16' : 'w-52'
        )}
      >
        {/* 헤더 */}
        <div className={cn('flex items-center border-b border-slate-100 px-3 py-4', collapsed ? 'justify-center' : 'justify-between px-4')}>
          {collapsed ? (
            <div className="w-8 h-8 rounded-lg bg-[#5B7A3D] flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">F</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#5B7A3D] flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm font-bold">F</span>
                </div>
                <span className="font-semibold text-slate-800">달려라 꽃배달</span>
              </div>
              <button
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                onClick={onClose}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* 네비게이션 */}
        <nav className={cn('flex-1 overflow-auto p-2', collapsed ? 'flex flex-col items-center gap-1' : 'space-y-0.5 p-3')}>
          {navEntries.map((entry, i) => {
            if (collapsed) {
              // 축소 모드
              if (isGroup(entry)) {
                return <CollapsedNavGroup key={i} group={entry} activeHref={activeHref} onNavClick={handleNavClick} />;
              }
              return <CollapsedNavItem key={(entry as NavItem).href} entry={entry as NavItem} activeHref={activeHref} onNavClick={handleNavClick} />;
            }
            // 확장 모드
            if (isGroup(entry)) {
              return <NavGroupItem key={i} group={entry} activeHref={activeHref} onNavClick={handleNavClick} />;
            }
            const item = entry as NavItem;
            const isActive = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition-all',
                  isActive
                    ? 'bg-[#E8F0E0] text-[#5B7A3D] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <span className="opacity-60">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 하단: 사용자 정보 + 토글 */}
        <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white p-3 space-y-2">
          {collapsed ? (
            <>
              {user && (
                <div className="flex justify-center" title={`${user.name} (${user.username})`}>
                  <div className="w-8 h-8 rounded-full bg-[#5B7A3D] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {user.name?.charAt(0) || 'A'}
                  </div>
                </div>
              )}
              <button
                onClick={toggleCollapsed}
                title="메뉴 확장"
                className="flex items-center justify-center w-full h-9 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <CollapseIcon collapsed={collapsed} />
              </button>
            </>
          ) : (
            <>
              {user && (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#5B7A3D] flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                    {user.name?.charAt(0) || 'A'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-medium text-slate-800 truncate">{user.name}</div>
                    <div className="text-sm text-slate-400 truncate">{user.username}</div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-9 text-sm border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                  onClick={handleLogout}
                >
                  로그아웃
                </Button>
                <button
                  onClick={toggleCollapsed}
                  title="메뉴 축소"
                  className="flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <CollapseIcon collapsed={collapsed} />
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
