#!/usr/bin/env bash

# Build and run SVP App with Docker.
# The script creates .env.docker on first run, including a generated admin login.

set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

APP_NAME="${APP_NAME:-svpapp}"
IMAGE_NAME="${IMAGE_NAME:-svpapp:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-svpapp}"
ENV_FILE="${ENV_FILE:-.env.docker}"

BUILD_IMAGE=true
RESET_ADMIN=false
SHOW_ADMIN=false

ADMIN_EMAIL_OVERRIDE="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD_OVERRIDE="${ADMIN_PASSWORD:-}"
APP_PORT_OVERRIDE="${APP_PORT:-}"
BIND_ADDRESS_OVERRIDE="${BIND_ADDRESS:-}"
APP_URL_OVERRIDE="${NEXT_PUBLIC_APP_URL:-${NEXT_PUBLIC_SITE_URL:-}}"
COOKIE_SECURE_OVERRIDE="${SESSION_COOKIE_SECURE:-}"
PUBLISH_PORT_OVERRIDE="${PUBLISH_PORT:-}"
DOCKER_NETWORK_OVERRIDE="${DOCKER_NETWORK:-}"
PORT_WAS_EXPLICIT=false

if [ -n "${APP_PORT:-}" ]; then
  PORT_WAS_EXPLICIT=true
fi

if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  NC=''
fi

usage() {
  cat <<EOF
Usage: ./docker-run.sh [options]

Options:
  --admin-email EMAIL      Set or update the admin email.
  --admin-password VALUE   Set or update the admin password.
  --app-url URL            Public app URL, for example https://svp.example.de.
  --port PORT              Host port to publish. Default: 3000.
  --bind ADDRESS           Host bind address. Default: 0.0.0.0.
  --no-publish             Do not bind a host port. Use this behind a reverse proxy.
  --publish                Bind the host port, overriding PUBLISH_PORT=false.
  --network NAME           Connect the container to an existing Docker network.
  --env-file FILE          Docker env file to create/use. Default: .env.docker.
  --no-build               Reuse the existing Docker image.
  --reset-admin            Generate a new admin password.
  --show-admin             Print the current admin login from the env file.
  -h, --help               Show this help.

Examples:
  ./docker-run.sh
  ./docker-run.sh --admin-email admin@example.de --app-url https://turnier.example.de
  ./docker-run.sh --no-publish --network web --app-url https://turnier.example.de
  ./docker-run.sh --reset-admin --show-admin
EOF
}

need_option_value() {
  local option_name="$1"

  if [ "$#" -lt 2 ] || [ -z "${2:-}" ]; then
    echo -e "${RED}[ERROR]${NC} $option_name requires a value." >&2
    usage
    exit 1
  fi
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --admin-email)
      need_option_value "$@"
      ADMIN_EMAIL_OVERRIDE="$2"
      shift 2
      ;;
    --admin-password)
      need_option_value "$@"
      ADMIN_PASSWORD_OVERRIDE="$2"
      shift 2
      ;;
    --app-url)
      need_option_value "$@"
      APP_URL_OVERRIDE="$2"
      shift 2
      ;;
    --port)
      need_option_value "$@"
      APP_PORT_OVERRIDE="$2"
      PORT_WAS_EXPLICIT=true
      shift 2
      ;;
    --bind)
      need_option_value "$@"
      BIND_ADDRESS_OVERRIDE="$2"
      shift 2
      ;;
    --no-publish)
      PUBLISH_PORT_OVERRIDE=false
      shift
      ;;
    --publish)
      PUBLISH_PORT_OVERRIDE=true
      shift
      ;;
    --network)
      need_option_value "$@"
      DOCKER_NETWORK_OVERRIDE="$2"
      shift 2
      ;;
    --env-file)
      need_option_value "$@"
      ENV_FILE="$2"
      shift 2
      ;;
    --no-build)
      BUILD_IMAGE=false
      shift
      ;;
    --reset-admin)
      RESET_ADMIN=true
      shift
      ;;
    --show-admin)
      SHOW_ADMIN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo -e "${RED}[ERROR]${NC} Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

die() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required but was not found."
}

read_env_value() {
  local key="$1"

  if [ ! -f "$ENV_FILE" ]; then
    return 0
  fi

  awk -v key="$key" '
    /^[[:space:]]*#/ { next }
    index($0, key "=") == 1 {
      sub("^[^=]*=", "")
      print
      exit
    }
  ' "$ENV_FILE"
}

prompt_default() {
  local prompt="$1"
  local default_value="$2"
  local value

  if [ -t 0 ]; then
    read -r -p "$prompt [$default_value]: " value
    echo "${value:-$default_value}"
  else
    echo "$default_value"
  fi
}

generate_hex() {
  local bytes="$1"

  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$bytes"
    return
  fi

  od -An -N "$bytes" -tx1 /dev/urandom | tr -d ' \n'
}

validate_plain_env_value() {
  local key="$1"
  local value="$2"

  if [[ "$value" == *$'\n'* || "$value" == *$'\r'* ]]; then
    die "$key must not contain newlines."
  fi
}

validate_port() {
  local value="$1"

  if [[ -z "$value" || "$value" == *[!0-9]* || "$value" -lt 1 || "$value" -gt 65535 ]]; then
    die "Invalid port: $value"
  fi
}

normalize_bool() {
  local key="$1"
  local value="$2"

  case "$value" in
    true|false)
      echo "$value"
      ;;
    *)
      die "$key must be true or false."
      ;;
  esac
}

infer_cookie_secure() {
  local app_url="$1"

  if [ -n "$COOKIE_SECURE_OVERRIDE" ]; then
    case "$COOKIE_SECURE_OVERRIDE" in
      true|false) echo "$COOKIE_SECURE_OVERRIDE" ;;
      *) die "SESSION_COOKIE_SECURE must be true or false." ;;
    esac
    return
  fi

  case "$app_url" in
    https://*) echo "true" ;;
    *) echo "false" ;;
  esac
}

write_env_file() {
  local app_port="$1"
  local bind_address="$2"
  local app_url="$3"
  local admin_email="$4"
  local admin_password="$5"
  local session_secret="$6"
  local admin_api_key="$7"
  local referee_card_secret="$8"
  local session_cookie_secure="$9"
  local publish_port="${10}"
  local docker_network="${11}"
  local tmp_file

  mkdir -p "$(dirname "$ENV_FILE")"
  tmp_file="$(mktemp "${ENV_FILE}.tmp.XXXXXX")"

  {
    echo "# Generated by ./docker-run.sh"
    echo "# Do not commit this file. It contains production secrets."
    echo ""
    echo "NODE_ENV=production"
    echo "NODE_OPTIONS=--max-old-space-size=512"
    echo "NEXT_TELEMETRY_DISABLED=1"
    echo "PORT=3000"
    echo "HOSTNAME=0.0.0.0"
    echo "APP_PORT=$app_port"
    echo "BIND_ADDRESS=$bind_address"
    echo "PUBLISH_PORT=$publish_port"
    if [ -n "$docker_network" ]; then
      echo "DOCKER_NETWORK=$docker_network"
    else
      echo "# DOCKER_NETWORK=web"
    fi
    echo "NEXT_PUBLIC_APP_URL=$app_url"
    echo "DATABASE_PATH=/app/data/database.sqlite"
    echo "DB_TIMEOUT=$(read_env_value DB_TIMEOUT || true)"
    echo "DB_BUSY_TIMEOUT=$(read_env_value DB_BUSY_TIMEOUT || true)"
    echo "SESSION_COOKIE_SECURE=$session_cookie_secure"
    echo ""
    echo "# Admin login for /admin/login"
    echo "ADMIN_EMAIL=$admin_email"
    echo "ADMIN_PASSWORD=$admin_password"
    echo "SESSION_SECRET=$session_secret"
    echo ""
    echo "# Legacy/internal secrets used by older helpers and referee-card tokens."
    echo "ADMIN_API_KEY=$admin_api_key"
    echo "REFEREE_CARD_SECRET=$referee_card_secret"
    echo ""
    echo "# Optional mail settings. Fill these in if SMTP should be active."
    write_optional_env "SMTP_HOST"
    write_optional_env "SMTP_PORT"
    write_optional_env "SMTP_USER"
    write_optional_env "SMTP_PASS"
    write_optional_env "SMTP_FROM"
    write_optional_env "TEAM_EMAIL_DOMAIN"
    write_optional_env "ALLOWED_IPS"
    write_optional_env "MAX_REQUESTS_PER_MINUTE"
    write_optional_env "AUTO_REGENERATE_SPIELPLAN_AFTER_REGISTRATION"
  } > "$tmp_file"

  if grep -q '^DB_TIMEOUT=$' "$tmp_file"; then
    sed -i.bak 's/^DB_TIMEOUT=$/DB_TIMEOUT=5000/' "$tmp_file"
    rm -f "$tmp_file.bak"
  fi

  if grep -q '^DB_BUSY_TIMEOUT=$' "$tmp_file"; then
    sed -i.bak 's/^DB_BUSY_TIMEOUT=$/DB_BUSY_TIMEOUT=5000/' "$tmp_file"
    rm -f "$tmp_file.bak"
  fi

  chmod 600 "$tmp_file"
  mv "$tmp_file" "$ENV_FILE"
}

write_optional_env() {
  local key="$1"
  local existing_value
  local current_value

  existing_value="$(read_env_value "$key" || true)"
  current_value="${!key:-$existing_value}"

  if [ -n "$current_value" ]; then
    validate_plain_env_value "$key" "$current_value"
    echo "$key=$current_value"
  else
    echo "# $key="
  fi
}

ensure_env_file() {
  local existing_admin_email
  local existing_admin_password
  local existing_session_secret
  local existing_admin_api_key
  local existing_referee_card_secret
  local existing_app_port
  local existing_bind_address
  local existing_app_url
  local existing_publish_port
  local existing_docker_network
  local app_port
  local bind_address
  local app_url
  local publish_port
  local docker_network
  local admin_email
  local admin_password
  local session_secret
  local admin_api_key
  local referee_card_secret
  local session_cookie_secure

  existing_admin_email="$(read_env_value ADMIN_EMAIL || true)"
  existing_admin_password="$(read_env_value ADMIN_PASSWORD || true)"
  existing_session_secret="$(read_env_value SESSION_SECRET || true)"
  existing_admin_api_key="$(read_env_value ADMIN_API_KEY || true)"
  existing_referee_card_secret="$(read_env_value REFEREE_CARD_SECRET || true)"
  existing_app_port="$(read_env_value APP_PORT || true)"
  existing_bind_address="$(read_env_value BIND_ADDRESS || true)"
  existing_app_url="$(read_env_value NEXT_PUBLIC_APP_URL || true)"
  existing_publish_port="$(read_env_value PUBLISH_PORT || true)"
  existing_docker_network="$(read_env_value DOCKER_NETWORK || true)"

  app_port="${APP_PORT_OVERRIDE:-${existing_app_port:-3000}}"
  validate_port "$app_port"

  bind_address="${BIND_ADDRESS_OVERRIDE:-${existing_bind_address:-0.0.0.0}}"
  publish_port="${PUBLISH_PORT_OVERRIDE:-${existing_publish_port:-true}}"
  publish_port="$(normalize_bool "PUBLISH_PORT" "$publish_port")"
  docker_network="${DOCKER_NETWORK_OVERRIDE:-${existing_docker_network:-}}"
  app_url="${APP_URL_OVERRIDE:-${existing_app_url:-http://localhost:${app_port}}}"
  admin_email="${ADMIN_EMAIL_OVERRIDE:-${existing_admin_email:-}}"

  if [ -z "$admin_email" ]; then
    admin_email="$(prompt_default "Admin email" "admin@sv-puschendorf.de")"
  fi

  if [ -n "$ADMIN_PASSWORD_OVERRIDE" ]; then
    admin_password="$ADMIN_PASSWORD_OVERRIDE"
    ADMIN_PASSWORD_WAS_GENERATED=false
  elif [ "$RESET_ADMIN" = true ] || [ -z "$existing_admin_password" ]; then
    admin_password="$(generate_hex 18)"
    ADMIN_PASSWORD_WAS_GENERATED=true
  else
    admin_password="$existing_admin_password"
    ADMIN_PASSWORD_WAS_GENERATED=false
  fi

  if [ -z "$existing_session_secret" ] || [ "$RESET_ADMIN" = true ]; then
    session_secret="$(generate_hex 32)"
  else
    session_secret="$existing_session_secret"
  fi

  if [ -z "$existing_admin_api_key" ] || [ "$RESET_ADMIN" = true ]; then
    admin_api_key="$(generate_hex 32)"
  else
    admin_api_key="$existing_admin_api_key"
  fi

  if [ -z "$existing_referee_card_secret" ] || [ "$RESET_ADMIN" = true ]; then
    referee_card_secret="$(generate_hex 32)"
  else
    referee_card_secret="$existing_referee_card_secret"
  fi

  session_cookie_secure="$(infer_cookie_secure "$app_url")"

  validate_plain_env_value "APP_PORT" "$app_port"
  validate_plain_env_value "BIND_ADDRESS" "$bind_address"
  validate_plain_env_value "PUBLISH_PORT" "$publish_port"
  validate_plain_env_value "DOCKER_NETWORK" "$docker_network"
  validate_plain_env_value "NEXT_PUBLIC_APP_URL" "$app_url"
  validate_plain_env_value "ADMIN_EMAIL" "$admin_email"
  validate_plain_env_value "ADMIN_PASSWORD" "$admin_password"
  validate_plain_env_value "SESSION_SECRET" "$session_secret"
  validate_plain_env_value "ADMIN_API_KEY" "$admin_api_key"
  validate_plain_env_value "REFEREE_CARD_SECRET" "$referee_card_secret"

  write_env_file \
    "$app_port" \
    "$bind_address" \
    "$app_url" \
    "$admin_email" \
    "$admin_password" \
    "$session_secret" \
    "$admin_api_key" \
    "$referee_card_secret" \
    "$session_cookie_secure" \
    "$publish_port" \
    "$docker_network"

  success "Docker environment written to $ENV_FILE"
}

prepare_runtime_dirs() {
  mkdir -p data sessions

  if docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    info "Preparing persistent data directories for the container user..."
    if ! docker run --rm \
      --user root \
      -v "$APP_DIR/data:/mnt/data" \
      -v "$APP_DIR/sessions:/mnt/sessions" \
      "$IMAGE_NAME" \
      sh -c 'chown -R 1001:1001 /mnt/data /mnt/sessions && chmod -R u+rwX,go-rwx /mnt/data /mnt/sessions' >/dev/null; then
      warn "Could not adjust data directory ownership. If SQLite cannot open, run: sudo chown -R 1001:1001 data sessions"
    fi
  fi
}

stop_existing_container() {
  if docker ps -a --format '{{.Names}}' | grep -Fx "$CONTAINER_NAME" >/dev/null 2>&1; then
    info "Stopping existing $CONTAINER_NAME container..."
    docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
    docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
  fi
}

port_is_in_use() {
  local port="$1"

  if command -v ss >/dev/null 2>&1; then
    if ss -ltn 2>/dev/null | awk -v port=":$port" '$4 ~ port "$" { found = 1 } END { exit found ? 0 : 1 }'; then
      return 0
    fi
  fi

  if command -v lsof >/dev/null 2>&1; then
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi
  fi

  if command -v netstat >/dev/null 2>&1; then
    if netstat -ltn 2>/dev/null | awk -v port=":$port" '$4 ~ port "$" { found = 1 } END { exit found ? 0 : 1 }'; then
      return 0
    fi
  fi

  if (: </dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1; then
    return 0
  fi

  return 1
}

find_available_port() {
  local start_port="$1"
  local candidate="$((start_port + 1))"
  local last_port="$((start_port + 50))"

  while [ "$candidate" -le "$last_port" ]; do
    if ! port_is_in_use "$candidate"; then
      echo "$candidate"
      return 0
    fi

    candidate="$((candidate + 1))"
  done

  return 1
}

set_env_value() {
  local key="$1"
  local value="$2"
  local tmp_file

  validate_plain_env_value "$key" "$value"
  tmp_file="$(mktemp "${ENV_FILE}.tmp.XXXXXX")"

  awk -v key="$key" -v value="$value" '
    index($0, key "=") == 1 {
      print key "=" value
      updated = 1
      next
    }
    { print }
    END {
      if (!updated) {
        print key "=" value
      }
    }
  ' "$ENV_FILE" > "$tmp_file"

  chmod 600 "$tmp_file"
  mv "$tmp_file" "$ENV_FILE"
}

ensure_host_port_available() {
  local bind_address="$1"
  local requested_port="$2"
  local selected_port
  local current_url
  local new_url

  if ! port_is_in_use "$requested_port"; then
    echo "$requested_port"
    return 0
  fi

  if [ "$PORT_WAS_EXPLICIT" = true ]; then
    die "Host port $requested_port is already in use. Stop the process using it, or run: ./docker-run.sh --port $((requested_port + 1))"
  fi

  selected_port="$(find_available_port "$requested_port")" || die "Host port $requested_port is in use and no free port was found in the next 50 ports. Run ./docker-run.sh --port PORT with a free port."

  warn "Host port $requested_port is already in use; using $selected_port instead."
  set_env_value "APP_PORT" "$selected_port"

  current_url="$(read_env_value NEXT_PUBLIC_APP_URL || true)"

  case "$current_url" in
    ""|"http://localhost:${requested_port}"|"http://127.0.0.1:${requested_port}")
      new_url="http://localhost:${selected_port}"
      set_env_value "NEXT_PUBLIC_APP_URL" "$new_url"
      set_env_value "SESSION_COOKIE_SECURE" "$(infer_cookie_secure "$new_url")"
      ;;
    *)
      warn "Keeping NEXT_PUBLIC_APP_URL=$current_url. Update your reverse proxy if it should point at port $selected_port."
      ;;
  esac

  echo "$selected_port"
}

print_admin_summary() {
  local admin_email
  local admin_password
  local app_url
  local publish_port
  local app_port
  local docker_network

  admin_email="$(read_env_value ADMIN_EMAIL || true)"
  admin_password="$(read_env_value ADMIN_PASSWORD || true)"
  app_url="$(read_env_value NEXT_PUBLIC_APP_URL || true)"
  publish_port="$(read_env_value PUBLISH_PORT || true)"
  app_port="$(read_env_value APP_PORT || true)"
  docker_network="$(read_env_value DOCKER_NETWORK || true)"

  echo ""
  echo "Admin login:"
  echo "  URL:      ${app_url}/admin/login"
  echo "  Email:    $admin_email"

  if [ "${ADMIN_PASSWORD_WAS_GENERATED:-false}" = true ] || [ "$SHOW_ADMIN" = true ]; then
    echo "  Password: $admin_password"
  else
    echo "  Password: kept from $ENV_FILE (use --show-admin to print it, --reset-admin to rotate it)"
  fi

  if [ "$publish_port" = false ]; then
    echo ""
    echo "Reverse proxy target:"
    echo "  Container: $CONTAINER_NAME"
    echo "  Port:      3000"
    if [ -n "$docker_network" ]; then
      echo "  Network:   $docker_network"
    else
      echo "  Network:   default bridge (use --network NAME if your proxy uses a shared network)"
    fi
  else
    echo "  Host port: $app_port"
  fi
}

require_command docker

[ -f package.json ] || die "package.json not found. Run this script from the svpapp directory."
[ -f Dockerfile ] || die "Dockerfile not found."

if ! docker info >/dev/null 2>&1; then
  die "Docker is not running or the current user cannot access it."
fi

ensure_env_file

if [ "$BUILD_IMAGE" = true ]; then
  info "Building Docker image $IMAGE_NAME..."
  export BUILDX_GIT_INFO="${BUILDX_GIT_INFO:-false}"
  docker build -t "$IMAGE_NAME" .
  success "Image built: $IMAGE_NAME"
else
  info "Skipping image build because --no-build was set."
fi

prepare_runtime_dirs
stop_existing_container

APP_PORT="$(read_env_value APP_PORT || true)"
BIND_ADDRESS="$(read_env_value BIND_ADDRESS || true)"
PUBLISH_PORT="$(read_env_value PUBLISH_PORT || true)"
DOCKER_NETWORK="$(read_env_value DOCKER_NETWORK || true)"
BIND_ADDRESS="${BIND_ADDRESS:-0.0.0.0}"
PUBLISH_PORT="${PUBLISH_PORT:-true}"
PUBLISH_PORT="$(normalize_bool "PUBLISH_PORT" "$PUBLISH_PORT")"

if [ -n "$DOCKER_NETWORK" ] && ! docker network inspect "$DOCKER_NETWORK" >/dev/null 2>&1; then
  die "Docker network '$DOCKER_NETWORK' was not found. Create it with: docker network create $DOCKER_NETWORK"
fi

docker_run_args=(
  -d
  --name "$CONTAINER_NAME"
  --env-file "$ENV_FILE"
  -v "$APP_DIR/data:/app/data"
  -v "$APP_DIR/sessions:/app/sessions"
  --restart unless-stopped
)

if [ -n "$DOCKER_NETWORK" ]; then
  docker_run_args+=(--network "$DOCKER_NETWORK")
fi

if [ "$PUBLISH_PORT" = true ]; then
  APP_PORT="$(ensure_host_port_available "$BIND_ADDRESS" "$APP_PORT")"
  docker_run_args+=(-p "${BIND_ADDRESS}:${APP_PORT}:3000")
  info "Starting $CONTAINER_NAME on ${BIND_ADDRESS}:${APP_PORT}..."
else
  info "Starting $CONTAINER_NAME without a published host port. Proxy to ${CONTAINER_NAME}:3000."
fi

docker run "${docker_run_args[@]}" "$IMAGE_NAME" >/dev/null

success "Container started."
print_admin_summary

echo ""
echo "Useful commands:"
echo "  Logs:       docker logs -f $CONTAINER_NAME"
echo "  Stop:       docker stop $CONTAINER_NAME"
echo "  Restart:    docker restart $CONTAINER_NAME"
echo "  Shell:      docker exec -it $CONTAINER_NAME sh"
echo "  Compose:    docker compose --env-file $ENV_FILE up -d --build"
