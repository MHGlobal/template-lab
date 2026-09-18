#!/usr/bin/env bash
set -euo pipefail
OUT="${{ github.workspace }}/audit-out/wave4"
APK="${{ github.workspace }}/private-builds/candidate.apk"
mkdir -p "$OUT"
exec > >(tee "$OUT/runtime.log") 2>&1

tap_ui() {
  local wanted="$1"
  adb shell uiautomator dump /sdcard/rs-wave4.xml >/dev/null
  adb pull /sdcard/rs-wave4.xml /tmp/rs-wave4.xml >/dev/null
  local xy
  xy=$(python3 - "$wanted" <<'PY'
import re,sys,xml.etree.ElementTree as ET
wanted=sys.argv[1]
root=ET.parse('/tmp/rs-wave4.xml').getroot()
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

adb install "$APK" >/dev/null
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
adb exec-out run-as com.rs.localstorage sh -c 'cat > shared_prefs/rs_users.xml' < /tmp/rs_users.xml
adb exec-out run-as com.rs.localstorage sh -c 'cat > shared_prefs/rs_onboarding.xml' < /tmp/rs_onboarding.xml
adb shell pm grant com.rs.localstorage android.permission.POST_NOTIFICATIONS || true
adb shell pm grant com.rs.localstorage android.permission.NEARBY_WIFI_DEVICES || true
adb shell appops set com.rs.localstorage MANAGE_EXTERNAL_STORAGE allow || true
adb shell monkey -p com.rs.localstorage -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 3
tap_ui 'Ativar servidor'
adb forward tcp:18080 tcp:8080
for ((i=1;i<=75;i++)); do curl -fsS --max-time 2 http://127.0.0.1:18080/login >/dev/null 2>&1 && break; sleep 1; done
curl -fsS http://127.0.0.1:18080/login >/dev/null

curl -sS -c /tmp/rs-cookies -D /tmp/login-headers -o /dev/null -X POST \
  --data-urlencode 'u=admin' --data-urlencode "p=$AUDIT_PASS" \
  http://127.0.0.1:18080/login
grep -qi '^Set-Cookie: RSSESSION=' /tmp/login-headers
ROOT_PATH=/storage/emulated/0
BASE="$ROOT_PATH/Download/rs-audit-wave4"
adb shell "rm -rf '$BASE'; mkdir -p '$BASE/upload' '$BASE/copydst' '$BASE/movedst' '$BASE/stress-d1' '$BASE/stress-d2' '$BASE/stress-d3'"
curl -fsS -b /tmp/rs-cookies --get --data-urlencode "d=$BASE" http://127.0.0.1:18080/admin/files > /tmp/files.html
CSRF=$(python3 - <<'PY'
import re
s=open('/tmp/files.html',encoding='utf-8',errors='ignore').read()
m=re.search(r"data-rs-csrf='([^']+)'",s)
if not m: raise SystemExit(2)
print(m.group(1))
PY
)
echo "::add-mask::$CSRF"

echo '--- 32 MiB streaming upload integrity/performance ---'
python3 -c "import os; open('/tmp/upload32.bin','wb').write(os.urandom(32*1024*1024))"
HOST_SHA=$(shasum -a 256 /tmp/upload32.bin | awk '{print $1}')
UP_METRIC=$(curl -fsS -b /tmp/rs-cookies -o /tmp/upload-response.json \
  -w '%{http_code} %{size_upload} %{time_total} %{speed_upload}' \
  --request POST --data-binary @/tmp/upload32.bin \
  --get --data-urlencode "d=$BASE/upload" --data-urlencode 'name=payload32.bin' \
  --data-urlencode 'conflict=replace' --data-urlencode "csrf=$CSRF" \
  http://127.0.0.1:18080/admin/upload)
echo "UPLOAD_RAW_METRIC=$UP_METRIC"
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
wait_transfer "$ID1" completed 360
wait_transfer "$ID2" completed 360

echo '--- memory/responsiveness evidence ---'
curl -fsS -b /tmp/rs-cookies http://127.0.0.1:18080/api/admin/transfers > "$OUT/final-transfers.json"
adb shell dumpsys meminfo com.rs.localstorage > "$OUT/meminfo.txt"
adb shell dumpsys cpuinfo | grep com.rs.localstorage > "$OUT/cpuinfo.txt" || true
adb logcat -d -t 1200 | grep -E 'AndroidRuntime|FATAL EXCEPTION|OutOfMemory|com\.rs\.localstorage' > "$OUT/logcat-tail.txt" || true
curl -fsS -b /tmp/rs-cookies --max-time 3 http://127.0.0.1:18080/admin/files >/dev/null
echo 'SERVER_RESPONSIVE_AFTER_STRESS=true'
echo 'WAVE4_ANDROID_LOOPBACK_TRANSFER_GATES=PASS'
echo 'PHYSICAL_WIFI_PERFORMANCE_GATE=NOT_RUN'
echo 'FINAL_AUDIT_COMPLETE=NO'
