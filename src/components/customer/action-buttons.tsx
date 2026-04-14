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
