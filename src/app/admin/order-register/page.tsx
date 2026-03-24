'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import OrderForm from './order-form';

export default function OrderRegisterPage() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          돌아가기
        </Button>
        <h1 className="text-xl font-bold text-gray-900">주문 등록 (발주)</h1>
      </div>

      <OrderForm />
    </div>
  );
}
