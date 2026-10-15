# Lightweight launcher; Windows PowerShell 5.1 works without .NET 8 installed.
param([switch]$NoInstall)
$ErrorActionPreference = "Stop"
$base = Split-Path -Parent $MyInvocation.MyCommand.Definition
$exe = Join-Path $base "Bond0-ControlCenter.exe"
function Test-DesktopRuntime {
    $dotnet = Join-Path $env:ProgramFiles "dotnet\dotnet.exe"
    if (!(Test-Path -LiteralPath $dotnet)) { return $false }
    $installed = & $dotnet --list-runtimes 2>$null
    return [bool](@($installed | Where-Object { $_ -match '^Microsoft\.WindowsDesktop\.App\s+8\.\d+\.\d+\s+\[' }).Count)
}
function Confirm-Download {
    Add-Type -AssemblyName System.Windows.Forms
    $message = "O Bond0 precisa do .NET Desktop Runtime 8 (x64), que nao esta instalado." +
        [Environment]::NewLine + [Environment]::NewLine +
        "Descarregar o instalador oficial da Microsoft e solicitar a instalacao?"
    $result = [System.Windows.Forms.MessageBox]::Show($message,
        "Bond0 - Preparacao do ambiente",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question)
    return $result -eq [System.Windows.Forms.DialogResult]::Yes
}
function Install-MicrosoftRuntime {
    $uri = "https://dotnetcli.blob.core.windows.net/dotnet/release-metadata/8.0/releases.json"
    Write-Host "A obter metadados oficiais .NET 8..." -ForegroundColor Cyan
    $meta = Invoke-RestMethod -Uri $uri -TimeoutSec 30
    $candidate = $null
    foreach ($release in $meta.releases) {
        $desktop = $release.windowsdesktop
        if ($null -eq $desktop -or $null -eq $desktop.files) { continue }
        $candidate = @($desktop.files | Where-Object {
            $_.name -eq "windowsdesktop-runtime-win-x64.exe" -and $_.rid -eq "win-x64" -and
            $_.hash -match '^[a-fA-F0-9]{128}$' -and $_.url -match '^https://'
        }) | Select-Object -First 1
        if ($candidate) { break }
    }
    if (!$candidate) { throw "O manifesto nao apresentou instalador WindowsDesktop x64 verificavel." }
    $download = [Uri]$candidate.url
    $allowed = @("builds.dotnet.microsoft.com", "dotnetcli.azureedge.net",
                 "dotnetcli.blob.core.windows.net", "download.visualstudio.microsoft.com")
    if ($download.Scheme -ne "https" -or $allowed -notcontains $download.Host.ToLowerInvariant()) {
        throw "Dominio do instalador nao autorizado."
    }
    $temp = Join-Path $env:TEMP ("bond0-dotnet8-" + [guid]::NewGuid().ToString("N") + ".exe")
    try {
        Write-Host "A descarregar runtime oficial da Microsoft..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $candidate.url -OutFile $temp -UseBasicParsing -TimeoutSec 180
        $sha = (Get-FileHash -LiteralPath $temp -Algorithm SHA512).Hash
        if ($sha -ine $candidate.hash) { throw "Falha na verificacao SHA-512 do instalador." }
        $signature = Get-AuthenticodeSignature -FilePath $temp
        if ($signature.Status -ne "Valid" -or !$signature.SignerCertificate -or
            $signature.SignerCertificate.Subject -notmatch "Microsoft Corporation") {
            throw "Assinatura Authenticode do runtime invalida."
        }
        Write-Host "SHA-512 e assinatura Microsoft validadas." -ForegroundColor Green
        $process = Start-Process -FilePath $temp -Verb RunAs -ArgumentList "/install","/quiet","/norestart" -Wait -PassThru
        if ($process.ExitCode -notin @(0,3010,1641)) { throw "Instalacao falhou: codigo $($process.ExitCode)." }
    }
    finally {
        if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue }
    }
}
try {
    if (!(Test-Path -LiteralPath $exe)) { throw "Bond0-ControlCenter.exe nao foi encontrado nesta pasta." }
    if (![Environment]::Is64BitOperatingSystem) { throw "Esta versao requer Windows x64." }
    if (!(Test-DesktopRuntime)) {
        if ($NoInstall) { throw "Runtime ausente e instalacao bloqueada." }
        if (!(Confirm-Download)) { throw "Instalacao cancelada pelo utilizador." }
        Install-MicrosoftRuntime
    }
    if (!(Test-DesktopRuntime)) {
        throw "O .NET 8 Desktop nao foi encontrado depois da instalacao. Pode ser necessario reiniciar."
    }
    Write-Host "A iniciar Bond0..." -ForegroundColor Green
    Start-Process -FilePath $exe -WorkingDirectory $base
}
catch {
    Write-Host "Bond0 nao iniciou: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Suporte: https://dotnet.microsoft.com/download/dotnet/8.0" -ForegroundColor Yellow
    Read-Host "Prima Enter para fechar"
    exit 1
}
