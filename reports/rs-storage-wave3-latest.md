# RS Storage Audit — Wave 3 latest evidence index

- Run ID: `35199902095`
- Run URL: https://github.com/MHGlobal/template-lab/actions/runs/35199902095
- Workflow conclusion: **failure**
- Template Lab head SHA: `47172d5a87214f872d4c0b2365f04d37032aca1f`
- Target: `MHGlobal/RS-Storage` · `release/v4.7.13-agent-harness`

## Job conclusions

- `Android upgrade + native visual + Android-served Web`: **failure**
- `Wave 3 evidence gate`: **failure**

## Evidence artifacts

- `wave3-android-runtime-evidence` · artifact id `10487893208` · expired=`False`

## Sanitized markers

- `UPGRADE_INTERNAL_DATA_PRESERVED=true`
- `WAVE3_ANDROID_RUNTIME_GATES=PASS' | tee -a "$OUT/upgrade-evidence.txt"`
- `WAVE3_AUTOMATED_EVIDENCE=PASS'; echo 'FINAL_AUDIT_COMPLETE=NO — full Android/Web visual evidence, transfer/performance and physical Wi-Fi/hotspot gates remain mandatory.'^[[0m`
- `FINAL_AUDIT_COMPLETE=NO — full Android/Web visual evidence, transfer/performance and physical Wi-Fi/hotspot gates remain mandatory.'^[[0m`

## Audit policy

A successful Wave 3 run is not final approval. The screenshots in the evidence artifact must be downloaded and visually reviewed. Transfer/performance and physical Wi-Fi/hotspot gates remain mandatory until separately completed.
