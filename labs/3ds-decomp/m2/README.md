# M2 — 40-way synthetic ARM matching

M1 proved the full single-function path including Ghidra. M2 proves that the matching phase can scale across the account's 40 concurrent GitHub-hosted runners.

## What each lane does

For lane `0..39`:

1. generate a unique synthetic ARM function and a reconstructed spelling;
2. compile both with the same preinstalled Clang targeting ARMv6K;
3. extract only `.text.lab_fn` with a repository-owned ELF parser;
4. compare exact machine-code bytes;
5. emit a tiny JSON receipt.

The reducer passes only when:

- every lane `0..39` exists exactly once;
- every lane is a 100% byte match;
- all 40 original machine-code hashes are unique.

## Why Clang here?

M2 validates sharding and matching throughput. It deliberately uses the GitHub runner's preinstalled compiler so 40 runners do not each download a large ARM toolchain. Real title matching later uses the exact compiler/toolchain required by the target binary.

No game data is used in M2.
