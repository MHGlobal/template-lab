#!/usr/bin/env python3
"""Generate one deterministic ARM matching shard for M2."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def constants(lane: int) -> dict[str, int]:
    return {
        "k1": (0x13579BDF ^ (lane * 0x00110203)) & 0xFFFFFFFF,
        "k2": (0x2468ACE1 + lane * 0x01010101) & 0xFFFFFFFF,
        "k3": (0xA5A50000 | (lane * 0x101 + 0x5A)) & 0xFFFFFFFF,
        "k4": (0x10203040 + lane * 0x00010011) & 0xFFFFFFFF,
        "k5": 3 + (lane % 13),
        "shift1": 1 + (lane % 5),
        "shift2": 2 + (lane % 6),
        "mask": (1 << (1 + (lane % 8))) - 1,
    }


def render_original(c: dict[str, int]) -> str:
    return f"""#include <stdint.h>

__attribute__((noinline, used))
uint32_t lab_fn(uint32_t a, uint32_t b, uint32_t c) {{
    uint32_t x = (a ^ 0x{c['k1']:08x}u) + b;
    uint32_t y = (c + 0x{c['k2']:08x}u) ^ (x >> {c['shift1']}u);

    if ((y & 0x{c['mask']:08x}u) == 0u) {{
        x = (x + y) ^ 0x{c['k3']:08x}u;
    }} else {{
        x = (x - y) + 0x{c['k4']:08x}u;
    }}

    x ^= x << {c['shift2']}u;
    return x + (y * {c['k5']}u);
}}
"""


def render_candidate(c: dict[str, int]) -> str:
    return f"""#include <stdint.h>

/* Reconstructed spelling: identifiers/comments differ, machine logic does not. */
__attribute__((noinline, used))
uint32_t lab_fn(uint32_t first, uint32_t second, uint32_t third) {{
    uint32_t accumulator = (first ^ 0x{c['k1']:08x}u) + second;
    uint32_t mixed = (third + 0x{c['k2']:08x}u) ^ (accumulator >> {c['shift1']}u);

    if ((mixed & 0x{c['mask']:08x}u) == 0u) {{
        accumulator = (accumulator + mixed) ^ 0x{c['k3']:08x}u;
    }} else {{
        accumulator = (accumulator - mixed) + 0x{c['k4']:08x}u;
    }}

    accumulator ^= accumulator << {c['shift2']}u;
    return accumulator + (mixed * {c['k5']}u);
}}
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lane", type=int, required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    if not 0 <= args.lane < 40:
        raise SystemExit("lane must be in range 0..39")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    c = constants(args.lane)
    (out / "original.c").write_text(render_original(c), encoding="utf-8")
    (out / "reconstructed.c").write_text(render_candidate(c), encoding="utf-8")
    (out / "metadata.json").write_text(
        json.dumps({"lane": args.lane, "constants": c}, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
