# RS Storage audit findings — Wave 1

Target: `MHGlobal/RS-Storage` · `release/v4.7.13-agent-harness`

This ledger contains sanitized audit conclusions only. Private RS Storage source is never published as an artifact by the public Template Lab runner.

## Release status

**BLOCKED — audit incomplete.** Automated tests are evidence, not the release decision. Visual review, real-task execution, Android runtime evidence, upgrade/data preservation, transfer/performance and physical-network gates remain required.

## Findings

### F-W1-001 — RESOLVED BY LATER RUNTIME EVIDENCE — Git write capability mismatch

Wave 1 originally observed a mismatch in an older target/runtime snapshot: the Engineer policy exposed `git.commit = ASK` and `git.push = ASK` while explicit runtime executors appeared absent. This finding must not be carried forward as a current 4.7.13 blocker without reproduction.

The later end-to-end Agent tool parity gate against `release/v4.7.13-agent-harness` verified concrete operations for `git.commit`, `git.push`, `git.status`, `git.add`, `git.restore`, `git.fetch`, `git.pull`, `git.clone`, `git.init`, branch listing and undo-last-commit, with destructive Git actions remaining approval-gated. A fresh Wave 2 run is still required to confirm the integrated real-task gate on the current target before final release approval.

### F-W1-002 — HIGH — Automated pass does not prove real-task readiness

The current Agent Harness behavior suite passes all 73 automated checks, but reported real usage still shows repeated approval prompts, unavailable Git operations, empty searches, repeated actions and tasks stuck during validation. The existing suite therefore has a coverage gap around complete user tasks and end-to-end tool availability.

Wave 2 adds controlled real-task gates and a runtime tool-surface gate. Audit completion remains forbidden based only on unit/contract success.

### F-W1-003 — REVIEW — Dynamic UI dependency findings

The Wave 1 dependency audit reported one high-severity direct Vite finding and one low-severity transitive esbuild finding. Impact on the shipped Android/runtime product is not yet classified because these dependencies may be limited to build tooling. Do not promote this to a production vulnerability until reachability and shipped-asset impact are verified.

### F-W1-004 — REVIEW — Mobile Files layout candidates

Production RS File assets rendered in the public evidence shell show possible mobile command-bar width/overflow and context-menu layout concerns. These remain candidates rather than confirmed product defects until reproduced on the Android-served page or a physical device.

### F-W1-005 — AUDIT INFRA — Android emulator evidence is not yet trustworthy

Earlier public Android emulator evidence jobs were affected by obsolete SDK bootstrap and later by runner shutdown/orphaning. The current Wave 1 workflow no longer requests the removed legacy Android `tools` package and targets 4.7.13, so historical emulator failures are not a valid verdict on the candidate. A fresh current-definition emulator run and actual screenshot review remain mandatory.

## Evidence already established

- Private source checkout through `RS_STORAGE_READ_TOKEN` works on the public runner without publishing the private tree.
- Regression map was produced against the stabilization branch.
- Agent contract suite: 73/73 pass.
- ARM64 debug build and package validation pass for version 4.7.13.
- RS File real-browser behavior gates pass.
- Eight Web visual evidence screenshots were captured and manually reviewed.
- Security/dependency baseline artifacts were produced.
- The dedicated end-to-end Agent tool parity gate passed on its fifth attempt against the current 4.7.13 target, including concrete Git write operations.

## Mandatory remaining gates

1. Fresh integrated Wave 2 runtime tool-surface and controlled real-task audit on the current target.
2. Fresh Android emulator/device screenshots plus UI hierarchy and logcat review using the current workflow definition.
3. Web UI served by the actual Android application.
4. Upgrade/data-preservation test from the previous installed build to the candidate without uninstall/reset, preserving the application ID/signing lineage and user configuration.
5. Transfer/upload/copy performance and cancellation/recovery tests with synthetic payloads.
6. Physical hotspot/Wi-Fi/Wi-Fi Direct validation where CI cannot truthfully emulate the network topology.
7. Consolidated recovery specification only after the evidence set is complete.

## Wave 2 public-runner rerun

This ledger refresh intentionally triggers the current Wave 2 real-task workflow on the public Template Lab runner. The reporter records only allow-listed gate markers and job conclusions; it never publishes the private RS Storage source tree.
