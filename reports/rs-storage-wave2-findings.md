# RS Storage Audit — Wave 2 findings

Target: `MHGlobal/RS-Storage` · `release/v4.7.13-agent-harness`

## Release decision after Wave 2

**BLOCKED.** Wave 2 automated real-task gates passed for workspace containment, undo/redo and CompletionGate integrity. The original Git-write blocker has since received a source-level remediation, but the remediation still requires runtime revalidation. A later Android compile blocker was also discovered and fixed on the dedicated Agent Harness branch; the release remains blocked until all downstream gates are rerun successfully.

## F-W2-001 — REMEDIATED IN CODE / RUNTIME REVALIDATION REQUIRED — Git write capability / permission-path mismatch

Wave 2 originally observed:

- Runtime tool count: 25.
- Explicit Git tools: `git_status=true`, `git_diff=true`, `git_log=true`.
- Explicit Git write tools: `git_commit=false`, `git_push=false`.
- Engineer policy: `git.commit=ASK`, `git.push=ASK`, `git.status=ALLOW`, `git.diff=ALLOW`.
- Final runtime blockers: 2.

The branch subsequently added explicit `git_commit` and `git_push` ToolRegistry entries wired to `git.commit` and `git.push`, with concrete runtime executors. This closes the original source-level architecture mismatch. It is **not yet marked PASS** because the corrected candidate must compile and the real-task/public-runner gate must be repeated against the new branch head.

The generic shell path remains insufficient as a substitute for dedicated Git authorization. Dedicated Git tools are still the required path, including approval/audit events and force-push protection.

## F-W2-002 — ARCHITECTURE RISK REDUCED / REVALIDATION REQUIRED — executor binding

Wave 2 had reported `null_executor_count=25` under the earlier split architecture. The current branch now binds concrete executors through the ToolRegistry for runtime tools. This is a material remediation, but parity between provider-advertised tools, ToolRegistry entries, permission categories and executable dispatch must be retested on the new branch head.

## F-W2-003 — BLOCKER FOUND AND REMEDIATED — Android-incompatible `Files.readString/writeString`

The first post-remediation Android builds in Waves 3, 4 and 5 all failed in the same place: `:rsapp:compileDebugJavaWithJavac` in `RuntimeToolExecutors.java`.

Root cause:

- `Files.readString(path, UTF_8)` was not available in the Android compile API used by the app.
- Both `Files.writeString(...)` calls were likewise unavailable.
- This produced three `cannot find symbol` errors before any emulator/runtime test could execute.

The issue was corrected on `release/v4.7.13-agent-harness` in commit `0581f962efef7e7f3f6b4302f253fef6d4131129` by using Android-compatible equivalents:

- `new String(Files.readAllBytes(path), StandardCharsets.UTF_8)` for reads;
- `Files.write(path, text.getBytes(StandardCharsets.UTF_8), ...)` for create/append/truncate writes.

No change was made to `main`. The Android build and all dependent runtime gates must now be rerun from this exact candidate branch state.

## Gates passed in the original Wave 2

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

The following remain mandatory before release approval:

1. Revalidate the remediated Agent tool surface and real Git permission path.
2. Android emulator/device screenshots plus UI hierarchy and logcat review.
3. Web UI served by the actual Android application.
4. Upgrade/data-preservation test from the previous install to the candidate build.
5. Transfer/upload/copy performance and cancellation/recovery tests with synthetic payloads.
6. Android 16 local-network protection behavior.
7. Physical hotspot/Wi-Fi validation where CI cannot truthfully emulate the topology.
8. Human review of the captured Android and Android-served Web screenshots.

## Wave 3 rerun

Updating this findings ledger intentionally retriggers Wave 3 on the public Template Lab runner against the corrected candidate branch. A green workflow alone will still not constitute visual approval; the generated screenshots must be downloaded and manually reviewed.
