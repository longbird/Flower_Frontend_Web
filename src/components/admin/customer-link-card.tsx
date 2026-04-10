'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getOrderPublicLink,
  reactivateOrderPublicLink,
  resendOrderPublicLink,
  deactivateOrderPublicLink,
  getConsultRequestPublicLink,
  reactivateConsultRequestPublicLink,
  resendConsultRequestPublicLink,
  deactivateConsultRequestPublicLink,
} from '@/lib/api/admin';
import { cn } from '@/lib/utils';

interface CustomerLinkCardProps {
  orderId: number;
  /** 'ORDER' (기본) 또는 'CONSULT_REQUEST' (지사 상담요청) */
  targetType?: 'ORDER' | 'CONSULT_REQUEST';
  /** 카드 컴팩트 모드 (상담요청 펼친 영역 안에 작게 표시) */
  compact?: boolean;
}

export function CustomerLinkCard({
  orderId,
  targetType = 'ORDER',
  compact = false,
}: CustomerLinkCardProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<'resend' | 'toggle' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isConsult = targetType === 'CONSULT_REQUEST';
  const queryKey = isConsult
    ? ['admin-consult-public-link', orderId]
    : ['admin-order-public-link', orderId];
  const getFn = isConsult ? getConsultRequestPublicLink : getOrderPublicLink;
  const reactivateFn = isConsult ? reactivateConsultRequestPublicLink : reactivateOrderPublicLink;
  const resendFn = isConsult ? resendConsultRequestPublicLink : resendOrderPublicLink;
  const deactivateFn = isConsult ? deactivateConsultRequestPublicLink : deactivateOrderPublicLink;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getFn(orderId),
  });

  const info = data?.ok && data.data ? data.data : null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!info?.shortUrl) return;
    try {
      await navigator.clipboard.writeText(info.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('복사 실패');
    }
  };

  const handleResend = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy('resend');
    try {
      const res = await resendFn(orderId);
      if (res.ok) {
        showToast('SMS 발송됨');
        queryClient.invalidateQueries({ queryKey });
      } else {
        showToast(res.message || '발송 실패');
      }
    } catch (err: any) {
      showToast(err?.message || '발송 실패');
    } finally {
      setBusy(null);
    }
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy || !info) return;
    setBusy('toggle');
    try {
      if (info.isActive) {
        // 활성 → 비활성화
        const res = await deactivateFn(orderId);
        if (res.ok) {
          showToast('비활성화됨');
          queryClient.invalidateQueries({ queryKey });
        } else {
          showToast(res.message || '비활성화 실패');
        }
      } else {
        // 만료/폐기 → 활성화 (1일)
        const res = await reactivateFn(orderId);
        if (res.ok) {
          showToast('활성화됨');
          queryClient.invalidateQueries({ queryKey });
        } else {
          showToast(res.message || '활성화 실패');
        }
      }
    } catch (err: any) {
      showToast(err?.message || '실패');
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) {
    if (compact) return <div className="text-xs text-slate-500">URL 로딩 중...</div>;
    return (
      <Card>
        <CardContent className="p-5 text-sm text-slate-500">
          고객 확인 URL 정보를 불러오는 중...
        </CardContent>
      </Card>
    );
  }

  const inner = (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-700">고객 확인 URL</span>
        {info && (
          <Badge
            className={cn(
              'text-[10px] px-1.5 py-0',
              info.isActive
                ? 'bg-emerald-100 text-emerald-800'
                : info.revokedAt
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-red-100 text-red-700',
            )}
          >
            {info.isActive ? '활성' : info.revokedAt ? '폐기' : '만료'}
          </Badge>
        )}
      </div>

      {!info ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy === 'resend'}
          onClick={handleResend}
          className="h-7 text-xs"
        >
          {busy === 'resend' ? '발송 중...' : 'URL 발급 + SMS 발송'}
        </Button>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {info.shortUrl && (
            <>
              <code className="flex-1 min-w-0 text-[11px] bg-slate-50 px-2 py-1 rounded border border-slate-200 truncate">
                {info.shortUrl}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="px-2 py-1 text-[11px] rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shrink-0"
              >
                {copied ? '복사됨' : '복사'}
              </button>
            </>
          )}
          <button
            type="button"
            disabled={busy !== null}
            onClick={handleResend}
            className={cn(
              'px-2 py-1 text-[11px] rounded border shrink-0',
              'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
              busy !== null && 'opacity-50',
            )}
          >
            {busy === 'resend' ? '발송...' : 'SMS 재전송'}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={handleToggle}
            className={cn(
              'px-2 py-1 text-[11px] rounded border shrink-0',
              info.isActive
                ? 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
              busy !== null && 'opacity-50',
            )}
          >
            {busy === 'toggle' ? '처리...' : info.isActive ? '비활성화' : '활성화'}
          </button>
        </div>
      )}

      {toast && (
        <p className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded inline-block">
          {toast}
        </p>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        {inner}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">{inner}</CardContent>
    </Card>
  );
}
