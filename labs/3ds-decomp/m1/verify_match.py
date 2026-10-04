#!/usr/bin/env python3
"""Compare exact machine-code bytes for the reconstructed synthetic function."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--original", required=True)
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--address", required=True)
    parser.add_argument("--json", required=True)
    parser.add_argument("--markdown", required=True)
    args = parser.parse_args()

    original = Path(args.original).read_bytes()
    candidate = Path(args.candidate).read_bytes()
    matched = original == candidate

    first_difference = None
    for index, pair in enumerate(zip(original, candidate)):
        if pair[0] != pair[1]:
            first_difference = index
            break
    if first_difference is None and len(original) != len(candidate):
        first_difference = min(len(original), len(candidate))

    report = {
        "function": "puzzle_score",
        "address": args.address.strip(),
        "original_size": len(original),
        "candidate_size": len(candidate),
        "original_sha256": digest(original),
        "candidate_sha256": digest(candidate),
        "match_percent": 100.0 if matched else 0.0,
        "exact_match": matched,
        "first_difference_offset": first_difference,
    }

    Path(args.json).write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    status = "PASS" if matched else "FAIL"
    lines = [
        "# M1 synthetic matching report",
        "",
        f"- Function: `puzzle_score`",
        f"- Address in stripped ELF: `{report['address']}`",
        f"- Original bytes: {len(original)}",
        f"- Candidate bytes: {len(candidate)}",
        f"- Original SHA-256: `{report['original_sha256']}`",
        f"- Candidate SHA-256: `{report['candidate_sha256']}`",
        f"- Exact byte match: **{status}**",
        f"- Match: **{report['match_percent']:.2f}%**",
    ]
    if first_difference is not None:
        lines.append(f"- First differing byte offset: `0x{first_difference:x}`")

    Path(args.markdown).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))

    return 0 if matched else 1


if __name__ == "__main__":
    raise SystemExit(main())
