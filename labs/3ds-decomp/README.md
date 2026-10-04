# 3DS Decomp Lab — GitHub Actions only

Training laboratory for a reproducible Nintendo 3DS reverse-engineering/decompilation workflow before attempting a much larger title.

## Training target

- Game: **Pushmo / Pullblox**
- First native target: **PC**
- Later target: **Android**
- Compute: **GitHub-hosted Actions only**
- Parallelism: **up to 40 matrix workers**

## Public repository boundary

`MHGlobal/template-lab` is public. Never commit or publish game images, CIA/CCI/CXI files, `code.bin`, `exheader.bin`, RomFS/ExeFS, original CRO modules, keys, copyrighted assets, or raw disassembly dumps containing substantial original code.

The policy job fails when forbidden source material is tracked by Git.

## Architecture

```
template-lab
    |
    +-- policy gate
    |
    +-- toolchain validator
    |      Ghidra 12.1.4
    |      ARM GNU binutils/GCC
    |      3dsd (pinned)
    |      3DS Ghidra scripts (pinned)
    |
    +-- 40 GitHub-hosted workers
    |      lane 00 .. lane 39
    |
    +-- reducer gate
    |      requires exactly 40 receipts
    |
    +-- final gate
```

The first bootstrap uses synthetic shards so the entire orchestration can be verified safely.

## Private game material without a VM

For the real game stage, use a **private GHCR OCI package** whose access is granted only to this repository's Actions. The workflow may pull it into the ephemeral runner, use it during the job, and delete it at job end.

Do **not** upload original game material through `actions/upload-artifact` in this public repository and do not place it in Actions cache.

The initial private package is not created automatically because it requires the user's own legally obtained dump and package permissions.

## Current milestones

- M0A — public-repo policy gate
- M0B — reproducible toolchain validation
- M0C — 40-worker fan-out
- M0D — 40-worker reducer/fan-in
- M1 — private game source attached through GHCR
- M2 — fingerprint/extraction validation
- M3 — Ghidra baseline
- M4 — first candidate function
- M5 — first 100% matching function
- M6+ — subsystem mapping, PC runtime, then Android

The first serious reverse-engineering milestone remains: **one real function reconstructed and verified at 100% match**.

## Validated milestones

### M0 — GitHub-only bootstrap: PASS

Validated with 40 GitHub-hosted workers, a reducer gate, pinned Ghidra/3DS tooling, and the public-repository safety gate.

### M1 — Synthetic ARM decompilation + exact matching: PASS

Validated run: `37228416905`.

Evidence:

- stripped ARM ELF contained no `puzzle_score` symbol;
- Ghidra recovered the target at `0x00100028` as `FUN_00100028`;
- function size: `0x3c` (60 bytes);
- original function SHA-256: `92b87660efb890c76887b72c63ddce5236a0cb5e6b3453420491be4cdacb0f28`;
- reconstructed function SHA-256: `92b87660efb890c76887b72c63ddce5236a0cb5e6b3453420491be4cdacb0f28`;
- exact machine-code match: **100.00%**.

Next milestone: M2 will scale the verified matching pattern across many independent synthetic function shards before attaching private Pushmo input.

### M2 — 40-way synthetic ARM matching: PASS

Validated run: `37228774068`.

Evidence:

- ARMv6K compiler probe: **PASS**;
- GitHub matrix: **40 workers**;
- exact byte matches: **40/40**;
- unique original machine-code hashes: **40/40**;
- generated function size range: **80–84 bytes**;
- reducer gate: **PASS**.

This validates the fan-out/fan-in pattern that will be reused for real function shards.

