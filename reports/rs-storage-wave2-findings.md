# RS Storage Audit — Wave 2 findings

Target: `MHGlobal/RS-Storage` · `release/v4.7.13-agent-harness`

## Release decision after Wave 2

**BLOCKED.** Wave 2 automated real-task gates passed for workspace containment, undo/redo and CompletionGate integrity, but the production gate correctly failed because the Agent runtime capability surface does not match the declared Git write permissions.

## F-W2-001 — BLOCKER — Git write capability / permission-path mismatch

Observed on public Template Lab runner:

- Runtime tool count: 25.
- Explicit Git tools: `git_status=true`, `git_diff=true`, `git_log=true`.
- Explicit Git write tools: `git_commit=false`, `git_push=false`.
- Engineer policy: `git.commit=ASK`, `git.push=ASK`, `git.status=ALLOW`, `git.diff=ALLOW`.
- Final runtime blockers: 2.

Source inspection confirms the provider/native schema advertises only `git_status`, `git_diff` and `git_log`. The production dispatcher also implements only those explicit Git tools.

The generic `shell` path can execute commands that are not on the safe-shell allowlist only after a separate explicit approval. This does **not** close the architecture gap: a `git commit` or `git push` issued through `shell` is authorized/audited under the shell path instead of the dedicated `git.commit` / `git.push` policy categories. The Engineer therefore has declared Git-specific permission rules that cannot be exercised through explicit Git write tools.

Required remediation is not to silently bless shell as the Git API. The recovery specification must either:

1. implement explicit `git_commit` and `git_push` runtime tools wired to `git.commit` and `git.push`, including approval/audit events and force-push denial; or
2. deliberately remove the unsupported Git-write contract from the Agent capability model and redefine completion semantics so coding tasks do not claim Git-write capability.

The current product specification expects a coding agent capable of complete real tasks, so option 1 is the expected remediation unless the product contract is explicitly changed.

## F-W2-002 — NOT A DEFECT BY ITSELF — null ToolDefinition executors

Wave 2 reported `null_executor_count=25`. Source inspection shows this is currently a split architecture: `ToolRegistry` holds capability/permission metadata, while `RsAiAgentRuntime.exec(...)` is the actual production dispatcher. Therefore `null_executor_count=25` is not independently classified as a blocker.

It remains an architectural maintainability risk because capability metadata and executable dispatch are duplicated in separate places and can drift — F-W2-001 is already evidence of such drift. The recovery specification should consolidate registration and execution binding or add a mandatory parity contract.

## Gates passed in Wave 2

- Workspace edit persisted.
- Undo passed.
- Redo passed.
- Plain traversal blocked.
- Encoded traversal blocked.
- Symlink escape blocked.
- Synthetic Git diff visible.
- Empty CompletionGate evidence rejected.
- Unknown-diff CompletionGate evidence rejected.
- Complete known evidence accepted.

## Audit remains incomplete

Wave 2 does not replace the mandatory Android visual, Android-served Web, upgrade/data-preservation, transfer/performance and physical Wi-Fi/hotspot gates. Those continue independently while F-W2-001 remains open.
