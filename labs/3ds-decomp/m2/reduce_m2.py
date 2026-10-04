#!/usr/bin/env python3
"""Require 40 successful, unique machine-code matching receipts."""

from __future__ import annotations

import json
import sys
from pathlib import Path


EXPECTED = set(range(40))


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "receipts")
    receipts = {}

    for path in sorted(root.glob("m2-lane-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        lane = int(data["lane"])

        if lane in receipts:
            raise SystemExit(f"duplicate lane {lane}")
        if not data.get("exact_match"):
            raise SystemExit(f"lane {lane} did not match")
        if float(data.get("match_percent", 0.0)) != 100.0:
            raise SystemExit(f"lane {lane} is not 100%")

        receipts[lane] = data

    actual = set(receipts)
    missing = sorted(EXPECTED - actual)
    extra = sorted(actual - EXPECTED)
    if missing or extra:
        raise SystemExit(f"lane set mismatch: missing={missing}, extra={extra}")

    hashes = [receipts[lane]["original_sha256"] for lane in sorted(EXPECTED)]
    if len(set(hashes)) != 40:
        raise SystemExit(
            f"expected 40 unique original code hashes, got {len(set(hashes))}"
        )

    compiler_set = sorted({receipts[lane]["compiler"] for lane in EXPECTED})

    sizes = [int(receipts[lane]["original_size"]) for lane in EXPECTED]
    summary = {
        "status": "PASS",
        "lanes": 40,
        "exact_matches": 40,
        "unique_original_hashes": 40,
        "min_function_bytes": min(sizes),
        "max_function_bytes": max(sizes),
        "compilers": compiler_set,
    }

    Path("M2-SUMMARY.json").write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    Path("M2-SUMMARY.md").write_text(
        "\n".join(
            [
                "# M2 40-way matching summary",
                "",
                "- Status: **PASS**",
                "- Lanes: **40/40**",
                "- Exact byte matches: **40/40**",
                "- Unique machine-code hashes: **40/40**",
                f"- Function size range: **{min(sizes)}–{max(sizes)} bytes**",
                f"- Compiler identities: **{len(compiler_set)}**",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
