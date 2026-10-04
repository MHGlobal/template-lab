#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BANK = 0x4000

def header_checksum(rom: bytearray) -> int:
    x = 0
    for i in range(0x134, 0x14D):
        x = (x - rom[i] - 1) & 0xFF
    return x

def global_checksum(rom: bytearray) -> int:
    return sum(b for i, b in enumerate(rom) if i not in (0x14E, 0x14F)) & 0xFFFF

def make_rom(bank_count: int, cart_type: int, rom_size_code: int, title: str, patterned: bool) -> bytes:
    rom = bytearray(bank_count * BANK)
    if patterned:
        for bank in range(bank_count):
            start = bank * BANK
            seed = hashlib.sha256(f"m4-bank-{bank}".encode()).digest()
            for off in range(BANK):
                rom[start + off] = seed[off % len(seed)] ^ ((off * 17 + bank * 29) & 0xFF)

    # Minimal entry point: JP 0x0150, then an infinite JR loop.
    rom[0x100:0x104] = bytes([0xC3, 0x50, 0x01, 0x00])
    rom[0x150:0x152] = bytes([0x18, 0xFE])

    # We deliberately do not embed Nintendo's logo in the synthetic fixture.
    rom[0x104:0x134] = b"\x00" * 0x30

    title_bytes = title.encode("ascii")[:15]
    rom[0x134:0x143] = b"\x00" * 0x0F
    rom[0x134:0x134 + len(title_bytes)] = title_bytes
    rom[0x143] = 0x80  # CGB-compatible
    rom[0x144:0x146] = b"00"
    rom[0x146] = 0x00
    rom[0x147] = cart_type
    rom[0x148] = rom_size_code
    rom[0x149] = 0x03 if cart_type != 0x00 else 0x00
    rom[0x14A] = 0x01
    rom[0x14B] = 0x33
    rom[0x14C] = 0x00
    rom[0x14D] = header_checksum(rom)
    chk = global_checksum(rom)
    rom[0x14E] = (chk >> 8) & 0xFF
    rom[0x14F] = chk & 0xFF
    return bytes(rom)

def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--out-dir", required=True)
    args = p.parse_args()
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)

    small = make_rom(2, 0x00, 0x00, "M4SYNTH", False)
    big = make_rom(64, 0x1B, 0x05, "M4BANKS", True)

    (out / "synthetic-small.gbc").write_bytes(small)
    (out / "synthetic-64banks.gbc").write_bytes(big)
    meta = {
        "small": {"size": len(small), "sha256": hashlib.sha256(small).hexdigest()},
        "banked": {"size": len(big), "sha256": hashlib.sha256(big).hexdigest(), "banks": 64},
    }
    (out / "fixture.json").write_text(json.dumps(meta, indent=2, sort_keys=True) + "\n")
    print(json.dumps(meta, indent=2, sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
