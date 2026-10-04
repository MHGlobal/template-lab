#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path

BANK = 0x4000
ROM_SIZE_BYTES = {
    0x00: 32 * 1024,
    0x01: 64 * 1024,
    0x02: 128 * 1024,
    0x03: 256 * 1024,
    0x04: 512 * 1024,
    0x05: 1024 * 1024,
    0x06: 2 * 1024 * 1024,
    0x07: 4 * 1024 * 1024,
    0x08: 8 * 1024 * 1024,
    0x52: 1152 * 1024,
    0x53: 1280 * 1024,
    0x54: 1536 * 1024,
}

def calc_header_checksum(data: bytes) -> int:
    x = 0
    for i in range(0x134, 0x14D):
        x = (x - data[i] - 1) & 0xFF
    return x

def calc_global_checksum(data: bytes) -> int:
    return sum(b for i, b in enumerate(data) if i not in (0x14E, 0x14F)) & 0xFFFF

def title(data: bytes) -> str:
    raw = data[0x134:0x143]
    return raw.split(b"\x00", 1)[0].decode("ascii", errors="replace").rstrip()

def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("rom")
    p.add_argument("--output")
    args = p.parse_args()
    data = Path(args.rom).read_bytes()
    if len(data) < 0x150 or len(data) % BANK:
        raise SystemExit("ROM must be at least 0x150 bytes and aligned to 16 KiB banks")

    size_code = data[0x148]
    expected = ROM_SIZE_BYTES.get(size_code)
    report = {
        "schema": "gbc-rom-probe/v1",
        "size": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "title": title(data),
        "cgb_flag": data[0x143],
        "cartridge_type": data[0x147],
        "rom_size_code": size_code,
        "ram_size_code": data[0x149],
        "destination_code": data[0x14A],
        "version": data[0x14C],
        "bank_count": len(data) // BANK,
        "expected_size_from_header": expected,
        "size_matches_header": expected == len(data) if expected is not None else False,
        "header_checksum_stored": data[0x14D],
        "header_checksum_calculated": calc_header_checksum(data),
        "header_checksum_valid": data[0x14D] == calc_header_checksum(data),
        "global_checksum_stored": (data[0x14E] << 8) | data[0x14F],
        "global_checksum_calculated": calc_global_checksum(data),
        "global_checksum_valid": ((data[0x14E] << 8) | data[0x14F]) == calc_global_checksum(data),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        Path(args.output).write_text(encoded)
    print(encoded, end="")
    if not report["header_checksum_valid"] or not report["size_matches_header"]:
        return 2
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
