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
        <header className="mb-6 text-center">
          <h1 className="text-lg font-bold text-slate-800">달려라 꽃배달</h1>
          <p className="text-xs text-slate-500 mt-1">주문 진행 상황</p>
        </header>
        <main>{children}</main>
        <footer className="mt-10 pb-4 text-center text-xs text-slate-400">
          문의: 1588-xxxx
        </footer>
      </div>
    </div>
  );
}
