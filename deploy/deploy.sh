#!/bin/bash
###############################################################################
# deploy.sh — Flutter → Next.js 관리자 웹 배포 스크립트
#
# 실행 위치: 개발 서버 (49.247.46.86)
# 대상 서버: seoulflower.co.kr (49.247.206.190)
#
# 사용법:
#   cd ~/frontend_web
#   bash deploy/deploy.sh          # 전체 배포 (백업 → 전송 → 설치 → 전환)
#   bash deploy/deploy.sh backup   # 1단계: Flutter 백업만
#   bash deploy/deploy.sh transfer # 2단계: 파일 전송만
#   bash deploy/deploy.sh install  # 3단계: 원격 설치+빌드만
#   bash deploy/deploy.sh switch   # 4단계: nginx 전환 + PM2 시작만
###############################################################################
set -euo pipefail

REMOTE_HOST="blueadm@seoulflower.co.kr"
REMOTE_DIR="/home/blueadm/frontend_web"
FLUTTER_BUILD="/home/blueadm/frontend/apps/admin_web/build/web"
FLUTTER_BACKUP="/home/blueadm/backups/flutter_admin_web"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
step() { echo -e "\n${CYAN}━━━ $* ━━━${NC}"; }

###############################################################################
# 1단계: Flutter 백업
###############################################################################
do_backup() {
  step "1/4  Flutter 백업"

  log "원격 서버에 백업 디렉토리 생성..."
  ssh "$REMOTE_HOST" "mkdir -p ${FLUTTER_BACKUP}"

  log "Flutter 빌드 백업 중... → ${FLUTTER_BACKUP}/flutter_${TIMESTAMP}.tar.gz"
  ssh "$REMOTE_HOST" "
    if [ -d '${FLUTTER_BUILD}' ]; then
      tar czf '${FLUTTER_BACKUP}/flutter_${TIMESTAMP}.tar.gz' \
        -C '$(dirname ${FLUTTER_BUILD})' '$(basename ${FLUTTER_BUILD})'
      echo '백업 완료: $(du -sh ${FLUTTER_BUILD} | cut -f1) 압축됨'
    else
      echo 'Flutter 빌드 디렉토리 없음 — 건너뜀'
    fi
  "

  log "현재 nginx 설정 백업..."
  ssh "$REMOTE_HOST" "
    mkdir -p ${FLUTTER_BACKUP}/nginx_${TIMESTAMP}
    sudo cp /etc/nginx/sites-enabled/admin-web   ${FLUTTER_BACKUP}/nginx_${TIMESTAMP}/ 2>/dev/null || true
    sudo cp /etc/nginx/sites-enabled/admin-web-ip ${FLUTTER_BACKUP}/nginx_${TIMESTAMP}/ 2>/dev/null || true
    echo 'nginx 설정 백업 완료'
  "

  log "백업 목록:"
  ssh "$REMOTE_HOST" "ls -lh ${FLUTTER_BACKUP}/"

  echo -e "${GREEN}[OK]${NC} 백업 완료"
}

###############################################################################
# 2단계: Next.js 프로젝트 전송
###############################################################################
do_transfer() {
  step "2/4  Next.js 프로젝트 전송"

  log "원격 디렉토리 생성..."
  ssh "$REMOTE_HOST" "mkdir -p ${REMOTE_DIR}"

  log "rsync 전송 중... (node_modules, .next 제외)"
  rsync -az --delete \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='.env.local' \
    "${LOCAL_DIR}/" "${REMOTE_HOST}:${REMOTE_DIR}/"

  log "원격 .env.production 설정..."
  ssh "$REMOTE_HOST" "cat > ${REMOTE_DIR}/.env.production << 'ENVEOF'
# Production: Next.js rewrites를 통해 백엔드 API 프록시
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8080
ENVEOF"

  echo -e "${GREEN}[OK]${NC} 전송 완료"
}

###############################################################################
# 3단계: 원격 설치 + 빌드
###############################################################################
do_install() {
  step "3/4  원격 npm install + build"

  ssh "$REMOTE_HOST" "
    cd ${REMOTE_DIR}
    echo '=== Node 버전 ==='
    node -v
    echo '=== npm install ==='
    npm ci --production=false 2>&1 | tail -5
    echo '=== npm run build ==='
    npm run build 2>&1 | tail -20
    echo '=== 빌드 결과 ==='
    ls -lh .next/ | head -5
  "

  echo -e "${GREEN}[OK]${NC} 빌드 완료"
}

###############################################################################
# 4단계: nginx 전환 + PM2 시작
###############################################################################
do_switch() {
  step "4/4  서비스 전환 (nginx + PM2)"

  log "PM2로 Next.js 시작..."
  ssh "$REMOTE_HOST" "
    cd ${REMOTE_DIR}

    # 기존 admin-web PM2 프로세스 정리
    pm2 delete admin-web 2>/dev/null || true

    # PM2 시작
    pm2 start ecosystem.config.js
    sleep 3

    # 헬스체크
    HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3030/ 2>/dev/null || echo '000')
    if [ \"\$HTTP_CODE\" = '000' ]; then
      echo 'Next.js 시작 대기 중...'
      sleep 5
      HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3030/ 2>/dev/null || echo '000')
    fi
    echo \"Next.js 응답 코드: \$HTTP_CODE\"

    if [ \"\$HTTP_CODE\" != '200' ] && [ \"\$HTTP_CODE\" != '307' ] && [ \"\$HTTP_CODE\" != '308' ]; then
      echo '경고: Next.js가 아직 응답하지 않음. PM2 로그 확인:'
      pm2 logs admin-web --lines 10 --nostream
      echo ''
      echo 'nginx 전환을 계속하시겠습니까? (Ctrl+C로 중단)'
      # 스크립트에서는 계속 진행 (수동으로 중단 가능)
    fi
  "

  log "nginx 설정 교체..."
  ssh "$REMOTE_HOST" "
    sudo cp ${REMOTE_DIR}/deploy/nginx-admin-web.conf    /etc/nginx/sites-enabled/admin-web
    sudo cp ${REMOTE_DIR}/deploy/nginx-admin-web-ip.conf /etc/nginx/sites-enabled/admin-web-ip

    echo 'nginx 설정 테스트...'
    sudo nginx -t

    echo 'nginx 재로드...'
    sudo systemctl reload nginx
  "

  log "PM2 저장 (재부팅 시 자동 시작)..."
  ssh "$REMOTE_HOST" "
    pm2 save
    pm2 list
  "

  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  배포 완료!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  https://seoulflower.co.kr"
  echo "  https://seoulflower.co.kr/admin/dashboard"
  echo ""
  echo "  롤백이 필요한 경우:"
  echo "    bash deploy/rollback.sh"
  echo ""
}

###############################################################################
# 메인
###############################################################################
case "${1:-all}" in
  backup)   do_backup ;;
  transfer) do_transfer ;;
  install)  do_install ;;
  switch)   do_switch ;;
  all)
    echo -e "${CYAN}"
    echo "┌─────────────────────────────────────────────┐"
    echo "│  달려라꽃배달 관리자 웹 배포                 │"
    echo "│  Flutter → Next.js 전환                     │"
    echo "│  대상: seoulflower.co.kr                    │"
    echo "└─────────────────────────────────────────────┘"
    echo -e "${NC}"
    echo "단계:"
    echo "  1) Flutter 백업 (빌드 + nginx 설정)"
    echo "  2) Next.js 프로젝트 전송 (rsync)"
    echo "  3) 원격 npm install + build"
    echo "  4) nginx 전환 + PM2 시작"
    echo ""
    read -p "계속하시겠습니까? (y/N) " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
      echo "취소됨."
      exit 0
    fi

    do_backup
    do_transfer
    do_install
    do_switch
    ;;
  *)
    echo "사용법: $0 [backup|transfer|install|switch|all]"
    exit 1
    ;;
esac
