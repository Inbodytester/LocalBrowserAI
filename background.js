/*  LocalBrowserAI — Background Service Worker
    Handles: history storage, side-panel control, native-messaging for backend start/stop.  */

let nativePort = null;

// ── Message Router ──
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handlers = {
    start_backend:    () => startBackend(),
    stop_backend:     () => stopBackend(),
    open_side_panel:  () => openSidePanel(sender.tab?.windowId),
    close_side_panel: () => closeSidePanel(),
    save_history:     () => saveHistory(msg.entry),
    get_history:      () => getHistory(),
    clear_history:    () => clearHistory(),
  };

  const fn = handlers[msg.action];
  if (fn) {
    fn().then(sendResponse);
    return true; // keep channel open for async
  }
});

// ── Native Messaging (auto-start backend) ──

function connectNative() {
  if (nativePort) return nativePort;
  try {
    nativePort = chrome.runtime.connectNative("com.localbrowserai.host");
    nativePort.onDisconnect.addListener(() => {
      console.warn("Native host disconnected:", chrome.runtime.lastError?.message);
      nativePort = null;
    });
    return nativePort;
  } catch (err) {
    console.error("connectNative failed:", err);
    return null;
  }
}

function nativeRequest(message, timeoutMs = 6000) {
  const port = connectNative();
  if (!port) return Promise.resolve({ error: "Native messaging unavailable" });

  return new Promise((resolve) => {
    let done = false;
    const handler = (response) => {
      if (done) return;
      done = true;
      port.onMessage.removeListener(handler);
      clearTimeout(timer);
      resolve(response);
    };
    port.onMessage.addListener(handler);
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        port.onMessage.removeListener(handler);
        resolve({ status: "timeout" });
      }
    }, timeoutMs);

    port.postMessage(message);
  });
}

async function startBackend() {
  return nativeRequest({ action: "start" });
}

async function stopBackend() {
  return nativeRequest({ action: "stop" });
}

// ── Side Panel ──

async function openSidePanel(windowId) {
  try {
    const wid = windowId || (await chrome.windows.getCurrent()).id;
    await chrome.sidePanel.open({ windowId: wid });
    return { status: "opened" };
  } catch (err) {
    return { error: err.message };
  }
}

async function closeSidePanel() {
  try {
    const win = await chrome.windows.getCurrent();
    await chrome.sidePanel.close({ windowId: win.id });
    return { status: "closed" };
  } catch (err) {
    return { error: err.message };
  }
}

// ── History (chrome.storage.local) ──

async function saveHistory(entry) {
  const { history = [] } = await chrome.storage.local.get("history");
  history.unshift(entry);
  if (history.length > 100) history.length = 100;
  await chrome.storage.local.set({ history });
  return { status: "saved" };
}

async function getHistory() {
  const { history = [] } = await chrome.storage.local.get("history");
  return { history };
}

async function clearHistory() {
  await chrome.storage.local.set({ history: [] });
  return { status: "cleared" };
}

// Keep side panel action click disabled — pin button in popup handles it
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
