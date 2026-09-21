#!/usr/bin/env bash
WS="${1:?workspace path required}"
set -euo pipefail
OUT="$WS/audit-out/wave4"
APK="$WS/private-builds/candidate.apk"
mkdir -p "$OUT"
git -C "$WS/target" rev-parse HEAD > "$OUT/target-sha.txt"
exec > >(tee "$OUT/runtime.log") 2>&1

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
  return 1
}
wait_runtime_health() {
  for attempt in $(seq 1 60); do
    if adb shell service check package 2>/dev/null | grep -qi found &&
       adb shell service check activity 2>/dev/null | grep -qi found &&
       adb shell service check appops 2>/dev/null | grep -qi found &&
       adb shell "test -d /storage/emulated/0 && touch /storage/emulated/0/Download/.rs-wave4-ready && rm -f /storage/emulated/0/Download/.rs-wave4-ready" >/dev/null 2>&1; then
      echo "ANDROID_RUNTIME_HEALTH=PASS"
      return 0
    fi
    sleep 2
  done
  echo "ANDROID_RUNTIME_HEALTH_RECOVERY=reboot"
  adb reboot || true
  wait_android_ready
  for attempt in $(seq 1 60); do
    if adb shell service check package 2>/dev/null | grep -qi found &&
       adb shell service check activity 2>/dev/null | grep -qi found &&
       adb shell service check appops 2>/dev/null | grep -qi found &&
       adb shell "test -d /storage/emulated/0 && touch /storage/emulated/0/Download/.rs-wave4-ready && rm -f /storage/emulated/0/Download/.rs-wave4-ready" >/dev/null 2>&1; then
      echo "ANDROID_RUNTIME_HEALTH=PASS"
      return 0
    fi
    sleep 2
  done
  echo "ANDROID_RUNTIME_HEALTH=FAIL" >&2
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
  local apk="$1" log="$2"
  for attempt in 1 2 3; do
    echo "ADB_INSTALL_ATTEMPT=$attempt APK=$(basename "$apk")" | tee -a "$log"
    if python3 - "$apk" "$log" <<'PY'
import subprocess,sys
apk,log=sys.argv[1:]
cmd=['adb','install',apk]
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
    print_install_diagnostics "$apk" "$log"
    adb devices -l || true
    adb kill-server || true
    sleep 2
    adb start-server
    wait_android_ready || true
  done
  print_install_diagnostics "$apk" "$log"
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

tap_ui() {
  local wanted="$1"
  local xy=""
  for attempt in $(seq 1 8); do
    adb exec-out screencap -p > "$OUT/android-ui-before-server.png" || true
    adb shell dumpsys activity activities > "$OUT/activity-before-server.txt" || true
    if adb shell uiautomator dump /data/local/tmp/rs-wave4.xml >/dev/null 2>&1 &&
       adb pull /data/local/tmp/rs-wave4.xml /tmp/rs-wave4.xml >/dev/null 2>&1; then
      cp /tmp/rs-wave4.xml "$OUT/ui-before-server.xml"
      set +e
      xy=$(python3 - "$wanted" <<'PY'
import re,sys,xml.etree.ElementTree as ET
wanted=sys.argv[1].casefold()
root=ET.parse('/tmp/rs-wave4.xml').getroot()
nodes=list(root.iter('node'))
for n in nodes:
    label=((n.attrib.get('text') or n.attrib.get('content-desc') or '')).casefold()
    if label in {'close app','wait','fechar app','aguardar'}:
        m=re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',n.attrib.get('bounds',''))
        if m:
            x1,y1,x2,y2=map(int,m.groups());print('RECOVER',(x1+x2)//2,(y1+y2)//2);raise SystemExit
for n in nodes:
    labels=[n.attrib.get('text',''),n.attrib.get('content-desc','')]
    if any(wanted == label.casefold() or wanted in label.casefold() for label in labels):
        m=re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',n.attrib.get('bounds',''))
        if m:
            x1,y1,x2,y2=map(int,m.groups());print('TARGET',(x1+x2)//2,(y1+y2)//2);raise SystemExit
raise SystemExit(3)
PY
      )
      rc=$?
      set -e
      if [ "$rc" = 0 ] && [[ "$xy" =~ ^RECOVER\ [0-9]+\ [0-9]+$ ]]; then
        read -r _ recover_x recover_y <<<"$xy"
        adb shell input tap "$recover_x" "$recover_y" || true
        adb shell am start -W -n com.rs.localstorage/.MainActivity >/tmp/rs-wave4-am-recover.txt 2>&1 || true
        sleep 3
        xy=""
        continue
      fi
      if [ "$rc" = 0 ] && [[ "$xy" =~ ^TARGET\ [0-9]+\ [0-9]+$ ]]; then break; fi
    fi
    echo "UI_TARGET_RETRY=$attempt TARGET=$wanted"
    adb shell input keyevent 4 || true
    adb shell am start -W -n com.rs.localstorage/.MainActivity >/tmp/rs-wave4-am-retry.txt 2>&1 || true
    sleep 3
  done
  if [ -z "$xy" ]; then
    echo "UI_TARGET_NOT_FOUND=$wanted" >&2
    return 3
  fi
  read -r _ target_x target_y <<<"$xy"
  adb shell input tap "$target_x" "$target_y"
  sleep 1
}

wait_android_ready
adb_install_bounded "$APK" "$OUT/adb-install.log"
AUDIT_PASS="RsWave4-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-B7!"
export AUDIT_PASS
python3 - <<'PY' >/tmp/rs_users.xml
import base64,hashlib,os,secrets
salt=secrets.token_bytes(16)
digest=hashlib.pbkdf2_hmac('sha256',os.environ['AUDIT_PASS'].encode(),salt,180000,dklen=32)
print('<?xml version="1.0" encoding="utf-8" standalone="yes" ?>')
print('<map>')
print('  <string name="admin_user">admin</string>')
print('  <string name="admin_salt">'+base64.b64encode(salt).decode()+'</string>')
print('  <string name="admin_hash">'+base64.b64encode(digest).decode()+'</string>')
print('</map>')
PY
cat >/tmp/rs_onboarding.xml <<'EOF'
<?xml version="1.0" encoding="utf-8" standalone="yes" ?>
<map><boolean name="v4710_exact_targets_done" value="true" /></map>
EOF
adb shell run-as com.rs.localstorage mkdir -p shared_prefs
run_as_write_file /tmp/rs_users.xml shared_prefs/rs_users.xml
run_as_write_file /tmp/rs_onboarding.xml shared_prefs/rs_onboarding.xml
wait_runtime_health
adb shell pm grant com.rs.localstorage android.permission.POST_NOTIFICATIONS || true
adb shell pm grant com.rs.localstorage android.permission.NEARBY_WIFI_DEVICES || true
adb shell appops set com.rs.localstorage MANAGE_EXTERNAL_STORAGE allow || true
adb shell am start -W -n com.rs.localstorage/.MainActivity >/tmp/rs-wave4-am-start.txt
grep -Eq 'Status: ok|Complete' /tmp/rs-wave4-am-start.txt
sleep 5
tap_ui 'Ativar servidor'
adb forward tcp:18080 tcp:8080
for ((i=1;i<=75;i++)); do curl -fsS --max-time 2 http://127.0.0.1:18080/login >/dev/null 2>&1 && break; sleep 1; done
curl -fsS http://127.0.0.1:18080/login >/dev/null

curl -sS -c /tmp/rs-cookies -D /tmp/login-headers -o /dev/null -X POST \
  --data-urlencode 'u=admin' --data-urlencode "p=$AUDIT_PASS" \
  http://127.0.0.1:18080/login
grep -qi '^Set-Cookie: RSSESSION=' /tmp/login-headers
ROOT_PATH=/storage/emulated/0
PARENT="$ROOT_PATH/Download"
BASE="$PARENT/rs-audit-wave4-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"
adb shell "rm -rf '$BASE'" || true
curl -fsS -b /tmp/rs-cookies --get --data-urlencode "d=$PARENT" http://127.0.0.1:18080/admin/files > /tmp/files.html
CSRF=$(python3 - <<'PY'
import re
s=open('/tmp/files.html',encoding='utf-8',errors='ignore').read()
m=re.search(r"data-rs-csrf='([^']+)'",s)
if not m: raise SystemExit(2)
print(m.group(1))
PY
)
echo "::add-mask::$CSRF"
api_mkdir() {
  local parent="$1" name="$2" status
  status=$(curl -sS -b /tmp/rs-cookies -o /tmp/mkdir-response.html -w '%{http_code}' -X POST \
    --data-urlencode "csrf=$CSRF" --data-urlencode 'action=mkdir' \
    --data-urlencode "path=$parent" --data-urlencode "name=$name" \
    http://127.0.0.1:18080/admin/action)
  test "$status" = 302
}
api_mkdir "$PARENT" "$(basename "$BASE")"
for dir in upload copydst movedst stress-d1 stress-d2 stress-d3; do api_mkdir "$BASE" "$dir"; done
curl -fsS -b /tmp/rs-cookies --get --data-urlencode "d=$BASE" http://127.0.0.1:18080/admin/files >/dev/null
echo 'APP_UID_DESTINATION_TREE_CREATED=true'

echo '--- 32 MiB streaming upload integrity/performance ---'
python3 -c "import os; open('/tmp/upload32.bin','wb').write(os.urandom(32*1024*1024))"
HOST_SHA=$(shasum -a 256 /tmp/upload32.bin | awk '{print $1}')
UPLOAD_URL=$(python3 - "$BASE/upload" "$CSRF" <<'PY'
import sys,urllib.parse
path,csrf=sys.argv[1:]
q=urllib.parse.urlencode({'d':path,'name':'payload32.bin','conflict':'replace','csrf':csrf})
print('http://127.0.0.1:18080/admin/upload?'+q)
PY
)
UP_METRIC=$(curl -sS -b /tmp/rs-cookies -o /tmp/upload-response.json \
  -w '%{http_code} %{size_upload} %{time_total} %{speed_upload}' \
  --data-binary @/tmp/upload32.bin "$UPLOAD_URL")
echo "UPLOAD_RAW_METRIC=$UP_METRIC"
UPLOAD_STATUS=$(awk '{print $1}' <<<"$UP_METRIC")
if [ "$UPLOAD_STATUS" != 200 ]; then
  echo "UPLOAD_HTTP_STATUS=$UPLOAD_STATUS" >&2
  if grep -q 'Acesso bloqueado' /tmp/upload-response.json; then echo 'UPLOAD_FAILURE_CLASS=PRODUCT_SECURITY_REJECTION' >&2; fi
  adb shell "ls -ld '$BASE' '$BASE/upload'" >&2 || true
  exit 22
fi
echo "$UP_METRIC" | awk '$1==200 && $2>=33554432 {ok=1} END{exit ok?0:1}'
DEVICE_SHA=$(adb shell "sha256sum '$BASE/upload/payload32.bin'" | tr -d '\r' | awk '{print $1}')
test "$HOST_SHA" = "$DEVICE_SHA"
echo 'UPLOAD_HASH_MATCH=true'

echo '--- tracked download integrity/performance ---'
TID="dl${GITHUB_RUN_ID}${GITHUB_RUN_ATTEMPT}"
DL_METRIC=$(curl -fsS -b /tmp/rs-cookies -o /tmp/download32.bin \
  -w '%{http_code} %{size_download} %{time_total} %{speed_download}' \
  --get --data-urlencode "f=$BASE/upload/payload32.bin" --data-urlencode "tid=$TID" \
  http://127.0.0.1:18080/admin/download)
echo "DOWNLOAD_RAW_METRIC=$DL_METRIC"
echo "$DL_METRIC" | awk '$1==200 && $2>=33554432 {ok=1} END{exit ok?0:1}'
test "$(shasum -a 256 /tmp/download32.bin | awk '{print $1}')" = "$HOST_SHA"
curl -fsS -b /tmp/rs-cookies --get --data-urlencode "id=$TID" http://127.0.0.1:18080/api/admin/transfer > /tmp/dl-state.json
python3 - <<'PY'
import json
j=json.load(open('/tmp/dl-state.json'))
assert j['kind']=='download' and j['status']=='completed'
assert int(j['done'])==int(j['total'])==33554432
PY
echo 'DOWNLOAD_HASH_MATCH=true'
echo 'DOWNLOAD_TRACKING_COMPLETED=true'

echo '--- HTTP Range 206 integrity ---'
RANGE_URL=$(python3 - "$BASE/upload/payload32.bin" <<'PY'
import sys,urllib.parse
print('http://127.0.0.1:18080/admin/download?'+urllib.parse.urlencode({'f':sys.argv[1]}))
PY
)
RANGE_METRIC=$(curl -fsS -b /tmp/rs-cookies -o /tmp/range1m.bin -H 'Range: bytes=0-1048575' -w '%{http_code} %{size_download}' "$RANGE_URL")
echo "RANGE_RAW_METRIC=$RANGE_METRIC"
echo "$RANGE_METRIC" | awk '$1==206 && $2==1048576 {ok=1} END{exit ok?0:1}'
python3 - <<'PY'
import hashlib
full=open('/tmp/upload32.bin','rb').read(1048576)
part=open('/tmp/range1m.bin','rb').read()
assert len(part)==1048576
assert hashlib.sha256(full).digest()==hashlib.sha256(part).digest()
PY
echo 'RANGE_206_HASH_MATCH=true'

api_action() {
  local action="$1" src="$2" dest="$3" out="$4"
  curl -fsS -b /tmp/rs-cookies -o "$out" -w '%{http_code}' -X POST \
    --data-urlencode "csrf=$CSRF" --data-urlencode "action=$action" \
    --data-urlencode "path=$src" --data-urlencode "dest=$dest" \
    http://127.0.0.1:18080/admin/action
}
newest_transfer() {
  curl -fsS -b /tmp/rs-cookies http://127.0.0.1:18080/api/admin/transfers | python3 -c 'import json,sys; a=json.load(sys.stdin).get("transfers",[]); print(a[-1]["id"] if a else "")'
}
wait_transfer() {
  local id="$1" expected="$2" max="${3:-120}"
  for ((i=1;i<=max;i++)); do
    curl -fsS -b /tmp/rs-cookies --get --data-urlencode "id=$id" http://127.0.0.1:18080/api/admin/transfer > /tmp/state.json
    S=$(python3 -c 'import json; print(json.load(open("/tmp/state.json")).get("status",""))')
    [ "$S" = "$expected" ] && return 0
    case "$S" in error|cancelled) [ "$S" = "$expected" ] && return 0 || { cat /tmp/state.json; return 2; };; esac
    sleep .25
  done
  cat /tmp/state.json
  return 3
}
snapshot_transfers() {
  curl -fsS -b /tmp/rs-cookies http://127.0.0.1:18080/api/admin/transfers > "$1"
}
new_transfer_between() {
  python3 - "$1" "$2" <<'PY'
import json,sys
before={x['id'] for x in json.load(open(sys.argv[1])).get('transfers',[])}
after=[x['id'] for x in json.load(open(sys.argv[2])).get('transfers',[]) if x['id'] not in before]
assert len(after)==1, f'expected one new transfer, got {after}'
print(after[0])
PY
}
transfer_status() {
  curl -fsS -b /tmp/rs-cookies --get --data-urlencode "id=$1" http://127.0.0.1:18080/api/admin/transfer |
    python3 -c 'import json,sys; print(json.load(sys.stdin)["status"])'
}

echo '--- copy and move via actual server queue ---'
BEFORE=$(curl -fsS -b /tmp/rs-cookies http://127.0.0.1:18080/api/admin/transfers)
test "$(api_action copy "$BASE/upload/payload32.bin" "$BASE/copydst" /tmp/copy-action.out)" = 302
sleep .1
COPY_ID=$(newest_transfer)
test -n "$COPY_ID"
COPY_START=$(python3 -c 'import time; print(time.time_ns())')
wait_transfer "$COPY_ID" completed 180
COPY_END=$(python3 -c 'import time; print(time.time_ns())')
COPY_SHA=$(adb shell "sha256sum '$BASE/copydst/payload32.bin'" | tr -d '\r' | awk '{print $1}')
test "$COPY_SHA" = "$HOST_SHA"
COPY_SEC=$(python3 - <<PY
print((${COPY_END}-${COPY_START})/1e9)
PY
)
echo "COPY_SECONDS=$COPY_SEC"
echo 'COPY_HASH_MATCH=true'

test "$(api_action move "$BASE/copydst/payload32.bin" "$BASE/movedst" /tmp/move-action.out)" = 302
sleep .1
MOVE_ID=$(newest_transfer)
test -n "$MOVE_ID"
wait_transfer "$MOVE_ID" completed 180
adb shell "test ! -e '$BASE/copydst/payload32.bin'"
MOVED_SHA=$(adb shell "sha256sum '$BASE/movedst/payload32.bin'" | tr -d '\r' | awk '{print $1}')
test "$MOVED_SHA" = "$HOST_SHA"
echo 'MOVE_SOURCE_REMOVED=true'
echo 'MOVE_HASH_MATCH=true'

echo '--- deterministic queued cancellation + partial cleanup ---'
adb shell "mkdir -p '$BASE/stress-src'"
adb shell "for d in 0 1 2 3 4 5 6 7 8 9; do mkdir -p '$BASE/stress-src/d'; done"
for d in {0..9}; do
  adb shell "for i in \$(seq 1 500); do printf '%08d-%08d-wave4-audit-data' '$d' \$i > '$BASE/stress-src/d/f'\$i'.txt'; done"
done
test "$(api_action copy "$BASE/stress-src" "$BASE/stress-d1" /tmp/s1.out)" = 302
ID1=$(newest_transfer)
test "$(api_action copy "$BASE/stress-src" "$BASE/stress-d2" /tmp/s2.out)" = 302
ID2=$(newest_transfer)
test "$(api_action copy "$BASE/stress-src" "$BASE/stress-d3" /tmp/s3.out)" = 302
ID3=$(newest_transfer)
test -n "$ID1" -a -n "$ID2" -a -n "$ID3"
curl -fsS -b /tmp/rs-cookies --get --data-urlencode "id=$ID3" http://127.0.0.1:18080/api/admin/transfer > /tmp/id3-before.json
python3 - <<'PY'
import json
j=json.load(open('/tmp/id3-before.json'))
assert j['kind']=='copy'
assert j['status'] in {'queued','preparing','running'}
assert j['cancellable'] is True
PY
curl -fsS -b /tmp/rs-cookies -X POST \
  --data-urlencode "csrf=$CSRF" --data-urlencode "id=$ID3" \
  http://127.0.0.1:18080/api/admin/transfer/cancel > /tmp/cancel.json
python3 - <<'PY'
import json
j=json.load(open('/tmp/cancel.json')); assert j['ok'] is True and j['status']=='cancelling'
PY
wait_transfer "$ID3" cancelled 180
adb shell "test ! -e '$BASE/stress-d3/stress-src'"
PARTIAL_COUNT=$(adb shell "find '$BASE/stress-d3' -maxdepth 1 -name '.rs-*.partial' 2>/dev/null | wc -l" | tr -d '\r ')
test "$PARTIAL_COUNT" = 0
echo 'QUEUED_OR_ACTIVE_CANCEL_COMPLETED=true'
echo 'CANCEL_PARTIAL_CLEANUP=true'

echo '--- foreground download priority while file-operation workers are saturated ---'
PRIORITY_TID="prio$(python3 -c 'import secrets;print(secrets.token_hex(8))')"
PRIORITY_START=$(python3 -c 'import time;print(time.time_ns())')
curl -fsS -b /tmp/rs-cookies -o /tmp/priority-download.bin \
  --get --data-urlencode "f=$BASE/upload/payload32.bin" --data-urlencode "tid=$PRIORITY_TID" \
  http://127.0.0.1:18080/download
PRIORITY_END=$(python3 -c 'import time;print(time.time_ns())')
test "$(shasum -a 256 /tmp/priority-download.bin | awk '{print $1}')" = "$HOST_SHA"
PRIORITY_SEC=$(python3 - <<PY
print((${PRIORITY_END}-${PRIORITY_START})/1e9)
PY
)
python3 - "$PRIORITY_SEC" <<'PY'
import sys
assert float(sys.argv[1]) < 30.0, sys.argv[1]
PY
echo "PRIORITY_DOWNLOAD_SECONDS=$PRIORITY_SEC"
echo 'INTERACTIVE_DOWNLOAD_PRIORITY=PASS'

echo '--- atomic destination exclusion under a queued collision ---'
adb shell "mkdir -p '$BASE/collision-a' '$BASE/collision-b' '$BASE/collision-dst'; cp '$BASE/upload/payload32.bin' '$BASE/collision-a/same.bin'; dd if=/dev/zero of='$BASE/collision-b/same.bin' bs=1048576 count=32 2>/dev/null"
COLLISION_A_SHA=$(adb shell "sha256sum '$BASE/collision-a/same.bin'" | tr -d '\r' | awk '{print $1}')
COLLISION_B_SHA=$(adb shell "sha256sum '$BASE/collision-b/same.bin'" | tr -d '\r' | awk '{print $1}')
test "$COLLISION_A_SHA" != "$COLLISION_B_SHA"
snapshot_transfers /tmp/collision-before.json
test "$(api_action copy "$BASE/collision-a/same.bin" "$BASE/collision-dst" /tmp/collision-a.out)" = 302
snapshot_transfers /tmp/collision-after-a.json
COLLISION_A_ID=$(new_transfer_between /tmp/collision-before.json /tmp/collision-after-a.json)
test "$(api_action copy "$BASE/collision-b/same.bin" "$BASE/collision-dst" /tmp/collision-b.out)" = 302
snapshot_transfers /tmp/collision-after-b.json
COLLISION_B_ID=$(new_transfer_between /tmp/collision-after-a.json /tmp/collision-after-b.json)

wait_transfer "$ID1" completed 360
wait_transfer "$ID2" completed 360
for i in $(seq 1 360); do
  COLLISION_A_STATUS=$(transfer_status "$COLLISION_A_ID")
  COLLISION_B_STATUS=$(transfer_status "$COLLISION_B_ID")
  if [[ "$COLLISION_A_STATUS" =~ ^(completed|error)$ ]] && [[ "$COLLISION_B_STATUS" =~ ^(completed|error)$ ]]; then break; fi
  sleep .25
done
python3 - "$COLLISION_A_STATUS" "$COLLISION_B_STATUS" <<'PY'
import sys
assert sorted(sys.argv[1:]) == ['completed','error'], sys.argv[1:]
PY
COLLISION_DST_SHA=$(adb shell "sha256sum '$BASE/collision-dst/same.bin'" | tr -d '\r' | awk '{print $1}')
test "$COLLISION_DST_SHA" = "$COLLISION_A_SHA" -o "$COLLISION_DST_SHA" = "$COLLISION_B_SHA"
test "$(adb shell "find '$BASE/collision-dst' -maxdepth 1 -name '.rs-*.partial' 2>/dev/null | wc -l" | tr -d '\r ')" = 0
echo 'DESTINATION_COLLISION_EXCLUSION=PASS'
echo 'DESTINATION_COLLISION_PARTIAL_CLEANUP=PASS'

echo '--- memory/responsiveness evidence ---'
curl -fsS -b /tmp/rs-cookies http://127.0.0.1:18080/api/admin/transfers > "$OUT/final-transfers.json"
adb shell dumpsys meminfo com.rs.localstorage > "$OUT/meminfo.txt"
adb shell dumpsys cpuinfo | grep com.rs.localstorage > "$OUT/cpuinfo.txt" || true
adb logcat -d -t 1200 | grep -E 'AndroidRuntime|FATAL EXCEPTION|OutOfMemory|com\.rs\.localstorage' > "$OUT/logcat-tail.txt" || true
! grep -Eqi 'FATAL EXCEPTION.*com\.rs\.localstorage|OutOfMemoryError.*com\.rs\.localstorage' "$OUT/logcat-tail.txt"
curl -fsS -b /tmp/rs-cookies --max-time 3 http://127.0.0.1:18080/admin/files >/dev/null
echo 'SERVER_RESPONSIVE_AFTER_STRESS=true'
echo 'WAVE4_ANDROID_LOOPBACK_TRANSFER_GATES=PASS'
echo 'PHYSICAL_WIFI_PERFORMANCE_GATE=NOT_RUN'
echo 'FINAL_AUDIT_COMPLETE=NO'
