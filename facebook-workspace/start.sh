#!/usr/bin/env bash
# Start Facebook Control Center
# Usage: ./start.sh

cd "$(dirname "$0")"
echo "■ Starting Facebook Control Center..."
node server/index.js &
sleep 1
xdg-open http://localhost:3099 2>/dev/null || open http://localhost:3099 2>/dev/null || echo "Open http://localhost:3099 in your browser"
echo ""
echo "  Dashboard : http://localhost:3099"
echo "  API       : http://localhost:3099/api/state"
echo "  Stop      : kill $(lsof -t -i:3099)"
