# RS Screen Manager — alpha build

Native Windows x64 application written in C++20. This is an **initial executable prototype**, not the complete v1.0 WinUI 3 release.

## Currently functional
- Discover authorized, unauthorized, or offline Android devices using bundled ADB.
- USB connection and wireless pairing (IP:port and 6-digit pairing code) / connect / disconnect.
- Launch scrcpy 5.0.1 **physical mirroring** or **independent virtual display** per selected device.
- Multiple simultaneous session processes, 60/30/90/120 FPS *targets*; resolution, bitrate, output or duplicated audio.
- Raw Android HID keyboard/mouse/gamepad modes (when supported by device).
- Save settings to %LOCALAPPDATA%\RS Screen Manager\settings.ini.
- Exit and stop a selected scrcpy process.

## Not implemented in this alpha
- Full WinUI 3 interface, in-window video renderer.
- PC WASD/mouse-to-touch/gamepad visual mapping engine, cross-session game input.
- Companion Android APK, recording management, advanced profiles, device health dashboard.
Do not claim these are functional merely because the options have been specified.

## USB setup
Turn on Developer options > USB debugging on your Android, connect by USB and authorize the PC. Pick your device and select Mirror or Virtual Screen.

## Wi-Fi pairing
In Android Developer options, open Wireless debugging, choose Pair with pairing code, enter its pairing IP:port and 6-digit code, then press Pair. For connection, enter the Android's wireless debugging connection IP:port, then press Connect. These two ports may differ.

## Notes
Bundled adb.exe and scrcpy.exe originate from the official scrcpy v5.0.1 Windows release; the CI verifies the documented SHA-256.
Virtual screens on HyperOS may need an installed launcher such as org.fossify.home. Virtual display does NOT grant access to Xiaomi Second Space while a different Android user is current.
For games: HID controls are **native Android HID**, not yet PC-to-touch mapping. That engine is a separate unfinished requirement.
Always comply with the game's terms of service. Software is provided unsigned and may prompt Windows SmartScreen.
