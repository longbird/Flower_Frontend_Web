#!/bin/bash
###############################################################################
# rollback.sh — Next.js → Flutter 롤백 스크립트
#
# Next.js 배포 후 문제가 생겼을 때, Flutter 버전으로 즉시 복원합니다.
#
# 실행 위치: 개발 서버 (49.247.46.86)
# 대상 서버: seoulflower.co.kr
#
# 사용법:
#   bash deploy/rollback.sh          # 최신 백업으로 롤백
#   bash deploy/rollback.sh list     # 백업 목록 확인
###############################################################################
set -euo pipefail

REMOTE_HOST="blueadm@seoulflower.co.kr"
FLUTTER_BUILD="/home/blueadm/frontend/apps/admin_web/build/web"
FLUTTER_BACKUP="/home/blueadm/backups/flutter_admin_web"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[ROLLBACK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

###############################################################################
# 백업 목록 확인
###############################################################################
do_list() {
  echo -e "${CYAN}=== 백업 목록 ===${NC}"
  ssh "$REMOTE_HOST" "
    echo '--- Flutter 빌드 백업 ---'
    ls -lhtr ${FLUTTER_BACKUP}/flutter_*.tar.gz 2>/dev/null || echo '(없음)'
    echo ''
    echo '--- nginx 설정 백업 ---'
    ls -d ${FLUTTER_BACKUP}/nginx_*/ 2>/dev/null || echo '(없음)'
  "
}

###############################################################################
# 롤백 실행
###############################################################################
do_rollback() {
  echo -e "${CYAN}"
  echo "┌──────────────────────────────────────────┐"
  echo "│  롤백: Next.js → Flutter                  │"
  echo "│  대상: seoulflower.co.kr                  │"
  echo "└──────────────────────────────────────────┘"
  echo -e "${NC}"

  # 최신 백업 찾기
  LATEST_BACKUP=$(ssh "$REMOTE_HOST" "ls -t ${FLUTTER_BACKUP}/flutter_*.tar.gz 2>/dev/null | head -1")
  LATEST_NGINX=$(ssh "$REMOTE_HOST" "ls -dt ${FLUTTER_BACKUP}/nginx_*/ 2>/dev/null | head -1")

  if [ -z "$LATEST_BACKUP" ]; then
    err "Flutter 백업을 찾을 수 없습니다. 롤백 불가."
  fi

  echo "사용할 백업:"
  echo "  Flutter: $LATEST_BACKUP"
  echo "  nginx:   ${LATEST_NGINX:-없음 (현재 설정 유지)}"
  echo ""
  read -p "롤백을 진행하시겠습니까? (y/N) " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "취소됨."
    exit 0
  fi

  # 1. PM2에서 Next.js 정지
  log "PM2 admin-web 정지..."
  ssh "$REMOTE_HOST" "pm2 stop admin-web 2>/dev/null || true; pm2 delete admin-web 2>/dev/null || true"

  # 2. Flutter 빌드 복원
  log "Flutter 빌드 복원 중..."
  ssh "$REMOTE_HOST" "
    rm -rf ${FLUTTER_BUILD}/*
    tar xzf ${LATEST_BACKUP} -C $(dirname ${FLUTTER_BUILD})
    echo '복원 완료: '
    ls ${FLUTTER_BUILD}/ | head -5
  "

  # 3. nginx 설정 복원
  if [ -n "$LATEST_NGINX" ]; then
    log "nginx 설정 복원 중..."
    ssh "$REMOTE_HOST" "
      sudo cp ${LATEST_NGINX}admin-web    /etc/nginx/sites-enabled/admin-web    2>/dev/null || true
      sudo cp ${LATEST_NGINX}admin-web-ip /etc/nginx/sites-enabled/admin-web-ip 2>/dev/null || true
      sudo nginx -t && sudo systemctl reload nginx
    "
  else
    warn "nginx 백업 없음. 수동으로 nginx 설정을 확인하세요."
  fi

  # 4. PM2 저장
  ssh "$REMOTE_HOST" "pm2 save"

  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  롤백 완료! Flutter 버전으로 복원되었습니다.${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  https://seoulflower.co.kr"
  echo ""
}

###############################################################################
# 메인
###############################################################################
case "${1:-rollback}" in
  list)     do_list ;;
  rollback) do_rollback ;;
  *)
    echo "사용법: $0 [rollback|list]"
    exit 1
    ;;
esac
