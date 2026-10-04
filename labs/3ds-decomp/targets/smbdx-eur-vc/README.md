# Target — Super Mario Bros. Deluxe (Europe), 3DS Virtual Console

This is now the preferred learning target for the lab.

## Verified container identity

- Title: Super Mario Bros. Deluxe
- Region: Europe
- Title ID: `00040000000FFB00`
- Product code: `CTR-N-QA5P`
- CIA size: `5,351,744` bytes
- Target-file SHA-256:
  `e9e44127330b2ab5badfcee0c77fec721d3c8601cf170596a8eed0c5154f396c`
- TMD contents: 2
- Main content: NCCH/CXI-like executable content
- Secondary content: `CTR-P-CTAP` instruction-manual CFA

The target fingerprint stores metadata only. The CIA itself is not committed.

## Important architecture difference

This is not a native Game Boy Color binary wrapped directly as a CIA.

For NES/GB/GBC Virtual Console, the 3DS title contains:

```
3DS CIA
  -> main NCCH
       -> ARM11 Virtual Console emulator
       -> RomFS
            -> embedded Game Boy Color ROM
            -> VC config / shaders / UI resources
```

That gives us two distinct reverse-engineering targets:

### Path A — Virtual Console layer

Analyze the ARM11 emulator application. This teaches the same ARM/3DS workflow as M1-M3.

### Path B — Game Boy Color layer

Analyze the embedded GBC ROM. This is the smaller path for learning game decompilation and matching, and it is the recommended path once an already-decrypted/authorized ROM extraction is available.

## Current blocker

The outer CIA content records are not marked encrypted, but the main NCCH has its `NoCrypto` flag clear. The ExeFS/RomFS payload therefore cannot be treated as plaintext.

The lab will not attempt to defeat NCCH encryption or import external console keys.

The next accepted input is one of:

- an already-decrypted ExeFS/RomFS extraction from a copy the operator is authorized to use; or
- an already-decrypted GBC ROM dump from a copy the operator is authorized to use.

## Existing public research

A public work-in-progress disassembly exists for **Super Mario Bros. Deluxe (USA v1.1)** and reports exact matches for many code/data banks. It is useful as a research reference, but it is a different revision and the repository does not currently declare a license, so this lab must not vendor or copy its source wholesale.

Reference:
`KarisaAdvynia/smbdx-disasm`

The lab should independently fingerprint the European ROM before reusing any symbol/address assumptions.
