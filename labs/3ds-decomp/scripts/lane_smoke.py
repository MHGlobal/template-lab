#!/usr/bin/env python3
"""Deterministic smoke worker used to validate 40-way GitHub Actions fan-out."""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
import sys


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lane", type=int, required=True)
    parser.add_argument("--sha", required=True)
    args = parser.parse_args()

    if not 0 <= args.lane < 40:
        raise SystemExit("lane must be between 0 and 39")

    token = hashlib.sha256(f"{args.sha}:{args.lane}".encode()).hexdigest()[:16]
    payload = {
        "lane": args.lane,
        "status": "PASS",
        "token": token,
        "python": sys.version.split()[0],
        "platform": platform.platform(),
    }
    print(json.dumps(payload, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
