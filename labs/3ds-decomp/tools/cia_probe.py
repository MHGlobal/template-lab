#!/usr/bin/env python3
"""Read-only CIA/TMD/NCCH structural probe.

This intentionally does not decrypt or extract NCCH payloads. It emits only
metadata safe for a public reverse-engineering lab.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
from pathlib import Path

SIG_SIZES = {
    0x00010000: 0x240,
    0x00010001: 0x140,
    0x00010002: 0x080,
    0x00010003: 0x240,
    0x00010004: 0x140,
    0x00010005: 0x080,
}


def align64(value: int) -> int:
    return (value + 0x3F) & ~0x3F


def read_u16be(buf: bytes, off: int) -> int:
    return struct.unpack_from(">H", buf, off)[0]


def read_u32le(buf: bytes, off: int) -> int:
    return struct.unpack_from("<I", buf, off)[0]


def read_u32be(buf: bytes, off: int) -> int:
    return struct.unpack_from(">I", buf, off)[0]


def read_u64le(buf: bytes, off: int) -> int:
    return struct.unpack_from("<Q", buf, off)[0]


def read_u64be(buf: bytes, off: int) -> int:
    return struct.unpack_from(">Q", buf, off)[0]


def parse(path: Path) -> dict:
    data = path.read_bytes()
    if len(data) < 0x2020:
        raise SystemExit("file is too small to be a normal CIA")

    (
        header_size,
        cia_type,
        version,
        cert_size,
        ticket_size,
        tmd_size,
        meta_size,
        content_size,
    ) = struct.unpack_from("<IHHIIIIQ", data, 0)

    if header_size < 0x20 or header_size > len(data):
        raise SystemExit("invalid CIA header size")

    cert_off = align64(header_size)
    ticket_off = align64(cert_off + cert_size)
    tmd_off = align64(ticket_off + ticket_size)
    content_off = align64(tmd_off + tmd_size)
    end_content = content_off + content_size
    if end_content > len(data):
        raise SystemExit("CIA content range exceeds file size")

    tmd = data[tmd_off:tmd_off + tmd_size]
    if len(tmd) < 4:
        raise SystemExit("TMD too small")

    sig_type = read_u32be(tmd, 0)
    sig_size = SIG_SIZES.get(sig_type)
    if sig_size is None:
        raise SystemExit(f"unsupported TMD signature type: 0x{sig_type:08x}")

    body = sig_size
    if len(tmd) < body + 0x9C4:
        raise SystemExit("TMD header/content-info area is truncated")

    title_id = read_u64be(tmd, body + 0x4C)
    title_version = read_u16be(tmd, body + 0x9C)
    content_count = read_u16be(tmd, body + 0x9E)
    boot_content = read_u16be(tmd, body + 0xA0)

    chunk_base = body + 0x9C4
    if chunk_base + content_count * 0x30 > len(tmd):
        raise SystemExit("TMD content records are truncated")

    contents = []
    cursor = content_off

    for i in range(content_count):
        record = chunk_base + i * 0x30
        content_id = read_u32be(tmd, record)
        index = read_u16be(tmd, record + 4)
        content_type = read_u16be(tmd, record + 6)
        size = read_u64be(tmd, record + 8)

        if cursor + size > len(data):
            raise SystemExit(f"content index {index} exceeds CIA bounds")

        ncch_magic = None
        ncch = None

        if size >= 0x200 and data[cursor + 0x100:cursor + 0x104] == b"NCCH":
            flags = data[cursor + 0x188:cursor + 0x190]
            product_code = (
                data[cursor + 0x150:cursor + 0x160]
                .split(b"\0", 1)[0]
                .decode("ascii", errors="replace")
            )
            ncch_magic = "NCCH"
            ncch = {
                "program_id": f"{read_u64le(data, cursor + 0x118):016x}",
                "product_code": product_code,
                "flags": flags.hex(),
                "no_crypto": bool(flags[7] & 0x04),
                "fixed_crypto_key": bool(flags[7] & 0x01),
                "exheader_size": read_u32le(data, cursor + 0x180),
                "exefs_offset": read_u32le(data, cursor + 0x1A0) * 0x200,
                "exefs_size": read_u32le(data, cursor + 0x1A4) * 0x200,
                "romfs_offset": read_u32le(data, cursor + 0x1B0) * 0x200,
                "romfs_size": read_u32le(data, cursor + 0x1B4) * 0x200,
            }

        contents.append(
            {
                "content_id": f"{content_id:08x}",
                "index": index,
                "tmd_type": content_type,
                "outer_encrypted": bool(content_type & 0x0001),
                "size": size,
                "cia_offset": cursor,
                "ncch_magic": ncch_magic,
                "ncch": ncch,
            }
        )

        cursor = align64(cursor + size)

    return {
        "schema": "3ds-cia-structural-probe/v1",
        "file_size": len(data),
        "sha256": hashlib.sha256(data).hexdigest(),
        "cia": {
            "header_size": header_size,
            "type": cia_type,
            "version": version,
            "cert_size": cert_size,
            "ticket_size": ticket_size,
            "tmd_size": tmd_size,
            "meta_size": meta_size,
            "content_size": content_size,
        },
        "title": {
            "title_id": f"{title_id:016x}",
            "title_version": title_version,
            "content_count": content_count,
            "boot_content_index": boot_content,
        },
        "contents": contents,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("cia")
    ap.add_argument("--output")
    args = ap.parse_args()

    result = parse(Path(args.cia))
    encoded = json.dumps(result, indent=2, sort_keys=True) + "\n"
    if args.output:
        Path(args.output).write_text(encoded, encoding="utf-8")
    else:
        print(encoded, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
