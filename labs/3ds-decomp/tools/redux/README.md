# Batch CIA 3DS Decryptor Redux — diagnostic integration

Pinned upstream commit:

```
xxmichibxx/Batch-CIA-3DS-Decryptor-Redux
2fb1ac549a4006dd5261b8545e943527960ceeff
```

This lab integration intentionally validates only the Windows batch package and `ctrtool.exe`.

It does **not** download or execute:

- `decrypt.exe`
- `seeddb.bin`
- `makerom.exe`

The upstream batch is inspected as text but is never executed.

The GitHub Actions test:

1. runs on `windows-latest`;
2. downloads the pinned batch file and `ctrtool.exe`;
3. records SHA-256 hashes;
4. verifies that `ctrtool.exe` launches;
5. creates a synthetic, non-proprietary CIA fixture;
6. runs the repository's own structural parser;
7. lets `ctrtool.exe` inspect the synthetic CIA;
8. publishes diagnostic logs only.

This proves whether the Redux tooling can execute in GitHub Actions without using it to decrypt protected game content.
