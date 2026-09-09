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

// 같은 코드베이스를 두 서버에 배포한다(꽃배달 / AirCPM 8282call 분리 서버).
// 배포처마다 브라우저 탭 제목이 달라야 하므로 env 로 덮어쓴다. 미설정이면 기존 값 그대로다.
export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_TITLE || '달려라 꽃배달 관리자',
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION || '달려라 꽃배달 관리자 웹 애플리케이션',
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
