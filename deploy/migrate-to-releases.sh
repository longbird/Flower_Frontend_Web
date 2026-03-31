#!/bin/bash
###############################################################################
# migrate-to-releases.sh — 기존 디렉토리 구조를 releases 기반으로 전환
#
# 1회성 실행. 대상 서버에서 직접 실행하거나 로컬에서 SSH로 실행.
#
# 사용법 (로컬에서):
#   bash deploy/migrate-to-releases.sh [test|prod]
#
# 사용법 (서버에서 직접):
#   bash migrate-to-releases.sh --local
###############################################################################
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[MIGRATE]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ─── 서버에서 실행할 마이그레이션 로직 ───
run_migration() {
  local BASE_DIR="/home/blueadm"
  local APP_DIR="${BASE_DIR}/frontend_web"
  local RELEASES_DIR="${BASE_DIR}/releases"
  local SHARED_DIR="${BASE_DIR}/shared"
  local INITIAL="v_initial"

  # 이미 symlink이면 중단
  if [ -L "${APP_DIR}" ]; then
    echo "frontend_web이 이미 symlink입니다. 마이그레이션 불필요."
    ls -la "${APP_DIR}"
    exit 0
  fi

  echo "=== 마이그레이션 시작 ==="

  # 1. 디렉토리 생성
  echo "[1/6] releases/ 및 shared/ 디렉토리 생성..."
  mkdir -p "${RELEASES_DIR}"
  mkdir -p "${SHARED_DIR}"

  # 2. .env.local을 shared/로 이동
  echo "[2/6] .env.local → shared/.env.local..."
  if [ -f "${APP_DIR}/.env.local" ]; then
    cp "${APP_DIR}/.env.local" "${SHARED_DIR}/.env.local"
    echo "  복사 완료: $(cat ${SHARED_DIR}/.env.local | wc -l) lines"
  else
    warn ".env.local 없음. shared/.env.local 수동 생성 필요."
  fi

  # 3. PM2 정지
  echo "[3/6] PM2 admin-web 정지..."
  pm2 stop admin-web 2>/dev/null || true

  # 4. frontend_web → releases/v_initial/ 이동
  echo "[4/6] frontend_web/ → releases/${INITIAL}/..."
  mv "${APP_DIR}" "${RELEASES_DIR}/${INITIAL}"

  # 5. .env.local을 symlink으로 교체
  echo "[5/6] .env.local symlink 생성..."
  rm -f "${RELEASES_DIR}/${INITIAL}/.env.local"
  ln -s "${SHARED_DIR}/.env.local" "${RELEASES_DIR}/${INITIAL}/.env.local"

  # 6. frontend_web symlink 생성
  echo "[6/6] frontend_web symlink 생성 → releases/${INITIAL}/..."
  ln -s "${RELEASES_DIR}/${INITIAL}" "${APP_DIR}"

  # 검증
  echo ""
  echo "=== 검증 ==="
  echo "symlink: $(ls -la ${APP_DIR} | grep -o '->.*')"
  echo ".env.local: $(ls -la ${APP_DIR}/.env.local | grep -o '->.*')"
  echo "ecosystem: $(ls -la ${APP_DIR}/ecosystem.config.js 2>/dev/null && echo 'OK' || echo 'MISSING')"
  echo ".next: $(ls -d ${APP_DIR}/.next 2>/dev/null && echo 'OK' || echo 'MISSING')"

  # PM2 재시작 (cluster 모드)
  echo ""
  echo "=== PM2 cluster 모드로 시작 ==="
  cd "${APP_DIR}"
  pm2 delete admin-web 2>/dev/null || true
  pm2 start ecosystem.config.js
  sleep 3
  pm2 list
  pm2 save

  echo ""
  echo -e "${GREEN}=== 마이그레이션 완료 ===${NC}"
  echo "  구조: frontend_web → releases/${INITIAL}/"
  echo "  모드: PM2 cluster (2 instances)"
  echo "  공유: shared/.env.local"
}

# ─── 메인 ───
TARGET="${1:-test}"

if [ "$TARGET" = "--local" ]; then
  # 서버에서 직접 실행
  run_migration
  exit 0
fi

case "$TARGET" in
  test)
    REMOTE_HOST="blueadm@49.247.46.86"
    echo "대상: 테스트 서버 (49.247.46.86)"
    ;;
  prod)
    REMOTE_HOST="blueadm@49.247.206.190"
    echo "대상: 프로덕션 서버 (49.247.206.190)"
    ;;
  *)
    echo "사용법: $0 [test|prod|--local]"
    exit 1
    ;;
esac

echo ""
read -p "마이그레이션을 진행하시겠습니까? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "취소됨."
  exit 0
fi

# 스크립트를 원격 서버로 전송 후 실행
log "마이그레이션 스크립트 전송 중..."
scp "$(dirname "$0")/migrate-to-releases.sh" "${REMOTE_HOST}:/tmp/migrate-to-releases.sh"

log "원격 실행 중..."
ssh "$REMOTE_HOST" "bash /tmp/migrate-to-releases.sh --local"
