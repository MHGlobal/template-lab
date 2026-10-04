# New Super Mario Bros. DS — A2DE target

This target is based on the user-supplied **USA/Australia** Nintendo DS ROM.

## Verified identity

- Title: `NEW MARIO`
- Game code: `A2DE`
- Size: `33,554,432` bytes
- CRC32: `0197576a`
- MD5: `a2ddba012e5c3c2096d0be57cc273be5`
- SHA-1: `a22713711b5cd58dfbafc9688dadea66c59888ce`
- SHA-256: `9f67fef1b4c73e966767f6153431ada3751dc1b0da2c70f386c14a5e3017f354`

The ROM itself is **not** committed.

## DS executable layout

```
ARM9
  ROM offset: 0x00004000
  load:       0x02000000
  entry:      0x02000800
  size:       389,028 bytes

ARM7
  ROM offset: 0x001FE800
  load:       0x02380000
  entry:      0x02380000
  size:       165,536 bytes

ARM9 overlays: 131
ARM7 overlays: 0
NitroFS files: 1,957
NitroFS directories: 20
```

Build marker recovered from NitroFS:

```
UROM2006-03-29 09:48:19nitro-mj
```

## Existing matching-decomp reference

The public `NSMB-Decomp/nsmb` project explicitly supports release `A2DE`.

Pinned research commit for this lab:

```
9c7c0b341ae87f860df090e1e35d720f06c70bfa
```

The upstream project is currently early-stage and states that it cannot yet build a complete ROM.

Its documented workflow is approximately:

```
A2DE.nds
  ↓
zig build extract
  ↓
extracted/
  ↓
zig build delink
  ↓
objdiff units
  ↓
matching C/C++
```

The project currently requires `dsd 0.12.0`, `zig 0.16.0`, `objdiff`, Wine on Linux/macOS, and the original `mwccarm 1.2sp3` compiler.

## Lab direction

This is a much better decompilation target than the encrypted 3DS Virtual Console CIA because the DS ROM already exposes:

- ARM9 and ARM7 binaries;
- overlay tables;
- NitroFS;
- file allocation/name tables;
- executable addresses and sizes.

The next lab milestone should split the 131 ARM9 overlays and the ARM9 main binary into reproducible analysis units, then run matching/decomp work across GitHub Actions workers.

A native Android port is a later milestone. Matching the DS game does not automatically produce an Android executable because Nintendo DS hardware APIs, graphics, audio, filesystem and input still require a compatibility/runtime layer.
