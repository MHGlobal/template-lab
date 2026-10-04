# M1 — Synthetic ARM decompilation and exact matching

This milestone proves the complete public-safe workflow before any real 3DS game binary is introduced.

## Pipeline

1. Compile a small freestanding C program for ARM11/MPCore.
2. Link it at a 3DS-like virtual address.
3. Record the target function address/size from the unstripped build.
4. Strip every symbol from the ELF.
5. Import the stripped ELF into Ghidra headless.
6. Decompile the target function by address.
7. Compile a separately written reconstructed C implementation.
8. Extract only the `.text.puzzle_score` machine-code bytes from each object.
9. Require an exact byte-for-byte match.
10. Publish only synthetic evidence.

## Gate

M1 passes only if:

```
original function bytes == reconstructed function bytes
```

The target is synthetic and created by this repository, so the disassembly and Ghidra output are safe to publish.

## Why only one runner here?

M1 validates correctness, not throughput. After this gate passes, M2 can shard many independent functions across the account's 40 concurrent GitHub-hosted runners.
