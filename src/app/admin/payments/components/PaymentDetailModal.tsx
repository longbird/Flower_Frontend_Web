'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth/store'
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from '@/lib/payments/constants'
import type { TossPayment } from '@/lib/payments/types'
import { cn } from '@/lib/utils'

interface PaymentDetailModalProps {
  paymentKey: string | null
  onClose: () => void
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원'
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

export default function PaymentDetailModal({
  paymentKey,
  onClose,
}: PaymentDetailModalProps) {
  const [payment, setPayment] = useState<TossPayment | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!paymentKey) {
      setPayment(null)
      setError(null)
      return
    }

    const fetchPayment = async () => {
      setLoading(true)
      setError(null)

      try {
        const token = useAuthStore.getState().accessToken
        const res = await fetch(`/api/payments/${paymentKey}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.message ?? `조회 실패 (${res.status})`)
        }

        const data: TossPayment = await res.json()
        setPayment(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '결제 정보를 불러오지 못했습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchPayment()
  }, [paymentKey])

  const isOpen = paymentKey !== null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>결제 상세</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {payment && !loading && (
          <div className="space-y-5">
            {/* 결제 상태 */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  PAYMENT_STATUS_COLORS[payment.status]
                )}
              >
                {PAYMENT_STATUS_LABELS[payment.status]}
              </span>
            </div>

            {/* 기본 정보 */}
            <section>
              <h3 className="text-sm font-semibold mb-2">기본 정보</h3>
              <div className="rounded-md border p-3 divide-y">
                <InfoRow label="주문 ID" value={payment.orderId} />
                <InfoRow label="주문명" value={payment.orderName} />
                <InfoRow label="결제 금액" value={formatAmount(payment.totalAmount)} />
                <InfoRow label="잔여 금액" value={formatAmount(payment.balanceAmount)} />
                <InfoRow label="결제 수단" value={payment.method} />
                <InfoRow label="요청 일시" value={formatDateTime(payment.requestedAt)} />
                <InfoRow label="승인 일시" value={formatDateTime(payment.approvedAt)} />
              </div>
            </section>

            {/* 카드 정보 */}
            {payment.card && (
              <section>
                <h3 className="text-sm font-semibold mb-2">카드 정보</h3>
                <div className="rounded-md border p-3 divide-y">
                  <InfoRow label="카드 번호" value={payment.card.number} />
                  <InfoRow
                    label="할부"
                    value={
                      payment.card.installmentPlanMonths === 0
                        ? '일시불'
                        : `${payment.card.installmentPlanMonths}개월`
                    }
                  />
                  <InfoRow label="승인 번호" value={payment.card.approveNo} />
                  <InfoRow label="카드 종류" value={payment.card.cardType} />
                  <InfoRow
                    label="카드 금액"
                    value={formatAmount(payment.card.amount)}
                  />
                </div>
              </section>
            )}

            {/* 가상계좌 정보 */}
            {payment.virtualAccount && (
              <section>
                <h3 className="text-sm font-semibold mb-2">가상계좌 정보</h3>
                <div className="rounded-md border p-3 divide-y">
                  <InfoRow label="은행" value={payment.virtualAccount.bankCode} />
                  <InfoRow label="계좌번호" value={payment.virtualAccount.accountNumber} />
                  <InfoRow label="예금주" value={payment.virtualAccount.customerName} />
                  <InfoRow label="입금 기한" value={formatDateTime(payment.virtualAccount.dueDate)} />
                  <InfoRow
                    label="상태"
                    value={
                      payment.virtualAccount.expired ? (
                        <span className="text-red-600">만료</span>
                      ) : (
                        <span className="text-emerald-600">유효</span>
                      )
                    }
                  />
                </div>
              </section>
            )}

            {/* 취소 이력 */}
            {payment.cancels && payment.cancels.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold mb-2">
                  취소 이력 ({payment.cancels.length}건)
                </h3>
                <div className="space-y-2">
                  {payment.cancels.map((cancel, idx) => (
                    <div
                      key={cancel.transactionKey ?? idx}
                      className="rounded-md border p-3 divide-y"
                    >
                      <InfoRow label="취소 금액" value={formatAmount(cancel.cancelAmount)} />
                      <InfoRow label="취소 사유" value={cancel.cancelReason} />
                      <InfoRow label="취소 일시" value={formatDateTime(cancel.canceledAt)} />
                      <InfoRow
                        label="환불 가능 금액"
                        value={formatAmount(cancel.refundableAmount)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 영수증 */}
            {payment.receipt?.url && (
              <section>
                <a
                  href={payment.receipt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="size-4" />
                  영수증 보기
                </a>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
