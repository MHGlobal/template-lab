# RS Screen Manager — WinUI 3 preview (connect+)

**Status: development preview, not v1.0.** Windows x64 app in native C++20/WinUI 3. The original Win32 manager is still included and has not been removed. The application stays agentless for core features; any future Android Companion must remain optional and require user permission.

## Approved design implemented in the preview
- Identity: **RS Screen Manager · connect+**, a proposed abstract geometric mark, main blue `#007BFF`, near-black `#090B10`; Gaming accent `#FF6B35`.
- Dark corporate dashboard with large translucent acrylic cards and restrained visual hierarchy.
- Card-first home with the primary **Create virtual display** action.
- Horizontal routing to Devices, Mirroring, Virtual Displays, Gaming, Control Editor, Profiles, Diagnostics, Settings, History and Help.
- Lower visual complexity in Gaming/video routes to prioritize the video FPS; no glass overlay on external scrcpy video.
- User-facing connection instructions in Portuguese; this build has **not** finished the approved automatic PT/EN localization.

## Functionality available in this preview
- ADB device discovery of `device`, `unauthorized` and `offline`, with state surfaced to the user.
- Selected-device mirroring and independent virtual-display sessions through bundled official scrcpy.
- Multiple scrcpy processes, with last-session stop and simple current-run history.
- Wi-Fi pairing using PIN, connect/disconnect and optional reconnect of the saved endpoint.
- Saved FPS, bitrate, virtual resolution, launcher, audio duplication and auto-restore choices under `%LOCALAPPDATA%\RS Screen Manager\winui-settings.ini`.
- Eco, Balanced, Quality and Gaming video presets (targets, subject to actual device capability).
- On startup, when enabled, rechecks ADB authorization and attempts to resume the saved sessions. No root, bypass or hidden Android permissions.
- Compiled/tested independent C++ touch mapping state engine (not yet connected to live scrcpy touch injection).

## Still pending — do not present as functional
- **In-app live video**: scrcpy currently opens separate windows; no FFmpeg/D3D11 embedded renderer, no live previews in device grid or integrated tabbed mirroring.
- **Gaming touch editor**: real multi-pointer injection, Raw Input/Windows gamepad pipeline, drag-and-drop editor, macros, per-game profiles, overlays, import/export and simultaneous session touch mapping.
- **Additional virtual-display workflows**: app-launch picker, arbitrary custom presets, per-display lifecycle control, comprehensive virtual-display capability detection.
- **Full localization**: Portuguese UI is present, automatic English localization remains unimplemented.
- **Recording library and management**, native screenshots panel, latency/CPU/GPU telemetry, full connection wizard with illustrated screenshots, compulsory first-run onboarding and complete accessibility auditing.
- Final polished brand logomark and actual animation/motion system (the current geometric mark is a provisional implementation proposal).
- Optional Android Companion APK is not built and must never be installed without consent.

The UI explicitly explains when a capability is unfinished rather than showing controls that only pretend to work. Existing native fallback functionality is retained.

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
