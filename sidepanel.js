/*  LocalBrowserAI — Side Panel Script  */

document.addEventListener("DOMContentLoaded", async () => {
  // Theme
  const { theme } = await chrome.storage.sync.get("theme");
  applyTheme(theme || "light");

  // Backend health
  checkBackend();

  // Listeners
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("closePanelBtn").addEventListener("click", closePanel);
  document.getElementById("historyBtn").addEventListener("click", showHistory);
  document.getElementById("modeToggle").addEventListener("click", toggleMode);
  document.getElementById("sendButton").addEventListener("click", sendMessage);
  document.getElementById("startBackendBtn").addEventListener("click", startBackend);
  document.getElementById("closeHistory").addEventListener("click", hideHistory);
  document.getElementById("clearHistoryBtn").addEventListener("click", clearHistory);
});

/* ── Mode State ── */
let mode = "screenshot"; // "screenshot" | "text"

function toggleMode() {
  mode = mode === "screenshot" ? "text" : "screenshot";
  const icon = $("modeToggle");
  const btn = $("sendButton");
  if (mode === "text") {
    icon.textContent = "📄";
    icon.title = "Text mode — extracts full page content";
    btn.textContent = "📄 Extract Text & Ask";
  } else {
    icon.textContent = "📷";
    icon.title = "Screenshot mode — captures visible page";
    btn.textContent = "📸 Take Screenshot & Ask";
  }
}

/* ── Backend Health ── */

async function checkBackend() {
  try {
    const r = await fetch("http://localhost:8000/health", {
      signal: AbortSignal.timeout(3000),
    });
    if (r.ok) { hide("backendWarning"); return true; }
  } catch { /* fall through */ }
  show("backendWarning");
  return false;
}

async function startBackend() {
  const btn = $("startBackendBtn");
  btn.textContent = "Starting…";
  btn.disabled = true;

  try {
    const res = await chrome.runtime.sendMessage({ action: "start_backend" });
    if (res?.status === "started" || res?.status === "already_running") {
      for (let i = 0; i < 12; i++) {
        await sleep(1000);
        if (await checkBackend()) { btn.textContent = "Running ✓"; btn.disabled = false; return; }
      }
      btn.textContent = "Timed out";
    } else {
      btn.textContent = res?.error || "Failed";
    }
  } catch { btn.textContent = "Error"; }
  btn.disabled = false;
}

/* ── Theme ── */

async function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  await chrome.storage.sync.set({ theme: next });
  setThemeIcon(next);
}

function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  setThemeIcon(t);
}

function setThemeIcon(t) {
  const b = $("themeToggle");
  b.textContent = t === "dark" ? "☀" : "☾";
  b.title = t === "dark" ? "Switch to light mode" : "Switch to dark mode";
}

/* ── Close Side Panel ── */

async function closePanel() {
  try {
    // chrome.sidePanel.close() requires Chrome 126+
    await chrome.sidePanel.close();
  } catch {
    // Fallback: disable then re-enable so next pin reopens
    try {
      await chrome.sidePanel.setOptions({ enabled: false });
    } catch { window.close(); }
  }
}

/* ── Send Screenshot or Text + Query ── */

async function sendMessage() {
  const prompt = $("prompt");
  const status = $("status");
  const response = $("response");
  const btn = $("sendButton");

  if (!prompt.value.trim()) { status.textContent = "Type a question first."; return; }

  btn.disabled = true;
  response.textContent = "";

  try {
    let payload = { prompt: prompt.value };

    if (mode === "screenshot") {
      status.textContent = "Taking screenshot…";
      const dataUrl = await captureScreenshot();
      if (!dataUrl) { status.textContent = "Error: could not capture tab."; btn.disabled = false; return; }
      payload.image = dataUrl.split(",")[1];
    } else {
      status.textContent = "Extracting page text…";
      payload.text = await extractPageText();
      if (!payload.text) { status.textContent = "Error: could not extract text."; btn.disabled = false; return; }
    }

    status.textContent = "Sending to LM Studio…";

    const r = await fetch("http://localhost:8000/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();

    if (data.response) {
      status.textContent = "Response received:";
      response.textContent = data.response;

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.runtime.sendMessage({
        action: "save_history",
        entry: {
          id: Date.now().toString(),
          timestamp: Date.now(),
          url: tab?.url || "",
          title: tab?.title || "",
          prompt: prompt.value,
          response: data.response,
          mode: mode,
        },
      });
    } else {
      status.textContent = "Error: empty response from server.";
    }
  } catch {
    status.textContent = "Error: could not reach backend.";
  }
  btn.disabled = false;
}

function captureScreenshot() {
  return new Promise((resolve) => {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      resolve(dataUrl || null);
    });
  });
}

async function extractPageText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return null;
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const el = document.querySelector("article") || document.querySelector("main") || document.body;
        return el.innerText.replace(/\s+/g, " ").trim();
      },
    });
    const text = results?.[0]?.result;
    if (!text) return null;
    return text.length > 4000 ? text.substring(0, 4000) + "\n\n[truncated]" : text;
  } catch { return null; }
}

/* ── History ── */

async function showHistory() {
  const list = $("historyList");
  const { history = [] } = await chrome.storage.local.get("history");

  if (!history.length) {
    list.innerHTML = '<div class="history-empty">No conversations yet.</div>';
  } else {
    list.innerHTML = history
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((e) => {
        const t = new Date(e.timestamp).toLocaleString();
        const p = e.prompt.length > 60 ? e.prompt.slice(0, 60) + "…" : e.prompt;
        // Content is escaped via esc() — safe innerHTML
        return `<div class="history-entry" data-id="${e.id}">
          <div class="history-entry-prompt">${esc(p)}</div>
          <div class="history-entry-meta">${t} — ${esc(e.title || e.url || "")}</div>
        </div>`;
      })
      .join("");

    list.querySelectorAll(".history-entry").forEach((el) =>
      el.addEventListener("click", () => {
        const e = history.find((h) => h.id === el.dataset.id);
        if (!e) return;
        $("prompt").value = e.prompt;
        $("response").textContent = e.response;
        $("status").textContent = `Loaded from history (${new Date(e.timestamp).toLocaleString()})`;
        hideHistory();
      })
    );
  }
  $("historyModal").style.display = "flex";
}

function hideHistory() { $("historyModal").style.display = "none"; }

async function clearHistory() {
  await chrome.storage.local.set({ history: [] });
  $("historyList").innerHTML = '<div class="history-empty">No conversations yet.</div>';
}

/* ── Helpers ── */

function $(id) { return document.getElementById(id); }
function show(id) { $(id).style.display = "flex"; }
function hide(id) { $(id).style.display = "none"; }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function esc(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
