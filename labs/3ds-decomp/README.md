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
