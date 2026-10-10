#!/usr/bin/env python3
"""Bundle official ArtCraft Windows x64 MSI releases with source SHA256 verification."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import hashlib
import json
import re
import subprocess
import zipfile

APPS = [
    ("photocraft", "0.6.0"), ("vectorcraft", "0.8.0"),
    ("filmcraft", "0.5.0"), ("lightcraft", "0.5.0"),
    ("pdfcraft", "0.5.0"), ("effectcraft", "0.7.0"),
    ("designcraft", "0.5.0"), ("wordcraft", "0.4.0"),
    ("gridcraft", "0.4.0"), ("deckcraft", "0.4.0"),
    ("cadcraft", "0.4.0"), ("soundcraft", "0.4.0"),
    ("craft-launcher", "0.2.0"),
]
BUNDLE = "ArtCraft-Windows-x64-Complete-2026-10-10"
ROOT = Path("dist")
STAGING = ROOT / BUNDLE
INSTALLERS = STAGING / "Installers"
LICENSES = STAGING / "Licenses"
ZIP = ROOT / (BUNDLE + ".zip")

def fetch(url, output):
    output.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["curl", "-fL", "--retry", "4", "--retry-delay", "3",
         "--connect-timeout", "30", "--max-time", "900", "-o", str(output), url],
        check=True,
    )

def checksum(path):
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def package_one(app, version):
    label = "artcraft-launcher" if app == "craft-launcher" else app
    asset = f"{label}-{version}-windows-x64.msi"
    base = f"https://github.com/storytold/{app}/releases/download/v{version}"
    upstream_hashes = ROOT / "checksums" / f"{app}.txt"
    fetch(base + "/SHA256SUMS.txt", upstream_hashes)
    hashes = {}
    for line in upstream_hashes.read_text(encoding="utf-8-sig").splitlines():
        match = re.match(r"^([a-fA-F0-9]{64})\s+\*?(.+?)\s*$", line)
        if match:
            hashes[Path(match.group(2)).name] = match.group(1).lower()
    expected = hashes.get(asset)
    if not expected:
        raise RuntimeError(f"Official checksum not found for {asset}")
    file = INSTALLERS / asset
    fetch(f"{base}/{asset}", file)
    if file.stat().st_size < 1_000_000:
        raise RuntimeError(f"Unexpectedly small MSI: {asset}")
    if file.read_bytes()[:8] != bytes.fromhex("D0CF11E0A1B11AE1"):
        raise RuntimeError(f"Invalid MSI/OLE header: {asset}")
    digest = checksum(file)
    if digest != expected:
        raise RuntimeError(f"SHA256 MISMATCH: {asset}: {digest} != {expected}")
    print(f"PASS {app} v{version} ({file.stat().st_size:,} bytes) SHA256={digest}", flush=True)
    return {"name": app, "version": version, "filename": asset,
            "sha256": digest, "bytes": file.stat().st_size,
            "official_release": f"https://github.com/storytold/{app}/releases/tag/v{version}",
            "download": f"{base}/{asset}"}

INSTALL_PS1 = r'''#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"
$installerFolder = Join-Path $PSScriptRoot "Installers"
$installers = @(Get-ChildItem -LiteralPath $installerFolder -Filter "*.msi" | Sort-Object Name)
if ($installers.Count -ne 13) { throw "Expected 13 verified MSI files; found $($installers.Count)." }
Write-Host "ArtCraft Windows x64 bundle: installing $($installers.Count) applications"
Write-Host "Each application comes from the official storytold GitHub releases."
foreach ($installer in $installers) {
    Write-Host ("Installing " + $installer.Name)
    $proc = Start-Process -FilePath "msiexec.exe" -ArgumentList @("/i", ('"' + $installer.FullName + '"'), "/passive", "/norestart") -PassThru -Wait
    if ($proc.ExitCode -notin @(0, 3010)) { throw "Installation failed: $($installer.Name); code $($proc.ExitCode)" }
}
Write-Host "Installers finished. Windows may request a restart."
'''

def main():
    INSTALLERS.mkdir(parents=True, exist_ok=True)
    LICENSES.mkdir(parents=True, exist_ok=True)
    results = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        tasks = [pool.submit(package_one, app, version) for app, version in APPS]
        for task in as_completed(tasks):
            results.append(task.result())
    results.sort(key=lambda x: [app for app, _ in APPS].index(x["name"]))

    # License texts are sourced from the matching tagged GitHub repositories.
    for app, version in APPS:
        for filename in ("LICENSE-MIT", "LICENSE-APACHE", "LICENSE", "NOTICE"):
            target = LICENSES / f"{app}-{filename}.txt"
            url = f"https://raw.githubusercontent.com/storytold/{app}/v{version}/{filename}"
            try:
                fetch(url, target)
                if target.stat().st_size < 20:
                    target.unlink()
            except subprocess.CalledProcessError:
                target.unlink(missing_ok=True)

    (STAGING / "Install-All.ps1").write_text(INSTALL_PS1, encoding="utf-8-sig")
    manifest = {
        "name": BUNDLE, "platform": "Windows x64 (Intel/AMD 64-bit)",
        "publisher_of_builds": "storytold (official upstream releases)",
        "package_created_at": "2026-10-10",
        "apps": results,
        "verification": "Official SHA256SUMS.txt verified for every MSI, plus MSI file header",
    }
    (STAGING / "MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (STAGING / "SHA256SUMS.txt").write_text(
        "".join(f'{app["sha256"]}  Installers/{app["filename"]}\n' for app in results),
        encoding="ascii"
    )
    readme = (
        "ARTCRAFT WINDOWS x64 OFFLINE BUNDLE\n"
        "==================================\n"
        "Includes 12 released Craft applications and ArtCraft Launcher (13 MSI installers).\n"
        "Windows 10/11, x64 (Intel/AMD 64-bit). Not for Windows ARM or 32-bit.\n\n"
        "INSTALL: Extract this entire ZIP. For one app, double-click the MSI in Installers.\n"
        "INSTALL ALL: Open PowerShell as Administrator, cd to the extracted folder,\n"
        "then run: powershell -ExecutionPolicy Bypass -File .\\Install-All.ps1\n"
        "Verify installers: Get-FileHash .\\Installers\\APP.msi -Algorithm SHA256\n"
        "and compare each hash with SHA256SUMS.txt or MANIFEST.json.\n\n"
        "All applications are early-stage open-source builds from official GitHub\n"
        "releases. They were downloaded and checksum-verified; graphical operation\n"
        "on a user's PC was NOT tested. Licenses and upstream links are included.\n"
        "The ArtCraft AI studio itself is NOT included: its desktop download is\n"
        "temporarily unavailable on https://getartcraft.com/download.\n\n"
        "NOTE: MSI installers are already internally compressed. ZIP -9 provides\n"
        "a convenient single-file download, but cannot reduce their size much.\n"
        "If size is more important than offline installation, use the official\n"
        "ArtCraft Launcher from https://github.com/storytold/craft-launcher/releases.\n"
    )
    (STAGING / "README-INSTALL.txt").write_text(readme, encoding="utf-8")
    with zipfile.ZipFile(ZIP, "w", compression=zipfile.ZIP_DEFLATED,
                         compresslevel=9, allowZip64=True, strict_timestamps=False) as output:
        for path in sorted(STAGING.rglob("*")):
            if path.is_file():
                output.write(path, arcname=path.relative_to(ROOT))
    with zipfile.ZipFile(ZIP) as z:
        bad = z.testzip()
        if bad is not None:
            raise RuntimeError(f"ZIP integrity check failed: {bad}")
        msis = [n for n in z.namelist() if n.lower().endswith(".msi")]
        if len(msis) != 13:
            raise RuntimeError(f"Expected 13 MSI files, found {len(msis)}")
    outer = checksum(ZIP)
    (ROOT / (BUNDLE + ".sha256")).write_text(f"{outer}  {ZIP.name}\n", encoding="ascii")
    print(json.dumps({"result": "PASS", "zip": str(ZIP), "zip_bytes": ZIP.stat().st_size,
                      "zip_sha256": outer, "installer_count": len(results)}, indent=2))

if __name__ == "__main__":
    main()
