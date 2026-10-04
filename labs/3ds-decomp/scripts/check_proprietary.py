#!/usr/bin/env python3
"""Fail CI if proprietary 3DS game material is tracked by Git."""

from __future__ import annotations

import subprocess
import sys
from pathlib import PurePosixPath

FORBIDDEN_EXTENSIONS = {".3ds", ".cia", ".cci", ".cxi", ".app"}
FORBIDDEN_BASENAMES = {"code.bin", "exheader.bin"}
FORBIDDEN_DIRS = {"romfs", "exefs", "cro", "original", "private", "dump", "keys"}


def tracked_files() -> list[str]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        check=True,
        stdout=subprocess.PIPE,
    )
    return [p.decode("utf-8") for p in result.stdout.split(b"\0") if p]


def is_forbidden(path_text: str) -> bool:
    path = PurePosixPath(path_text)
    lower_parts = [part.lower() for part in path.parts]
    basename = path.name.lower()
    suffix = path.suffix.lower()

    if suffix in FORBIDDEN_EXTENSIONS:
        return True
    if basename in FORBIDDEN_BASENAMES:
        return True
    return any(part in FORBIDDEN_DIRS for part in lower_parts)


def main() -> int:
    violations = [path for path in tracked_files() if is_forbidden(path)]
    if violations:
        print("ERROR: proprietary/private 3DS material is tracked by Git:")
        for path in violations:
            print(f"  - {path}")
        print("Keep original game data only in MCPNet storage.")
        return 1

    print("PASS: no forbidden 3DS game material is tracked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
