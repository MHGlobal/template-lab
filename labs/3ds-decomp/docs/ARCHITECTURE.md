# GitHub-only architecture

## Principle

GitHub Actions performs all compute. There is no self-hosted runner and no VM dependency.

## Public plane

The public `template-lab` repository contains:
- workflow definitions;
- scripts written for the lab;
- reconstructed source code when appropriate;
- symbols/metadata safe to publish;
- synthetic test fixtures;
- sanitized reports.

## Private source plane

When real game material is introduced, it must live in a **private GHCR OCI package**, not in this public Git repository, Actions cache, or public artifacts.

A job may pull the private package into `$RUNNER_TEMP`, process it, emit sanitized results, and rely on runner teardown for disposal. Workflows must never upload the raw package contents.

## Parallel execution

The worker job uses a matrix of lanes `0..39` with `max-parallel: 40`.

For bootstrap, each lane produces a deterministic synthetic receipt. A reducer downloads those public-safe receipts and refuses to pass unless every lane exists exactly once.

For later reverse-engineering work, a coordinator will assign bounded function ranges or symbol IDs to lanes. Each lane works on a distinct shard and emits only the evidence needed by the reducer.

## Toolchain pinning

- Ghidra 12.1.4: archive SHA-256 verified before use.
- 3dsd: pinned commit.
- 3DS Ghidra scripts: pinned commit.
- ARM GNU tools: installed from the GitHub Ubuntu runner package repository.

Exact matching may require the original ARM compiler version used by the target title. That compiler is not bundled by 3dsd and is intentionally not fabricated by this bootstrap.

## Completion rule

No wave is complete merely because a job exits successfully. Gates must carry reproducible evidence: checksums, addresses, compiler identity, function/symbol IDs, match percentage, callers/callees, or test output as appropriate.
