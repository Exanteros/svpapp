#!/usr/bin/env bash

# Docker deployment for SVP App.
# Run this on the production server from the repository directory:
#   bash scripts/docker-deploy.sh

set -Eeuo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env.docker}"
SERVICE="${SERVICE:-svpapp}"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-svpapp}"
HEALTH_URL_OVERRIDE="${HEALTH_URL:-}"
HEALTH_URL=""
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups/docker-deploy}"
SKIP_PULL=false
SKIP_HEALTHCHECK=false

usage() {
  cat <<EOF
Usage: bash scripts/docker-deploy.sh [options]

Options:
  --no-pull              Do not fetch/reset from origin/main before deploying.
  --skip-healthcheck     Do not wait for /api/health.
  --compose-file FILE    Compose file to use. Default: docker-compose.yml.
  --env-file FILE        Env file to use. Default: .env.docker.
  --service NAME         Compose service name. Default: svpapp.
  --health-url URL       Healthcheck URL. Default: http://127.0.0.1:\$APP_PORT/api/health.
  -h, --help             Show this help.

Examples:
  bash scripts/docker-deploy.sh
  bash scripts/docker-deploy.sh --compose-file docker-compose.proxy.yml --health-url https://turnier.example.de/api/health
  bash scripts/docker-deploy.sh --no-pull
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --no-pull)
      SKIP_PULL=true
      shift
      ;;
    --skip-healthcheck)
      SKIP_HEALTHCHECK=true
      shift
      ;;
    --compose-file)
      COMPOSE_FILE="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --service)
      SERVICE="${2:-}"
      shift 2
      ;;
    --health-url)
      HEALTH_URL="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

die() {
  log "ERROR: $*" >&2
  exit 1
}

need_command() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required."
}

read_env_value() {
  local key="$1"

  [ -f "$ENV_FILE" ] || return 0

  awk -v key="$key" '
    /^[[:space:]]*#/ { next }
    index($0, key "=") == 1 {
      sub("^[^=]*=", "")
      gsub(/^"|"$/, "")
      print
      exit
    }
  ' "$ENV_FILE"
}

compose() {
  docker compose -p "$PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

backup_database() {
  local source_db="$APP_DIR/data/database.sqlite"
  local timestamp

  timestamp="$(date '+%Y%m%d-%H%M%S')"
  mkdir -p "$BACKUP_DIR"

  if [ -f "$source_db" ]; then
    cp "$source_db" "$BACKUP_DIR/database-$timestamp.sqlite"
    log "Database backup created: $BACKUP_DIR/database-$timestamp.sqlite"
  else
    log "No database found at $source_db, skipping database backup."
  fi
}

pull_latest() {
  if [ "$SKIP_PULL" = true ]; then
    log "Skipping git pull/reset."
    return
  fi

  log "Pulling latest origin/main..."
  git fetch origin
  git reset --hard origin/main
}

remember_current_image() {
  local container_id
  local image_id
  local rollback_tag

  container_id="$(compose ps -q "$SERVICE" 2>/dev/null || true)"

  if [ -z "$container_id" ]; then
    return 0
  fi

  image_id="$(docker inspect --format '{{.Image}}' "$container_id" 2>/dev/null || true)"

  if [ -z "$image_id" ]; then
    return 0
  fi

  rollback_tag="${PROJECT_NAME}-${SERVICE}:rollback"
  docker image tag "$image_id" "$rollback_tag"
  log "Rollback image tagged as $rollback_tag"
}

rollback_container() {
  local rollback_tag="${PROJECT_NAME}-${SERVICE}:rollback"
  local target_tag="${PROJECT_NAME}-${SERVICE}:latest"

  if ! docker image inspect "$rollback_tag" >/dev/null 2>&1; then
    die "Deployment failed and no rollback image is available."
  fi

  log "Rolling back to $rollback_tag..."
  docker image tag "$rollback_tag" "$target_tag"
  compose up -d --no-build "$SERVICE"
}

wait_for_health() {
  local attempts=30
  local status

  if [ "$SKIP_HEALTHCHECK" = true ]; then
    log "Skipping healthcheck."
    return 0
  fi

  log "Waiting for healthcheck: $HEALTH_URL"

  for attempt in $(seq 1 "$attempts"); do
    status="$(curl -fsS -o /dev/null -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || true)"

    if [ "$status" = "200" ]; then
      log "Healthcheck passed."
      return 0
    fi

    log "Healthcheck not ready yet ($attempt/$attempts, status: ${status:-none})."
    sleep 3
  done

  return 1
}

main() {
  cd "$APP_DIR"

  need_command git
  need_command docker
  need_command curl

  [ -f "$COMPOSE_FILE" ] || die "Compose file not found: $COMPOSE_FILE"
  [ -f "$ENV_FILE" ] || die "Env file not found: $ENV_FILE. Copy docker.env.example to $ENV_FILE first."

  local app_port
  app_port="${APP_PORT:-$(read_env_value APP_PORT)}"
  app_port="${app_port:-3000}"
  HEALTH_URL="${HEALTH_URL_OVERRIDE:-http://127.0.0.1:${app_port}/api/health}"

  log "Starting Docker deploy in $APP_DIR"
  log "Compose file: $COMPOSE_FILE"
  log "Env file: $ENV_FILE"
  log "Service: $SERVICE"

  backup_database
  pull_latest
  remember_current_image

  log "Building Docker image..."
  compose build "$SERVICE"

  log "Starting container..."
  compose up -d "$SERVICE"

  if ! wait_for_health; then
    log "Healthcheck failed."
    rollback_container
    die "Deployment rolled back after failed healthcheck."
  fi

  log "Deployment complete."
  compose ps "$SERVICE"
}

main "$@"
