# RS Storage — remaining physical evidence

Use the existing private `RS Storage Physical Runner Probe` and release/install workflows. Do not create a second runner. A queued job without steps is not evidence of a connected phone.

## Update compatibility before network testing

On the workstation connected by ADB to the already-installed phone, set `APK` to the signed candidate downloaded from the private release workflow and `APKSIGNER` to the Android SDK executable. Keep APKs and signing metadata private.

```bash
set -euo pipefail
adb devices -l
adb shell getprop ro.product.model
adb shell dumpsys package com.rs.localstorage > before-package.txt
OLD_PATH=$(adb shell pm path com.rs.localstorage | tr -d '\r' | sed -n 's/^package://p' | head -1)
test -n "$OLD_PATH"
adb pull "$OLD_PATH" previous-installed.apk
"$APKSIGNER" verify --print-certs previous-installed.apk > before-signature.txt
"$APKSIGNER" verify --print-certs "$APK" > candidate-signature.txt
diff <(sed -n '/certificate SHA-256 digest/p' before-signature.txt) <(sed -n '/certificate SHA-256 digest/p' candidate-signature.txt)
adb shell mkdir -p /storage/emulated/0/Download/RSAgentWorkspace
adb shell 'echo rs-physical-update-marker > /storage/emulated/0/Download/RSAgentWorkspace/physical-update-marker.txt'
adb exec-out screencap -p > before-update.png
adb install -r "$APK"
adb shell am start -W -n com.rs.localstorage/.MainActivity
adb shell cat /storage/emulated/0/Download/RSAgentWorkspace/physical-update-marker.txt
adb shell dumpsys package com.rs.localstorage > after-package.txt
adb exec-out screencap -p > after-update.png
```

Before updating, manually set distinctive non-secret port/UI settings and create a representative file in RS FILE. After updating, verify those exact settings, administrator login, file, folder position and media index. Record screenshots of the settings before/after. An external marker alone does not prove SharedPreferences preservation. If signer comparison fails, stop: do not uninstall or clear data.

## Network matrix

For each row, record the phone model/Android version, client OS, server IP/port, direct-IP URL, `.local` result, 32 MiB upload/download SHA-256, elapsed time, and screenshots from both devices.

| Network | Client | Required lifecycle |
|---|---|---|
| Phone hotspot | Second Android | screen off/on, stop/start, restart |
| Phone hotspot | Windows laptop | screen off/on, stop/start, restart |
| Shared Wi-Fi | Android and Windows | Nearby deny/grant, reconnect |
| Mobile data + hotspot | Android or Windows | server URLs and mDNS binding |
| Wider `/23`, `/20` or `/16`, when available | Connected client | same-subnet admission |
| IPv6-capable LAN, when available | Connected client | bracketed/scoped URL and access |

Use the actual IP/port shown by the APK, then independently try `http://rsstorage.local` and the advertised port. A `.local` failure must not be hidden by a successful direct-IP test.

On Windows, generate a payload and record its hash:

```powershell
$payload = New-Object byte[] (32MB)
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($payload)
$rng.Dispose()
[System.IO.File]::WriteAllBytes("$PWD\physical32.bin", $payload)
Get-FileHash .\physical32.bin -Algorithm SHA256
```

Upload through authenticated RS FILE, navigate folders while it runs, inspect transfer progress/priority, download the completed file, and compare `Get-FileHash` of both files. Repeat copy/move, cancellation and `.part`/`.partial` cleanup. Verify the selected upload survives navigation, folder position is restored, context menu actions work and the transfer button is absent on login.

On Android 16, deny Nearby from app settings, return to the app and verify LAN is unavailable and the UI reports that limitation. Grant Nearby, return and verify IP and `.local` independently. Record the actual service state and screenshots. Do not substitute ADB-forwarded loopback for client LAN access.

## Security boundary

HTTP is plaintext. Password hashing, HttpOnly, SameSite and CSRF do not encrypt packets. Use an owner-controlled encrypted hotspot for this test. General shared/untrusted-LAN release remains pending the disposition of `F-SEC-001`; no self-signed HTTPS approval is implied here.

## Completion record

Every row requires observed PASS/FAIL/BLOCKED and evidence references. Preserve failures and environment limitations. Do not mark the physical gate PASS from installation, PID, one screenshot or direct-IP access alone.
