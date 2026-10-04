#!/usr/bin/env python3
from __future__ import annotations
import argparse, csv, json
from pathlib import Path

def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", required=True)
    p.add_argument("--functions", required=True)
    p.add_argument("--json", required=True)
    p.add_argument("--markdown", required=True)
    args = p.parse_args()

    manifest = json.loads(Path(args.manifest).read_text())
    with Path(args.functions).open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    addresses = [int(r["Location"], 16) for r in rows]
    sizes = [int(r["Size"], 16) for r in rows]
    arm = sum(r["Mode"] == "$a" for r in rows)
    thumb = sum(r["Mode"] == "$t" for r in rows)
    summary = {
        "schema": "3ds-decomp-m3-summary/v1",
        "label": manifest.get("label", "unknown"),
        "base_address": manifest["base_address"],
        "code_bin": manifest["files"]["code.bin"],
        "exheader_bin": manifest["files"]["exheader.bin"],
        "function_count": len(rows),
        "arm_functions": arm,
        "thumb_functions": thumb,
        "lowest_function_address": f"{min(addresses):08x}" if addresses else None,
        "highest_function_address": f"{max(addresses):08x}" if addresses else None,
        "total_function_body_bytes": sum(sizes),
    }
    Path(args.json).write_text(json.dumps(summary, indent=2, sort_keys=True)+"\n")
    md = [
        "# M3 raw code.bin baseline", "",
        f"- Label: **{summary['label']}**",
        f"- Base address: `0x{summary['base_address']}`",
        f"- code.bin bytes: **{summary['code_bin']['size']}**",
        f"- code.bin SHA-256: `{summary['code_bin']['sha256']}`",
        f"- exheader.bin bytes: **{summary['exheader_bin']['size']}**",
        f"- Functions discovered: **{summary['function_count']}**",
        f"- ARM functions: **{summary['arm_functions']}**",
        f"- Thumb functions: **{summary['thumb_functions']}**",
        f"- Lowest function: `{summary['lowest_function_address']}`",
        f"- Highest function: `{summary['highest_function_address']}`",
        f"- Function body bytes mapped: **{summary['total_function_body_bytes']}**",
    ]
    Path(args.markdown).write_text("\n".join(md)+"\n")
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
