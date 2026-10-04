# M4 — Game Boy Color native-port lab

This milestone prepares the exact workflow we want for Super Mario Bros. Deluxe once an authorized plaintext GBC ROM is available.

## Backends

### mgbdis

Pinned commit: `95d951a9881a0d7ff1a42a94d1be175da92b1777`.

Purpose:
- LR35902/SM83 disassembly;
- multi-bank ROM awareness;
- RGBDS-compatible assembly output;
- symbol/data annotations later.

### GB Recompiled

Pinned commit: `9150f87d82fa98abcb6ea22329170463f9702eb8`.

Purpose:
- analyze banked LR35902 code;
- emit portable C;
- build a desktop executable with SDL2;
- generate an Android project.

This is the most direct experimental path from a GBC ROM to native PC/Android while retaining a reviewable generated C layer.

## M4 gates

1. Generate a legal synthetic CGB ROM.
2. Validate the GBC header/checksums.
3. Split a 64-bank synthetic ROM across 40 GitHub runners.
4. Require all 64 banks to be accounted for exactly once.
5. Run `mgbdis` on the small synthetic ROM.
6. Build pinned `gb-recompiled`.
7. Generate a desktop C project.
8. Compile the generated desktop project.
9. Execute a short headless smoke test.
10. Generate the Android project skeleton.

No commercial ROM is committed or uploaded by this workflow.
