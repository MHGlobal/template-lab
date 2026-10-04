# Architecture

## Control plane

GitHub stores the lab source, workflow definitions, public-safe documentation, and validation scripts.

## Private data plane

MCPNet stores original/extracted material, Ghidra projects, matching workspaces, generated private evidence, builds, and caches.

## Parallelism

The bootstrap workflow defines 40 independent GitHub-hosted lanes with `max-parallel: 40`. A future private-work coordinator will assign bounded work units to those lanes. Raw game images are never committed.

## Trust boundaries

1. Git repository: public-safe only.
2. GitHub-hosted runners: ephemeral workers.
3. MCPNet: persistent private storage.
4. Original source material: root-managed, read-only to analysis agents.
5. Writable workspaces: separate from originals.

## Completion rule

No reverse-engineering wave is complete merely because a script exits successfully. The wave must produce evidence appropriate to the gate: hashes, addresses, compiler settings, match percentage, callers/callees, or test output.
