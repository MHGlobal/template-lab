#!/usr/bin/env python3
from __future__ import annotations
import argparse, os, urllib.parse, urllib.request
from pathlib import Path

ALLOWED_HOSTS = {
    "github.com",
    "objects.githubusercontent.com",
    "user-attachments.githubusercontent.com",
}
ALLOWED_SUFFIXES = (".githubusercontent.com",)

def allowed(url: str) -> bool:
    p = urllib.parse.urlparse(url)
    host = (p.hostname or "").lower()
    return p.scheme == "https" and (
        host in ALLOWED_HOSTS or any(host.endswith(s) for s in ALLOWED_SUFFIXES)
    )

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not allowed(newurl):
            raise RuntimeError(f"redirect to disallowed host: {newurl}")
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--output-dir", required=True)
    args = p.parse_args()
    urls = [x.strip() for x in os.environ.get("M3_ENCRYPTED_URLS", "").splitlines() if x.strip()]
    if not urls:
        raise SystemExit("no encrypted attachment URLs supplied")

    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)
    opener = urllib.request.build_opener(SafeRedirect())
    for i, url in enumerate(urls):
        if not allowed(url):
            raise SystemExit(f"disallowed input URL: {url}")
        req = urllib.request.Request(url, headers={"User-Agent": "MHGlobal-3DS-Decomp-Lab/1.0"})
        with opener.open(req, timeout=120) as resp:
            data = resp.read()
        if not data:
            raise SystemExit(f"empty part: {url}")
        path = out / f"part{i:03d}.gz"
        path.write_bytes(data)
        print(f"{path}: {len(data)} bytes")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
