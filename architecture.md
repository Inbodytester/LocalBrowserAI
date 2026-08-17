# LocalBrowserAI — Architecture

## System Overview

```
┌──────────────────────────┐         ┌──────────────────┐         ┌──────────────┐
│     Chrome Extension      │  HTTP   │   FastAPI Server  │  OpenAI │   LM Studio  │
│                           │  POST   │                  │   API   │              │
│  ┌─────────┐ ┌─────────┐ │ ──────→ │   server.py      │ ──────→ │  Local Model │
│  │ popup   │ │ side    │ │         │                  │         │  (VL / Text) │
│  │ .html   │ │ panel   │ │ ←────── │   /ask endpoint  │ ←────── │              │
│  │ .js     │ │ .html   │ │  JSON   │                  │  resp   │              │
│  └─────────┘ │ .js     │ │         └──────────────────┘         └──────────────┘
│              └─────────┘ │
│  ┌─────────────────────┐ │
│  │ background.js        │ │  ← Service worker: history, side panel, native messaging
│  │ styles.css           │ │  ← Shared dark/light theme
│  └─────────────────────┘ │
└──────────────────────────┘
```

## Component Details

### Chrome Extension (Client)

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest — permissions, service worker, side panel config |
| `popup.html/js` | Default UI — opens on extension icon click |
| `sidepanel.html/js` | Persistent UI — stays open across page navigations |
| `background.js` | Service worker — message router, history storage, native messaging |
| `styles.css` | Shared CSS with custom properties for dark/light theming |

**Permissions**: activeTab, storage, sidePanel, nativeMessaging, scripting

**Data Flow**:
1. User types question → selects mode (screenshot / text)
2. Screenshot mode: `chrome.tabs.captureVisibleTab()` → base64 PNG
3. Text mode: `chrome.scripting.executeScript()` → page innerText
4. POST to `localhost:8000/ask` with prompt + image/text
5. Response rendered in popup/sidepanel
6. Conversation saved to `chrome.storage.local`

### FastAPI Backend (Bridge)

| File | Role |
|------|------|
| `server.py` | HTTP server — validates input, forwards to LM Studio, returns response |
| `.env.example` | Configuration template |

**Endpoints**:
- `GET /health` — returns `{"status": "ok"}` (used by extension health check)
- `POST /ask` — accepts `{prompt, image?, text?}`, forwards to LM Studio

**Input Validation** (Pydantic):
- `prompt`: required, 1–2000 chars
- `image`: optional, validated as base64, max ~10 MB
- `text`: optional, max 4000 chars

### Native Messaging Host (Auto-Start)

| File | Role |
|------|------|
| `native_host.py` | Spawns server.py as child process when extension requests it |
| `install.sh` | One-time installer for the native host manifest |
| `update_extension_id.sh` | Registers extension ID in the native host manifest |

**Protocol**: Chrome ↔ native_host communicate via 4-byte length-prefixed JSON on stdin/stdout.

**Lifecycle**: Chrome spawns native_host on `connectNative()` → native_host starts server.py → Chrome disconnects → native_host terminates server.py.

### LM Studio (Model Server)

Not part of this codebase. External dependency.

- Default endpoint: `http://localhost:1234/v1`
- OpenAI-compatible chat completions API
- Must have a model loaded and server started

## Configuration Flow

```
.env  →  server.py reads os.getenv()  →  configures CORS, LM Studio connection, limits
```

All configuration is environment-variable driven. No hardcoded values in source.

## Security Model

| Layer | Control |
|-------|---------|
| Network | Server binds to 127.0.0.1 only — not accessible from LAN |
| CORS | Locked to extension origin by default (configurable via `.env`) |
| Input | Pydantic validation on all fields — length limits, type checks |
| Errors | Full errors logged server-side; sanitized messages returned to client |
| Secrets | `.env` gitignored; `.env.example` ships with blank values |
| Storage | History capped at 100 entries / ~8 MB; responses truncated at 2000 chars |
