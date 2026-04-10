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
} from '@/lib/api/admin';
import { cn } from '@/lib/utils';

interface CustomerLinkCardProps {
  orderId: number;
}

function formatDateTime(s?: string | null): string {
  if (!s) return '-';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return s;
  }
}

export function CustomerLinkCard({ orderId }: CustomerLinkCardProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<'resend' | 'reactivate' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-order-public-link', orderId],
    queryFn: () => getOrderPublicLink(orderId),
  });

  const info = data?.ok && data.data ? data.data : null;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopy = async () => {
    if (!info?.shortUrl) return;
    try {
      await navigator.clipboard.writeText(info.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast('복사 실패');
    }
  };

  const handleResend = async () => {
    setBusy('resend');
    try {
      const res = await resendOrderPublicLink(orderId);
      if (res.ok) {
        showToast('고객에게 SMS가 발송되었습니다');
        queryClient.invalidateQueries({ queryKey: ['admin-order-public-link', orderId] });
      } else {
        showToast(res.message || '발송 실패');
      }
    } catch (e: any) {
      showToast(e?.message || '발송 실패');
    } finally {
      setBusy(null);
    }
  };

  const handleReactivate = async () => {
    if (!confirm('고객 확인 URL을 재활성화 하시겠습니까? 활성화 후 1일간 유효합니다.')) {
      return;
    }
    setBusy('reactivate');
    try {
      const res = await reactivateOrderPublicLink(orderId);
      if (res.ok) {
        showToast('재활성화되었습니다');
        queryClient.invalidateQueries({ queryKey: ['admin-order-public-link', orderId] });
      } else {
        showToast(res.message || '재활성화 실패');
      }
    } catch (e: any) {
      showToast(e?.message || '재활성화 실패');
    } finally {
      setBusy(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-slate-500">
          고객 확인 URL 정보를 불러오는 중...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">고객 확인 URL</h2>
          {info && (
            <Badge
              className={cn(
                'text-xs',
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
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              아직 발급된 URL이 없습니다. 주문이 새로 접수되면 자동 발급됩니다.
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={busy === 'resend'}
              onClick={handleResend}
            >
              {busy === 'resend' ? '발송 중...' : 'URL 발급 + SMS 발송'}
            </Button>
          </div>
        ) : (
          <>
            {info.shortUrl && (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-slate-50 px-2 py-1.5 rounded border border-slate-200 truncate">
                  {info.shortUrl}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? '복사됨' : '복사'}
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">만료 시각</span>
                <p className="mt-0.5">
                  {info.expiresAt ? formatDateTime(info.expiresAt) : '영구 활성'}
                </p>
              </div>
              <div>
                <span className="text-slate-400">마지막 발송</span>
                <p className="mt-0.5">
                  {formatDateTime(info.lastSentAt)} ({info.sendCount}회)
                </p>
              </div>
              {info.reactivatedAt && (
                <div className="col-span-2">
                  <span className="text-slate-400">재활성화</span>
                  <p className="mt-0.5">
                    {formatDateTime(info.reactivatedAt)}
                    {info.reactivatedBy && ` · ${info.reactivatedBy}`}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy !== null}
                onClick={handleResend}
              >
                {busy === 'resend' ? '발송 중...' : 'SMS 재전송'}
              </Button>
              {!info.isActive && (
                <Button
                  size="sm"
                  variant="default"
                  disabled={busy !== null}
                  onClick={handleReactivate}
                >
                  {busy === 'reactivate' ? '재활성화 중...' : '재활성화 (1일)'}
                </Button>
              )}
            </div>
          </>
        )}

        {toast && (
          <p className="text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded">
            {toast}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
