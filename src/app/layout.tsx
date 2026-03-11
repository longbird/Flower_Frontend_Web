import type { Metadata } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const notoSansKR = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-noto-sans-kr',
});

export const metadata: Metadata = {
  title: '달려라 꽃배달 관리자',
  description: '달려라 꽃배달 관리자 웹 애플리케이션',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={notoSansKR.variable}>
      <body className={`${notoSansKR.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
