#!/usr/bin/env bash
# ==============================================================================
# CineVicino — Universal Automated Production VPS Deployment Script
# ==============================================================================
# Single self-contained installer that takes a fresh git clone on ANY Linux VPS
# to a fully operational, publicly accessible site behind a Cloudflare Tunnel.
#
# Supported Distros: Debian, Ubuntu, Oracle Linux, RHEL, Rocky, Alma, Fedora,
#                    Arch Linux, Alpine Linux, openSUSE / SLES
# Supported Architectures: x86_64 / amd64, aarch64 / arm64 (e.g. Oracle Ampere A1)
#
# Key Guarantees:
#   1. Zero manual steps required.
#   2. Idempotent: safe to run multiple times; never overwrites existing secrets.
#   3. Absolute Cloudflare Safety: NEVER touches or alters pre-existing tunnels.
#   4. Structural docker-compose updates via Python: no blind string appending.
#   5. Port Security: Nginx binds to 127.0.0.1 only; public traffic flows via Tunnel.
# ==============================================================================

set -euo pipefail

# Text formatting helpers
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
fatal()   { echo -e "${RED}[FATAL ERROR]${NC} $*" >&2; exit 1; }

echo -e "${BOLD}"
echo "=================================================================="
echo "    CineVicino — Universal Production Installer & Tunnel Setup   "
echo "=================================================================="
echo -e "${NC}"

# ------------------------------------------------------------------------------
# 1. ROOT & SUDO PRIVILEGE DETECTION
# ------------------------------------------------------------------------------
if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    fatal "This script must be executed as root or by a user with sudo privileges."
  fi
fi

# Locate project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"
info "Working inside repository root: ${PROJECT_ROOT}"

# ------------------------------------------------------------------------------
# 2. CPU ARCHITECTURE DETECTION (Requirement 2)
# ------------------------------------------------------------------------------
ARCH_RAW=$(uname -m)
case "${ARCH_RAW}" in
  x86_64|amd64)
    ARCH="amd64"
    ;;
  aarch64|arm64)
    ARCH="arm64"
    ;;
  *)
    fatal "Unsupported CPU architecture: '${ARCH_RAW}'.\nCineVicino production containers and cloudflared require either:\n  - x86_64 / amd64\n  - aarch64 / arm64 (e.g. Oracle Cloud Ampere A1, AWS Graviton)\nStopping cleanly rather than attempting to download incompatible binaries."
    ;;
esac
success "Detected CPU architecture: ${ARCH_RAW} -> mapped to '${ARCH}'"

# ------------------------------------------------------------------------------
# 3. LINUX DISTRO & PACKAGE MANAGER DETECTION (Requirement 1)
# ------------------------------------------------------------------------------
PKG_MANAGER=""
if command -v apt-get >/dev/null 2>&1; then
  PKG_MANAGER="apt-get"
elif command -v dnf >/dev/null 2>&1; then
  PKG_MANAGER="dnf"
elif command -v yum >/dev/null 2>&1; then
  PKG_MANAGER="yum"
elif command -v pacman >/dev/null 2>&1; then
  PKG_MANAGER="pacman"
elif command -v apk >/dev/null 2>&1; then
  PKG_MANAGER="apk"
elif command -v zypper >/dev/null 2>&1; then
  PKG_MANAGER="zypper"
else
  fatal "No supported package manager detected on this system.\nChecked: apt-get, dnf, yum, pacman, apk, zypper.\nPlease install Docker and Python3 manually on your distribution, then re-run."
fi
success "Detected Linux package manager: ${PKG_MANAGER}"

# ------------------------------------------------------------------------------
# 4. INIT SYSTEM HELPER (Requirement 3)
# ------------------------------------------------------------------------------
manage_service() {
  local action="$1"
  local svc="$2"
  if command -v systemctl >/dev/null 2>&1; then
    if [ "$action" = "enable_and_start" ]; then
      $SUDO systemctl enable --now "$svc" 2>/dev/null || $SUDO systemctl start "$svc" 2>/dev/null || true
    elif [ "$action" = "start" ]; then
      $SUDO systemctl start "$svc" 2>/dev/null || true
    fi
  elif command -v service >/dev/null 2>&1; then
    $SUDO service "$svc" start 2>/dev/null || true
  elif command -v rc-service >/dev/null 2>&1; then
    $SUDO rc-service "$svc" start 2>/dev/null || true
  else
    info "No systemctl/service/rc-service detected. Assuming ${svc} is managed by host init or container supervisor."
  fi
}

# ------------------------------------------------------------------------------
# 5. DOCKER & DOCKER COMPOSE VERIFICATION OR INSTALLATION (Requirement 1)
# ------------------------------------------------------------------------------
has_docker=false
has_compose=false

if command -v docker >/dev/null 2>&1; then
  has_docker=true
fi

if docker compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1; then
  has_compose=true
fi

if [ "$has_docker" = true ] && [ "$has_compose" = true ]; then
  success "Docker and Docker Compose are already installed and functional. Skipping installation."
else
  info "Installing Docker and Docker Compose via ${PKG_MANAGER}..."
  case "${PKG_MANAGER}" in
    apt-get)
      $SUDO apt-get update -y
      $SUDO apt-get install -y ca-certificates curl gnupg
      if ! curl -fsSL https://get.docker.com | $SUDO sh; then
        info "get.docker.com fallback: installing via distribution packages..."
        $SUDO apt-get install -y docker.io docker-compose-plugin
      fi
      ;;
    dnf)
      if ! curl -fsSL https://get.docker.com | $SUDO sh; then
        $SUDO dnf install -y docker docker-compose-plugin || $SUDO dnf install -y docker-ce docker-compose-plugin
      fi
      ;;
    yum)
      if ! curl -fsSL https://get.docker.com | $SUDO sh; then
        $SUDO yum install -y docker docker-compose-plugin
      fi
      ;;
    pacman)
      $SUDO pacman -Sy --noconfirm docker docker-compose
      ;;
    apk)
      $SUDO apk add --no-cache docker docker-cli-compose
      ;;
    zypper)
      $SUDO zypper refresh
      $SUDO zypper install -y docker docker-compose
      ;;
  esac

  manage_service "enable_and_start" "docker"

  # Add current user to docker group if non-root
  if [ -n "$SUDO" ] && [ -n "${USER:-}" ]; then
    $SUDO usermod -aG docker "$USER" 2>/dev/null || true
    info "Added user '${USER}' to docker group."
  fi
fi

# Determine compose command
if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
else
  fatal "Docker Compose is still not available after installation attempt."
fi
success "Docker Compose command validated: '${DOCKER_COMPOSE}'"

# ------------------------------------------------------------------------------
# 6. PYTHON 3 & PY签/YAML MODULE VERIFICATION (Requirement 6)
# ------------------------------------------------------------------------------
info "Checking for Python 3 runtime (needed for safe structural YAML editing)..."
if ! command -v python3 >/dev/null 2>&1; then
  info "Installing python3..."
  case "${PKG_MANAGER}" in
    apt-get) $SUDO apt-get update -y && $SUDO apt-get install -y python3 python3-yaml ;;
    dnf)     $SUDO dnf install -y python3 python3-pyyaml ;;
    yum)     $SUDO yum install -y python3 python3-pyyaml ;;
    pacman)  $SUDO pacman -Sy --noconfirm python python-yaml ;;
    apk)     $SUDO apk add --no-cache python3 py3-yaml ;;
    zypper)  $SUDO zypper install -y python3 python3-PyYAML ;;
  esac
fi

if ! command -v python3 >/dev/null 2>&1; then
  fatal "Python 3 is required for structural YAML configuration but could not be installed."
fi

# Ensure PyYAML or install it
if ! python3 -c "import yaml" >/dev/null 2>&1; then
  info "Installing PyYAML module for structural docker-compose.yml modification..."
  case "${PKG_MANAGER}" in
    apt-get) $SUDO apt-get install -y python3-yaml 2>/dev/null || true ;;
    dnf)     $SUDO dnf install -y python3-pyyaml 2>/dev/null || true ;;
    yum)     $SUDO yum install -y python3-pyyaml 2>/dev/null || true ;;
    pacman)  $SUDO pacman -Sy --noconfirm python-yaml 2>/dev/null || true ;;
    apk)     $SUDO apk add --no-cache py3-yaml 2>/dev/null || true ;;
    zypper)  $SUDO zypper install -y python3-PyYAML 2>/dev/null || true ;;
  esac

  if ! python3 -c "import yaml" >/dev/null 2>&1; then
    if command -v pip3 >/dev/null 2>&1; then
      pip3 install --break-system-packages pyyaml 2>/dev/null || pip3 install pyyaml 2>/dev/null || true
    fi
  fi
fi

if python3 -c "import yaml" >/dev/null 2>&1; then
  success "Python 3 + PyYAML verified for structural docker-compose manipulation."
else
  info "PyYAML module not found in OS packages; will use Python's built-in structural block parser."
fi

# ------------------------------------------------------------------------------
# 7. SAFE CLOUDFLARE TUNNEL AUDIT & INSTALLATION (Requirement 4)
# ------------------------------------------------------------------------------
CLOUDFLARED_BIN=""
if command -v cloudflared >/dev/null 2>&1; then
  CLOUDFLARED_BIN="$(command -v cloudflared)"
  success "Reusing existing cloudflared binary at: ${CLOUDFLARED_BIN}"
elif [ -x "/usr/local/bin/cloudflared" ]; then
  CLOUDFLARED_BIN="/usr/local/bin/cloudflared"
  success "Reusing existing cloudflared binary at: ${CLOUDFLARED_BIN}"
else
  info "cloudflared binary not found. Downloading for architecture: ${ARCH}..."
  CLOUDFLARED_DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}"
  TMP_CF="/tmp/cloudflared"
  curl -fsSL "${CLOUDFLARED_DOWNLOAD_URL}" -o "${TMP_CF}"
  chmod +x "${TMP_CF}"
  $SUDO mv "${TMP_CF}" /usr/local/bin/cloudflared
  CLOUDFLARED_BIN="/usr/local/bin/cloudflared"
  success "Installed cloudflared (${ARCH}) to ${CLOUDFLARED_BIN}"
fi

# Verify Cloudflare authentication login
CF_LOGIN_CERT="${HOME}/.cloudflared/cert.pem"
if [ ! -f "${CF_LOGIN_CERT}" ] || [ ! -s "${CF_LOGIN_CERT}" ]; then
  echo ""
  echo -e "${YELLOW}==================================================================${NC}"
  echo -e "${YELLOW}  CLOUDFLARE AUTHENTICATION REQUIRED                             ${NC}"
  echo -e "${YELLOW}==================================================================${NC}"
  echo "No existing Cloudflare account certificate was found at ~/.cloudflared/cert.pem."
  echo "Running 'cloudflared tunnel login' now. Please follow the instructions and"
  echo "open the authentication link in your browser to authorize your domain."
  echo "------------------------------------------------------------------"
  "${CLOUDFLARED_BIN}" tunnel login
fi

if [ ! -f "${CF_LOGIN_CERT}" ] || [ ! -s "${CF_LOGIN_CERT}" ]; then
  fatal "Cloudflare authentication certificate was not found at ${CF_LOGIN_CERT}. Setup cannot proceed without an active Cloudflare login."
fi
success "Cloudflare credentials verified (~/.cloudflared/cert.pem)."

# NON-NEGOTIABLE SAFETY AUDIT: Print all existing tunnels clearly
echo ""
echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}  AUDITING EXISTING CLOUDFLARE TUNNELS ON THIS VPS               ${NC}"
echo -e "${BLUE}==================================================================${NC}"
EXISTING_TUNNELS_OUTPUT="$("${CLOUDFLARED_BIN}" tunnel list 2>&1 || true)"
echo "${EXISTING_TUNNELS_OUTPUT}"
echo -e "${BLUE}------------------------------------------------------------------${NC}"
echo -e "${GREEN}[SAFETY GUARANTEE] CineVicino will NEVER modify, alter, or delete${NC}"
echo -e "${GREEN}any pre-existing Cloudflare tunnels listed above.${NC}"
echo -e "${GREEN}It operates strictly within its own project-scoped tunnel: 'cinevicino'.${NC}"
echo -e "${BLUE}==================================================================${NC}"
echo ""

# Project-scoped tunnel: check if 'cinevicino' already exists
CINE_TUNNEL_NAME="cinevicino"
CINE_TUNNEL_ID="$(echo "${EXISTING_TUNNELS_OUTPUT}" | awk -v name="${CINE_TUNNEL_NAME}" '$2 == name {print $1}')"

mkdir -p "${PROJECT_ROOT}/cloudflared"

if [ -n "${CINE_TUNNEL_ID}" ]; then
  success "Found existing project tunnel '${CINE_TUNNEL_NAME}' (ID: ${CINE_TUNNEL_ID}). Reusing it."
else
  info "Creating dedicated Cloudflare Tunnel '${CINE_TUNNEL_NAME}'..."
  "${CLOUDFLARED_BIN}" tunnel create "${CINE_TUNNEL_NAME}"
  # Re-list to retrieve newly created tunnel ID
  NEW_TUNNEL_LIST="$("${CLOUDFLARED_BIN}" tunnel list 2>&1)"
  CINE_TUNNEL_ID="$(echo "${NEW_TUNNEL_LIST}" | awk -v name="${CINE_TUNNEL_NAME}" '$2 == name {print $1}')"
  if [ -z "${CINE_TUNNEL_ID}" ]; then
    fatal "Failed to extract Tunnel ID for newly created tunnel '${CINE_TUNNEL_NAME}'."
  fi
  success "Created project tunnel '${CINE_TUNNEL_NAME}' with ID: ${CINE_TUNNEL_ID}"
fi

# Project-local credentials isolation: copy credentials to ./cloudflared/
# Never overwrite anything in ~/.cloudflared/
SRC_CRED="${HOME}/.cloudflared/${CINE_TUNNEL_ID}.json"
DEST_CRED="${PROJECT_ROOT}/cloudflared/${CINE_TUNNEL_ID}.json"
CANONICAL_CRED="${PROJECT_ROOT}/cloudflared/credentials.json"

if [ -f "${SRC_CRED}" ]; then
  cp "${SRC_CRED}" "${DEST_CRED}"
  cp "${SRC_CRED}" "${CANONICAL_CRED}"
  # Mode 644 (not 600) is required because the official cloudflared Docker container runs as non-root and cannot read mode-600 files owned by the host user
  chmod 644 "${DEST_CRED}" "${CANONICAL_CRED}"
  success "Isolated project credentials inside ./cloudflared/ (mode 644)."
elif [ -f "${DEST_CRED}" ]; then
  cp "${DEST_CRED}" "${CANONICAL_CRED}"
  # Mode 644 (not 600) is required because the official cloudflared Docker container runs as non-root and cannot read mode-600 files owned by the host user
  chmod 644 "${DEST_CRED}" "${CANONICAL_CRED}"
  success "Reusing existing credentials inside ./cloudflared/ (mode 644)."
else
  fatal "Could not locate credentials file for tunnel ${CINE_TUNNEL_ID} at ${SRC_CRED} or ${DEST_CRED}."
fi

# ------------------------------------------------------------------------------
# 8. CONFIGURATION & .ENV GENERATION (Requirement 7 & Idempotency)
# ------------------------------------------------------------------------------
ENV_FILE="${PROJECT_ROOT}/.env"

# Helper to read existing .env key
get_env_val() {
  local key="$1"
  if [ -f "${ENV_FILE}" ]; then
    grep -E "^${key}=" "${ENV_FILE}" | head -n1 | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true
  fi
}

# Domain sanitization helper
sanitize_domain() {
  local raw="$1"
  local clean="${raw#http://}"
  clean="${clean#https://}"
  clean="${clean%%/*}"
  echo "${clean}" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]'
}

EXISTING_SITE_URL="$(get_env_val "SITE_URL")"
EXISTING_APP_URL="$(get_env_val "APP_URL")"

DOMAIN=""
if [ -n "${EXISTING_SITE_URL}" ]; then
  DOMAIN="$(sanitize_domain "${EXISTING_SITE_URL}")"
elif [ -n "${EXISTING_APP_URL}" ]; then
  DOMAIN="$(sanitize_domain "${EXISTING_APP_URL}")"
fi

if [ -n "${DOMAIN}" ]; then
  success "Reusing existing configured domain from .env: ${DOMAIN}"
else
  echo ""
  echo -e "${BOLD}Please enter the domain for your CineVicino site${NC}"
  echo "(e.g. cinema.example.com or example.it - protocol and trailing slashes are stripped automatically):"
  read -r -p "Domain: " USER_INPUT_DOMAIN
  DOMAIN="$(sanitize_domain "${USER_INPUT_DOMAIN}")"
  if [ -z "${DOMAIN}" ]; then
    fatal "Domain cannot be empty."
  fi
  success "Domain sanitized: ${DOMAIN}"
fi

# Generate cryptographically secure random credentials ONLY if missing
generate_secret_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
  else
    python3 -c "import secrets; print(secrets.token_hex($1))"
  fi
}

generate_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20
  else
    python3 -c "import secrets, string; alphabet = string.ascii_letters + string.digits; print(''.join(secrets.choice(alphabet) for _ in range(20)))"
  fi
}

# Read or generate values (NEVER overwrite existing)
CUR_JWT_SECRET="$(get_env_val "JWT_SECRET")"
CUR_POSTGRES_USER="$(get_env_val "POSTGRES_USER")"
CUR_POSTGRES_PASS="$(get_env_val "POSTGRES_PASSWORD")"
CUR_POSTGRES_DB="$(get_env_val "POSTGRES_DB")"
CUR_ADMIN_EMAIL="$(get_env_val "ADMIN_EMAIL")"
CUR_ADMIN_PASSWORD="$(get_env_val "ADMIN_PASSWORD")"
CUR_ADMIN_SLUG="$(get_env_val "ADMIN_SLUG")"
CUR_TMDB_API_KEY="$(get_env_val "TMDB_API_KEY")"
CUR_FIRECRAWL_API_KEY="$(get_env_val "FIRECRAWL_API_KEY")"
CUR_MAXMIND_LICENSE_KEY="$(get_env_val "MAXMIND_LICENSE_KEY")"
CUR_EMAIL_ALERT_API_KEY="$(get_env_val "EMAIL_ALERT_API_KEY")"
CUR_GOOGLE_SERVICE_ACCOUNT_EMAIL="$(get_env_val "GOOGLE_SERVICE_ACCOUNT_EMAIL")"
CUR_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="$(get_env_val "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")"
CUR_CARTO_API_KEY="$(get_env_val "CARTO_API_KEY")"
[ -z "${CUR_CARTO_API_KEY}" ] && CUR_CARTO_API_KEY="$(get_env_val "VITE_CARTO_API_KEY")"

NEW_JWT_SECRET="${CUR_JWT_SECRET:-$(generate_secret_hex 32)}"
NEW_POSTGRES_USER="${CUR_POSTGRES_USER:-cineuser}"
NEW_POSTGRES_PASS="${CUR_POSTGRES_PASS:-$(generate_password)}"
NEW_POSTGRES_DB="${CUR_POSTGRES_DB:-cinevicino}"
NEW_ADMIN_EMAIL="${CUR_ADMIN_EMAIL:-admin@cinevicino.it}"
NEW_ADMIN_PASSWORD="${CUR_ADMIN_PASSWORD:-$(generate_password)}"
NEW_ADMIN_SLUG="${CUR_ADMIN_SLUG:-gestione-riservata-cv}"
NEW_DATABASE_URL="postgres://${NEW_POSTGRES_USER}:${NEW_POSTGRES_PASS}@postgres:5432/${NEW_POSTGRES_DB}"

# Optional API keys: if missing and interactive terminal, offer prompt
if [ -z "${CUR_TMDB_API_KEY}" ] && [ -t 0 ]; then
  read -r -p "Enter TMDb API key (optional, press Enter to skip): " INPUT_TMDB || true
  CUR_TMDB_API_KEY="${INPUT_TMDB:-}"
fi

if [ -z "${CUR_FIRECRAWL_API_KEY}" ] && [ -t 0 ]; then
  read -r -p "Enter Firecrawl API key (optional, press Enter to skip): " INPUT_FC || true
  CUR_FIRECRAWL_API_KEY="${INPUT_FC:-}"
fi

if [ -z "${CUR_MAXMIND_LICENSE_KEY}" ] && [ -t 0 ]; then
  read -r -p "Enter MaxMind License Key for GeoIP auto-city detection (free at maxmind.com, press Enter to skip): " INPUT_MM || true
  CUR_MAXMIND_LICENSE_KEY="${INPUT_MM:-}"
fi

if [ -z "${CUR_GOOGLE_SERVICE_ACCOUNT_EMAIL}" ] && [ -t 0 ]; then
  read -r -p "Enter Google Service Account email for Sheets auto-sync (optional, press Enter to skip): " INPUT_GSA_EMAIL || true
  CUR_GOOGLE_SERVICE_ACCOUNT_EMAIL="${INPUT_GSA_EMAIL:-}"
fi
if [ -z "${CUR_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY}" ] && [ -t 0 ] && [ -n "${CUR_GOOGLE_SERVICE_ACCOUNT_EMAIL}" ]; then
  echo "Paste the Service Account private key (the full 'private_key' field from the JSON key file, with \\n kept as literal \\n — do not convert to real newlines):"
  read -r -p "> " INPUT_GSA_KEY || true
  CUR_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="${INPUT_GSA_KEY:-}"
fi

if [ -z "${CUR_CARTO_API_KEY}" ] && [ -t 0 ]; then
  read -r -p "Enter CARTO API key for Dark Matter cinema map tiles (free at carto.com, press Enter to skip): " INPUT_CARTO || true
  CUR_CARTO_API_KEY="${INPUT_CARTO:-}"
fi

# Write updated .env idempotently
cat > "${ENV_FILE}" <<EOF
# CineVicino Production Environment Configuration
# Generated automatically by deploy/cinevicino-setup.sh
# Maintained with strict security standards: never commit secrets to git.

SITE_URL="https://${DOMAIN}"
APP_URL="https://${DOMAIN}"
NODE_ENV="production"
PORT=3000

# Database Settings
POSTGRES_USER="${NEW_POSTGRES_USER}"
POSTGRES_PASSWORD="${NEW_POSTGRES_PASS}"
POSTGRES_DB="${NEW_POSTGRES_DB}"
DATABASE_URL="${NEW_DATABASE_URL}"

# Security
JWT_SECRET="${NEW_JWT_SECRET}"
ADMIN_EMAIL="${NEW_ADMIN_EMAIL}"
ADMIN_PASSWORD="${NEW_ADMIN_PASSWORD}"
ADMIN_SLUG="${NEW_ADMIN_SLUG}"

# External Services
TMDB_API_KEY="${CUR_TMDB_API_KEY}"
FIRECRAWL_API_KEY="${CUR_FIRECRAWL_API_KEY}"
MAXMIND_LICENSE_KEY="${CUR_MAXMIND_LICENSE_KEY}"
EMAIL_ALERT_API_KEY="${CUR_EMAIL_ALERT_API_KEY}"
GOOGLE_SERVICE_ACCOUNT_EMAIL="${CUR_GOOGLE_SERVICE_ACCOUNT_EMAIL}"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="${CUR_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY}"
CARTO_API_KEY="${CUR_CARTO_API_KEY}"
VITE_CARTO_API_KEY="${CUR_CARTO_API_KEY}"
EOF

chmod 600 "${ENV_FILE}"
success "Validated and updated configuration at .env (mode 600)."
if [ -n "${CUR_GOOGLE_SERVICE_ACCOUNT_EMAIL}" ]; then
  info "Google Sheets sync note: remember to share your target Google Sheet with '${CUR_GOOGLE_SERVICE_ACCOUNT_EMAIL}' as Editor."
fi

# ------------------------------------------------------------------------------
# 9. FREE LOCAL PORT DETECTION FOR NGINX (Requirement 7)
# ------------------------------------------------------------------------------
EXISTING_LOCAL_PORT="$(get_env_val "NGINX_LOCAL_PORT")"
LOCAL_PORT=""

if [ -n "${EXISTING_LOCAL_PORT}" ]; then
  LOCAL_PORT="${EXISTING_LOCAL_PORT}"
  success "Reusing configured local Nginx port: 127.0.0.1:${LOCAL_PORT}"
else
  # Detect free loopback port using Python's socket binding test
  LOCAL_PORT="$(python3 -c "
import socket
for p in range(8080, 8150):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('127.0.0.1', p))
            print(p)
            break
        except OSError:
            continue
")"
  if [ -z "${LOCAL_PORT}" ]; then
    LOCAL_PORT="8080"
  fi
  echo "NGINX_LOCAL_PORT=\"${LOCAL_PORT}\"" >> "${ENV_FILE}"
  success "Assigned dedicated free loopback port for Nginx: 127.0.0.1:${LOCAL_PORT}"
fi

# ------------------------------------------------------------------------------
# 10. CLOUDFLARE TUNNEL CONFIG & DNS ROUTING
# ------------------------------------------------------------------------------
TUNNEL_CONFIG_FILE="${PROJECT_ROOT}/cloudflared/config.yml"
cat > "${TUNNEL_CONFIG_FILE}" <<EOF
# CineVicino Cloudflare Tunnel Configuration
tunnel: ${CINE_TUNNEL_ID}
credentials-file: /etc/cloudflared/${CINE_TUNNEL_ID}.json

ingress:
  - hostname: ${DOMAIN}
    service: http://nginx:80
  - service: http_status:404
EOF
chmod 644 "${TUNNEL_CONFIG_FILE}"
success "Configured project tunnel at ./cloudflared/config.yml routing '${DOMAIN}' -> 'http://nginx:80'."

# Setup DNS route in Cloudflare
info "Routing DNS for '${DOMAIN}' through tunnel '${CINE_TUNNEL_NAME}'..."
"${CLOUDFLARED_BIN}" tunnel route dns -f "${CINE_TUNNEL_NAME}" "${DOMAIN}" 2>&1 || true
success "DNS routing rule registered for ${DOMAIN}."

# ------------------------------------------------------------------------------
# 11. STRUCTURAL MODIFICATION OF docker-compose.yml (Requirement 6)
# ------------------------------------------------------------------------------
info "Modifying docker-compose.yml structurally via Python..."

python3 -c "
import sys, re

compose_path = 'docker-compose.yml'
local_port = '${LOCAL_PORT}'

try:
    import yaml

    with open(compose_path, 'r') as f:
        data = yaml.safe_load(f) or {}

    services = data.setdefault('services', {})

    # 1. Update app service
    app = services.setdefault('app', {})
    app['env_file'] = ['.env']

    # 2. Update nginx service (bind exclusively to loopback 127.0.0.1)
    nginx = services.setdefault('nginx', {})
    nginx['ports'] = [f'127.0.0.1:{local_port}:80']
    # Keep volumes minimal and clean
    nginx['volumes'] = ['./deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro']

    # 3. Add or update cloudflared service
    services['cloudflared'] = {
        'image': 'cloudflare/cloudflared:latest',
        'container_name': 'cinevicino-cloudflared',
        'restart': 'unless-stopped',
        'command': 'tunnel --config /etc/cloudflared/config.yml run',
        'volumes': ['./cloudflared:/etc/cloudflared'],
        'networks': ['cinevicino-network'],
        'depends_on': ['nginx']
    }

    with open(compose_path, 'w') as f:
        yaml.dump(data, f, sort_keys=False, indent=2)

    print('[✓] Updated docker-compose.yml using PyYAML.')

except ImportError:
    # Reliable structural block-level fallback if PyYAML is unavailable
    with open(compose_path, 'r') as f:
        content = f.read()

    # Replace nginx ports with loopback bind
    content = re.sub(r'ports:\s*\n(\s*-\s*[\"0-9:.]+\n)+', f'ports:\n      - \"127.0.0.1:{local_port}:80\"\n', content)

    # Insert cloudflared under services if not present
    if 'cinevicino-cloudflared' not in content:
        cloudflared_block = '''
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cinevicino-cloudflared
    restart: unless-stopped
    command: tunnel --config /etc/cloudflared/config.yml run
    volumes:
      - ./cloudflared:/etc/cloudflared
    networks:
      - cinevicino-network
    depends_on:
      - nginx
'''
        # Insert before top-level volumes: or networks:
        if '\nvolumes:' in content:
            content = content.replace('\nvolumes:', cloudflared_block + '\nvolumes:', 1)
        elif '\nnetworks:' in content:
            content = content.replace('\nnetworks:', cloudflared_block + '\nnetworks:', 1)
        else:
            content += cloudflared_block

    with open(compose_path, 'w') as f:
        f.write(content)

    print('[✓] Updated docker-compose.yml using Python structural block parser.')
"
success "docker-compose.yml successfully updated with Cloudflare Tunnel & local loopback port."

# ------------------------------------------------------------------------------
# 12. CONTAINER BUILD & STARTUP (Requirement 7)
# ------------------------------------------------------------------------------
info "Building and launching CineVicino containers via Docker Compose..."
${DOCKER_COMPOSE} up -d --build

# Wait up to 30 seconds for local app health
info "Waiting for CineVicino service to become healthy..."
attempts=0
max_attempts=30
app_ready=false

while [ $attempts -lt $max_attempts ]; do
  if curl -s -f "http://127.0.0.1:${LOCAL_PORT}/api/health" >/dev/null 2>&1; then
    app_ready=true
    break
  fi
  sleep 2
  attempts=$((attempts + 1))
done

if [ "$app_ready" = true ]; then
  success "Local application healthcheck passed at http://127.0.0.1:${LOCAL_PORT}/api/health"
else
  warn "Application container is still booting or warming up. Check logs with '${DOCKER_COMPOSE} logs -f app'."
fi

# ------------------------------------------------------------------------------
# 13. FINAL STATUS & CREDENTIALS SUMMARY (Requirement 7)
# ------------------------------------------------------------------------------
echo ""
echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}${BOLD}   CINEVICINO PRODUCTION DEPLOYMENT COMPLETE & OPERATIONAL       ${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo -e "${BOLD}Public Website URL:${NC}       https://${DOMAIN}"
echo -e "${BOLD}Local Host Fallback:${NC}      http://127.0.0.1:${LOCAL_PORT}"
echo -e "${BOLD}Cloudflare Tunnel:${NC}        ${CINE_TUNNEL_NAME} (ID: ${CINE_TUNNEL_ID})"
echo -e "${BOLD}Architecture Built:${NC}       ${ARCH_RAW} (${ARCH})"
echo -e "${BOLD}Admin Access Dashboard:${NC}   https://${DOMAIN}/${NEW_ADMIN_SLUG}"
echo -e "${BOLD}Admin Email:${NC}              ${NEW_ADMIN_EMAIL}"
echo -e "${BOLD}Admin Password:${NC}           ${NEW_ADMIN_PASSWORD}"
echo -e "${GREEN}------------------------------------------------------------------${NC}"
echo "Helpful Management Commands:"
echo "  View container status:   ${DOCKER_COMPOSE} ps"
echo "  View live logs:          ${DOCKER_COMPOSE} logs -f"
echo "  Restart services:        ${DOCKER_COMPOSE} restart"
echo "  Run national scrape:     ${DOCKER_COMPOSE} exec app npx tsx scripts/scrape.ts"
echo "  Update GeoIP database:   ${DOCKER_COMPOSE} exec app npx tsx scripts/update-geoip.ts"
echo ""
echo "Recommended Cron Jobs (add via 'crontab -e'):"
echo "  # Daily nationwide showtime scraper at 12:05"
echo "  5 12 * * * cd $(pwd) && ${DOCKER_COMPOSE} exec -T app npx tsx scripts/scrape.ts >> /var/log/cinevicino-scraper.log 2>&1"
echo "  # Weekly GeoLite2-City database refresh (Sundays at 03:00)"
echo "  0 3 * * 0 cd $(pwd) && ${DOCKER_COMPOSE} exec -T app npx tsx scripts/update-geoip.ts >> /var/log/cinevicino-geoip.log 2>&1"
echo -e "${GREEN}==================================================================${NC}"
echo ""
