#!/usr/bin/env python3
"""
Native messaging host for LocalBrowserAI.
Chrome spawns this process when the extension calls chrome.runtime.connectNative().
It starts / stops the FastAPI backend as a child process.

Protocol: 4-byte little-endian length prefix + JSON on stdin/stdout.
"""

import json
import os
import struct
import subprocess
import sys

server_process = None
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))


# ── Native messaging I/O ──────────────────────────────────────────────

def read_message():
    raw = sys.stdin.buffer.read(4)
    if not raw:
        return None
    length = struct.unpack("=I", raw)[0]
    return json.loads(sys.stdin.buffer.read(length).decode("utf-8"))


def write_message(obj):
    data = json.dumps(obj).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("=I", len(data)))
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


# ── Server management ─────────────────────────────────────────────────

def start_server():
    global server_process
    if server_process and server_process.poll() is None:
        return {"status": "already_running", "pid": server_process.pid}

    server_py = os.path.join(SERVER_DIR, "server.py")
    if not os.path.exists(server_py):
        return {"status": "error", "message": f"server.py not found at {server_py}"}

    server_process = subprocess.Popen(
        [sys.executable, server_py],
        cwd=SERVER_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,       # detach from Chrome's process tree
    )
    return {"status": "started", "pid": server_process.pid}


def stop_server():
    global server_process
    if server_process and server_process.poll() is None:
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()
            server_process.wait()
        return {"status": "stopped"}
    return {"status": "not_running"}


def check_server():
    global server_process
    if server_process and server_process.poll() is None:
        return {"status": "running", "pid": server_process.pid}
    return {"status": "not_running"}


# ── Main loop ─────────────────────────────────────────────────────────

ACTIONS = {
    "start": start_server,
    "stop": stop_server,
    "status": check_server,
}

try:
    while True:
        msg = read_message()
        if msg is None:
            break
        action = msg.get("action", "")
        fn = ACTIONS.get(action)
        result = fn() if fn else {"error": f"Unknown action: {action}"}
        write_message(result)
except Exception as e:
    try:
        write_message({"error": str(e)})
    except Exception:
        pass
finally:
    # Shut down the server when Chrome disconnects
    if server_process and server_process.poll() is None:
        server_process.terminate()
