'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/auth/store'
import { generateOrderId } from '@/lib/payments/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import CardInputForm from '../components/CardInputForm'
import type { CardFormData } from '../components/CardInputForm'

type Tab = 'existing' | 'new'

interface OrderInfo {
  orderId: string
  customerName: string
  productName: string
  amount: number
}

interface PaymentResult {
  paymentKey: string
  status: string
  orderId: string
  totalAmount: number
}

async function requestKeyInPayment(
  body: Record<string, unknown>,
): Promise<PaymentResult> {
  const token = useAuthStore.getState().accessToken
  const res = await fetch('/api/payments/key-in', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.message ?? `결제 요청 실패 (${res.status})`)
  }

  return res.json()
}

export default function KeyInPaymentPage() {
  const [activeTab, setActiveTab] = useState<Tab>('existing')

  // --- Tab 1: existing order ---
  const [searchOrderNumber, setSearchOrderNumber] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [foundOrder, setFoundOrder] = useState<OrderInfo | null>(null)
  const [existingSubmitting, setExistingSubmitting] = useState(false)

  // --- Tab 2: new order ---
  const [customerName, setCustomerName] = useState('')
  const [productName, setProductName] = useState('')
  const [amount, setAmount] = useState('')
  const [newSubmitting, setNewSubmitting] = useState(false)

  // --- Common result ---
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)

  const handleSearch = useCallback(async () => {
    if (!searchOrderNumber.trim()) {
      toast.error('주문번호를 입력해주세요')
      return
    }

    setIsSearching(true)
    setFoundOrder(null)

    try {
      // TODO: 실제 주문 조회 API 연동 필요
      // 현재는 mock 데이터를 표시합니다
      await new Promise((resolve) => setTimeout(resolve, 500))
      setFoundOrder({
        orderId: searchOrderNumber.trim(),
        customerName: '홍길동 (mock)',
        productName: '장미 꽃다발 (mock)',
        amount: 55000,
      })
      toast.info('TODO: 실제 주문 조회 API가 연동되면 실제 데이터가 표시됩니다')
    } catch {
      toast.error('주문 조회에 실패했습니다')
    } finally {
      setIsSearching(false)
    }
  }, [searchOrderNumber])

  const handleExistingOrderPayment = useCallback(
    async (cardData: CardFormData) => {
      if (!foundOrder) return

      setExistingSubmitting(true)
      setPaymentResult(null)

      try {
        const result = await requestKeyInPayment({
          orderId: foundOrder.orderId,
          amount: foundOrder.amount,
          orderName: foundOrder.productName,
          customerName: foundOrder.customerName,
          ...cardData,
        })
        setPaymentResult(result)
        toast.success('결제가 완료되었습니다')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '결제에 실패했습니다')
      } finally {
        setExistingSubmitting(false)
      }
    },
    [foundOrder],
  )

  const handleNewOrderPayment = useCallback(
    async (cardData: CardFormData) => {
      const trimmedName = customerName.trim()
      const trimmedProduct = productName.trim()
      const parsedAmount = Number(amount)

      if (!trimmedName) {
        toast.error('고객명을 입력해주세요')
        return
      }
      if (!trimmedProduct) {
        toast.error('상품명을 입력해주세요')
        return
      }
      if (!parsedAmount || parsedAmount <= 0) {
        toast.error('유효한 결제금액을 입력해주세요')
        return
      }

      setNewSubmitting(true)
      setPaymentResult(null)

      try {
        const orderId = generateOrderId('admin')
        const result = await requestKeyInPayment({
          orderId,
          amount: parsedAmount,
          orderName: trimmedProduct,
          customerName: trimmedName,
          ...cardData,
        })
        setPaymentResult(result)
        toast.success('결제가 완료되었습니다')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '결제에 실패했습니다')
      } finally {
        setNewSubmitting(false)
      }
    },
    [customerName, productName, amount],
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">수기결제 (Key-in)</h1>
      <p className="text-sm text-gray-500">
        전화 주문 등 카드 정보를 직접 입력하여 결제를 처리합니다.
      </p>

      {/* Tab Buttons */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        <button
          type="button"
          onClick={() => {
            setActiveTab('existing')
            setPaymentResult(null)
          }}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'existing'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          기존 주문 연결
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('new')
            setPaymentResult(null)
          }}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'new'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          신규 전화주문
        </button>
      </div>

      {/* Tab 1: Existing Order */}
      {activeTab === 'existing' && (
        <div className="space-y-5">
          {/* Order Search */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">주문번호 검색</label>
            <div className="flex gap-2">
              <Input
                placeholder="주문번호를 입력하세요"
                value={searchOrderNumber}
                onChange={(e) => setSearchOrderNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
                className="border-gray-200"
              />
              <Button
                type="button"
                onClick={handleSearch}
                disabled={isSearching}
                variant="outline"
              >
                {isSearching ? '검색 중...' : '검색'}
              </Button>
            </div>
          </div>

          {/* Order Summary */}
          {foundOrder && (
            <>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">주문 정보</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-gray-500">주문번호</dt>
                  <dd className="font-medium">{foundOrder.orderId}</dd>
                  <dt className="text-gray-500">고객명</dt>
                  <dd className="font-medium">{foundOrder.customerName}</dd>
                  <dt className="text-gray-500">상품</dt>
                  <dd className="font-medium">{foundOrder.productName}</dd>
                  <dt className="text-gray-500">결제금액</dt>
                  <dd className="font-medium text-blue-600">
                    {foundOrder.amount.toLocaleString()}원
                  </dd>
                </dl>
              </div>

              <CardInputForm
                onSubmit={handleExistingOrderPayment}
                isLoading={existingSubmitting}
                submitLabel="결제하기"
              />
            </>
          )}
        </div>
      )}

      {/* Tab 2: New Phone Order */}
      {activeTab === 'new' && (
        <div className="space-y-5">
          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-700">주문 정보 입력</h3>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">고객명</label>
              <Input
                placeholder="고객명을 입력하세요"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">상품명</label>
              <Input
                placeholder="상품명을 입력하세요"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">결제금액</label>
              <Input
                type="number"
                placeholder="결제금액 (원)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                className="border-gray-200"
              />
            </div>
          </div>

          <CardInputForm
            onSubmit={handleNewOrderPayment}
            isLoading={newSubmitting}
            submitLabel="결제하기"
          />
        </div>
      )}

      {/* Payment Result */}
      {paymentResult && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-emerald-800">결제 완료</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-emerald-600">결제키</dt>
            <dd className="break-all font-mono text-xs">{paymentResult.paymentKey}</dd>
            <dt className="text-emerald-600">상태</dt>
            <dd className="font-medium">{paymentResult.status}</dd>
            <dt className="text-emerald-600">주문번호</dt>
            <dd className="font-medium">{paymentResult.orderId}</dd>
            <dt className="text-emerald-600">결제금액</dt>
            <dd className="font-medium">
              {paymentResult.totalAmount.toLocaleString()}원
            </dd>
          </dl>
        </div>
      )}
    </div>
  )
}
