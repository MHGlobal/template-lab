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
# Keep the display awake on slow software-emulated runners; a sleeping display leaves MainActivity resumed but never drawn.
adb shell svc power stayon true || true
adb shell input keyevent KEYCODE_WAKEUP || true
adb shell wm dismiss-keyguard || true
# Give hosted Intel emulator system services time to settle. Previous evidence
# contained Bluetooth/SystemUI dialogs unrelated to RS Storage.
sleep 20
adb shell input keyevent 3 >/dev/null 2>&1 || true
adb shell am force-stop com.rs.localstorage
adb shell am start -W -n com.rs.localstorage/.MainActivity >/tmp/rs-wave1-am-start.txt
grep -Eq 'Status: ok|Complete' /tmp/rs-wave1-am-start.txt
sleep 8
adb shell pidof com.rs.localstorage | tee "$WS/audit-out/android/pid.txt"
READY=0
for attempt in $(seq 1 40); do
  adb shell input keyevent KEYCODE_WAKEUP >/dev/null 2>&1 || true
  adb shell wm dismiss-keyguard >/dev/null 2>&1 || true
  adb shell dumpsys activity activities > "$WS/audit-out/android/activity.txt"
  adb shell uiautomator dump /data/local/tmp/rs-window.xml >/dev/null 2>&1 || true
  adb pull /data/local/tmp/rs-window.xml "$WS/audit-out/android/window.xml" >/dev/null 2>&1 || true
  if [ -f "$WS/audit-out/android/window.xml" ] && grep -Eqi "isn't responding|keeps stopping|has stopped|not responding" "$WS/audit-out/android/window.xml"; then
    if grep -Eqi "com\\.rs\\.localstorage|RS Storage" "$WS/audit-out/android/window.xml"; then
      echo "ANDROID_VISUAL_APP_DIALOG=FAIL" >&2
      exit 1
    fi
    cp "$WS/audit-out/android/window.xml" "$WS/audit-out/android/transient-system-dialog-$attempt.xml" || true
    adb exec-out screencap -p > "$WS/audit-out/android/transient-system-dialog-$attempt.png" || true
    if [ "$attempt" -le 3 ]; then
      echo "ANDROID_VISUAL_TRANSIENT_SYSTEM_DIALOG=RECOVER"
      adb shell input keyevent 4 >/dev/null 2>&1 || true
      adb shell input keyevent 3 >/dev/null 2>&1 || true
      sleep 3
      adb shell am force-stop com.rs.localstorage || true
      adb shell monkey -p com.rs.localstorage -c android.intent.category.LAUNCHER 1 >/dev/null || true
      sleep 5
      continue
    fi
    echo "ANDROID_VISUAL_RUNNER_SYSTEM_DIALOG=FAIL" >&2
    exit 1
  fi
  APP_DRAWN="$(grep -A100 -F 'mActivityComponent=com.rs.localstorage/.MainActivity' "$WS/audit-out/android/activity.txt" | grep -m1 'reportedDrawn=' || true)"
  if grep -q 'topResumedActivity=.*com.rs.localstorage/.MainActivity' "$WS/audit-out/android/activity.txt" && printf '%s' "$APP_DRAWN" | grep -q 'reportedDrawn=true'; then
    READY=1
    break
  fi
  sleep 1
done
if [ "$READY" != 1 ]; then
  echo "ANDROID_VISUAL_APP_NOT_DRAWN=FAIL" >&2
  exit 1
fi
adb exec-out screencap -p > "$WS/audit-out/android/01-main-launch.png"
adb shell input keyevent 4 || true
sleep 2
adb exec-out screencap -p > "$WS/audit-out/android/02-after-back.png"
adb logcat -d -t 600 > "$WS/audit-out/android/logcat-tail.txt"
