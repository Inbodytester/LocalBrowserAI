#!/bin/bash
# ─────────────────────────────────────────────────────────────
# LocalBrowserAI — One-time native messaging host installer
# Run:  bash install.sh
# ─────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
MANIFEST="$HOST_DIR/com.localbrowserai.host.json"

echo "🔧  Installing LocalBrowserAI native messaging host…"
mkdir -p "$HOST_DIR"

cat > "$MANIFEST" <<EOF
{
  "name": "com.localbrowserai.host",
  "description": "LocalBrowserAI Backend Server Manager",
  "path": "$SCRIPT_DIR/native_host.py",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://PLACEHOLDER/"]
}
EOF

chmod +x "$SCRIPT_DIR/native_host.py"

echo ""
echo "✅  Installed → $MANIFEST"
echo ""
echo "NEXT STEP — register your extension ID:"
echo "  1. Load the extension at chrome://extensions  (Developer mode → Load unpacked)"
echo "  2. Copy the Extension ID"
echo "  3. Run:  bash update_extension_id.sh  <PASTE_ID_HERE>"
echo ""
