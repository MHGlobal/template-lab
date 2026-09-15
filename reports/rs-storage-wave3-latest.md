# RS Storage Audit — Wave 3 latest evidence index

- Run ID: `34950554075`
- Run URL: https://github.com/MHGlobal/template-lab/actions/runs/34950554075
- Workflow conclusion: **failure**
- Template Lab head SHA: `97793f9c12dd71c5e7ae06a5c7dc3ec3e9d963d1`
- Target: `MHGlobal/RS-Storage` · `release/v4.7.13-agent-harness`

## Job conclusions

- `Android upgrade + native visual + Android-served Web`: **failure**
- `Wave 3 evidence gate`: **failure**

## Evidence artifacts

- `wave3-android-runtime-evidence` · artifact id `10411388097` · expired=`False`
- `wave3-android-runtime-evidence` · artifact id `10394690813` · expired=`False`
- `wave3-android-runtime-evidence` · artifact id `10390122041` · expired=`False`

## Sanitized markers

- `UPGRADE_INTERNAL_DATA_PRESERVED=true`
- `UPGRADE_SHARED_PREFS_PRESERVED=true`
- `UPGRADE_EXTERNAL_WORKSPACE_PRESERVED=true`
- `ANDROID_EMBEDDED_SERVER_8080=true`
- `WAVE3_ANDROID_RUNTIME_GATES=PASS' | tee -a "$OUT/upgrade-evidence.txt"`
- `WAVE3_AUTOMATED_EVIDENCE=PASS'^[[0m`
- `FINAL_AUDIT_COMPLETE=NO — screenshots still require human visual review; transfer/performance and physical Wi-Fi/hotspot gates remain mandatory.'^[[0m`

## Audit policy

A successful Wave 3 run is not final approval. The screenshots in the evidence artifact must be downloaded and visually reviewed. Transfer/performance and physical Wi-Fi/hotspot gates remain mandatory until separately completed.
