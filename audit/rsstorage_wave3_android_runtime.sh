#!/usr/bin/env bash
WS="${1:?workspace path required}"
set -euo pipefail
OUT="$WS/audit-out/android"
WEB="$WS/audit-out/web-android-served"
OLD="$WS/private-builds/previous.apk"
NEW="$WS/private-builds/candidate.apk"
mkdir -p "$OUT" "$WEB"
git -C "$WS/target" rev-parse HEAD > "$OUT/target-sha.txt"
wait_android_ready() {
  adb wait-for-device
  for ((i=1;i<=240;i++)); do
    local boot
    boot="$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')"
    if [ "$boot" = 1 ] && adb shell cmd package list packages >/dev/null 2>&1; then
      echo "ANDROID_PACKAGE_MANAGER_READY=true"
      return 0
    fi
    sleep 2
  done
  echo "ANDROID_PACKAGE_MANAGER_READY=false" >&2
  adb devices -l || true
  adb shell getprop 2>/dev/null | tail -80 || true
  return 1
}
wait_external_storage() {
  for attempt in $(seq 1 60); do
    if adb shell "test -d /storage/emulated/0 && touch /storage/emulated/0/.rs-audit-ready && rm -f /storage/emulated/0/.rs-audit-ready" >/dev/null 2>&1; then
      echo "ANDROID_EXTERNAL_STORAGE_READY=true"
      return 0
    fi
    sleep 2
  done
  echo "ANDROID_EXTERNAL_STORAGE_RECOVERY=reboot"
  adb reboot || true
  wait_android_ready
  for attempt in $(seq 1 60); do
    if adb shell "test -d /storage/emulated/0 && touch /storage/emulated/0/.rs-audit-ready && rm -f /storage/emulated/0/.rs-audit-ready" >/dev/null 2>&1; then
      echo "ANDROID_EXTERNAL_STORAGE_READY=true"
      return 0
    fi
    sleep 2
  done
  echo "ANDROID_EXTERNAL_STORAGE_READY=false" >&2
  return 1
}

print_install_diagnostics() {
  local apk="$1" log="$2"
  python3 - "$apk" "$log" <<'PY'
import re,sys
apk,log=sys.argv[1:]
try:
    lines=open(log,encoding='utf-8',errors='ignore').read().splitlines()
except OSError:
    raise SystemExit
keep=[]
for line in lines:
    safe=line.replace(apk,'<apk>')
    if re.search(r'INSTALL_FAILED_[A-Z0-9_]+|Failure \[|ADB_INSTALL_TIMEOUT_SECONDS=|protocol fault|device offline|error:|adb: failed to install',safe,re.I):
        keep.append(safe[:500])
for line in keep[-12:]:
    print('ADB_INSTALL_DIAGNOSTIC='+line)
PY
}
adb_install_bounded() {
  local mode="$1" apk="$2" log="$3" marker
  marker="$(printf '%s' "$mode" | tr '[:lower:]' '[:upper:]')"
  for attempt in 1 2 3; do
    echo "ADB_INSTALL_MODE=$mode ATTEMPT=$attempt APK=$(basename "$apk")" | tee -a "$log"
    if python3 - "$mode" "$apk" "$log" <<'PY'
import subprocess,sys
mode,apk,log=sys.argv[1:]
cmd=['adb','install']
if mode=='upgrade': cmd.append('-r')
cmd.append(apk)
with open(log,'a',encoding='utf-8') as fh:
    fh.write('CMD='+' '.join(cmd)+'\n'); fh.flush()
    try:
        p=subprocess.run(cmd,stdout=fh,stderr=subprocess.STDOUT,timeout=300)
        raise SystemExit(p.returncode)
    except subprocess.TimeoutExpired:
        fh.write('ADB_INSTALL_TIMEOUT_SECONDS=300\n'); fh.flush()
        raise SystemExit(124)
PY
    then
      echo "ADB_INSTALL_${marker}=PASS" | tee -a "$log"
      return 0
    fi
    echo "ADB_INSTALL_${marker}_ATTEMPT_${attempt}=FAIL" | tee -a "$log"
    print_install_diagnostics "$apk" "$log"
    adb devices -l || true
    adb kill-server || true
    sleep 2
    adb start-server
    wait_android_ready || true
  done
  print_install_diagnostics "$apk" "$log"
  echo "ADB_INSTALL_${marker}=FAIL" | tee -a "$log"
  return 1
}

run_as_write_file() {
  local local_file="$1" remote_file="$2"
  python3 - "$local_file" "$remote_file" <<'PY'
import base64,subprocess,sys
local_file,remote_file=sys.argv[1:]
data=base64.b64encode(open(local_file,'rb').read()).decode('ascii')
remote=f"run-as com.rs.localstorage sh -c 'printf %s {data} | toybox base64 -d > {remote_file}'"
try:
    p=subprocess.run(['adb','shell',remote],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=30)
except subprocess.TimeoutExpired:
    print(f"ADB_RUN_AS_WRITE_TIMEOUT={remote_file}", file=sys.stderr)
    raise SystemExit(124)
if p.returncode:
    print(f"ADB_RUN_AS_WRITE_FAILED={remote_file}", file=sys.stderr)
    print(p.stdout[-2000:], file=sys.stderr)
    raise SystemExit(p.returncode)
print(f"ADB_RUN_AS_WRITE_PASS={remote_file}")
PY
}

tap_ui() {
  local wanted="$1"
  adb shell uiautomator dump /data/local/tmp/rs-audit-window.xml >/dev/null
  adb pull /data/local/tmp/rs-audit-window.xml /tmp/rs-audit-window.xml >/dev/null
  local xy
  xy=$(python3 - "$wanted" <<'PY'
import re,sys,xml.etree.ElementTree as ET
wanted=sys.argv[1]
root=ET.parse('/tmp/rs-audit-window.xml').getroot()
for n in root.iter('node'):
    if n.attrib.get('text')==wanted or n.attrib.get('content-desc')==wanted:
        m=re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',n.attrib.get('bounds',''))
        if m:
            x1,y1,x2,y2=map(int,m.groups());print((x1+x2)//2,(y1+y2)//2);raise SystemExit
raise SystemExit(3)
PY
  )
  adb shell input tap $xy
  sleep 1
}
wait_android_ready
echo 'Installing previous production baseline without uninstall path...' | tee "$OUT/upgrade-evidence.txt"
adb_install_bounded baseline "$OLD" "$OUT/baseline-install.log"
AUDIT_PASS="RsAudit-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-A9!"
export AUDIT_PASS
python3 - <<'PY' >/tmp/rs_users.xml
import base64,hashlib,os,secrets
pw=os.environ['AUDIT_PASS'].encode(); salt=secrets.token_bytes(16); digest=hashlib.pbkdf2_hmac('sha256',pw,salt,180000,dklen=32)
print('<?xml version="1.0" encoding="utf-8" standalone="yes" ?>'); print('<map>'); print('  <string name="admin_user">admin</string>'); print('  <string name="admin_salt">'+base64.b64encode(salt).decode()+'</string>'); print('  <string name="admin_hash">'+base64.b64encode(digest).decode()+'</string>'); print('</map>')
PY
cat >/tmp/rs_onboarding.xml <<'EOF'
<?xml version="1.0" encoding="utf-8" standalone="yes" ?>
<map><boolean name="v4710_exact_targets_done" value="true" /></map>
EOF
cat >/tmp/rs_ui.xml <<'EOF'
<?xml version="1.0" encoding="utf-8" standalone="yes" ?>
<map><boolean name="motion" value="false" /><boolean name="compact" value="false" /></map>
EOF
adb shell run-as com.rs.localstorage mkdir -p shared_prefs files
printf 'upgrade-marker-%s\n' "$GITHUB_RUN_ID" > /tmp/rs-audit-preserve.txt
run_as_write_file /tmp/rs-audit-preserve.txt files/rs-audit-preserve.txt
run_as_write_file /tmp/rs_users.xml shared_prefs/rs_users.xml
run_as_write_file /tmp/rs_onboarding.xml shared_prefs/rs_onboarding.xml
run_as_write_file /tmp/rs_ui.xml shared_prefs/rs_ui.xml
wait_external_storage
adb shell mkdir -p /storage/emulated/0/RSAgentWorkspace
adb shell "echo external-upgrade-marker-${GITHUB_RUN_ID} > /storage/emulated/0/RSAgentWorkspace/rs-audit-preserve.txt"
echo 'Applying candidate with adb install -r (no uninstall)...' | tee -a "$OUT/upgrade-evidence.txt"
adb_install_bounded upgrade "$NEW" "$OUT/candidate-update-install.log"
adb shell dumpsys package com.rs.localstorage | grep -E 'versionName=|versionCode=' | head -4 | tee -a "$OUT/upgrade-evidence.txt"
adb shell dumpsys package com.rs.localstorage | grep -q 'versionName=4.7.13'
adb exec-out run-as com.rs.localstorage cat files/rs-audit-preserve.txt | grep -q "upgrade-marker-${GITHUB_RUN_ID}"
adb exec-out run-as com.rs.localstorage cat shared_prefs/rs_users.xml | grep -q 'admin_hash'
adb shell cat /storage/emulated/0/RSAgentWorkspace/rs-audit-preserve.txt | grep -q "external-upgrade-marker-${GITHUB_RUN_ID}"
echo 'UPGRADE_INTERNAL_DATA_PRESERVED=true' | tee -a "$OUT/upgrade-evidence.txt"
echo 'UPGRADE_SHARED_PREFS_PRESERVED=true' | tee -a "$OUT/upgrade-evidence.txt"
echo 'UPGRADE_EXTERNAL_WORKSPACE_PRESERVED=true' | tee -a "$OUT/upgrade-evidence.txt"
adb shell pm grant com.rs.localstorage android.permission.POST_NOTIFICATIONS || true
adb shell pm grant com.rs.localstorage android.permission.NEARBY_WIFI_DEVICES || true
adb shell appops set com.rs.localstorage MANAGE_EXTERNAL_STORAGE allow || true
adb shell am force-stop com.rs.localstorage
adb shell am start -W -n com.rs.localstorage/.MainActivity >/tmp/rs-wave3-am-start.txt
grep -Eq 'Status: ok|Complete' /tmp/rs-wave3-am-start.txt
sleep 5
adb shell pidof com.rs.localstorage | tee "$OUT/pid.txt"
adb exec-out screencap -p > "$OUT/01-native-server-stopped.png"
adb shell uiautomator dump /data/local/tmp/rs-native.xml >/dev/null || true
adb pull /data/local/tmp/rs-native.xml "$OUT/01-native-server-stopped.xml" >/dev/null || true
tap_ui 'Ativar servidor'
adb forward tcp:18080 tcp:8080
ok=0
for i in $(seq 1 75); do if curl -fsS --max-time 2 http://127.0.0.1:18080/login >/dev/null 2>&1; then ok=1; break; fi; sleep 1; done
test "$ok" = 1
echo 'ANDROID_EMBEDDED_SERVER_8080=true' | tee -a "$OUT/upgrade-evidence.txt"
adb exec-out screencap -p > "$OUT/02-native-server-running.png"
tap_ui 'Media'; adb exec-out screencap -p > "$OUT/03-native-media.png"
tap_ui 'Clientes'; adb exec-out screencap -p > "$OUT/04-native-clients.png"
tap_ui 'Acessos'; adb exec-out screencap -p > "$OUT/05-native-access.png"
tap_ui 'Definições'; adb exec-out screencap -p > "$OUT/06-native-settings.png"
tap_ui 'IA'; sleep 2; adb exec-out screencap -p > "$OUT/07-native-rsia.png"
tap_ui 'APIs & endpoints'; sleep 2
adb exec-out screencap -p > "$OUT/08-native-rsia-providers.png"
adb shell uiautomator dump /data/local/tmp/rs-rsia-providers.xml >/dev/null || true
adb pull /data/local/tmp/rs-rsia-providers.xml "$OUT/08-native-rsia-providers.xml" >/dev/null || true
adb shell input keyevent 4 || true; sleep 1
adb shell input keyevent 4 || true; sleep 1
tap_ui 'Modelos & runtime'; sleep 2
adb exec-out screencap -p > "$OUT/09-native-rsia-models-runtime.png"
adb shell uiautomator dump /data/local/tmp/rs-rsia-models.xml >/dev/null || true
adb pull /data/local/tmp/rs-rsia-models.xml "$OUT/09-native-rsia-models-runtime.xml" >/dev/null || true
adb shell input keyevent 4 || true; sleep 1
curl -sS -D /tmp/rs-login.headers -o /dev/null -X POST --data-urlencode 'u=admin' --data-urlencode "p=$AUDIT_PASS" http://127.0.0.1:18080/login
RSSESSION=$(python3 - <<'PY'
import re
s=open('/tmp/rs-login.headers',encoding='utf-8',errors='ignore').read(); m=re.search(r'(?im)^Set-Cookie:\s*RSSESSION=([^;\r\n]+)',s)
if not m: raise SystemExit(2)
print(m.group(1))
PY
)
echo "::add-mask::$RSSESSION"
AUDIT_RSSESSION="$RSSESSION" node audit/rsstorage_wave3_android_served_web.mjs http://127.0.0.1:18080 "$WEB"
adb shell uiautomator dump /data/local/tmp/rs-final.xml >/dev/null || true
adb pull /data/local/tmp/rs-final.xml "$OUT/final-window.xml" >/dev/null || true
adb shell dumpsys activity activities > "$OUT/activity.txt"
adb logcat -d -t 1000 | grep -E 'AndroidRuntime|FATAL EXCEPTION|com\.rs\.localstorage' > "$OUT/logcat-app-tail.txt" || true
test "$(find "$OUT" -name '*.png' | wc -l)" -ge 9
test "$(find "$WEB" -name '*.png' | wc -l)" -ge 15
echo 'WAVE3_ANDROID_RUNTIME_GATES=PASS' | tee -a "$OUT/upgrade-evidence.txt"
