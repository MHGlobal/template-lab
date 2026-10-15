#!/usr/bin/env python3
"""Bond0 Manager prototype — loopback-only, read-only. NEVER expose directly to WAN.
No tunnel secrets; no shell execution from HTTP input; not a production admin API.
"""
import argparse
import json
import os
import subprocess
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

VERSION = "0.1.0-preview"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8870
STARTED = time.monotonic()


def service_active(name="bond0-server"):
    try:
        result = subprocess.run(
            ["systemctl", "is-active", name], capture_output=True,
            text=True, timeout=2, check=False
        )
        return result.returncode == 0 and result.stdout.strip() == "active"
    except (OSError, subprocess.TimeoutExpired):
        return False


def tun_counters(interface="bonding0", filename="/proc/net/dev"):
    """Return byte and packet counters without disclosing peer IPs."""
    try:
        with open(filename, encoding="utf-8") as fp:
            lines = fp.readlines()
        for line in lines[2:]:
            if ":" not in line:
                continue
            label, values = line.split(":", 1)
            if label.strip() != interface:
                continue
            numbers = [int(x) for x in values.split()]
            if len(numbers) < 16:
                break
            return {
                "rx_bytes": numbers[0], "rx_packets": numbers[1],
                "tx_bytes": numbers[8], "tx_packets": numbers[9]
            }
    except (OSError, ValueError):
        pass
    return None


def api_payload(path):
    if path == "/api/v1/health":
        return 200, {"ok": True, "name": "bond0-manager", "version": VERSION,
                     "mode": "read-only", "uptime_seconds": int(time.monotonic() - STARTED)}
    if path == "/api/v1/server":
        return 200, {"bonding_server_active": service_active(),
                     "tunnel": "bonding0", "tunnel_stats": tun_counters(),
                     "management_mode": "loopback-read-only"}
    if path == "/api/v1/links":
        return 200, {"links": [], "available": False,
                     "reason": "per-WAN metrics require authenticated data-plane telemetry"}
    if path == "/api/v1/sessions":
        return 501, {"error": "not_implemented", "reason": "auth and scope required"}
    return 404, {"error": "not_found"}


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        status, payload = api_payload(path)
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        body = b'{"error":"mutations_not_enabled"}'
        self.send_response(405)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Allow", "GET")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # Do not log authorization, keys, paths or request bodies.
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = parser.parse_args()
    if args.host not in ("127.0.0.1", "::1"):
        parser.error("Prototype may listen on loopback only")
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
