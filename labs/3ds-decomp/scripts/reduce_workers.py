#!/usr/bin/env python3
"""Fan-in gate: require one valid receipt from every lane 0..39."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "worker-results")
    receipts = {}
    for path in sorted(root.glob("lane-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        lane = int(data["lane"])
        if data.get("status") != "PASS":
            raise SystemExit(f"lane {lane} is not PASS")
        if lane in receipts:
            raise SystemExit(f"duplicate lane {lane}")
        receipts[lane] = data

    expected = set(range(40))
    actual = set(receipts)
    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    if missing or extra:
        raise SystemExit(f"fan-in mismatch: missing={missing}, extra={extra}")

    print("PASS: received exactly 40 worker receipts (lanes 0..39)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
