# M3 private-input preparation

Only `code.bin` and `exheader.bin` are required for the first real baseline.

The public repository must never contain either file in plaintext. M3 uses AES-256-GCM ciphertext and keeps the key only in the repository secret `PUSHMO_INPUT_KEY_B64`.

The helper `crypto_bundle.py generate-key` creates a random 256-bit key. Store it as the secret, then use `bundle.py pack`, `crypto_bundle.py encrypt`, and `split_file.py split` locally. The split helper defaults to 20 MiB, below GitHub's current 25 MB limit for ordinary issue attachments.

Attach only the encrypted `.gz` parts to the dedicated M3 intake issue, in numeric order. Real mode accepts one attachment URL per line and decrypts only inside the ephemeral GitHub runner.

Never attach the raw game image, `code.bin`, `exheader.bin`, RomFS, ExeFS, CRO files, or the encryption key.
