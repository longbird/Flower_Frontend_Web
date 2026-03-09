import type { Metadata } from 'next';
import '@/app/globals.css';
import './branch.css';

export const metadata: Metadata = {
  title: '꽃배달 서비스',
  description: '신선한 꽃을 빠르고 정성스럽게 배달해 드립니다.',
};

export default function BranchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="branch-homepage min-h-screen">
      {children}
    </div>
  );
}
