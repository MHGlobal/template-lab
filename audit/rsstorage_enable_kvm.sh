#!/usr/bin/env bash
# Hosted Linux emulator preflight. Software emulation is not valid performance evidence.
set -euo pipefail
test "$(uname -m)" = x86_64
if [ ! -c /dev/kvm ]; then
  echo 'FAILURE_CLASS=ENVIRONMENT_INFRA_FAILURE KVM_DEVICE_MISSING' >&2
  exit 1
fi
echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
sudo udevadm control --reload-rules
sudo udevadm trigger --name-match=kvm
sudo udevadm settle
# Existing nodes may not receive the asynchronous rule before this process checks them.
sudo chmod 0666 /dev/kvm
python3 - <<'PY'
import fcntl, os
fd = os.open('/dev/kvm', os.O_RDWR | os.O_CLOEXEC)
try:
    version = fcntl.ioctl(fd, 0xAE00, 0)  # KVM_GET_API_VERSION
    assert version == 12, f'Unexpected KVM API version: {version}'
    vm = fcntl.ioctl(fd, 0xAE01, 0)  # KVM_CREATE_VM: prove virtualization works
    os.close(vm)
finally:
    os.close(fd)
print('ANDROID_EMULATOR_ACCELERATION=KVM VERIFIED_VM_CREATE=true')
PY
echo 'mode=on' >> "${GITHUB_OUTPUT:?GitHub output path required}"
