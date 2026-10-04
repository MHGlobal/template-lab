# M3 — encrypted raw code.bin intake

M3 bridges the synthetic laboratory and a real Nintendo 3DS binary without placing proprietary plaintext in the public repository.

- AES-256-GCM encrypted input.
- Raw `code.bin` imported with Ghidra BinaryLoader.
- Base address `0x00100000`.
- Processor `ARM:LE:32:v6`.
- Entry seeded before auto-analysis.
- Sanitized symbol CSV exported as `Location,Name,Mode,Size,Segment`, compatible with the later `3dsd` workflow.
- Plaintext is deleted before artifact upload.

Pushes to the development branch run entirely on a synthetic ARM binary. Real mode is manual-only and requires the repository secret plus encrypted GitHub attachment URLs.
