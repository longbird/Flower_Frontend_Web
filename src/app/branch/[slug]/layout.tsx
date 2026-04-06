import type { Metadata } from 'next';
import '@/app/globals.css';
import './branch.css';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  let branch: { name?: string; description?: string } | null = null;
  try {
    const res = await fetch(`${backendUrl}/public/branch/${slug}`, { next: { revalidate: 300 } });
    if (res.ok) {
      const json = await res.json();
      branch = json.data ?? null;
    }
  } catch { /* fallback to default */ }
  const name = branch?.name || '꽃배달 서비스';
  const description = branch?.description || '신선한 꽃을 빠르고 정성스럽게 배달해 드립니다.';
  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      type: 'website',
    },
  };
}

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
