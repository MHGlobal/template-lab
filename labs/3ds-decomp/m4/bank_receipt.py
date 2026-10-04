#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BANK = 0x4000

def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--rom", required=True)
    p.add_argument("--lane", required=True, type=int)
    p.add_argument("--output", required=True)
    args = p.parse_args()
    if not 0 <= args.lane < 40:
        raise SystemExit("lane must be 0..39")
    data = Path(args.rom).read_bytes()
    if len(data) % BANK:
        raise SystemExit("ROM is not bank aligned")
    count = len(data) // BANK
    banks = []
    for bank in range(args.lane, count, 40):
        blob = data[bank * BANK:(bank + 1) * BANK]
        banks.append({
            "bank": bank,
            "sha256": hashlib.sha256(blob).hexdigest(),
            "nonzero_bytes": sum(b != 0 for b in blob),
        })
    receipt = {"lane": args.lane, "bank_count": count, "banks": banks}
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n")
    print(json.dumps(receipt, sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
