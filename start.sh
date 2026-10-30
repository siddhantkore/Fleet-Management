#!/bin/bash

# ============================================================
#  Fleet Management System — Start Script
#  Usage:
#    ./start.sh          → build & start all services
#    ./start.sh stop     → stop all services
#    ./start.sh restart  → stop then start
#    ./start.sh logs     → tail live logs
#    ./start.sh status   → show container status
# ============================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "${GREEN}✅ $*${RESET}"; }
info() { echo -e "${CYAN}ℹ️  $*${RESET}"; }
warn() { echo -e "${YELLOW}⚠️  $*${RESET}"; }
fail() { echo -e "${RED}❌ $*${RESET}"; exit 1; }
sep()  { echo -e "${BOLD}──────────────────────────────────────────${RESET}"; }

# ── Docker Compose command (supports both v1 and v2) ─────────
if docker compose version &>/dev/null 2>&1; then
    DC="docker compose"
elif command -v docker-compose &>/dev/null; then
    DC="docker-compose"
else
    fail "Docker Compose not found. Install Docker Desktop or 'docker compose' plugin."
fi

# ── Helper: check Docker daemon is running ───────────────────
check_docker() {
    if ! docker info &>/dev/null; then
        fail "Docker daemon is not running. Start Docker and try again."
    fi
}

# ── Helper: ensure .env exists ───────────────────────────────
ensure_env() {
    if [ ! -f ".env" ]; then
        warn ".env file not found — creating one from defaults."
        cat > .env << 'EOF'
# ── Database ────────────────────────────────────────────────
DATABASE_URL=postgresql://fleet_user:fleet_password@db:5432/fleet_management

# ── Debug & Logging ─────────────────────────────────────────
DEBUG=True
LOG_LEVEL=INFO

# ── LLM Provider (groq | ollama | openai | gemini) ──────────
LLM_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

# ── Ollama (local) ───────────────────────────────────────────
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b

# ── Routing / Maps ───────────────────────────────────────────
OPENROUTES_API_KEY=
OPENROUTES_BASE_URL=https://api.openrouteservice.org
OPENROUTES_PROFILE=driving-hgv

# ── SMS Notifications (Twilio) — optional ───────────────────
# Get credentials at https://www.twilio.com/console
# Leave blank to disable (trips still work without SMS).
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
EOF
        ok ".env created. Edit it to add your API keys before going to production."
    else
        ok ".env found."
    fi
}

# ── Wait for a service to become healthy ─────────────────────
wait_healthy() {
    local container="$1"
    local label="$2"
    local retries=30
    echo -ne "${CYAN}   Waiting for ${label}...${RESET}"
    for i in $(seq 1 $retries); do
        local state
        state=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
        if [ "$state" = "healthy" ]; then
            echo -e " ${GREEN}ready${RESET}"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    echo -e " ${YELLOW}timeout (may still be starting)${RESET}"
}

# ── Wait for HTTP endpoint to respond ────────────────────────
wait_http() {
    local url="$1"
    local label="$2"
    local retries=30
    echo -ne "${CYAN}   Waiting for ${label}...${RESET}"
    for i in $(seq 1 $retries); do
        if curl -sf --max-time 2 "$url" &>/dev/null; then
            echo -e " ${GREEN}ready${RESET}"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    echo -e " ${YELLOW}timeout (check logs: ./start.sh logs)${RESET}"
}

# ── SUB-COMMANDS ─────────────────────────────────────────────

cmd_stop() {
    sep
    info "Stopping all Fleet Management services..."
    $DC down --remove-orphans
    ok "All services stopped."
}

cmd_logs() {
    info "Tailing logs (Ctrl+C to exit)..."
    $DC logs -f
}

cmd_status() {
    sep
    echo -e "${BOLD}Container Status:${RESET}"
    $DC ps
}

cmd_start() {
    sep
    echo -e "${BOLD}${CYAN}  Fleet Management System — Startup${RESET}"
    sep

    # Pre-flight checks
    check_docker
    ensure_env

    if [ ! -f "docker-compose.yml" ]; then
        fail "docker-compose.yml not found. Run this script from the project root directory."
    fi

    # ── Build & Start ─────────────────────────────────────────
    echo ""
    info "Building images and starting services (this may take a minute on first run)..."
    echo ""
    $DC up --build -d

    # ── Wait for health ───────────────────────────────────────
    echo ""
    sep
    echo -e "${BOLD}Waiting for services to become ready...${RESET}"
    wait_healthy "fleet-management-db"       "PostgreSQL database"
    wait_http    "http://localhost:8000/health" "FastAPI backend"
    wait_http    "http://localhost:5173"      "React frontend"

    # ── Done ──────────────────────────────────────────────────
    echo ""
    sep
    echo -e "${GREEN}${BOLD}  All services are up!${RESET}"
    sep
    echo ""
    echo -e "  ${BOLD}Frontend:${RESET}    ${CYAN}http://localhost:5173${RESET}"
    echo -e "  ${BOLD}Backend API:${RESET} ${CYAN}http://localhost:8000${RESET}"
    echo -e "  ${BOLD}API Docs:${RESET}    ${CYAN}http://localhost:8000/docs${RESET}"
    echo -e "  ${BOLD}Database:${RESET}    ${CYAN}localhost:5432${RESET} (fleet_user / fleet_password)"
    echo ""
    sep
    echo -e "${BOLD}Quick Guide:${RESET}"
    echo "  1. Open http://localhost:5173 in your browser"
    echo "  2. Sign up or log in to access the dashboard"
    echo "  3. Add vehicles & drivers via the management pages"
    echo "  4. Schedule trips — drivers auto-receive an SMS if Twilio is configured"
    echo "  5. Use Trip Management to pick any map location, not just plants"
    echo ""
    echo -e "${BOLD}Useful commands:${RESET}"
    echo "  ./start.sh logs     → stream all container logs"
    echo "  ./start.sh status   → show container health"
    echo "  ./start.sh stop     → shut everything down"
    echo "  ./start.sh restart  → full restart"
    echo ""
    sep

    # ── Warn about missing optional keys ─────────────────────
    source .env 2>/dev/null || true
    if [ -z "${TWILIO_ACCOUNT_SID:-}" ]; then
        warn "TWILIO_ACCOUNT_SID not set in .env — SMS notifications are disabled."
        warn "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER to enable them."
    else
        ok "Twilio configured — driver SMS notifications are active."
    fi
    if [ -z "${OPENROUTES_API_KEY:-}" ]; then
        warn "OPENROUTES_API_KEY not set — route optimization will use straight-line distances."
    else
        ok "OpenRouteService configured — full route optimization active."
    fi
    if [ -z "${GROQ_API_KEY:-}" ] && [ "${LLM_PROVIDER:-groq}" = "groq" ]; then
        warn "GROQ_API_KEY not set — AI fleet intelligence features may be limited."
    fi
    echo ""
}

# ── Entry point ───────────────────────────────────────────────
ACTION="${1:-start}"

case "$ACTION" in
    start)   cmd_start ;;
    stop)    check_docker; cmd_stop ;;
    restart) check_docker; cmd_stop; echo ""; cmd_start ;;
    logs)    check_docker; cmd_logs ;;
    status)  check_docker; cmd_status ;;
    *)
        echo "Usage: ./start.sh [start|stop|restart|logs|status]"
        echo "  start   — build & start all services (default)"
        echo "  stop    — stop all running services"
        echo "  restart — stop then start"
        echo "  logs    — stream live logs from all containers"
        echo "  status  — show container health & port info"
        exit 1
        ;;
esac
