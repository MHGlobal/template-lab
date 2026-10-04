# Private game input using GitHub only

The repository is public, therefore raw game material must not be stored in commits, Actions cache, or workflow artifacts.

## Recommended GitHub-only storage

Use a **private GHCR OCI package** controlled by the same GitHub account/organization. Grant this repository Actions read access to the package.

Suggested reference:

```
ghcr.io/mhglobal/3ds-decomp-private:pushmo-<region>-<revision>
```

The package should contain only material dumped from a copy you are entitled to use. Keep the package private.

## Intended workflow behavior

1. Authenticate to `ghcr.io` using a token/permission available only to the workflow.
2. Pull the package to `$RUNNER_TEMP/game-input`.
3. Verify a pre-recorded SHA-256 manifest.
4. Run analysis/matching.
5. Export only sanitized metadata/results.
6. Never call `actions/upload-artifact` on the raw input directory.
7. Never put the raw input directory in `actions/cache`.

A future workflow will enable this stage after the private package exists and Actions access has been granted.
