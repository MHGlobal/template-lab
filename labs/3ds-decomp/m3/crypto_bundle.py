#!/usr/bin/env python3
from __future__ import annotations
import argparse, base64, os
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

MAGIC = b"3DSM3ENC"
AAD = b"MHGlobal/template-lab:3ds-decomp:m3:v1"
NONCE_SIZE = 12

def decode_key(value: str) -> bytes:
    try:
        key = base64.b64decode(value, validate=True)
    except Exception as exc:
        raise SystemExit(f"invalid base64 key: {exc}") from exc
    if len(key) != 32:
        raise SystemExit(f"key must decode to 32 bytes, got {len(key)}")
    return key

def key_from_args(value: str | None) -> bytes:
    raw = value or os.environ.get("PUSHMO_INPUT_KEY_B64")
    if not raw:
        raise SystemExit("missing key: use --key-b64 or PUSHMO_INPUT_KEY_B64")
    return decode_key(raw.strip())

def main() -> int:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="command", required=True)
    sub.add_parser("generate-key")
    enc = sub.add_parser("encrypt")
    enc.add_argument("--input", required=True)
    enc.add_argument("--output", required=True)
    enc.add_argument("--key-b64")
    dec = sub.add_parser("decrypt")
    dec.add_argument("--input", required=True)
    dec.add_argument("--output", required=True)
    dec.add_argument("--key-b64")
    args = p.parse_args()

    if args.command == "generate-key":
        print(base64.b64encode(os.urandom(32)).decode("ascii"))
        return 0

    key = key_from_args(args.key_b64)
    if args.command == "encrypt":
        plaintext = Path(args.input).read_bytes()
        nonce = os.urandom(NONCE_SIZE)
        ciphertext = AESGCM(key).encrypt(nonce, plaintext, AAD)
        Path(args.output).write_bytes(MAGIC + nonce + ciphertext)
        return 0

    payload = Path(args.input).read_bytes()
    if not payload.startswith(MAGIC):
        raise SystemExit("bad encrypted-input magic")
    nonce = payload[len(MAGIC):len(MAGIC)+NONCE_SIZE]
    ciphertext = payload[len(MAGIC)+NONCE_SIZE:]
    try:
        plaintext = AESGCM(key).decrypt(nonce, ciphertext, AAD)
    except Exception as exc:
        raise SystemExit("authenticated decryption failed") from exc
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(plaintext)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
