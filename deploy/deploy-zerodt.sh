#!/bin/bash
###############################################################################
# deploy-zerodt.sh — 제로 다운타임 배포
#
# symlink 전환 + PM2 graceful reload로 다운타임 없이 배포.
# 빌드 실패 시 기존 버전 유지, 헬스체크 실패 시 자동 롤백.
#
# 사전 조건: migrate-to-releases.sh 실행 완료
#
# 사용법:
#   bash deploy/deploy-zerodt.sh          # 테스트 서버 배포 (기본)
#   bash deploy/deploy-zerodt.sh prod     # 프로덕션 배포
###############################################################################
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
step() { echo -e "\n${CYAN}━━━ $* ━━━${NC}"; }

TARGET="${1:-test}"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

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
    echo ""
    read -p "프로덕션 배포를 진행하시겠습니까? (y/N) " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
      echo "취소됨."
      exit 0
    fi
    ;;
  *)
    echo "사용법: $0 [test|prod]"
    exit 1
    ;;
esac

BASE_DIR="/home/blueadm"
APP_LINK="${BASE_DIR}/frontend_web"
RELEASES_DIR="${BASE_DIR}/releases"
SHARED_DIR="${BASE_DIR}/shared"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
NEW_RELEASE="${RELEASES_DIR}/${TIMESTAMP}"

# ─── 사전 검증 ───
step "0/6  사전 검증"

ssh "$REMOTE_HOST" "
  if [ ! -L '${APP_LINK}' ]; then
    echo 'ERROR: frontend_web이 symlink이 아닙니다. migrate-to-releases.sh를 먼저 실행하세요.'
    exit 1
  fi
  if [ ! -f '${SHARED_DIR}/.env.local' ]; then
    echo 'ERROR: shared/.env.local이 없습니다.'
    exit 1
  fi
  echo 'OK: symlink 구조 확인 완료'
  echo \"현재 릴리스: \$(readlink ${APP_LINK})\"
" || err "사전 검증 실패"

PREV_RELEASE=$(ssh "$REMOTE_HOST" "readlink ${APP_LINK}")
log "현재 릴리스: ${PREV_RELEASE}"

# ─── Step 1: 로컬 아카이브 ───
step "1/6  로컬 아카이브 생성"

ARCHIVE="/tmp/frontend_deploy_${TIMESTAMP}.tar.gz"
tar czf "$ARCHIVE" \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude=.env.local \
  --exclude=.agents \
  --exclude=.claude \
  --exclude=.windsurf \
  --exclude=.impeccable.md \
  --exclude=.superpowers \
  --exclude=screenshots \
  --exclude=scripts \
  -C "$LOCAL_DIR" .

log "아카이브: $(du -h "$ARCHIVE" | cut -f1)"

# ─── Step 2: 전송 ───
step "2/6  서버 전송"

scp "$ARCHIVE" "${REMOTE_HOST}:/tmp/frontend_deploy.tar.gz"
rm -f "$ARCHIVE"
log "전송 완료"

# ─── Step 3: 새 릴리스 생성 + 빌드 ───
step "3/6  새 릴리스 생성 및 빌드"

ssh "$REMOTE_HOST" "
  set -e

  # 새 릴리스 디렉토리
  mkdir -p '${NEW_RELEASE}'
  tar xzf /tmp/frontend_deploy.tar.gz -C '${NEW_RELEASE}'
  rm -f /tmp/frontend_deploy.tar.gz

  # .env.local symlink
  ln -sf '${SHARED_DIR}/.env.local' '${NEW_RELEASE}/.env.local'

  # node_modules 복사 (이전 릴리스에서, 빌드 속도 최적화)
  if [ -d '${PREV_RELEASE}/node_modules' ]; then
    echo 'node_modules 복사 중 (이전 릴리스에서)...'
    cp -a '${PREV_RELEASE}/node_modules' '${NEW_RELEASE}/node_modules'
  fi

  # npm install
  cd '${NEW_RELEASE}'
  echo '=== npm install ==='
  npm install --production=false 2>&1 | tail -3

  # next build
  echo '=== next build ==='
  npx next build 2>&1 | tail -10

  # 빌드 결과 확인
  if [ ! -d '${NEW_RELEASE}/.next' ]; then
    echo 'ERROR: .next 디렉토리가 생성되지 않았습니다. 빌드 실패.'
    rm -rf '${NEW_RELEASE}'
    exit 1
  fi
  echo 'BUILD OK'
" || {
  err "빌드 실패. 기존 버전 유지됨."
}

log "빌드 성공"

# ─── Step 4: Symlink 전환 (atomic) ───
step "4/6  Symlink 전환"

ssh "$REMOTE_HOST" "
  # atomic symlink swap: 임시 링크 생성 후 mv (rename은 atomic)
  ln -sfn '${NEW_RELEASE}' '${APP_LINK}.new'
  mv -Tf '${APP_LINK}.new' '${APP_LINK}'
  echo \"전환 완료: \$(readlink ${APP_LINK})\"
"

log "Symlink 전환 완료"

# ─── Step 5: PM2 Graceful Reload ───
step "5/6  PM2 Graceful Reload"

ssh "$REMOTE_HOST" "
  pm2 reload admin-web --update-env
  sleep 3
  pm2 list
"

# ─── Step 6: 헬스체크 + 정리 ───
step "6/6  헬스체크 및 정리"

HEALTH_CODE=$(ssh "$REMOTE_HOST" "curl -s -o /dev/null -w '%{http_code}' '${HEALTH_URL}' 2>/dev/null || echo '000'")

if [[ "$HEALTH_CODE" == "200" || "$HEALTH_CODE" == "307" || "$HEALTH_CODE" == "308" ]]; then
  log "헬스체크 통과 (HTTP ${HEALTH_CODE})"
else
  warn "헬스체크 실패 (HTTP ${HEALTH_CODE}). 자동 롤백 중..."

  ssh "$REMOTE_HOST" "
    ln -sfn '${PREV_RELEASE}' '${APP_LINK}.rollback'
    mv -Tf '${APP_LINK}.rollback' '${APP_LINK}'
    pm2 reload admin-web --update-env
    sleep 3
  "

  ROLLBACK_CODE=$(ssh "$REMOTE_HOST" "curl -s -o /dev/null -w '%{http_code}' '${HEALTH_URL}' 2>/dev/null || echo '000'")
  if [[ "$ROLLBACK_CODE" == "200" || "$ROLLBACK_CODE" == "307" || "$ROLLBACK_CODE" == "308" ]]; then
    warn "롤백 성공 (HTTP ${ROLLBACK_CODE}). 이전 버전으로 복구됨."
  else
    err "롤백도 실패 (HTTP ${ROLLBACK_CODE}). 수동 확인 필요!"
  fi
  exit 1
fi

# 오래된 릴리스 정리 (최근 3개만 유지)
ssh "$REMOTE_HOST" "
  cd '${RELEASES_DIR}'
  CURRENT=\$(basename \$(readlink '${APP_LINK}'))
  KEEP=3
  COUNT=0
  for dir in \$(ls -dt */ 2>/dev/null); do
    dir=\${dir%/}
    COUNT=\$((COUNT + 1))
    if [ \$COUNT -gt \$KEEP ] && [ \"\$dir\" != \"\$CURRENT\" ]; then
      echo \"정리: \$dir\"
      rm -rf \"\$dir\"
    fi
  done
  echo \"릴리스 목록:\"
  ls -dt */ 2>/dev/null
"

ssh "$REMOTE_HOST" "pm2 save"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  배포 완료! (제로 다운타임)${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  릴리스: ${TIMESTAMP}"
echo "  롤백:   bash deploy/rollback-zerodt.sh ${TARGET}"
echo ""
