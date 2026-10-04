#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, io, json, tarfile
from pathlib import Path

REQUIRED = {"code.bin", "exheader.bin", "manifest.json"}
SCHEMA = "3ds-decomp-private-input/v1"

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def add_bytes(tf: tarfile.TarFile, name: str, data: bytes) -> None:
    info = tarfile.TarInfo(name)
    info.size = len(data)
    info.mode = 0o600
    info.mtime = 0
    tf.addfile(info, io.BytesIO(data))

def main() -> int:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="command", required=True)
    pack = sub.add_parser("pack")
    pack.add_argument("--code", required=True)
    pack.add_argument("--exheader", required=True)
    pack.add_argument("--label", required=True)
    pack.add_argument("--base-address", default="00100000")
    pack.add_argument("--output", required=True)
    unpack = sub.add_parser("unpack")
    unpack.add_argument("--input", required=True)
    unpack.add_argument("--output-dir", required=True)
    unpack.add_argument("--sanitized-manifest", required=True)
    args = p.parse_args()

    if args.command == "pack":
        code = Path(args.code).read_bytes()
        exheader = Path(args.exheader).read_bytes()
        if not code or not exheader:
            raise SystemExit("input files must be non-empty")
        manifest = {
            "schema": SCHEMA,
            "label": args.label,
            "base_address": args.base_address.lower().removeprefix("0x"),
            "files": {
                "code.bin": {"size": len(code), "sha256": sha256(code)},
                "exheader.bin": {"size": len(exheader), "sha256": sha256(exheader)},
            },
        }
        manifest_bytes = (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode()
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        with tarfile.open(out, "w:gz", format=tarfile.PAX_FORMAT) as tf:
            add_bytes(tf, "manifest.json", manifest_bytes)
            add_bytes(tf, "code.bin", code)
            add_bytes(tf, "exheader.bin", exheader)
        print(json.dumps(manifest, indent=2, sort_keys=True))
        return 0

    entries = {}
    with tarfile.open(args.input, "r:gz") as tf:
        members = tf.getmembers()
        names = [m.name for m in members]
        if set(names) != REQUIRED or len(names) != len(REQUIRED):
            raise SystemExit(f"unexpected bundle entries: {sorted(names)}")
        for member in members:
            if not member.isfile():
                raise SystemExit(f"non-file bundle entry: {member.name}")
            if member.name.startswith("/") or ".." in Path(member.name).parts:
                raise SystemExit(f"unsafe bundle entry: {member.name}")
            f = tf.extractfile(member)
            if f is None:
                raise SystemExit(f"cannot read bundle entry: {member.name}")
            entries[member.name] = f.read()

    manifest = json.loads(entries["manifest.json"].decode())
    if manifest.get("schema") != SCHEMA:
        raise SystemExit("unexpected bundle schema")

    for name in ("code.bin", "exheader.bin"):
        data = entries[name]
        expected = manifest["files"][name]
        if expected["size"] != len(data) or expected["sha256"] != sha256(data):
            raise SystemExit(f"{name} integrity mismatch")

    outdir = Path(args.output_dir)
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / "code.bin").write_bytes(entries["code.bin"])
    (outdir / "exheader.bin").write_bytes(entries["exheader.bin"])

    sanitized = {
        "schema": manifest["schema"],
        "label": manifest.get("label", "unknown"),
        "base_address": manifest.get("base_address", "00100000"),
        "files": manifest["files"],
    }
    Path(args.sanitized_manifest).write_text(
        json.dumps(sanitized, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(json.dumps(sanitized, indent=2, sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
