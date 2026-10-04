# 3DS Decomp Lab

Training laboratory for learning a reproducible Nintendo 3DS reverse-engineering/decompilation workflow before attempting a much larger title.

## Training target

- Game: **Pushmo / Pullblox**
- First native target: **PC**
- Later target: **Android**
- Long-term learning target: apply the validated workflow to larger 3DS software.

## Data boundary

This repository is public. Do **not** commit game images, ROMs, CIA/CCI/CXI files, `code.bin`, `exheader.bin`, extracted RomFS/ExeFS, original CRO modules, keys, or copyrighted assets.

Private source material and persistent reverse-engineering state belong on the MCPNet VM under:

```
/srv/3ds-lab/
```

The CI policy gate checks tracked filenames and fails when forbidden material is detected.

## Execution model

```
GitHub
  |
  +-- policy gate
  |
  +-- coordinator
  |
  +-- 40-way worker matrix (max-parallel: 40)
  |
  +-- evidence/gates
  |
  +-- MCPNet VM (persistent private storage)
```

The initial workflow runs a synthetic 40-lane smoke test. It proves the GitHub fan-out without touching game material.

## Waves

1. W0 — storage/toolchain bootstrap
2. W1 — fingerprint a legally obtained copy
3. W2 — extraction validation
4. W3 — Ghidra baseline and symbol map
5. W4 — select a small candidate function
6. W5 — reconstruct C/C++
7. W6 — compile and byte-match
8. W7 — architecture map
9. W8 — native PC compatibility layer
10. W9 — Android port

The first serious milestone is one real function reconstructed and verified at **100% match**.

## Current bootstrap status

- GitHub branch isolation: prepared
- proprietary-content gate: prepared
- 40-lane GitHub smoke matrix: prepared
- MCPNet storage bootstrap script: prepared
- MCPNet live storage initialization: pending VM connectivity
- game intake: not started
