import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '주문 확인 - 달려라 꽃배달',
  description: '주문 진행 상황 및 배달 확인',
};

export default function OrderLinkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        <main>{children}</main>
      </div>
    </div>
  );
}
