# RS Storage Audit — Wave 3 latest evidence index

- Run ID: `35265391626`
- Run URL: https://github.com/MHGlobal/template-lab/actions/runs/35265391626
- Workflow conclusion: **failure**
- Template Lab head SHA: `a1c9d90c0a86fc0ae2e10b604d6a50d21141ee8d`
- Target: `MHGlobal/RS-Storage` · `release/v4.7.13-agent-harness`

## Job conclusions

- `Android upgrade + native visual + Android-served Web`: **failure**
- `Wave 3 evidence gate`: **failure**

## Evidence artifacts

- `wave3-android-runtime-evidence` · artifact id `10518105050` · expired=`False`

## Sanitized markers

- `UPGRADE_INTERNAL_DATA_PRESERVED=true`
- `WAVE3_ANDROID14_RUNTIME_GATES=PASS' | tee -a "$OUT/upgrade-evidence.txt"`
- `WAVE3_AUTOMATED_EVIDENCE=PASS'; echo 'FINAL_AUDIT_COMPLETE=NO — Android 15/16 network compatibility, full Android/Web visual evidence, transfer/performance and physical Wi-Fi/hotspot gates remain mandatory.'^[[0m`
- `FINAL_AUDIT_COMPLETE=NO — Android 15/16 network compatibility, full Android/Web visual evidence, transfer/performance and physical Wi-Fi/hotspot gates remain mandatory.'^[[0m`

## Audit policy

A successful Wave 3 run is not final approval. The screenshots in the evidence artifact must be downloaded and visually reviewed. Transfer/performance and physical Wi-Fi/hotspot gates remain mandatory until separately completed.
