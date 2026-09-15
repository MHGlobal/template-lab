# RS Storage Audit — Agent tool-surface parity findings

Target: `MHGlobal/RS-Storage` · `release/v4.7.13-agent-harness`

Status: **BLOCKED — production Agent tool surfaces are not yet end-to-end equivalent.**

## F-AP-001 — BLOCKER — Git write remediation exists only in ToolRegistry, not in the production Agent path

The current `AgentHarness.defaultTools(workspace)` registers concrete `git_commit` and `git_push` definitions mapped to `git.commit` and `git.push`. This is a useful partial remediation of the original Wave 2 finding.

However, the production execution path is still split:

1. `RsAiAgentRuntime` calls `t.harness.requireTool(tool)` and `t.harness.authorize(...)`.
2. It then executes the operation in its own manual `exec(...)` dispatcher rather than calling `AgentHarness.executeTool(...)` / the registered `ToolDefinition.executor`.
3. That production dispatcher implements `git_status`, `git_diff` and `git_log`, but has no `git_commit` or `git_push` branch.
4. `RsAgentNativeTools.schemas()` advertises only `git_status`, `git_diff` and `git_log` to native-tool providers.
5. The runtime's fallback instruction also lists Git read tools only.

Result: native tool calling cannot request explicit Git writes, fallback prompting does not advertise them, and even a manually formed `git_commit`/`git_push` call would pass registry authorization only to fall through to the production dispatcher's unsupported-tool error.

**Release impact:** coding tasks cannot truthfully claim an end-to-end explicit Git commit/push capability yet.

## F-AP-002 — HIGH — duplicated executable surfaces can drift

There are currently at least three independently maintained descriptions of Agent tools:

- ToolRegistry / `RuntimeToolExecutors`;
- `RsAgentNativeTools.schemas()`;
- `RsAiAgentRuntime.exec(...)` plus its fallback instruction/normalization layer.

The Git-write mismatch is direct evidence that these surfaces can diverge. A production-ready harness needs one canonical tool definition or a mandatory parity contract generated/tested from a single source of truth.

## F-AP-003 — HIGH candidate — filesystem argument contracts differ between surfaces

Examples observed in source:

- Production native schemas and `RsAiAgentRuntime` use `from` / `to` for `fs_copy` and `fs_move`.
- `AgentHarness` / `RuntimeToolExecutors` register those tools using `source` / `destination`.
- Production `fs_edit` uses `path` / `old` / `new` and performs replacement semantics.
- The ToolRegistry executor currently registers `fs_edit` as `path` / `content` and binds it to the same writer used for append behavior.

These mismatches mean a tool call valid for one surface can be invalid or semantically different on another. Until the executable paths are consolidated or proven equivalent, ToolRegistry unit success is not sufficient production evidence.

## F-AP-004 — REVIEW — registered executors are not the production executor

`AgentHarness.executeTool(...)` correctly enforces `DENY`, requires explicit approval for `ASK`, validates arguments and invokes the registered executor. The main production Agent loop does not use that method for normal tool execution; it reimplements authorization plus execution itself.

This weakens the intended architectural guarantee that there is a single policy-enforced execution path. The recovery specification should make the actual production runtime call the canonical execution API, or remove the duplicate executor layer and generate all schemas/permissions/dispatch from one canonical registry.

## Required revalidation

Before this area can pass:

- Native provider schemas must expose the intended explicit Git-write tools.
- Fallback/structured protocol must expose the same capability set.
- Production dispatch must execute through the same policy category and executor semantics as the registry.
- `git_commit` without approval must be denied with `APPROVAL_REQUIRED`.
- Approved commit in an isolated local Git repository must succeed.
- `git_push` without approval must be denied.
- Approved push to an isolated local bare remote must succeed.
- Force-push or flag injection must be structurally impossible/denied.
- Copy/move/edit schemas and runtime argument names/semantics must be identical across native, fallback and executable paths.
- A parity test must fail the build whenever any advertised/registered/executable tool differs.

This finding is independent of the Android visual/upgrade/performance/network gates and keeps the final audit blocked even if those gates pass.
