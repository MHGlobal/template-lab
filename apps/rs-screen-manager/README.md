# RS Screen Manager — connect+ 0.4.1-alpha (WinUI 3 preview)

**Status: development preview, not v1.0.** Windows x64 app in native C++20/WinUI 3. The original Win32 manager is still included and has not been removed. The application stays agentless for core features; any future Android Companion must remain optional and require user permission.

## v0.4.1-alpha verified source changes (device QA pending)
- Offline application search and favorites, persisted in local settings; no fabricated app labels or icons.
- Library searches/folders filtered by MP4/PNG and deletion confirmation; active MP4 recording cannot be deleted.
- Android physical screenshot now performed asynchronously with timeout and file signature validation.
- New unit-tested viewport coordinate mapping supports 0/90/180/270-degree rotation and excludes letterbox margins. The embedded renderer and genuine Android touch injection remain future dependencies.
- Full implementation audit and remaining work are tracked in `STATUS_IMPLEMENTACAO.md`.

## Approved design implemented in the preview
- Identity: **RS Screen Manager · connect+**, a proposed abstract geometric mark, main blue `#007BFF`, near-black `#090B10`; Gaming accent `#FF6B35`.
- Dark corporate dashboard with large translucent acrylic cards and restrained visual hierarchy.
- Card-first home with the primary **Create virtual display** action.
- Horizontal routing to Devices, Mirroring, Virtual Displays, Gaming, Control Editor, Profiles, Diagnostics, Settings, History and Help.
- Lower visual complexity in Gaming/video routes to prioritize the video FPS; no glass overlay on external scrcpy video.
- User-facing connection instructions in Portuguese; this build has **not** finished the approved automatic PT/EN localization.

## v0.3.0-alpha usability and runtime improvements
- Home now explains the order of use: **1. Connect an Android device → 2. Choose virtual display or mirroring**, with a clearer description of each.
- **Advanced options in an independent side panel**, including FPS, bitrate, custom launcher and technical caveats. The main Settings screen retains daily-use controls.
- **Virtual display launch target**: choose the Android system launcher, choose an installed third-party app from the currently authorized device (package list via ADB), or specify a custom launcher package in Advanced. Some non-launchable packages may appear and cannot be opened by scrcpy.
- **Automatic orientation is the default**: launches with native Android display dimensions (`--new-display`) and does not impose landscape. Explicit portrait and landscape sizes remain available, and landscape carries a compatibility warning. This does not guarantee every Android app supports virtual displays or auto-rotation.
- **Clipboard sharing** through official scrcpy: while the scrcpy window has focus, normal Android copy/paste shortcuts are available and the default mode syncs Android clipboard updates to Windows. Settings and the mirroring page let the user prefer PC (via `--no-clipboard-autosync`) or Android/automatic sync for **new sessions**. This is a real configuration change but it **does not hot-switch existing sessions**; clipboard sharing needs the Android app to allow copy/paste, and pasting PC content exposes it to other Android apps.
- Auto-resume saves the original virtual-display package, orientation and clipboard policy per session; it never bypasses Android permission.
- ADB installed-app listing uses a bounded temporary output file to avoid a stdout pipe deadlock.
- CI tests for orientation and clipboard policy in `tests/virtual_display_policy_test.cpp`.

## v0.3.1-alpha targeted UI polish (design contract)
- Preserves full **Liquid Glass** on the dashboard while using lower-cost `PerformanceCard` surfaces in mirroring, virtual-display and Gaming routes.
- Eliminates ambiguous selected-item actions: terminate-selected and open-recording are disabled until a valid list item is selected.
- Adds explicit first-use/empty states for disconnected devices, session lists and recordings, with clear next actions.
- Makes the header connection badge semantically accurate: green when at least one Android is ADB-authorized; amber when none is.
- Fits onboarding and advanced settings panels inside the available window width instead of fixing a desktop-only width.
- Introduces consistent 44-DIP minimum height for primary and secondary buttons and Fluent icons instead of text glyphs in library/diagnostics actions.
- Provides a shared `DESIGN.md` with immutable approved brand and functional constraints.
- CI includes a WinUI XML/event/state/style regression gate; **passing CI does not prove pixel-perfect runtime appearance**.

## Functionality available in this preview
- ADB device discovery of `device`, `unauthorized` and `offline`, with state surfaced to the user.
- Selected-device mirroring and independent virtual-display sessions through bundled official scrcpy.
- Multiple simultaneous scrcpy sessions with individual selection/termination, and an automatic lifecycle check to remove exited scrcpy processes.
- Optional native scrcpy MP4 recording for new mirroring or virtual-display sessions. Uses a graceful WM_CLOSE stop to help finalize recording containers before forced termination fallback.
- Physical-device screenshots via authorized `adb exec-out screencap -p`, saved as PNG after verifying the PNG signature and successful capture process exit.
- Local recordings catalogue: enumerate saved PNG/MP4, select/open with the system default application, refresh, and open the containing folder.
- Wi-Fi pairing using PIN, connect/disconnect and optional reconnect of the saved endpoint.
- Saved FPS, bitrate, virtual resolution, launcher, audio duplication and auto-restore choices under `%LOCALAPPDATA%\RS Screen Manager\winui-settings.ini`.
- Eco, Balanced, Quality and Gaming video presets (targets, subject to actual device capability).
- On startup, when enabled, rechecks ADB authorization and attempts to resume the saved sessions. No root, bypass or hidden Android permissions.
- Compiled/tested independent C++ touch mapping state engine (not yet connected to live scrcpy touch injection).

## Still pending — do not present as functional
- **In-app live video**: scrcpy currently opens separate windows; no FFmpeg/D3D11 embedded renderer, no live previews in device grid or integrated tabbed mirroring.
- **Gaming touch editor**: real multi-pointer injection, Raw Input/Windows gamepad pipeline, drag-and-drop editor, macros, per-game profiles, overlays, import/export and simultaneous session touch mapping.
- **Additional virtual-display workflows**: friendly per-app labels/icons (the current chooser lists verified installed package IDs), app launchability checks, arbitrary custom presets, comprehensive virtual-display capability detection and runtime orientation decisions based on the foreground app.
- **Full localization**: Portuguese UI is present, automatic English localization remains unimplemented.
- **Advanced recording library**: thumbnail previews, media metadata, filtering/search, record controls after a session starts, native screenshot of an Android virtual display, and stable recording integrity guarantees under unexpected power/process failure.
- Latency/CPU/GPU telemetry, full connection wizard with illustrated screenshots and comprehensive accessibility auditing. A first-run onboarding flow is implemented, but still needs physical UI testing.
- Final polished brand logomark and actual animation/motion system (the current geometric mark is a provisional implementation proposal).
- Optional Android Companion APK is not built and must never be installed without consent.

Media is saved under `%LOCALAPPDATA%\\RS Screen Manager\\Recordings`. Recording is only enabled when explicitly switched on for a new session. Automatic resume intentionally does not restart recording, to avoid unintentional recording after a restart.

The UI explicitly explains when a capability is unfinished rather than showing controls that only pretend to work. **A live clipboard-source switch in already running scrcpy windows, without restarting the session, still needs a dedicated scrcpy control integration.** Existing native fallback functionality is retained.

## Connect an Android
1. Enable Developer options and USB debugging.
2. Connect USB and accept the Android RSA authorization prompt.
3. Open **Dispositivos** and select a `device` (authorized) entry.
4. Choose mirroring or create a virtual display.
5. For Wi-Fi, use Android Wireless Debugging pairing IP:port + 6-digit PIN. Pairing and connection ports can differ.

The virtual display is not Xiaomi/HyperOS Second Space. A launcher such as `org.fossify.home` may be required for a virtual display.

## Build and verify
GitHub Actions workflows:
- `.github/workflows/rs-screen-manager-winui.yml` — WinUI C++ compilation, native mapper tests, signed-hash verification of scrcpy v5.0.1 official ZIP and self-contained WinUI installer/portable build.
- `.github/workflows/rs-screen-manager-windows.yml` — classic native backup manager plus mapper tests and installer.

Use the `feature/rs-screen-manager` branch. A green CI build validates compilation and package contents, **not actual physical-device operation or visual accessibility**, which require Windows/Android hands-on tests.
