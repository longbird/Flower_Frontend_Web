'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listAircpmCustomers,
  listAircpmBranches,
  type AircpmCustomer,
} from '@/lib/api/aircpm-payments';
import { useAuthStore } from '@/lib/auth/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ─── Utilities ─────────────────────────────────────────────────────

function toastForError(err: unknown, fallback = '요청에 실패했습니다.') {
  const message = err instanceof Error ? err.message : String(err);
  toast.error(message || fallback);
}

// ─── Page ───────────────────────────────────────────────────────────

export default function CustomersPage() {
  const router = useRouter();
  const isSuper = useAuthStore((s) => s.user?.isSuper ?? false);

  // Super: select a branch first; branch admin: never send brchCd (backend forces it)
  const [selectedBrchCd, setSelectedBrchCd] = useState<string>('');
  const [q, setQ] = useState('');
  const [qActive, setQActive] = useState('');

  // brchCd sent to the API:
  //   super       → the branch they selected (or undefined if none chosen)
  //   branch admin → always undefined (backend forces caller's own branch)
  const effectiveBrchCd: string | undefined = isSuper
    ? (selectedBrchCd || undefined)
    : undefined;

  // Branches query — only needed for super's Select
  const { data: branches = [] } = useQuery({
    queryKey: ['aircpm-branches'],
    queryFn: listAircpmBranches,
    enabled: isSuper,
  });

  // Customers query
  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['aircpm-customers', effectiveBrchCd, qActive],
    queryFn: () =>
      listAircpmCustomers({ brchCd: effectiveBrchCd, q: qActive || undefined }).catch(
        (err) => {
          toastForError(err, '고객 목록을 불러오지 못했습니다.');
          return { customers: [] };
        }
      ),
    enabled: !isSuper || Boolean(selectedBrchCd),
  });

  const customers: AircpmCustomer[] = data?.customers ?? [];

  const handleSearch = () => {
    setQActive(q.trim());
  };

  const handleRowClick = (customer: AircpmCustomer) => {
    const suffix =
      isSuper && selectedBrchCd ? `?brchCd=${encodeURIComponent(selectedBrchCd)}` : '';
    router.push(`/aircpm/customers/${customer.id}${suffix}`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">고객 목록</h1>
          <p className="text-sm text-slate-500 mt-1">
            AirCPM 등록 고객 목록. 고객을 클릭하면 상세 정보로 이동합니다.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching || (isSuper && !selectedBrchCd)}
        >
          {isFetching ? '새로고침 중...' : '새로고침'}
        </Button>
      </div>

      {/* Super: branch selector */}
      {isSuper && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-slate-700 shrink-0">지사 선택</span>
              <Select value={selectedBrchCd} onValueChange={setSelectedBrchCd}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="지사를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.brchCd} value={b.brchCd}>
                      {b.brchCd}{b.name ? ` · ${b.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Super without a branch selected → prompt */}
      {isSuper && !selectedBrchCd && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-base font-medium text-slate-500">지사를 선택하세요</p>
          <p className="text-sm mt-1">조회할 지사를 위에서 선택해 주세요.</p>
        </div>
      )}

      {/* Search — shown when a branch is active (branch admin always, super after selection) */}
      {(!isSuper || Boolean(selectedBrchCd)) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="전화번호 또는 고객명 검색"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="max-w-sm"
              />
              <Button onClick={handleSearch} size="sm">
                검색
              </Button>
              {qActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQ('');
                    setQActive('');
                  }}
                >
                  초기화
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {(!isSuper || Boolean(selectedBrchCd)) && (
        <>
          {isLoading && (
            <div className="text-center py-12 text-slate-500">로딩 중...</div>
          )}
          {!isLoading && customers.length === 0 && (
            <div className="text-center py-16 text-slate-400">등록된 고객이 없습니다.</div>
          )}

          <div className="space-y-2">
            {customers.map((c) => (
              <Card
                key={c.id}
                className="cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => handleRowClick(c)}
              >
                <CardContent className="p-4 flex items-start gap-3 flex-wrap">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900">
                        {c.customerPhone}
                      </span>
                      {c.name != null && (
                        <span className="text-sm text-slate-700">{c.name}</span>
                      )}
                    </div>
                    {c.memo != null && (
                      <p className="text-xs text-slate-400 truncate max-w-xs">{c.memo}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
