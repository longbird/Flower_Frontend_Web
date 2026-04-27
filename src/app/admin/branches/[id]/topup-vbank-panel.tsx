'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getBranchTopupVbank,
  issueBranchTopupVbank,
  reissueBranchTopupVbank,
} from '@/lib/api/branch-topup-vbank';

export function BranchTopupVbankPanel({ branchId }: { branchId: number }) {
  const queryClient = useQueryClient();
  const [holder, setHolder] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['branch-topup-vbank', branchId],
    queryFn: () => getBranchTopupVbank(branchId),
  });

  const hasActive = data != null && data.active;

  const mutation = useMutation({
    mutationFn: () =>
      hasActive
        ? reissueBranchTopupVbank(branchId, holder)
        : issueBranchTopupVbank(branchId, holder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-topup-vbank', branchId] });
      toast.success(
        hasActive
          ? '재발급되었습니다. 기존 계좌는 비활성화됩니다.'
          : '충전용 가상계좌가 발급되었습니다.'
      );
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">충전용 가상계좌 (이노페이)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-sm text-slate-400">로딩...</div>
        ) : hasActive ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-400 text-xs">은행</dt>
              <dd>{data.bankName ?? data.bankCode}</dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs">계좌번호</dt>
              <dd className="font-mono tabular-nums">{data.accountNumber}</dd>
            </div>
            <div>
              <dt className="text-slate-400 text-xs">예금주</dt>
              <dd>{data.holderName}</dd>
            </div>
            {data.issuedAt && (
              <div>
                <dt className="text-slate-400 text-xs">발급일</dt>
                <dd>{new Date(data.issuedAt).toLocaleDateString('ko-KR')}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-slate-500">아직 발급되지 않았습니다.</p>
        )}

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <Label htmlFor="vbank-holder">예금주명</Label>
          <Input
            id="vbank-holder"
            value={holder}
            onChange={e => setHolder(e.target.value)}
            placeholder="예금주명 입력"
          />
          <Button
            variant={hasActive ? 'outline' : 'default'}
            disabled={!holder || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {hasActive ? '재발급' : '발급'}
          </Button>
          <p className="text-xs text-slate-400">
            재발급 시 기존 가상계좌는 비활성화되며, 그 이후 입금은 자동 충전 처리되지 않습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
