# LocalBrowserAI

> **Private, in-browser AI — powered by your own machine.**

A Chrome extension that replicates the core capabilities of OpenAI's Atlas browser: ask AI questions about any webpage using screenshots or extracted text, with 100% local processing. No data leaves your network.

---

## Why This Exists

OpenAI launched ChatGPT Atlas in October 2025 — a standalone AI browser with Agent Mode, Browser Memories, and in-browser AI interaction. It was pulled on August 9, 2026, after less than a year, folded into ChatGPT Work.

That left a gap: **millions of users who got used to asking AI about what's on their screen, with nowhere to go.**

LocalBrowserAI fills that gap — and adds something Atlas never had: **privacy**. Your screenshots, your questions, your data — it all stays on your machine.

---

## Features

### v2.0 (Current)

| Feature | Description |
|---------|-------------|
| **Dual Query Mode** | Toggle between 📷 Screenshot (captures visible page) and 📄 Text (extracts full page content) |
| **Dark / Light Mode** | ☾ / ☀ toggle — preference persists across sessions |
| **Persistent Side Panel** | 📌 pin button opens a Chrome side panel that stays open across page navigations |
| **Conversation History** | Press **H** to browse past queries — click to reload any entry. Stores last 100 conversations |
| **Backend Auto-Start** | Native messaging host starts the Python server automatically on first click |
| **Health Check** | Yellow warning bar if backend isn't running — one-click "Start Server" button |
| **Privacy First** | Screenshots and text never leave localhost. All processing happens on your machine |

### v1.0 (Original)

- Basic screenshot → ask → response flow
- Popup UI with LM Studio integration
- Python FastAPI bridge to local LM Studio server

---

## Screenshots vs Text Mode

| Mode | What It Does | Best For | Model Requirement |
|------|-------------|----------|-------------------|
| 📷 **Screenshot** | Captures the visible viewport as a PNG | Charts, images, visual layouts, infographics | Vision-Language model (Qwen-VL, LLaVA, MiniCPM-V) |
| 📄 **Text** | Extracts full page text (article → main → body) | Articles, docs, code, long-form content | Any text model (Qwen, Llama, Mistral, Phi) |

Click the mode icon (📷 or 📄) to the left of the send button to toggle.

Text mode extracts clean content by prioritizing `<article>` and `<main>` tags, falling back to `<body>`. Content is truncated at 4,000 characters for LLM context.

---

## Requirements

### System

- **macOS, Windows, or Linux** — any platform that runs Chrome + LM Studio
- **Google Chrome** (or any Chromium browser: Brave, Edge, Opera)
- **Python 3.8+**
- **LM Studio** with a loaded model

### Python Dependencies

```bash
pip3 install "fastapi[all]" uvicorn openai
```

### LM Studio Setup

1. Open LM Studio → **Search** tab → download a model:
   - **Vision models** (for screenshot mode): Qwen2.5-VL 30B, LLaVA 1.6 7B, Qwen2.5-VL 7B, MiniCPM-V
   - **Text models** (for text mode only): Qwen2.5, Llama 3, Mistral, Phi-3
2. Go to **Server** tab → select the model → click **Start Server**
3. Leave LM Studio running in the background (default port: `1234`)

### Hardware Considerations

| Model Size | VRAM/RAM | Speed | Quality |
|-----------|----------|-------|---------|
| 7B | 6-8 GB | Fast | Good for summaries, basic QA |
| 14B | 10-14 GB | Medium | Better reasoning, more detail |
| 30B+ | 20-24 GB | Slower | Best analysis, complex visual understanding |

Text mode uses significantly fewer resources than screenshot mode since no vision processing is required.

---

## Installation

### 1 — Backend

```bash
cd /Users/gabe/LocalBrowserAI
pip3 install "fastapi[all]" uvicorn openai
python3 server.py
```

Leave that terminal running. The server listens on `http://localhost:8000`.

### 2 — Chrome Extension

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `LocalBrowserAI` folder
4. Pin the extension to your toolbar (puzzle icon → 📌)

### 3 — Auto-Start Backend (Optional, One-Time)

```bash
cd /Users/gabe/LocalBrowserAI
bash install.sh
```

Then:
1. Copy the Extension ID from `chrome://extensions`
2. Run: `bash update_extension_id.sh <YOUR_EXTENSION_ID>`
3. Restart Chrome

After this, the backend starts automatically when you click the extension.

---

## Usage

1. Navigate to any webpage
2. Click the extension icon → popup opens
3. Choose your mode:
   - 📷 **Screenshot** — captures the visible page (charts, images, layouts)
   - 📄 **Text** — extracts the full page content (articles, docs, code)
4. Type a question (e.g., "Summarize this page", "What is this chart showing?")
5. Click the send button
6. Read the AI's response

### Persistent Side Panel

Click 📌 to open the side panel. It stays open as you navigate between pages — no re-opening needed. Close it with ✕ in the panel header.

### History

Click **H** to see past conversations. Click any entry to reload its prompt and response. Use **Clear** to wipe all history.

---

## Architecture

```
┌──────────────────────┐      HTTP POST        ┌──────────────┐     OpenAI API      ┌───────────┐
│  Chrome Extension     │  localhost:8000/ask    │  FastAPI      │  localhost:1234/v1  │  LM Studio │
│  popup / side panel   │ ────────────────────→ │  server.py    │ ──────────────────→ │  Vision /  │
│                       │ ←──────────────────── │  (bridge)     │ ←────────────────── │  Text      │
└──────────────────────┘      JSON response     └──────────────┘                    └───────────┘
```

### Files

```
LocalBrowserAI/
├── manifest.json              # Chrome extension manifest (MV3)
├── background.js              # Service worker — history, side panel, native messaging
├── popup.html / popup.js      # Default popup UI
├── sidepanel.html / .js       # Persistent side panel UI
├── styles.css                 # Shared dark/light theme styles
├── server.py                  # FastAPI backend → LM Studio
├── native_host.py             # Native messaging host (auto-start server)
├── install.sh                 # One-time native host installer
├── update_extension_id.sh     # Register your extension ID
├── icon.png                   # Extension icon
├── LICENSE                    # MIT License
└── README.md                  # This file
```

---

## API Endpoint

The backend exposes a single endpoint:

### `POST /ask`

**Request:**
```json
{
  "prompt": "Summarize this page",
  "image": "<base64-encoded-png>",
  "text": "<extracted page text>"
}
```

- `prompt` (required): The user's question
- `image` (optional): Base64-encoded PNG — for screenshot mode
- `text` (optional): Extracted page text — for text mode
- At least one of `image` or `text` should be provided

**Response:**
```json
{
  "response": "The page discusses..."
}
```

### `GET /health`

Returns `{"status": "ok"}` when the server is running.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Backend not running" warning | Start LM Studio server + run `python3 server.py`, or install the native host for auto-start |
| "Could not capture tab" | Make sure Chrome has focus and the tab isn't a chrome:// page |
| "Could not extract text" | The page may not have extractable content (e.g., a blank page or app page) |
| Auto-start not working | Run `bash install.sh` and `bash update_extension_id.sh <ID>`, then restart Chrome |
| Side panel won't open | Requires Chrome 114+ with Manifest V3 support |
| Model gives poor responses | Try a larger model (7B → 14B → 30B) or ensure the model is designed for vision tasks |

---

## Future Plans

### Short Term (Next Release)

- **API Support for Cloud Models** — Send queries to OpenAI (GPT-4o), Anthropic (Claude), and Google (Gemini) APIs alongside local models
- **Model Selector** — Choose between local and cloud models from the extension UI
- **Conversation Context** — Multi-turn conversations where the AI remembers previous questions in the same session
- **Page Text Caching** — Cache extracted text so repeated queries on the same page are instant

### Medium Term

- **Full Page Screenshot** — Capture the entire scrollable page, not just the visible viewport
- **Custom System Prompts** — Define how the AI should behave (e.g., "Respond as a technical reviewer", "Summarize in bullet points")
- **Export Conversations** — Save conversations as Markdown, JSON, or PDF
- **Keyboard Shortcuts** — Quick-access hotkeys for send, mode toggle, side panel

### Long Term

- **Multi-Tab Context** — Ask questions across multiple open tabs
- **Browser Automation** — AI-driven actions (click buttons, fill forms, navigate) similar to Atlas Agent Mode
- **Offline OCR** — Extract text from images on the page without sending to a model
- **Firefox / Safari Support** — Port the extension to other browsers
- **Self-Hosted Model Support** — Direct integration with Ollama, vLLM, and other inference servers beyond LM Studio

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Support

If you find this tool useful, consider buying me a coffee:
👉 https://buymeacoffee.com/gabethevet

---

## Acknowledgments

Built by [Gabriel Olinger](https://github.com/Inbodytester) — from medic to maker.
Inspired by the gap left when OpenAI pulled Atlas.
