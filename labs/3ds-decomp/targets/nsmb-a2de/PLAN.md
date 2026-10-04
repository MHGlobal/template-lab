# NSMB A2DE execution plan

## N0 — fingerprint and structure

- verify all canonical hashes;
- map ARM9/ARM7;
- map overlays;
- map NitroFS;
- retain metadata only in Git.

## N1 — extraction harness

- reproduce the upstream `zig build extract` layout from a private ROM input;
- generate sanitized manifests only;
- never upload original NitroFS assets.

## N2 — decomp baseline

- pin `NSMB-Decomp/nsmb`;
- pin `dsd`;
- produce ARM9 and overlay delink units;
- create objdiff-compatible unit map.

## N3 — 40-runner sharding

Shard by decompilation unit, not raw bytes.

```
coordinator
  ├─ workers 00..39
  │    └─ assigned ARM9/overlay units
  └─ reducer
       ├─ matched bytes
       ├─ matched functions
       ├─ regressions
       └─ evidence
```

## N4 — matching

Primary goal:

> one real A2DE function matched 100% against the original binary.

Then scale to 10 functions, one subsystem, and eventually overlays.

## N5 — native portability research

Only after enough game logic is reconstructed:

- replace NitroSDK/NDS hardware calls with portable interfaces;
- create SDL2 input/audio/rendering host;
- test desktop x64 first;
- Android ARM64 later.
