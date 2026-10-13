#!/usr/bin/env bash
# ==============================================================================
# Launch Script for Apigee LLM Token Quota & Analytics Demo Web-UI
# ==============================================================================

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR/web-ui"

PORT="${PORT:-8089}"
VENV_DIR="$DIR/web-ui/.venv"

echo "=================================================================="
echo "🌟 Launching Apigee LLM Token Quota & Governance Demo Web-UI"
echo "Org: YOUR_APIGEE_ORG • Env: default-dev"
echo "Gateway Host: YOUR_APIGEE_GATEWAY_HOST"
echo "Model: gemini-3.5-flash-lite (global)"
echo "Port: http://localhost:$PORT"
echo "=================================================================="

# Check virtual environment
if [ ! -d "$VENV_DIR" ]; then
  echo "📦 Creating virtual environment..."
  python3 -m venv "$VENV_DIR"
fi

# Ensure dependencies
"$VENV_DIR/bin/pip" install -q -r requirements.txt

# Start Server
export PORT="$PORT"
exec "$VENV_DIR/bin/python" app.py
