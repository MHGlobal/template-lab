#!/usr/bin/env bash
WS="${1:?workspace path required}"
set -euo pipefail
WS="$WS"
mkdir -p "$WS/audit-out/android"
git -C "$WS/target" rev-parse HEAD > "$WS/audit-out/android/target-sha.txt"
APK=$(find "$WS/external/llama.cpp/examples/llama.android/rsapp/build/outputs/apk/debug" -type f -name '*.apk' | head -1)
test -s "$APK"
adb install -r "$APK"
adb shell pm grant com.rs.localstorage android.permission.POST_NOTIFICATIONS || true
adb shell pm grant com.rs.localstorage android.permission.NEARBY_WIFI_DEVICES || true
adb shell appops set com.rs.localstorage MANAGE_EXTERNAL_STORAGE allow || true
adb shell am force-stop com.rs.localstorage
adb shell monkey -p com.rs.localstorage -c android.intent.category.LAUNCHER 1
sleep 8
adb shell pidof com.rs.localstorage | tee "$WS/audit-out/android/pid.txt"
adb exec-out screencap -p > "$WS/audit-out/android/01-main-launch.png"
adb shell dumpsys activity activities > "$WS/audit-out/android/activity.txt"
adb shell uiautomator dump /sdcard/rs-window.xml || true
adb pull /sdcard/rs-window.xml "$WS/audit-out/android/window.xml" || true
adb shell input keyevent 4 || true
sleep 2
adb exec-out screencap -p > "$WS/audit-out/android/02-after-back.png"
adb logcat -d -t 600 > "$WS/audit-out/android/logcat-tail.txt"
