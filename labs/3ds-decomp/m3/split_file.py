#!/usr/bin/env python3
from __future__ import annotations
import argparse
from pathlib import Path

def main() -> int:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="command", required=True)
    s = sub.add_parser("split")
    s.add_argument("--input", required=True)
    s.add_argument("--output-prefix", required=True)
    s.add_argument("--part-size-mib", type=int, default=20)
    j = sub.add_parser("join")
    j.add_argument("--output", required=True)
    j.add_argument("parts", nargs="+")
    args = p.parse_args()

    if args.command == "split":
        data = Path(args.input).read_bytes()
        part_size = args.part_size_mib * 1024 * 1024
        if not 1 <= args.part_size_mib <= 24:
            raise SystemExit("part size must be 1..24 MiB")
        prefix = Path(args.output_prefix)
        prefix.parent.mkdir(parents=True, exist_ok=True)
        for i, off in enumerate(range(0, len(data), part_size)):
            path = Path(f"{prefix}.part{i:03d}.gz")
            path.write_bytes(data[off:off+part_size])
            print(path)
        return 0

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("wb") as dst:
        for part in args.parts:
            dst.write(Path(part).read_bytes())
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
