#!/bin/bash
###############################################################################
# rollback-zerodt.sh — 이전 릴리스로 즉시 롤백
#
# symlink 전환 + PM2 reload로 1초 이내 복구.
#
# 사용법:
#   bash deploy/rollback-zerodt.sh          # 테스트 서버
#   bash deploy/rollback-zerodt.sh prod     # 프로덕션 서버
#   bash deploy/rollback-zerodt.sh list     # 릴리스 목록 확인
#   bash deploy/rollback-zerodt.sh prod list
###############################################################################
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[ROLLBACK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

TARGET="${1:-test}"
ACTION="${2:-rollback}"

# list가 첫 번째 인자로 올 수도 있음
if [ "$TARGET" = "list" ]; then
  TARGET="test"
  ACTION="list"
fi

case "$TARGET" in
  test)
    REMOTE_HOST="blueadm@49.247.46.86"
    HEALTH_URL="http://127.0.0.1:3030/admin/login"
    echo -e "${CYAN}대상: 테스트 서버 (49.247.46.86)${NC}"
    ;;
  prod)
    REMOTE_HOST="blueadm@49.247.206.190"
    HEALTH_URL="http://127.0.0.1:3030/admin/login"
    echo -e "${CYAN}대상: 프로덕션 서버 (49.247.206.190)${NC}"
    ;;
  *)
    echo "사용법: $0 [test|prod] [list|rollback]"
    exit 1
    ;;
esac

BASE_DIR="/home/blueadm"
APP_LINK="${BASE_DIR}/frontend_web"
RELEASES_DIR="${BASE_DIR}/releases"

# ─── 릴리스 목록 ───
if [ "$ACTION" = "list" ]; then
  echo ""
  ssh "$REMOTE_HOST" "
    CURRENT=\$(basename \$(readlink '${APP_LINK}' 2>/dev/null) 2>/dev/null || echo 'unknown')
    echo '릴리스 목록:'
    for dir in \$(ls -dt ${RELEASES_DIR}/*/ 2>/dev/null); do
      name=\$(basename \$dir)
      if [ \"\$name\" = \"\$CURRENT\" ]; then
        echo \"  → \$name  (현재)\"
      else
        echo \"    \$name\"
      fi
    done
  "
  exit 0
fi

# ─── 롤백 실행 ───
echo ""

CURRENT=$(ssh "$REMOTE_HOST" "basename \$(readlink '${APP_LINK}')")
log "현재 릴리스: ${CURRENT}"

# 이전 릴리스 찾기 (현재 다음으로 최신)
PREV=$(ssh "$REMOTE_HOST" "
  CURRENT='${CURRENT}'
  FOUND_CURRENT=0
  for dir in \$(ls -dt ${RELEASES_DIR}/*/ 2>/dev/null); do
    name=\$(basename \$dir)
    if [ \$FOUND_CURRENT -eq 1 ]; then
      echo \$name
      exit 0
    fi
    if [ \"\$name\" = \"\$CURRENT\" ]; then
      FOUND_CURRENT=1
    fi
  done
  echo ''
")

if [ -z "$PREV" ]; then
  err "롤백할 이전 릴리스가 없습니다."
fi

log "롤백 대상: ${PREV}"
echo ""

if [ "$TARGET" = "prod" ]; then
  read -p "프로덕션을 ${PREV}로 롤백하시겠습니까? (y/N) " confirm
  if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "취소됨."
    exit 0
  fi
fi

# Symlink 전환
ssh "$REMOTE_HOST" "
  ln -sfn '${RELEASES_DIR}/${PREV}' '${APP_LINK}.rollback'
  mv -Tf '${APP_LINK}.rollback' '${APP_LINK}'
  echo \"전환: \$(readlink ${APP_LINK})\"
  pm2 reload admin-web --update-env
  sleep 3
  pm2 list
"

# 헬스체크
HEALTH_CODE=$(ssh "$REMOTE_HOST" "curl -s -o /dev/null -w '%{http_code}' '${HEALTH_URL}' 2>/dev/null || echo '000'")

if [[ "$HEALTH_CODE" == "200" || "$HEALTH_CODE" == "307" || "$HEALTH_CODE" == "308" ]]; then
  log "헬스체크 통과 (HTTP ${HEALTH_CODE})"
else
  warn "헬스체크 실패 (HTTP ${HEALTH_CODE}). 서버 로그를 확인하세요."
  ssh "$REMOTE_HOST" "pm2 logs admin-web --lines 10 --nostream 2>/dev/null || true"
  exit 1
fi

ssh "$REMOTE_HOST" "pm2 save"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  롤백 완료!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  릴리스: ${CURRENT} → ${PREV}"
echo ""
