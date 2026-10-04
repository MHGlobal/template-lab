#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-/srv/3ds-lab}"
GROUP="${LAB_GROUP:-3dslab}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash bootstrap.sh [root]" >&2
  exit 1
fi

if ! getent group "$GROUP" >/dev/null 2>&1; then
  groupadd --system "$GROUP"
fi

install -d -m 0750 -o root -g "$GROUP" "$ROOT"
install -d -m 0750 -o root -g "$GROUP"   "$ROOT/games/pushmo/original"   "$ROOT/games/pushmo/extracted"   "$ROOT/games/pushmo/metadata"   "$ROOT/tools"   "$ROOT/backups"

install -d -m 2770 -o root -g "$GROUP"   "$ROOT/workspaces/pushmo/ghidra-project"   "$ROOT/workspaces/pushmo/symbols"   "$ROOT/workspaces/pushmo/matching"   "$ROOT/workspaces/pushmo/scratch"   "$ROOT/builds/pushmo"   "$ROOT/reports-private/pushmo"   "$ROOT/cache"   "$ROOT/bin"

# Original game material is deliberately non-writable to the lab group.
chmod 0750 "$ROOT/games/pushmo/original"

cat > "$ROOT/README-STORAGE.txt" <<'EOF'
MCPNet 3DS Decomp Lab storage.
- games/*/original: immutable/private source material; root-managed only.
- games/*/extracted: private extracted material.
- workspaces: writable reverse-engineering state.
- builds: generated binaries.
- reports-private: evidence that must not be committed.
- cache: disposable/rebuildable data.
No ROM/CIA/code.bin/RomFS/ExeFS/CRO originals belong in GitHub.
EOF

touch "$ROOT/.storage-ready"
chown root:"$GROUP" "$ROOT/.storage-ready" "$ROOT/README-STORAGE.txt"
chmod 0640 "$ROOT/.storage-ready" "$ROOT/README-STORAGE.txt"

echo "READY: $ROOT"
find "$ROOT" -maxdepth 3 -type d -printf '%m %u:%g %p\n' | sort
