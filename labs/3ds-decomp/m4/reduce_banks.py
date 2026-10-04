#!/usr/bin/env python3
from __future__ import annotations
import json, sys
from pathlib import Path

root = Path(sys.argv[1] if len(sys.argv) > 1 else "receipts")
rows = []
lanes = set()
for path in root.glob("lane-*.json"):
    data = json.loads(path.read_text())
    lane = int(data["lane"])
    if lane in lanes:
        raise SystemExit(f"duplicate lane {lane}")
    lanes.add(lane)
    rows.extend(data["banks"])
if lanes != set(range(40)):
    raise SystemExit(f"expected lanes 0..39, got {sorted(lanes)}")
banks = [int(x["bank"]) for x in rows]
if sorted(banks) != list(range(64)):
    raise SystemExit(f"expected banks 0..63 once each; got {sorted(banks)}")
hashes = [x["sha256"] for x in rows]
if len(set(hashes)) != 64:
    raise SystemExit(f"expected 64 unique synthetic bank hashes, got {len(set(hashes))}")
summary = {
    "status": "PASS",
    "lanes": 40,
    "banks": 64,
    "unique_bank_hashes": 64,
}
Path("M4-BANK-SUMMARY.json").write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
print(json.dumps(summary, indent=2, sort_keys=True))
