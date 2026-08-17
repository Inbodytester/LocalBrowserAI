# LocalBrowserAI — Project Context (mimo.md)

## What This Is

A Chrome extension (Manifest V3) that replicates OpenAI Atlas browser capabilities:
ask AI questions about any webpage using screenshots or extracted text, with 100% local processing.

## Architecture

Three components:
1. **Chrome Extension** (popup + side panel) — UI for queries
2. **FastAPI Backend** (server.py) — bridge between extension and model server
3. **LM Studio** — local model inference server

Full architecture details → see `architecture.md`

## Constraints

- **Zero-leak policy**: No data leaves localhost unless explicitly configured for cloud APIs
- **CORS**: Default locked to extension origin. `*` only in `.env` for dev.
- **Secrets**: Never hardcoded. All config via environment variables (`.env`).
- **Python**: Always `python3`, never `python`
- **Manifest V3**: Chrome extension must use MV3 APIs only (no MV2 fallbacks)
- **Storage**: `chrome.storage.local` capped at ~8 MB (10 MB Chrome limit)
- **Input validation**: All user input validated via Pydantic on the backend

## Git Workflow

- `main` — stable releases only
- `feature/*` — all development happens on feature branches
- Commit messages: conventional format (`feat:`, `fix:`, `docs:`, `chore:`)
- Never force-push to `main`

## Style Guide

### JavaScript
- Vanilla JS only (no frameworks — this is a lightweight extension)
- `async/await` over raw promises where possible
- Helper functions: `$()` for getElementById, `esc()` for HTML escaping
- Keep popup.js and sidepanel.js in sync (shared logic duplicated intentionally for clarity)

### Python
- Type hints on all function signatures
- Pydantic models for request validation
- `os.getenv()` for all configuration
- `logging` module, never bare `print()`

### CSS
- CSS custom properties for theming (dark/light)
- Shared `styles.css` — no inline styles in HTML (except display toggles)
- Mobile-first (popup is 360px wide)

## Known Pitfalls

- `__pycache__/` causes Chrome extension load failure — always in `.gitignore`
- Chrome popups close on click-away — side panel is the persistent alternative
- `chrome.sidePanel.open()` requires user gesture — call directly in click handler, not after async
- `chrome.storage.local` has a 10 MB hard limit — truncate history entries
