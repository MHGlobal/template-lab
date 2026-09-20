#!/usr/bin/env bash
WS="${1:?workspace path required}"
set -euo pipefail
OUT="$WS/audit-out/wave5"
mkdir -p "$OUT"
git -C "$WS/target" rev-parse HEAD > "$OUT/target-sha.txt"
exec > >(tee "$OUT/lnp-runtime.log") 2>&1

wait_boot() {
  adb wait-for-device
  for ((i=1;i<=300;i++)); do
    boot="$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')"
    if [ "$boot" = 1 ] && adb shell cmd package list packages >/dev/null 2>&1; then
      echo "ANDROID_PACKAGE_MANAGER_READY=true"
      return 0
    fi
    sleep 2
  done
  echo "ANDROID_PACKAGE_MANAGER_READY=false" >&2
  adb devices -l || true
  return 1
}
wait_core_services() {
  for attempt in $(seq 1 60); do
    if adb shell service check package 2>/dev/null | grep -qi found &&
       adb shell service check activity 2>/dev/null | grep -qi found &&
       adb shell service check appops 2>/dev/null | grep -qi found; then
      echo "ANDROID_CORE_SERVICES=PASS"
      return 0
    fi
    sleep 2
  done
  echo "ANDROID_CORE_SERVICES_RECOVERY=reboot"
  adb reboot || true
  wait_boot
  for attempt in $(seq 1 60); do
    if adb shell service check package 2>/dev/null | grep -qi found &&
       adb shell service check activity 2>/dev/null | grep -qi found &&
       adb shell service check appops 2>/dev/null | grep -qi found; then
      echo "ANDROID_CORE_SERVICES=PASS"
      return 0
    fi
    sleep 2
  done
  echo "ANDROID_CORE_SERVICES=FAIL" >&2
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
    if re.search(r'INSTALL_FAILED_[A-Z0-9_]+|Failure \\[|ADB_INSTALL_TIMEOUT_SECONDS=|protocol fault|device offline|error:|adb: failed to install',safe,re.I):
        keep.append(safe[:500])
for line in keep[-12:]:
    print('ADB_INSTALL_DIAGNOSTIC='+line)
PY
}
adb_install_bounded() {
  local apk="$1" log="$2"
  for attempt in 1 2 3; do
    echo "ADB_INSTALL_ATTEMPT=$attempt APK=$(basename "$apk")" | tee -a "$log"
    if python3 - "$apk" "$log" <<'PY'
import subprocess,sys
apk,log=sys.argv[1:]
cmd=['adb','install','--no-streaming',apk]
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
      echo "ADB_INSTALL=PASS" | tee -a "$log"
      return 0
    fi
    echo "ADB_INSTALL_ATTEMPT_${attempt}=FAIL" | tee -a "$log"
    grep -E "INSTALL_FAILED_|Failure|protocol fault|device offline|error:" "$log" | tail -12 || true
    adb devices -l || true
    adb kill-server || true
    sleep 2
    adb start-server
    wait_boot || true
  done
  grep -E "INSTALL_FAILED_|Failure|protocol fault|device offline|error:" "$log" | tail -12 || true
  echo "ADB_INSTALL=FAIL" | tee -a "$log"
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

tap_text() {
  local wanted="$1"
  adb shell uiautomator dump /data/local/tmp/rs-wave5.xml >/dev/null
  adb pull /data/local/tmp/rs-wave5.xml /tmp/rs-wave5.xml >/dev/null
  local xy
  xy=$(python3 - "$wanted" <<'PY'
import re,sys,xml.etree.ElementTree as ET
wanted=sys.argv[1].lower()
root=ET.parse('/tmp/rs-wave5.xml').getroot()
for n in root.iter('node'):
    text=(n.attrib.get('text') or n.attrib.get('content-desc') or '').lower()
    if text==wanted or wanted in text:
        m=re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',n.attrib.get('bounds',''))
        if m:
            x1,y1,x2,y2=map(int,m.groups()); print((x1+x2)//2,(y1+y2)//2); raise SystemExit
raise SystemExit(3)
PY
  )
  adb shell input tap $xy
  sleep 1
}

wait_boot
adb_install_bounded "$WS/private-builds/candidate.apk" "$OUT/adb-install.log"
AUDIT_PASS="RsLnp-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-C5!"
export AUDIT_PASS
python3 - <<'PY' >/tmp/rs_users.xml
import base64,hashlib,os,secrets
salt=secrets.token_bytes(16)
digest=hashlib.pbkdf2_hmac('sha256',os.environ['AUDIT_PASS'].encode(),salt,180000,dklen=32)
print('<?xml version="1.0" encoding="utf-8" standalone="yes" ?>')
print('<map><string name="admin_user">admin</string><string name="admin_salt">'+base64.b64encode(salt).decode()+'</string><string name="admin_hash">'+base64.b64encode(digest).decode()+'</string></map>')
PY
cat >/tmp/rs_onboarding.xml <<'EOF'
<?xml version="1.0" encoding="utf-8" standalone="yes" ?>
<map><boolean name="v4710_exact_targets_done" value="true" /></map>
EOF
adb shell run-as com.rs.localstorage mkdir -p shared_prefs
run_as_write_file /tmp/rs_users.xml shared_prefs/rs_users.xml
run_as_write_file /tmp/rs_onboarding.xml shared_prefs/rs_onboarding.xml
wait_core_services
adb shell appops set com.rs.localstorage MANAGE_EXTERNAL_STORAGE allow || true
adb shell pm grant com.rs.localstorage android.permission.POST_NOTIFICATIONS || true

adb shell am compat enable RESTRICT_LOCAL_NETWORK com.rs.localstorage
adb reboot
wait_boot
wait_core_services
adb shell pm revoke com.rs.localstorage android.permission.NEARBY_WIFI_DEVICES || true
adb shell dumpsys package com.rs.localstorage | grep -A4 'NEARBY_WIFI_DEVICES' > "$OUT/permission-denied.txt" || true

python3 -m http.server 19090 --bind 0.0.0.0 >/tmp/wave5-host-http.log 2>&1 &
HOST_PID=$!
trap 'kill $HOST_PID 2>/dev/null || true' EXIT
sleep 1

set +e
adb shell "run-as com.rs.localstorage sh -c 'printf \"HEAD / HTTP/1.0\\r\\n\\r\\n\" | /system/bin/toybox nc -w 3 10.0.2.2 19090 >/dev/null 2>/dev/null'"
DENIED_RC=$?
set -e
echo "LNP_DENIED_APP_UID_RC=$DENIED_RC"
test "$DENIED_RC" -ne 0
echo 'LNP_DENIED_APP_UID_LAN_BLOCKED=true'

adb shell am start -W -n com.rs.localstorage/.MainActivity >/tmp/rs-wave5-am-start.txt
grep -Eq 'Status: ok|Complete' /tmp/rs-wave5-am-start.txt
sleep 5
tap_text 'Ativar servidor'
sleep 2
adb exec-out screencap -p > "$OUT/01-nearby-permission-request.png"
if ! tap_text "don't allow"; then
  tap_text 'não permitir'
fi
sleep 6
adb shell dumpsys activity services com.rs.localstorage > "$OUT/services-after-denial.txt"
grep -q 'HotspotServerService' "$OUT/services-after-denial.txt"
echo 'DENIED_NEARBY_SERVER_SERVICE_STARTED=true'
adb forward tcp:18081 tcp:8080
if curl -fsS --max-time 3 http://127.0.0.1:18081/login >/dev/null; then
  echo 'DENIED_NEARBY_LOOPBACK_SERVER_RUNNING=true'
else
  echo 'DENIED_NEARBY_LOOPBACK_SERVER_RUNNING=false'
fi

adb shell pm grant com.rs.localstorage android.permission.NEARBY_WIFI_DEVICES
adb shell dumpsys package com.rs.localstorage | grep -A4 'NEARBY_WIFI_DEVICES' > "$OUT/permission-granted.txt" || true
adb shell "run-as com.rs.localstorage sh -c 'printf \"HEAD / HTTP/1.0\\r\\n\\r\\n\" | /system/bin/toybox nc -w 3 10.0.2.2 19090 >/dev/null'"
echo 'LNP_GRANTED_APP_UID_LAN_WORKS=true'

adb exec-out run-as com.rs.localstorage cat shared_prefs/rs.xml > "$OUT/server-prefs-after-grant.xml" 2>/dev/null || true
adb logcat -d -t 1200 | grep -E 'AndroidRuntime|FATAL EXCEPTION|EPERM|ECONNABORTED|JmDNS|com\.rs\.localstorage' > "$OUT/logcat-tail.txt" || true
echo 'ANDROID16_LNP_REAL_UID_GATE=PASS'
echo 'FINAL_AUDIT_COMPLETE=NO'
