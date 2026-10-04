#!/usr/bin/env python3
"""Emit a public-safe toolchain manifest for reproducible CI."""

from __future__ import annotations

import json
import os
import platform
import subprocess


def one_line(command: list[str]) -> str:
    completed = subprocess.run(
        command,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    return completed.stdout.splitlines()[0].strip()


manifest = {
    "environment": "github-actions",
    "game_data_present": False,
    "ghidra": {
        "version": os.environ["GHIDRA_VERSION"],
        "sha256": os.environ["GHIDRA_SHA256"],
    },
    "3dsd_commit": os.environ["THREEDSD_SHA"],
    "ghidra_scripts_commit": os.environ["GHIDRA_SCRIPTS_SHA"],
    "python": platform.python_version(),
    "java": one_line(["java", "-version"]),
    "arm_gcc": one_line(["arm-none-eabi-gcc", "--version"]),
    "arm_ld": one_line(["arm-none-eabi-ld", "--version"]),
    "ninja": one_line(["ninja", "--version"]),
}
print(json.dumps(manifest, indent=2, sort_keys=True))
