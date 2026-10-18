# RS Screen Manager — Design contract (connect+)

Status: established requirements for the WinUI 3 preview. This is **not** approval of incomplete functionality or a new visual direction.

## Product outcome
Enable beginner through expert Windows users to connect authorized Android devices, mirror a screen, create independent virtual Android displays, and manage sessions, recordings and game mappings with predictable actions and clear status. Never suggest an unfinished integration works.

## Fixed identity
- Product: **RS Screen Manager**
- Slogan: **connect+**
- Brand: exclusive abstract mark (the executable icon is an implementation proposal)
- Primary blue: **#007BFF**
- Background: **#090B10**
- Gaming-only accent: **#FF6B35**
- Windows typography: Segoe UI
- Personality: clean, corporate, capable; filled Fluent iconography, moderately squared controls

## Surface and performance
- **Dashboard: full Liquid Glass**. Cards have dark frosted acrylic, translucent border and low-noise visual hierarchy even while sessions run.
- Video and Gaming **in-session UI**: plain dark composited surfaces, no full-screen blur or effects on video; prioritize FPS, latency and input.
- The shared XAML `GlassCard` is reserved for dashboard/ordinary chrome. `PerformanceCard` is used on video, virtual display and Gaming routes. Neither is meant to fake video or advanced functionality.

## Interaction model
1. Dashboard answers **what should I do now?** — Connect Android, Mirror, Create virtual display.
2. Device page shows connected, unauthorized, offline and empty states; do not bypass ADB consent.
3. Virtual display defaults to native Android dimensions and only uses forced landscape if selected.
4. App/launcher selection is progressive; package ID/manual FPS and bitrate reside in a dedicated advanced panel.
5. Clipboard policy is chosen for new sessions; PC→Android clipboard paste remains available via scrcpy, but live hot-switch in an already-open session is not implemented.
6. Actions requiring an item (terminate selected session, open recording) are disabled until selection; error and empty states show next steps.
7. Onboarding is first-run only. Reconnect previously authorized sessions without bypassing prompts.

## Visual and accessibility rules
- Text is not an icon. Use Segoe Fluent Icons for actionable controls with readable labels/accessible names.
- Focus remains keyboard visible; tab order follows visual reading order. Primary and secondary buttons have at least 44 DIP touch targets.
- 8 DIP spacing rhythm: 8 for related subitems; 12–16 for control groups; 22–32 for page sections.
- On small windows, dashboard actions stack, stat cards reflow, and advanced/onboarding surfaces fit within the viewport.
- State colors are semantic: blue = action/info, green = authorized, amber = waiting/permission, Gaming orange = identity only.
- A build or static scan alone is **not** visual sign-off. Visual QA requires opening on Windows at multiple DPI/scales and testing with Android USB/Wi-Fi.

## Preservation and non-goals
Preserve existing ADB/scrcpy, native fallback, session management, diagnostics, recording, privacy and feature commitments. Do not claim FFmpeg embedded video or gaming touch injection before those runtime integrations are implemented. Do not replace this design contract with generic Impeccable defaults.
