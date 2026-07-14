import { redirect } from 'next/navigation';

// 모바일 기기 관리는 '기기 인증'(/aircpm/certs) 한 화면으로 합쳤다.
// 이 경로는 기존 북마크를 위해 남겨둔다.
export default function AircpmMobileDevicesRedirect() {
  redirect('/aircpm/certs');
}
