#!/usr/bin/env python3
"""Produce a machine-code matching receipt for one M2 lane."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lane", type=int, required=True)
    parser.add_argument("--original", required=True)
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--metadata", required=True)
    parser.add_argument("--compiler", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    original = Path(args.original).read_bytes()
    candidate = Path(args.candidate).read_bytes()
    metadata = json.loads(Path(args.metadata).read_text(encoding="utf-8"))

    if metadata["lane"] != args.lane:
        raise SystemExit("lane/metadata mismatch")

    receipt = {
        "lane": args.lane,
        "function": "lab_fn",
        "exact_match": original == candidate,
        "match_percent": 100.0 if original == candidate else 0.0,
        "original_size": len(original),
        "candidate_size": len(candidate),
        "original_sha256": sha256(original),
        "candidate_sha256": sha256(candidate),
        "compiler": args.compiler,
        "constants": metadata["constants"],
    }

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    print(json.dumps(receipt, sort_keys=True))
    return 0 if receipt["exact_match"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
