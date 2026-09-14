# RS Storage audit findings — Wave 1

Target: `MHGlobal/RS-Storage` · `release/v4.7.13-agent-harness`

This ledger contains sanitized audit conclusions only. Private RS Storage source is never published as an artifact by the public Template Lab runner.

## Release status

**BLOCKED — audit incomplete.** Automated tests are evidence, not the release decision. Visual review, real-task execution, Android runtime evidence, upgrade/data preservation, transfer/performance and physical-network gates remain required.

## Findings

### F-W1-001 — BLOCKER candidate — Git write capability mismatch

The runtime Agent Harness registers explicit Git tools for status, diff and log, while no explicit `git_commit` or `git_push` runtime tools are registered. At the same time, the Engineer permission profile defines `git.commit = ASK` and `git.push = ASK`. Engineer is configured with the wildcard tool capability. This is an architecture mismatch between declared permissions and exposed runtime tools and is consistent with the observed inability of realistic coding tasks to finish Git write operations.

Wave 2 must verify the tool surface at runtime and keep the production gate blocked while the mismatch exists. A generic shell path must not silently substitute a missing explicit capability unless the product specification explicitly permits that behavior and the permission/audit trail remains equivalent.

### F-W1-002 — HIGH — Automated pass does not prove real-task readiness

The current Agent Harness behavior suite passes all 73 automated checks, but reported real usage still shows repeated approval prompts, unavailable Git operations, empty searches, repeated actions and tasks stuck during validation. The existing suite therefore has a coverage gap around complete user tasks and end-to-end tool availability.

Wave 2 adds controlled real-task gates and a runtime tool-surface gate. Audit completion remains forbidden based only on unit/contract success.

### F-W1-003 — REVIEW — Dynamic UI dependency findings

The Wave 1 dependency audit reported one high-severity direct Vite finding and one low-severity transitive esbuild finding. Impact on the shipped Android/runtime product is not yet classified because these dependencies may be limited to build tooling. Do not promote this to a production vulnerability until reachability and shipped-asset impact are verified.

### F-W1-004 — REVIEW — Mobile Files layout candidates

Production RS File assets rendered in the public evidence shell show possible mobile command-bar width/overflow and context-menu layout concerns. These remain candidates rather than confirmed product defects until reproduced on the Android-served page or a physical device.

### F-W1-005 — AUDIT INFRA — Android emulator evidence is not yet trustworthy

The first public Android emulator evidence job builds the x86_64 audit variant successfully but can remain for a long period inside emulator boot/install/capture. Until bounded diagnostics and actual screenshots are obtained, Android visual evidence is incomplete and the aggregate Wave 1 gate must not be treated as final audit completion.

## Evidence already established

- Private source checkout through `RS_STORAGE_READ_TOKEN` works on the public runner without publishing the private tree.
- Regression map was produced against the stabilization branch.
- Agent contract suite: 73/73 pass.
- ARM64 debug build and package validation pass for version 4.7.13.
- RS File real-browser behavior gates pass.
- Eight Web visual evidence screenshots were captured and manually reviewed.
- Security/dependency baseline artifacts were produced.

## Mandatory remaining gates

1. Runtime tool-surface and controlled real-task audit.
2. Android emulator/device screenshots plus UI hierarchy and logcat review.
3. Web UI served by the actual Android application.
4. Upgrade/data-preservation test from the previous install to the candidate build.
5. Transfer/upload/copy performance and cancellation/recovery tests with synthetic payloads.
6. Physical hotspot/Wi-Fi/Wi-Fi Direct validation where CI cannot truthfully emulate the network topology.
7. Consolidated recovery specification only after the evidence set is complete.

## Wave 2 public-runner rerun

A fresh Wave 2 run was requested after installing the sanitized completion reporter. The reporter records only allow-listed gate markers and job conclusions; it never publishes the private RS Storage source tree.
