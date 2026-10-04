#!/usr/bin/env python3
"""Deterministic worker shard used to prove 40-way GitHub Actions fan-out."""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lane", type=int, required=True)
    parser.add_argument("--sha", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    if not 0 <= args.lane < 40:
        raise SystemExit("lane must be between 0 and 39")

    payload = {
        "lane": args.lane,
        "status": "PASS",
        "token": hashlib.sha256(f"{args.sha}:{args.lane}".encode()).hexdigest()[:16],
        "python": platform.python_version(),
        "runner": platform.platform(),
    }

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(payload, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
