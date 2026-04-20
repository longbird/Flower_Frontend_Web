'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchRecommendedPhotos } from '@/lib/branch/api';
import type { BranchInfo, RecommendedPhoto, PaginatedResponse } from '@/lib/branch/types';
import type { BranchThemeProps } from './types';
import { parseServiceAreas } from '@/lib/branch/utils';
import {
  formatPrice,
  photoUrl,
  categoryLabel,
  gradeLabel,
  CATEGORY_ORDER,
  BusinessInfoFooter,
} from './shared';

// ═══════════════════════════════════════════════════════════════════
// Inline icon set — stroke 1.6~1.8, line-only style consistent with
// the design system. No lucide import to avoid runtime weight cost
// on a landing page.
// ═══════════════════════════════════════════════════════════════════

const Icon = {
  phone: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  chat: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  check: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  star: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l2.39 7.36h7.74l-6.26 4.55 2.39 7.36L12 17.27l-6.26 4.55 2.39-7.36L1.87 9.36h7.74z" />
    </svg>
  ),
  arrow: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  ),
  clock: (cls = 'w-5 h-5') => (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  camera: (cls = 'w-5 h-5') => (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <circle cx="12" cy="13" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  shield: (cls = 'w-5 h-5') => (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  map: (cls = 'w-5 h-5') => (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0L6.343 16.657a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  heart: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
    </svg>
  ),
  search: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  chevron: (cls = 'w-4 h-4', rot = 0) => (
    <svg className={cls} style={{ transform: `rotate(${rot}deg)`, transition: 'transform 220ms var(--ease-out-quart)' }} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
  xmark: (cls = 'w-4 h-4') => (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════
// Scroll reveal — single IntersectionObserver, one-shot
// ═══════════════════════════════════════════════════════════════════

function useScrollReveal(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = root.current;
    if (!host) return;
    const targets = host.querySelectorAll<HTMLElement>('.reveal');
    if (targets.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.01 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [root]);
}

// ═══════════════════════════════════════════════════════════════════
// Sticky Header — transparent over hero, glass on scroll
// ═══════════════════════════════════════════════════════════════════

function StickyHeader({ branch, slug }: { branch: BranchInfo; slug: string }) {
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks: Array<[string, string]> = [
    ['#usecase', '용도별'],
    ['#products', '상품'],
    ['#reviews', '후기'],
    ['#delivery', '배송'],
    ['#info', '매장안내'],
  ];

  return (
    <header
      className="sticky top-0 z-40 transition-colors"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? '1px solid var(--branch-border)' : '1px solid transparent',
        color: scrolled ? 'var(--branch-text)' : '#ffffff',
      }}
    >
      <div className="max-w-[1200px] mx-auto h-16 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-6 md:gap-8 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="shrink-0">
              <circle cx="16" cy="16" r="15" fill={scrolled ? 'var(--branch-green)' : 'transparent'} stroke={scrolled ? 'var(--branch-green)' : 'currentColor'} strokeWidth="1.5" />
              <path d="M16 9 C13 10 11 13 11 16 C11 18 13 20 16 20 C19 20 21 18 21 16 C21 13 19 10 16 9 Z" fill={scrolled ? '#fff' : 'currentColor'} />
              <path d="M16 20 L16 24" stroke={scrolled ? '#fff' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div className="leading-tight min-w-0">
              <div className="serif text-[1rem] md:text-[1.05rem] font-semibold truncate">{branch.name}</div>
              <div
                className="text-[10px] tracking-[0.28em] uppercase hidden sm:block"
                style={{ color: scrolled ? 'var(--branch-text-muted)' : 'rgba(255,255,255,0.72)' }}
              >
                Seoul Flower Delivery
              </div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {navLinks.map(([h, l]) => (
              <a key={h} href={h} className="transition-opacity hover:opacity-60">{l}</a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {branch.phone && (
            <a
              href={`tel:${branch.phone}`}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm tnum transition-opacity hover:opacity-70"
            >
              {Icon.phone()} {branch.phone}
            </a>
          )}
          <button
            onClick={() => router.push(`/branch/${slug}/consult`)}
            className="btn-fill"
            style={{ padding: '0.5rem 1.1rem', fontSize: '0.8125rem' }}
          >
            주문/상담
          </button>
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Editorial Hero — full-bleed product photo, serif display, stat sidebar
// ═══════════════════════════════════════════════════════════════════

function EditorialHero({ branch, heroProduct, slug }: { branch: BranchInfo; heroProduct?: RecommendedPhoto; slug: string }) {
  const router = useRouter();
  const bgImage = heroProduct?.imageUrl ? photoUrl(heroProduct.imageUrl) : '';

  return (
    <section className="relative" style={{ background: 'var(--branch-bg-deep)' }}>
      {bgImage && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={bgImage}
            alt=""
            className="w-full h-full object-cover"
            style={{ opacity: 0.55, filter: 'saturate(0.85)' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0.65) 100%)' }}
          />
        </div>
      )}

      <div className="relative max-w-[1200px] mx-auto px-4 md:px-6 pt-20 pb-28 md:pt-32 md:pb-40 text-white">
        <div className="grid md:grid-cols-[1fr_auto] items-end gap-10 md:gap-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6 md:mb-8 reveal">
              <span className="h-px w-10 bg-white/60" />
              <span className="text-[11px] tracking-[0.4em] uppercase opacity-80 serif italic">
                Seasonal Bloom · Everyday Delivery
              </span>
            </div>
            <h1
              className="serif font-normal leading-[1.02] mb-6 md:mb-8 reveal d1"
              style={{ fontSize: 'var(--type-display)' }}
            >
              오늘의 <em className="italic font-medium">꽃</em>,<br />
              내일의 <em className="italic font-medium">마음</em>.
            </h1>
            <p className="text-base md:text-lg opacity-85 max-w-lg leading-relaxed mb-8 reveal d2">
              {branch.description || '20년 경력 플로리스트가 매일 새벽 경매장에서 직접 고른 꽃으로, 서울 전역 3시간 이내 배송해 드립니다.'}
            </p>
            <div className="flex flex-wrap items-center gap-3 reveal d3">
              <button
                onClick={() => router.push(`/branch/${slug}/consult`)}
                className="btn-fill"
                style={{ padding: '1rem 2rem', fontSize: '0.9375rem' }}
              >
                상담 신청하기 {Icon.arrow()}
              </button>
              {branch.phone && (
                <a
                  href={`tel:${branch.phone}`}
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-full border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition tnum"
                >
                  {Icon.phone()} {branch.phone}
                </a>
              )}
            </div>
          </div>

          <div className="hidden md:flex flex-col gap-6 pl-8 border-l border-white/20 reveal d4">
            <Stat num="12,400+" label="누적 배송" />
            <Stat num="4.9 / 5.0" label="후기 평점" />
            <Stat num="3시간" label="평균 배송시간" />
          </div>
        </div>
      </div>

      <div className="absolute left-1/2 bottom-6 -translate-x-1/2 text-white/70 text-[10px] tracking-[0.3em] uppercase flex flex-col items-center gap-2 pointer-events-none">
        <span>Scroll</span>
        <span className="block h-8 w-px bg-white/40" />
      </div>
    </section>
  );
}

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div>
      <div className="serif text-3xl lg:text-4xl font-normal tnum">{num}</div>
      <div className="text-[11px] tracking-[0.25em] uppercase opacity-70 mt-1">{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Use Cases — 2×2 tiles with photo overlap, check list, From price
// ═══════════════════════════════════════════════════════════════════

type UseCaseKey = 'celebration' | 'condolence' | 'bouquet' | 'parents';

// Curated stock photos per use case. All licensed for commercial use without
// attribution (Pexels / Unsplash free license). URLs include server-side
// resize params so bandwidth stays tight.
const USE_CASES: Array<{
  key: UseCaseKey;
  label: string;
  sub: string;
  from: number;
  lines: string[];
  image: string;
  imageCredit: string;
}> = [
  {
    key: 'celebration',
    label: '축하 화환',
    sub: '개업 · 승진 · 취임 · 공연',
    from: 90000,
    lines: ['리본 문구 정성 작성', '당일 오후 배송 가능', '실물 사진 전송'],
    image: 'https://images.pexels.com/photos/7813205/pexels-photo-7813205.jpeg?auto=compress&cs=tinysrgb&w=800',
    imageCredit: 'Pexels — colorful floral wreath',
  },
  {
    key: 'condolence',
    label: '근조 화환',
    sub: '조의 · 영결 · 49재',
    from: 85000,
    lines: ['2시간 이내 긴급 배송', '정식 근조 스탠드', '상주 이름 확인 후 제작'],
    image: 'https://images.pexels.com/photos/8986716/pexels-photo-8986716.jpeg?auto=compress&cs=tinysrgb&w=800',
    imageCredit: 'Pexels — bouquet wrapped in black ribbon',
  },
  {
    key: 'bouquet',
    label: '꽃다발 · 부케',
    sub: '기념일 · 고백 · 생일',
    from: 48000,
    lines: ['시즌 신선 꽃다발', '카드 메시지 무료', '픽업/배송 선택'],
    image: 'https://images.unsplash.com/photo-1549576351-2b0829ac81f8?w=800&q=80&auto=format&fit=crop',
    imageCredit: 'Unsplash — pink & white peony bouquet',
  },
  {
    key: 'parents',
    label: '어버이날 · 특별한 날',
    sub: '카네이션 · 용돈박스 · 감사 화환',
    from: 55000,
    lines: ['시즌 한정 카네이션', '용돈 박스 옵션', '전국 KTX 특송'],
    image: 'https://images.unsplash.com/photo-1497276236755-0f85ba99a126?w=800&q=80&auto=format&fit=crop',
    imageCredit: 'Unsplash — pink carnation bouquet',
  },
];

// Map each use case to the actual product category used in the catalog —
// clicking a tile filters the Products grid and scrolls the user to it.
const USE_CASE_CATEGORY: Record<UseCaseKey, string> = {
  celebration: 'CELEBRATION',
  condolence: 'CONDOLENCE',
  bouquet: 'FLOWER',
  parents: 'OBJET',
};

function UseCases({ onPickCategory }: { onPickCategory: (category: string) => void }) {
  const handlePick = (key: UseCaseKey) => {
    onPickCategory(USE_CASE_CATEGORY[key]);
    if (typeof window !== 'undefined') {
      // Defer so the category state applies before scroll starts.
      requestAnimationFrame(() => {
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  return (
    <section id="usecase" className="py-20 md:py-24 px-4 md:px-6" style={{ background: 'var(--branch-bg)' }}>
      <div className="max-w-[1240px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10 md:mb-12 reveal">
          <div>
            <p className="text-[11px] tracking-[0.35em] uppercase mb-3" style={{ color: 'var(--branch-green)' }}>
              Choose Your Moment
            </p>
            <h2 className="serif font-normal leading-tight" style={{ fontSize: 'var(--type-section)', color: 'var(--branch-text)' }}>
              어떤 자리에 보내시나요?
            </h2>
            <p className="text-sm mt-3 max-w-md" style={{ color: 'var(--branch-text-muted)' }}>
              자리에 어울리는 상품을 바로 확인해 보세요. 상세 상담은 언제든 가능합니다.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5 md:gap-7">
          {USE_CASES.map((u, i) => (
            <article
              key={u.key}
              onClick={() => handlePick(u.key)}
              className={`reveal d${(i % 4) + 1} group relative overflow-hidden rounded-[20px] cursor-pointer transition-shadow hover:shadow-md`}
              style={{ background: 'var(--branch-surface)', border: '1px solid var(--branch-border)' }}
            >
              <div className="grid grid-cols-[1fr_1fr]">
                <div
                  className="relative aspect-[4/3] md:aspect-auto overflow-hidden"
                  style={{ background: 'var(--branch-bg-alt)' }}
                >
                  <img
                    src={u.image}
                    alt={u.label}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                    style={{ transitionTimingFunction: 'var(--ease-out-quart)' }}
                  />
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, transparent 55%, var(--branch-surface) 100%)' }}
                  />
                </div>
                <div className="p-5 md:p-7 flex flex-col">
                  <p className="text-[10px] md:text-[11px] tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--branch-text-subtle)' }}>
                    {u.sub}
                  </p>
                  <h3 className="serif text-[1.25rem] md:text-[1.625rem] font-medium mb-4" style={{ color: 'var(--branch-text)' }}>
                    {u.label}
                  </h3>
                  <ul className="space-y-2 mb-5 text-[12px] md:text-[13px]">
                    {u.lines.map((l) => (
                      <li key={l} className="flex items-start gap-2" style={{ color: 'var(--branch-text-muted)' }}>
                        <span className="mt-0.5 shrink-0" style={{ color: 'var(--branch-green)' }}>{Icon.check('w-3.5 h-3.5')}</span>
                        {l}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex items-end justify-between gap-3">
                    <div>
                      <span className="text-[10px] tracking-[0.3em] uppercase" style={{ color: 'var(--branch-text-subtle)' }}>From</span>
                      <div className="serif text-lg md:text-xl tnum font-normal" style={{ color: 'var(--branch-green)' }}>
                        {formatPrice(u.from)}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm transition-all group-hover:gap-2" style={{ color: 'var(--branch-text)' }}>
                      보러가기 {Icon.arrow('w-4 h-4')}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Trust strip — 4 icon cards on warm alt background
// ═══════════════════════════════════════════════════════════════════

function TrustStrip() {
  const items = [
    { icon: Icon.clock(), title: '3시간 이내 배송', desc: '서울 전 지역' },
    { icon: Icon.camera(), title: '실물 사진 전송', desc: '제작 완료 후' },
    { icon: Icon.shield(), title: '리본 문구 무료', desc: '정성껏 작성' },
    { icon: Icon.map(), title: '전국 배송 가능', desc: 'KTX 특송 지원' },
  ];
  return (
    <section className="py-14 md:py-16 px-4 md:px-6" style={{ background: 'var(--branch-bg-alt)' }}>
      <div className="max-w-[1100px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {items.map((b, i) => (
          <div key={b.title} className={`reveal d${(i % 4) + 1} flex items-start gap-3 md:gap-4`}>
            <span
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--branch-surface)', color: 'var(--branch-green)', border: '1px solid var(--branch-border)' }}
            >
              {b.icon}
            </span>
            <div>
              <h3 className="text-[0.9375rem] font-semibold mb-0.5" style={{ color: 'var(--branch-text)' }}>{b.title}</h3>
              <p className="text-xs" style={{ color: 'var(--branch-text-muted)' }}>{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Products — real API, grade pill filter + category pill strip
// ═══════════════════════════════════════════════════════════════════

function Products({
  slug,
  initialData,
  onProductClick,
  defaultServiceArea,
  selectedCategory,
  setSelectedCategory,
}: {
  slug: string;
  initialData: PaginatedResponse<RecommendedPhoto>;
  onProductClick: (product: RecommendedPhoto) => void;
  defaultServiceArea?: string;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
}) {
  const [selectedGrade, setSelectedGrade] = useState<string>('전체');
  const [areaInput, setAreaInput] = useState(defaultServiceArea || '');
  const [activeArea, setActiveArea] = useState(defaultServiceArea || '');
  const [page, setPage] = useState(1);
  const [photosData, setPhotosData] = useState<PaginatedResponse<RecommendedPhoto>>(initialData);
  const [loadingPage, setLoadingPage] = useState(false);
  const [categoryList, setCategoryList] = useState<string[]>(['전체']);

  useEffect(() => {
    async function loadCategories() {
      const result = await fetchRecommendedPhotos(slug, { page: 1, size: 200 });
      const cats = new Set<string>();
      for (const p of result.data) {
        if (p.category) cats.add(p.category);
      }
      if (cats.size > 0) {
        const sorted = CATEGORY_ORDER.filter((c) => cats.has(c));
        const rest = Array.from(cats).filter((c) => !CATEGORY_ORDER.includes(c));
        setCategoryList(['전체', ...sorted, ...rest]);
      }
    }
    loadCategories();
  }, [slug]);

  // Reset to page 1 whenever the category changes (incl. from parent / use-case tile).
  // See react.dev "Adjusting some state when a prop changes" — derive via render-phase
  // compare instead of useEffect to avoid cascading re-renders.
  const [prevCategory, setPrevCategory] = useState(selectedCategory);
  if (selectedCategory !== prevCategory) {
    setPrevCategory(selectedCategory);
    setPage(1);
  }

  useEffect(() => {
    const category = selectedCategory === '전체' ? undefined : selectedCategory;
    const serviceArea = activeArea || undefined;
    async function loadPage() {
      setLoadingPage(true);
      const result = await fetchRecommendedPhotos(slug, { page, size: 24, category, serviceArea });
      setPhotosData(result);
      setLoadingPage(false);
    }
    loadPage();
  }, [slug, page, selectedCategory, activeArea]);

  const filteredProducts = useMemo(
    () => (selectedGrade === '전체' ? photosData.data : photosData.data.filter((p) => p.grade === selectedGrade)),
    [photosData.data, selectedGrade],
  );
  const totalPages = Math.ceil(photosData.total / photosData.size);

  const handleAreaSearch = () => {
    setActiveArea(areaInput.trim());
    setPage(1);
  };
  const handleAreaClear = () => {
    setAreaInput('');
    setActiveArea('');
    setPage(1);
  };

  if (initialData.data.length === 0) return null;

  const grades = ['전체', 'PREMIUM', 'HIGH', 'STANDARD'];

  return (
    <section id="products" className="py-20 md:py-24 px-4 md:px-6" style={{ background: 'var(--branch-bg)' }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8 md:mb-10 reveal">
          <div>
            <p className="text-[11px] tracking-[0.35em] uppercase mb-3" style={{ color: 'var(--branch-green)' }}>
              Bouquets &amp; Arrangements
            </p>
            <h2 className="serif font-normal" style={{ fontSize: 'var(--type-section)', color: 'var(--branch-text)' }}>
              오늘의 컬렉션
            </h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            {grades.map((g) => {
              const isActive = selectedGrade === g;
              return (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className="px-4 py-2 rounded-full text-xs font-medium transition"
                  style={{
                    background: isActive ? 'var(--branch-text)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--branch-text-muted)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--branch-text)' : 'var(--branch-border)',
                  }}
                >
                  {g === '전체' ? '전체' : gradeLabel(g)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category strip + area search */}
        <div className="mb-6 reveal d1">
          <div className="overflow-x-auto no-scrollbar -mx-4 md:-mx-6 px-4 md:px-6 mb-5">
            <div className="flex gap-2 min-w-max">
              {categoryList.map((c) => {
                const isActive = selectedCategory === c;
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setSelectedCategory(c);
                      setPage(1);
                    }}
                    className="px-5 py-2.5 rounded-full text-sm font-medium transition whitespace-nowrap"
                    style={{
                      background: isActive ? 'var(--branch-green)' : 'var(--branch-surface)',
                      color: isActive ? '#ffffff' : 'var(--branch-text-muted)',
                      border: '1px solid',
                      borderColor: isActive ? 'var(--branch-green)' : 'var(--branch-border)',
                    }}
                  >
                    {c === '전체' ? '전체' : categoryLabel(c)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--branch-text-muted)' }}>
                  {Icon.search()}
                </span>
                <input
                  type="text"
                  value={areaInput}
                  onChange={(e) => setAreaInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAreaSearch()}
                  placeholder="배달 지역 검색 (예: 강남, 서초)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full text-sm transition-colors"
                  style={{
                    background: 'var(--branch-surface)',
                    border: '1px solid var(--branch-border)',
                    color: 'var(--branch-text)',
                    outline: 'none',
                  }}
                />
              </div>
              <button onClick={handleAreaSearch} className="btn-fill shrink-0" style={{ padding: '0.625rem 1.4rem', fontSize: '0.875rem' }}>
                검색
              </button>
            </div>
            {activeArea && (
              <div className="flex items-center justify-center gap-2 mt-2 text-xs" style={{ color: 'var(--branch-text-secondary)' }}>
                <span>
                  &quot;{activeArea}&quot; 지역 결과 · {filteredProducts.length}건
                </span>
                <button onClick={handleAreaClear} className="underline" style={{ color: 'var(--branch-green)' }}>
                  초기화
                </button>
              </div>
            )}
          </div>
        </div>

        {loadingPage ? (
          <div className="text-center py-16" style={{ color: 'var(--branch-text-muted)' }}>
            <div className="w-8 h-8 mx-auto mb-3 border-2 border-[var(--branch-green)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--branch-text-muted)' }}>
            <span className="inline-block opacity-40 mb-3">{Icon.search('w-12 h-12')}</span>
            <p className="text-sm">해당 조건에 맞는 상품이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-7">
            {filteredProducts.map((p, i) => (
              <article
                key={p.id}
                onClick={() => onProductClick(p)}
                className={`reveal d${(i % 4) + 1} group cursor-pointer`}
              >
                <div
                  className="relative aspect-[3/4] overflow-hidden mb-4 rounded-[12px]"
                  style={{ background: 'var(--branch-bg-alt)' }}
                >
                  {p.imageUrl ? (
                    <img
                      src={photoUrl(p.imageUrl)}
                      alt={p.name || '상품'}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      style={{ transitionTimingFunction: 'var(--ease-out-quart)' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--branch-text-subtle)' }}>
                      {Icon.camera('w-8 h-8')}
                    </div>
                  )}
                  {p.grade && (
                    <div className="absolute top-3 left-3">
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase"
                        style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--branch-text)' }}
                      >
                        {gradeLabel(p.grade)}
                      </span>
                    </div>
                  )}
                  <button
                    aria-label="찜하기"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-white/90 hover:bg-white transition-colors"
                    style={{ color: 'var(--branch-text-muted)' }}
                  >
                    {Icon.heart()}
                  </button>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {p.category && (
                      <p className="text-[10px] md:text-[11px] tracking-wider uppercase mb-1" style={{ color: 'var(--branch-text-subtle)' }}>
                        {categoryLabel(p.category)}
                      </p>
                    )}
                    {p.name && (
                      <h3 className="serif text-[0.95rem] md:text-[1.0625rem] leading-snug font-medium truncate" style={{ color: 'var(--branch-text)' }}>
                        {p.name}
                      </h3>
                    )}
                  </div>
                  {p.sellingPrice != null && p.sellingPrice > 0 && (
                    <div className="text-right shrink-0">
                      <p className="text-[0.9375rem] font-semibold tnum" style={{ color: 'var(--branch-green)' }}>
                        {formatPrice(p.sellingPrice)}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {photosData.total > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'var(--branch-surface)',
                color: 'var(--branch-text-secondary)',
                border: '1px solid var(--branch-border)',
              }}
            >
              이전
            </button>
            <span className="text-sm tnum" style={{ color: 'var(--branch-text-muted)' }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'var(--branch-surface)',
                color: 'var(--branch-text-secondary)',
                border: '1px solid var(--branch-border)',
              }}
            >
              다음
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Reviews — 2-col, photo beside testimonial
// ═══════════════════════════════════════════════════════════════════

// Each review maps to a product category so the photo shown next to it is
// visually consistent with the usecase (축하 → CELEBRATION, etc.).
const REVIEWS: Array<{
  id: number;
  usecase: string;
  preferCategories: string[];
  name: string;
  date: string;
  product: string;
  text: string;
}> = [
  {
    id: 1,
    usecase: '축하 화환',
    preferCategories: ['CELEBRATION'],
    name: '김지민',
    date: '2026.02.14',
    product: '프리미엄 축하 화환',
    text: '거래처 개업식에 보냈는데 실물이 사진보다 더 예뻤다고 연락이 왔어요. 리본 글귀도 정성스럽게 써주셔서 감사했습니다.',
  },
  {
    id: 2,
    usecase: '꽃다발',
    preferCategories: ['FLOWER'],
    name: '이준호',
    date: '2026.02.02',
    product: '시즌 피오니 꽃다발',
    text: '기념일에 주문했는데 제작 전에 실물 사진 먼저 보내주셔서 마음이 놓였어요. 꽃이 오래 가서 2주 넘게 봤습니다.',
  },
  {
    id: 3,
    usecase: '근조 화환',
    preferCategories: ['CONDOLENCE'],
    name: '박서연',
    date: '2026.01.23',
    product: '근조 스탠드',
    text: '갑작스러운 부고 소식에 전화 한 통으로 2시간 만에 정중한 근조 화환을 보내드릴 수 있었어요. 정말 감사합니다.',
  },
  {
    id: 4,
    usecase: '어버이날',
    preferCategories: ['OBJET', 'FLOWER', 'CELEBRATION'],
    name: '최다은',
    date: '2026.01.18',
    product: '카네이션 용돈박스',
    text: '어머니 생신에 보내드렸는데 너무 예쁘다고 좋아하셨어요. 구성이 알차고 카드 메시지도 손글씨라 더 특별했습니다.',
  },
];

/** Pair each review with a category-matched real product photo, avoiding reuse. */
function pickReviewImages(products: RecommendedPhoto[]): Array<string | undefined> {
  const withImg = products.filter((p) => !!p.imageUrl);
  const used = new Set<number>();
  return REVIEWS.map((r) => {
    for (const cat of r.preferCategories) {
      const match = withImg.find((p) => p.category === cat && !used.has(p.id));
      if (match?.imageUrl) {
        used.add(match.id);
        return photoUrl(match.imageUrl);
      }
    }
    const any = withImg.find((p) => !used.has(p.id));
    if (any?.imageUrl) {
      used.add(any.id);
      return photoUrl(any.imageUrl);
    }
    return withImg[0]?.imageUrl ? photoUrl(withImg[0].imageUrl) : undefined;
  });
}

function Reviews({ products }: { products: RecommendedPhoto[] }) {
  const reviewImages = useMemo(() => pickReviewImages(products), [products]);
  return (
    <section id="reviews" className="py-20 md:py-24 px-4 md:px-6" style={{ background: 'var(--branch-bg-alt)' }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-6 mb-10 md:mb-12 reveal">
          <div>
            <p className="text-[11px] tracking-[0.35em] uppercase mb-3" style={{ color: 'var(--branch-green)' }}>
              Customer Reviews
            </p>
            <h2 className="serif font-normal leading-tight" style={{ fontSize: 'var(--type-section)', color: 'var(--branch-text)' }}>
              실제 받아보신 분들의 후기
            </h2>
          </div>
          <div className="flex items-center gap-4 md:gap-5">
            <div className="flex items-center gap-1" style={{ color: 'var(--branch-star)' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i}>{Icon.star('w-5 h-5')}</span>
              ))}
            </div>
            <div className="text-sm tnum" style={{ color: 'var(--branch-text-muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--branch-text)' }}>4.9</span> / 5.0 · 리뷰 {REVIEWS.length.toLocaleString()}건
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5 md:gap-6">
          {REVIEWS.map((r, i) => {
            const img = reviewImages[i];
            return (
            <article
              key={r.id}
              className={`reveal d${(i % 4) + 1} rounded-[18px] overflow-hidden flex flex-col md:flex-row`}
              style={{ background: 'var(--branch-surface)', border: '1px solid var(--branch-border)' }}
            >
              <div className="md:w-[220px] shrink-0 aspect-[4/3] md:aspect-auto overflow-hidden relative" style={{ background: 'var(--branch-bg-alt)' }}>
                {img ? (
                  <img src={img} alt={r.product} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--branch-text-subtle)' }}>
                    {Icon.camera('w-8 h-8')}
                  </div>
                )}
              </div>
              <div className="p-5 md:p-6 flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-0.5" style={{ color: 'var(--branch-star)' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s}>{Icon.star('w-3.5 h-3.5')}</span>
                    ))}
                  </div>
                  <span
                    className="text-[10px] md:text-[11px] tracking-wider uppercase px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--branch-green-light)', color: 'var(--branch-green)' }}
                  >
                    {r.usecase}
                  </span>
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--branch-text)' }}>
                  &ldquo;{r.text}&rdquo;
                </p>
                <div className="flex items-center justify-between text-xs pt-3 border-t" style={{ borderColor: 'var(--branch-border)', color: 'var(--branch-text-muted)' }}>
                  <span className="font-medium" style={{ color: 'var(--branch-text)' }}>{r.name}</span>
                  <span className="tnum">{r.date}</span>
                </div>
                <p className="text-[11px] mt-2" style={{ color: 'var(--branch-text-subtle)' }}>
                  주문 상품 · {r.product}
                </p>
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Delivery — map + ZIP check
// ═══════════════════════════════════════════════════════════════════

const SEOUL_ZIP_PREFIXES = ['01', '02', '03', '04', '05', '06', '07'];
const METRO_ZIP_PREFIXES = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '22', '23'];

type ZipStatus = 'seoul' | 'metro' | 'nation' | 'invalid';
interface ZipResult {
  status: ZipStatus;
  eta?: string;
  fee?: number;
}

function checkZip(zip: string): ZipResult {
  const z = zip.trim();
  if (!/^\d{5}$/.test(z)) return { status: 'invalid' };
  const pre = z.slice(0, 2);
  if (SEOUL_ZIP_PREFIXES.includes(pre)) return { status: 'seoul', eta: '오늘 오후', fee: 0 };
  if (METRO_ZIP_PREFIXES.includes(pre)) return { status: 'metro', eta: '내일 오전', fee: 15000 };
  return { status: 'nation', eta: '2일 이내 · KTX 특송', fee: 28000 };
}

function Delivery({ branch, slug }: { branch: BranchInfo; slug: string }) {
  const router = useRouter();
  return (
    <section id="delivery" className="py-20 md:py-24 px-4 md:px-6" style={{ background: 'var(--branch-bg)' }}>
      <div className="max-w-[1200px] mx-auto grid md:grid-cols-[1fr_1.1fr] gap-10 md:gap-14 items-center">
        <div className="reveal">
          <p className="text-[11px] tracking-[0.35em] uppercase mb-3" style={{ color: 'var(--branch-green)' }}>
            Delivery Area
          </p>
          <h2 className="serif font-normal leading-tight mb-5 md:mb-6" style={{ fontSize: 'var(--type-section)', color: 'var(--branch-text)' }}>
            서울 전역<br />3시간 이내 배송
          </h2>
          <p className="text-base mb-6 md:mb-8 leading-relaxed max-w-md" style={{ color: 'var(--branch-text-muted)' }}>
            {branch.address ? `${branch.address} ` : ''}매장에서 출발하여 서울 25개 구 전 지역 당일 배송이 가능합니다. 전국 배송은 KTX 특송 또는 파트너 지사를 통해 안전하게 전달합니다.
          </p>
          <ul className="space-y-3 mb-8">
            {[
              ['오전 주문', '당일 오후 배송 (14시 이전 주문 기준)'],
              ['오후 주문', '당일 저녁 또는 익일 오전 배송'],
              ['전국 배송', 'KTX 특송으로 2-4시간 내 도착'],
            ].map(([k, v]) => (
              <li key={k} className="flex gap-3">
                <span className="mt-0.5 shrink-0" style={{ color: 'var(--branch-green)' }}>{Icon.check('w-5 h-5')}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--branch-text)' }}>{k}</p>
                  <p className="text-xs" style={{ color: 'var(--branch-text-muted)' }}>{v}</p>
                </div>
              </li>
            ))}
          </ul>
          <button onClick={() => router.push(`/branch/${slug}/consult`)} className="btn-outline">
            배송지 상담하기 {Icon.arrow()}
          </button>
        </div>

        <div className="reveal d2">
          <div
            className="relative aspect-[4/3] rounded-[20px] overflow-hidden"
            style={{ background: 'var(--branch-bg-alt)', border: '1px solid var(--branch-border)' }}
          >
            <SeoulMap />
            <div
              className="absolute left-5 top-5 px-3 py-2 rounded-full text-xs font-medium flex items-center gap-2"
              style={{ background: 'var(--branch-surface)', color: 'var(--branch-text)', border: '1px solid var(--branch-border)' }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: 'var(--branch-green)' }} />
              매장 위치 · {branch.name}
            </div>
          </div>
          <ZipCheck />
        </div>
      </div>
    </section>
  );
}

function SeoulMap() {
  const cells = ['..XXXX..', '.XXXXXX.', 'XXXXOXXX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..'];
  return (
    <svg viewBox="0 0 400 300" className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>
        <pattern id="branchMapGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="var(--branch-border)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="400" height="300" fill="url(#branchMapGrid)" />
      <path
        d="M0 175 Q70 170 140 180 T300 165 T400 180"
        stroke="var(--branch-green-light)"
        strokeWidth="14"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M0 175 Q70 170 140 180 T300 165 T400 180"
        stroke="var(--branch-green)"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
      {cells.map((row, y) =>
        row.split('').map((c, x) => {
          if (c === '.') return null;
          const cx = 40 + x * 40;
          const cy = 30 + y * 40;
          const isCenter = c === 'O';
          return (
            <g key={`${x}-${y}`}>
              <rect
                x={cx}
                y={cy}
                width="34"
                height="34"
                rx="6"
                fill={isCenter ? 'var(--branch-green)' : 'var(--branch-green-light)'}
                stroke={isCenter ? 'var(--branch-primary-deep)' : 'var(--branch-green)'}
                strokeWidth="0.8"
                opacity={isCenter ? 1 : 0.55 + ((x + y) % 3) * 0.12}
              />
              {isCenter && <circle cx={cx + 17} cy={cy + 17} r="4" fill="#ffffff" />}
            </g>
          );
        }),
      )}
      <circle cx="207" cy="147" r="50" fill="none" stroke="var(--branch-green)" strokeWidth="1" opacity="0.5" strokeDasharray="3 3" />
      <circle cx="207" cy="147" r="90" fill="none" stroke="var(--branch-green)" strokeWidth="1" opacity="0.3" strokeDasharray="3 3" />
      <circle cx="207" cy="147" r="130" fill="none" stroke="var(--branch-green)" strokeWidth="1" opacity="0.15" strokeDasharray="3 3" />
    </svg>
  );
}

function ZipCheck() {
  const [zip, setZip] = useState('');
  const [result, setResult] = useState<ZipResult | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(checkZip(zip));
  };

  const statusCopy: Record<ZipStatus, { label: string; color: string }> = {
    seoul: { label: '서울 전역 당일 배송 가능', color: 'var(--branch-green)' },
    metro: { label: '수도권 익일 배송 가능', color: 'var(--branch-text)' },
    nation: { label: '전국 배송 · KTX 특송', color: 'var(--branch-text)' },
    invalid: { label: '우편번호 5자리를 입력해 주세요', color: '#b84a4a' },
  };

  return (
    <div
      className="rounded-[14px] p-5 md:p-6 mt-6 md:mt-8"
      style={{ background: 'var(--branch-bg-alt)', border: '1px solid var(--branch-border)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: 'var(--branch-green)', color: '#ffffff' }}
        >
          {Icon.search('w-3.5 h-3.5')}
        </span>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--branch-text)' }}>
          우편번호로 배송 가능 확인
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
          placeholder="예: 06234"
          inputMode="numeric"
          className="flex-1 px-4 py-2.5 text-sm rounded-full tnum"
          style={{
            background: 'var(--branch-surface)',
            border: '1px solid var(--branch-border)',
            color: 'var(--branch-text)',
            outline: 'none',
          }}
        />
        <button type="submit" className="btn-fill" style={{ padding: '0.625rem 1.4rem', fontSize: '0.875rem' }}>
          확인
        </button>
      </form>

      {result && (
        <div
          className="mt-4 p-4 rounded-[10px] flex items-center gap-3"
          style={{ background: 'var(--branch-surface)', border: '1px solid var(--branch-border)' }}
        >
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: result.status === 'invalid' ? '#fde8e8' : 'var(--branch-green-light)',
              color: result.status === 'invalid' ? '#b84a4a' : 'var(--branch-green)',
            }}
          >
            {result.status === 'invalid' ? Icon.xmark('w-4 h-4') : Icon.check('w-4 h-4')}
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color: statusCopy[result.status].color }}>
              {statusCopy[result.status].label}
            </div>
            {result.status !== 'invalid' && result.eta != null && result.fee != null && (
              <div className="text-xs mt-1 flex flex-wrap gap-x-3" style={{ color: 'var(--branch-text-muted)' }}>
                <span>
                  도착 예정 · <strong style={{ color: 'var(--branch-text)' }}>{result.eta}</strong>
                </span>
                <span>
                  배송비 ·{' '}
                  <strong className="tnum" style={{ color: 'var(--branch-text)' }}>
                    {result.fee === 0 ? '무료' : formatPrice(result.fee)}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FAQ accordion
// ═══════════════════════════════════════════════════════════════════

const FAQ_ITEMS = [
  {
    q: '주문 후 얼마나 빨리 받을 수 있나요?',
    a: '서울 전 지역은 오후 2시 이전 주문 시 당일 오후 배송이 가능합니다. 근조 화환 등 긴급 주문은 연락 주시면 2시간 이내 출고도 가능합니다. 전국 배송은 KTX 특송으로 2~4시간 내 도착합니다.',
  },
  {
    q: '실물이 사진과 달라 보이면 어쩌죠?',
    a: '제작이 완료되면 실물 사진을 먼저 카카오톡/문자로 전송해 드립니다. 만족스럽지 않으시면 배송 전 수정 요청이 가능합니다. 제작된 꽃의 색감·풍성함은 당일 꽃 상태에 따라 자연스럽게 다를 수 있음을 양해 부탁드립니다.',
  },
  {
    q: '리본이나 카드 메시지는 어떻게 요청하나요?',
    a: '주문/상담 시 리본 문구와 카드 메시지를 알려 주시면 서예 경력자가 정성껏 작성해 드립니다. 축하 / 근조 / 기념일 모두 무료이며, 수기 작성을 원하실 경우 별도로 말씀해 주세요.',
  },
  {
    q: '전국 배송도 가능한가요?',
    a: '네, 서울 외 전국 배송이 모두 가능합니다. 당사 전국 파트너 지사망을 통해 현지 제작·배송으로 신선도를 유지하며, 장거리 배송은 KTX 특송 또는 퀵 서비스를 이용합니다.',
  },
  {
    q: '결제 방법은 어떻게 되나요?',
    a: '신용카드·체크카드·무통장입금·카카오페이·네이버페이가 모두 가능합니다. 사업자 세금계산서 발행도 지원합니다. 기업·단체 정기 주문은 후불 결제 계약도 가능하니 상담 부탁드립니다.',
  },
  {
    q: '주문 취소·환불은 어떻게 하나요?',
    a: '제작 착수 전(일반적으로 주문 후 2시간 이내)에는 전액 환불이 가능합니다. 제작 착수 이후에는 꽃의 특성상 환불이 어려우므로, 꼭 상담 후 주문 부탁드립니다. 배송 중 파손이 발생한 경우 즉시 재제작 또는 환불해 드립니다.',
  },
];

function FAQSection({ branch }: { branch: BranchInfo }) {
  const [open, setOpen] = useState<number>(0);
  return (
    <section id="faq" className="py-20 md:py-24 px-4 md:px-6" style={{ background: 'var(--branch-bg-alt)' }}>
      <div className="max-w-[960px] mx-auto">
        <div className="text-center mb-10 md:mb-14 reveal">
          <p className="text-[11px] tracking-[0.35em] uppercase mb-3" style={{ color: 'var(--branch-green)' }}>
            FAQ
          </p>
          <h2 className="serif font-normal" style={{ fontSize: 'var(--type-section)', color: 'var(--branch-text)' }}>
            자주 묻는 질문
          </h2>
        </div>

        <div
          className="rounded-[16px] overflow-hidden reveal"
          style={{ background: 'var(--branch-surface)', border: '1px solid var(--branch-border)' }}
        >
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i;
            const isLast = i === FAQ_ITEMS.length - 1;
            return (
              <div key={i} style={{ borderBottom: isLast ? 'none' : '1px solid var(--branch-border)' }}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="w-full text-left flex items-center gap-4 px-5 md:px-8 py-5 transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--branch-bg-alt)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="serif text-lg italic tnum shrink-0" style={{ color: 'var(--branch-green)' }}>
                    0{i + 1}
                  </span>
                  <span className="flex-1 font-medium text-[0.9375rem]" style={{ color: 'var(--branch-text)' }}>
                    {item.q}
                  </span>
                  <span style={{ color: 'var(--branch-text-muted)' }}>{Icon.chevron('w-4 h-4', isOpen ? 180 : 0)}</span>
                </button>
                <div
                  style={{
                    maxHeight: isOpen ? '480px' : '0',
                    overflow: 'hidden',
                    transition: 'max-height 400ms var(--ease-out-quart)',
                  }}
                >
                  <div
                    className="px-5 md:px-8 pb-6 pl-[3.5rem] md:pl-[4.25rem] text-[14px] leading-relaxed"
                    style={{ color: 'var(--branch-text-muted)' }}
                  >
                    {item.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8 md:mt-10 reveal">
          <p className="text-sm mb-4" style={{ color: 'var(--branch-text-muted)' }}>
            더 궁금하신 점이 있으시면 언제든 연락 주세요.
          </p>
          <div className="inline-flex flex-wrap justify-center gap-2">
            {branch.phone && (
              <a
                href={`tel:${branch.phone}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium tnum"
                style={{ background: 'var(--branch-surface)', border: '1px solid var(--branch-border)', color: 'var(--branch-text)' }}
              >
                {Icon.phone()} {branch.phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CTA Band — dark, centered, full-width
// ═══════════════════════════════════════════════════════════════════

function CTABand({ branch, slug, heroProduct }: { branch: BranchInfo; slug: string; heroProduct?: RecommendedPhoto }) {
  const router = useRouter();
  const bgImage = heroProduct?.imageUrl ? photoUrl(heroProduct.imageUrl) : '';
  return (
    <section className="relative py-16 md:py-20 px-4 md:px-6 overflow-hidden" style={{ background: 'var(--branch-primary-deep)' }}>
      {bgImage && (
        <div className="absolute inset-0 opacity-15">
          <img src={bgImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="relative max-w-[900px] mx-auto text-center text-white">
        <p className="text-[11px] tracking-[0.4em] uppercase mb-5 opacity-70 serif italic">
          Talk to our florist
        </p>
        <h2 className="serif font-normal leading-tight mb-6" style={{ fontSize: 'var(--type-section)' }}>
          아직 고민되신다면,<br />플로리스트에게 물어보세요.
        </h2>
        <p className="text-base mb-8 md:mb-10 opacity-80 max-w-xl mx-auto">
          예산·자리·받으시는 분의 취향만 알려주시면 저희가 맞춤으로 제안해 드립니다. 상담은 언제든 무료입니다.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => router.push(`/branch/${slug}/consult`)} className="btn-fill" style={{ padding: '1rem 2rem' }}>
            무료 상담 신청 {Icon.arrow()}
          </button>
          {branch.phone && (
            <a
              href={`tel:${branch.phone}`}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition tnum"
            >
              {Icon.phone()} {branch.phone}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Footer — 3-col with business info
// ═══════════════════════════════════════════════════════════════════

function Footer({ branch }: { branch: BranchInfo }) {
  const hasAccount = branch.virtualAccountBank && branch.virtualAccountNumber;
  return (
    <footer id="info" style={{ background: 'var(--branch-footer-bg)', color: 'rgba(255,255,255,0.8)' }}>
      <div className="h-[3px]" style={{ background: 'var(--branch-green)' }} />
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-16 grid md:grid-cols-[1.3fr_1fr] gap-10">
        <div>
          <h3 className="serif text-xl font-semibold text-white mb-1">{branch.name}</h3>
          <p className="text-[11px] tracking-[0.3em] uppercase opacity-50 mb-6">Seoul Flower Delivery</p>
          <BusinessInfoFooter branch={branch} />
        </div>
        {hasAccount && (
          <div className="md:text-right">
            <div className="inline-block py-4 px-6 rounded-xl bg-white/5 border border-white/10 text-left">
              <p className="text-xs text-white/40 tracking-wider mb-1">입금 계좌</p>
              <p className="text-white font-medium text-sm">
                {branch.virtualAccountBank}
                {branch.virtualAccountHolder ? ` (${branch.virtualAccountHolder})` : ''}
              </p>
              <p className="text-white/90 text-base font-semibold tracking-wider mt-0.5 tnum">
                {branch.virtualAccountNumber}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-5 flex flex-wrap justify-between gap-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <span>&copy; {new Date().getFullYear()} {branch.name}. All rights reserved.</span>
          <span className="serif italic">Powered by 달려라 꽃배달</span>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sticky mobile bottom bar
// ═══════════════════════════════════════════════════════════════════

function StickyBottomBar({ branch, slug }: { branch: BranchInfo; slug: string }) {
  const router = useRouter();
  return (
    <div
      className="lg:hidden sticky bottom-0 z-30 pb-[env(safe-area-inset-bottom)]"
      style={{
        background: 'var(--branch-surface)',
        borderTop: '1px solid var(--branch-border)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-stretch gap-2 p-3">
        {branch.phone && (
          <a
            href={`tel:${branch.phone}`}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-full text-sm font-semibold"
            style={{ background: 'var(--branch-bg-alt)', color: 'var(--branch-text)' }}
          >
            {Icon.phone()} 전화
          </a>
        )}
        <button
          onClick={() => router.push(`/branch/${slug}/consult`)}
          className="flex-[1.5] btn-fill"
          style={{ padding: '0.875rem 1rem' }}
        >
          상담 신청 {Icon.arrow()}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════

export function EditorialHome({ branch, slug, products, onProductClick }: BranchThemeProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  useScrollReveal(stageRef);

  // Product category filter is lifted so use-case tiles can control it.
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');

  const defaultServiceArea = useMemo(() => parseServiceAreas(branch.serviceAreas)[0], [branch.serviceAreas]);
  const heroProduct =
    products.data.find((p) => p.category === 'FLOWER' && p.imageUrl) ||
    products.data.find((p) => p.imageUrl) ||
    products.data[0];

  return (
    <div ref={stageRef}>
      <StickyHeader branch={branch} slug={slug} />
      <EditorialHero branch={branch} heroProduct={heroProduct} slug={slug} />
      <UseCases onPickCategory={setSelectedCategory} />
      <TrustStrip />
      {products.data.length > 0 && (
        <Products
          slug={slug}
          initialData={products}
          onProductClick={onProductClick}
          defaultServiceArea={defaultServiceArea}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
      )}
      <Reviews products={products.data} />
      <Delivery branch={branch} slug={slug} />
      <FAQSection branch={branch} />
      <CTABand branch={branch} slug={slug} heroProduct={heroProduct} />
      <Footer branch={branch} />
      <StickyBottomBar branch={branch} slug={slug} />
    </div>
  );
}
