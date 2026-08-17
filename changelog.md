# LocalBrowserAI — Changelog

## v2.0.1 — Security & Documentation (2026-08-16)

### Security
- server.py: CORS now configurable via `CORS_ORIGINS` env var (default: extension origin, not `*`)
- server.py: All config read from environment variables via `os.getenv()`
- server.py: Input validation via Pydantic — prompt length, base64 check, text length
- server.py: Errors logged server-side; sanitized messages returned to client
- background.js: History capped at ~8 MB; responses truncated at 2000 chars
- Added `.env.example` with all configuration variables
- Updated `.gitignore` to track `.env`, `.env.*`, `.env.local` patterns

### Documentation
- Added `mimo.md` — project context, constraints, style guide, known pitfalls
- Added `architecture.md` — system design, data flow, security model
- Added `changelog.md` — this file
- Added `project_status.md` — milestone tracking

## v2.0 — UI Overhaul (2026-08-16)

### Features
- Dark/light mode toggle (☾/☀) with persistent preference
- Persistent side panel via Chrome Side Panel API (📌 pin button)
- Conversation history modal (H button, stores last 100 entries)
- Dual query mode: 📷 Screenshot and 📄 Text extraction
- Text extraction via `chrome.scripting.executeScript` — extracts full page content
- Backend auto-start via native messaging host
- Health check bar with one-click "Start Server" button

### Infrastructure
- Background service worker for history, side panel, native messaging
- Shared CSS with custom properties for theming
- FastAPI backend with `/health` endpoint
- Native messaging host for auto-starting the Python server
- Install script + extension ID registration script

## v1.0 — Initial Release (2025-11-04)

- Basic screenshot → ask → response flow
- Popup UI with LM Studio integration
- Python FastAPI bridge to local LM Studio server
