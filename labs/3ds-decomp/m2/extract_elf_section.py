#!/usr/bin/env python3
"""Extract one section from a 32-bit little-endian ELF without external tools."""

from __future__ import annotations

import argparse
import struct
from pathlib import Path


ELF32_SHDR = struct.Struct("<IIIIIIIIII")


def cstring(blob: bytes, start: int) -> str:
    end = blob.find(b"\0", start)
    if end < 0:
        end = len(blob)
    return blob[start:end].decode("ascii", errors="strict")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--elf", required=True)
    parser.add_argument("--section", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    data = Path(args.elf).read_bytes()
    if data[:4] != b"\x7fELF":
        raise SystemExit("not an ELF file")
    if data[4] != 1:
        raise SystemExit("expected ELFCLASS32")
    if data[5] != 1:
        raise SystemExit("expected little-endian ELF")

    e_machine = struct.unpack_from("<H", data, 18)[0]
    if e_machine != 40:
        raise SystemExit(f"expected EM_ARM (40), got {e_machine}")

    e_shoff = struct.unpack_from("<I", data, 32)[0]
    e_shentsize = struct.unpack_from("<H", data, 46)[0]
    e_shnum = struct.unpack_from("<H", data, 48)[0]
    e_shstrndx = struct.unpack_from("<H", data, 50)[0]

    if e_shentsize != ELF32_SHDR.size:
        raise SystemExit(
            f"unexpected section-header size: {e_shentsize} "
            f"(expected {ELF32_SHDR.size})"
        )
    if not 0 <= e_shstrndx < e_shnum:
        raise SystemExit("invalid section-name table index")

    headers = []
    for index in range(e_shnum):
        offset = e_shoff + index * e_shentsize
        headers.append(ELF32_SHDR.unpack_from(data, offset))

    shstr = headers[e_shstrndx]
    names = data[shstr[4] : shstr[4] + shstr[5]]

    for header in headers:
        name = cstring(names, header[0])
        if name == args.section:
            payload = data[header[4] : header[4] + header[5]]
            output = Path(args.output)
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(payload)
            print(f"{name}: {len(payload)} bytes")
            return 0

    available = [cstring(names, header[0]) for header in headers]
    raise SystemExit(
        f"section {args.section!r} not found; available={available}"
    )


if __name__ == "__main__":
    raise SystemExit(main())
