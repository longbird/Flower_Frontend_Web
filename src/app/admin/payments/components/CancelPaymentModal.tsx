'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/auth/store'
import { VIRTUAL_ACCOUNT_BANKS } from '@/lib/payments/constants'
import type { BankCode } from '@/lib/payments/types'
import { cn } from '@/lib/utils'

interface CancelPaymentModalProps {
  paymentKey: string | null
  onClose: () => void
  onSuccess: () => void
}

type CancelType = 'full' | 'partial'

export default function CancelPaymentModal({
  paymentKey,
  onClose,
  onSuccess,
}: CancelPaymentModalProps) {
  const [cancelType, setCancelType] = useState<CancelType>('full')
  const [cancelAmount, setCancelAmount] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [showRefundAccount, setShowRefundAccount] = useState(false)
  const [refundBank, setRefundBank] = useState<BankCode | ''>('')
  const [refundAccountNumber, setRefundAccountNumber] = useState('')
  const [refundHolderName, setRefundHolderName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOpen = paymentKey !== null

  const resetForm = () => {
    setCancelType('full')
    setCancelAmount('')
    setCancelReason('')
    setShowRefundAccount(false)
    setRefundBank('')
    setRefundAccountNumber('')
    setRefundHolderName('')
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const isValid = (): boolean => {
    if (!cancelReason.trim()) return false
    if (cancelType === 'partial') {
      const amount = Number(cancelAmount)
      if (!amount || amount <= 0) return false
    }
    if (showRefundAccount) {
      if (!refundBank || !refundAccountNumber.trim() || !refundHolderName.trim()) {
        return false
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!paymentKey || !isValid()) return

    setSubmitting(true)
    setError(null)

    try {
      const token = useAuthStore.getState().accessToken

      const body: Record<string, unknown> = {
        cancelReason: cancelReason.trim(),
      }

      if (cancelType === 'partial') {
        body.cancelAmount = Number(cancelAmount)
      }

      if (showRefundAccount && refundBank) {
        body.refundReceiveAccount = {
          bank: refundBank,
          accountNumber: refundAccountNumber.trim(),
          holderName: refundHolderName.trim(),
        }
      }

      const res = await fetch(`/api/payments/${paymentKey}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.message ?? `취소 실패 (${res.status})`)
      }

      toast('결제가 취소되었습니다')
      resetForm()
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : '결제 취소 중 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>결제 취소</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* 취소 유형 */}
          <fieldset>
            <legend className="text-sm font-medium mb-2">취소 유형</legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="cancelType"
                  checked={cancelType === 'full'}
                  onChange={() => setCancelType('full')}
                  className="accent-primary"
                />
                <span className="text-sm">전액 취소</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="cancelType"
                  checked={cancelType === 'partial'}
                  onChange={() => setCancelType('partial')}
                  className="accent-primary"
                />
                <span className="text-sm">부분 환불</span>
              </label>
            </div>
          </fieldset>

          {/* 부분 환불 금액 */}
          {cancelType === 'partial' && (
            <div className="space-y-1.5">
              <Label htmlFor="cancelAmount">환불 금액</Label>
              <Input
                id="cancelAmount"
                type="number"
                min={1}
                placeholder="환불할 금액을 입력하세요"
                value={cancelAmount}
                onChange={(e) => setCancelAmount(e.target.value)}
              />
            </div>
          )}

          {/* 취소 사유 */}
          <div className="space-y-1.5">
            <Label htmlFor="cancelReason">
              취소 사유 <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="cancelReason"
              rows={3}
              maxLength={200}
              placeholder="취소 사유를 입력하세요 (최대 200자)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className={cn(
                'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm',
                'shadow-sm placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'resize-none'
              )}
            />
            <p className="text-xs text-muted-foreground text-right">
              {cancelReason.length}/200
            </p>
          </div>

          {/* 가상계좌 환불 계좌 */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showRefundAccount}
                onChange={(e) => setShowRefundAccount(e.target.checked)}
                className="accent-primary"
              />
              <span className="text-sm">가상계좌 환불 계좌 입력</span>
            </label>

            {showRefundAccount && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="refundBank">은행</Label>
                  <select
                    id="refundBank"
                    value={refundBank}
                    onChange={(e) => setRefundBank(e.target.value as BankCode)}
                    className={cn(
                      'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm',
                      'shadow-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                    )}
                  >
                    <option value="">은행 선택</option>
                    {VIRTUAL_ACCOUNT_BANKS.map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="refundAccountNumber">계좌번호</Label>
                  <Input
                    id="refundAccountNumber"
                    placeholder="'-' 없이 입력"
                    value={refundAccountNumber}
                    onChange={(e) => setRefundAccountNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="refundHolderName">예금주</Label>
                  <Input
                    id="refundHolderName"
                    placeholder="예금주명을 입력하세요"
                    value={refundHolderName}
                    onChange={(e) => setRefundHolderName(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            닫기
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting || !isValid()}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                처리 중...
              </>
            ) : (
              '결제 취소'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
