#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Update the Chrome extension ID in the native messaging manifest.
# Usage:  bash update_extension_id.sh  <EXTENSION_ID>
# ─────────────────────────────────────────────────────────────
set -e

if [ -z "$1" ]; then
  echo "Usage: bash update_extension_id.sh <EXTENSION_ID>"
  echo ""
  echo "Find your ID at chrome://extensions after loading the unpacked extension."
  exit 1
fi

HOST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
MANIFEST="$HOST_DIR/com.localbrowserai.host.json"

if [ ! -f "$MANIFEST" ]; then
  echo "❌  Manifest not found. Run  bash install.sh  first."
  exit 1
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/PLACEHOLDER/$1/" "$MANIFEST"
else
  sed -i "s/PLACEHOLDER/$1/" "$MANIFEST"
fi

echo "✅  Extension ID set → $1"
echo "   Manifest: $MANIFEST"
echo "   Restart Chrome for the change to take effect."
