"""Own-device Laya companion for the private profile panel.

    HF_HUB_CACHE=.wyj-local/hf .wyj-local/venv/bin/python scripts/local-classifier/server.py

Binds 127.0.0.1:11435 only. The founder's browser calls it directly; the shared Next
server never sees the profile text. Only requests from WYJ_ORIGINS (comma-separated,
default http://localhost:3000,http://localhost:3002) are answered. Nothing is logged:
no request lines, no bodies, no labels.

POST /classify {"text": "..."} returns suggested offered skills and interests only,
always with status "needs_review". While Laya is loading, or if it failed to load, the
answer is 503 with status "unavailable". There is no other model and no cloud fallback.
"""
import json
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from questions import build_brief_questions, read_answers

os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

HOST, PORT = "127.0.0.1", 11435
MODEL, THRESHOLD = "english", 0.7
MAX_BODY = 20_000
ORIGINS = {o.strip().rstrip("/") for o in os.environ.get("WYJ_ORIGINS", "http://localhost:3000,http://localhost:3002").split(",") if o.strip()}
HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}

state = {"router": None, "status": "loading"}
predict_lock = threading.Lock()


def load():
    try:
        from laya import Router

        router = Router()
        router.predict("Backend engineer.", build_brief_questions(), model=MODEL)  # loads the checkpoint
        state["router"], state["status"] = router, "ready"
    except Exception:  # noqa: BLE001 - any failure means unavailable; the reason is not logged
        state["status"] = "unavailable"
    print(f"classifier {state['status']}", file=sys.stderr, flush=True)


def unavailable(message):
    return {"status": "unavailable", "engine": "laya-local", "suggested": {"offers": [], "seeks": [], "interests": [], "availability": None}, "message": message}


def classify(text):
    with predict_lock:
        raw = state["router"].predict(text, build_brief_questions(), model=MODEL)
    got = read_answers(raw, THRESHOLD)
    return {
        "status": "needs_review",
        "engine": "laya-local",
        "suggested": {"offers": got["offers"], "seeks": [], "interests": got["interests"], "availability": None},
        "message": "Suggested offered skills and interests. Check each one.",
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "wyj-classifier"
    sys_version = ""

    def log_message(self, *args):  # never log requests
        pass

    def _origin(self):
        origin = (self.headers.get("Origin") or "").rstrip("/")
        return origin if origin in ORIGINS else None

    def _send(self, code, body=None, origin=None):
        data = json.dumps(body).encode() if body is not None else b""
        self.send_response(code)
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Cache-Control", "no-store")
        if body is not None:
            self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _guard(self):
        # Host check stops DNS-rebinding pages; Origin check stops any other site.
        if self.headers.get("Host") not in HOSTS:
            self._send(421)
            return None
        origin = self._origin()
        if not origin:
            self._send(403, {"error": "origin not allowed"})
            return None
        return origin

    def do_OPTIONS(self):
        origin = self._guard()
        if not origin:
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Methods", "POST, GET")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Vary", "Origin")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        origin = self._guard()
        if not origin:
            return
        if self.path != "/health":
            return self._send(404, {"error": "not found"}, origin)
        self._send(200, {"status": state["status"], "engine": "laya-local"}, origin)

    def do_POST(self):
        origin = self._guard()
        if not origin:
            return
        if self.path != "/classify":
            return self._send(404, {"error": "not found"}, origin)
        if state["status"] != "ready":
            msg = "The classifier is still loading." if state["status"] == "loading" else "Laya is not available on this device."
            return self._send(503, unavailable(msg), origin)
        try:
            length = int(self.headers.get("Content-Length") or 0)
            if not 0 < length <= MAX_BODY or not (self.headers.get("Content-Type") or "").startswith("application/json"):
                raise ValueError
            text = json.loads(self.rfile.read(length))["text"]
            if not isinstance(text, str) or not text.strip():
                raise ValueError
        except Exception:  # noqa: BLE001 - bad input; never echo it back
            return self._send(400, {"error": "expected JSON {\"text\": string}"}, origin)
        try:
            self._send(200, classify(text), origin)
        except Exception:  # noqa: BLE001
            self._send(503, unavailable("The classifier failed on this input."), origin)


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    threading.Thread(target=load, daemon=True).start()
    print(f"listening on http://{HOST}:{PORT} for {sorted(ORIGINS)}", file=sys.stderr, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
