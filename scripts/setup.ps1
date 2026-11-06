#requires -Version 5.1
# Windows PowerShell 5.1 o PowerShell 7: .\scripts\setup.ps1 --storage sqlite
$ErrorActionPreference = 'Stop'
$loomRoot = Split-Path -Parent $PSScriptRoot
$env:PATH = (Join-Path $loomRoot '.loom/toolchain/bin') + [IO.Path]::PathSeparator + (Join-Path $HOME '.bun/bin') + [IO.Path]::PathSeparator + $env:PATH
$loomBun = Get-Command bun -ErrorAction SilentlyContinue
if (-not $loomBun -or (& $loomBun.Source --version) -ne '1.4.0') {
    # Copia privada: no se actualiza el Bun global ni la politica de ejecucion.
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'Para macOS usa bash scripts/setup.sh.' }
    # PROCESSOR_ARCHITEW6432 identifica el SO si PowerShell es de 32 bits.
    $loomProcessor = $env:PROCESSOR_ARCHITEW6432
    if (-not $loomProcessor) { $loomProcessor = $env:PROCESSOR_ARCHITECTURE }
    $loomArch = switch ($loomProcessor) {
        'AMD64' { 'x64' }
        'ARM64' { 'arm64' }
        default { throw 'Arquitectura Windows no soportada por este script.' }
    }
    $loomTarget = Join-Path $loomRoot '.loom/toolchain/bin'
    New-Item -ItemType Directory -Force $loomTarget | Out-Null
    $loomTemp = Join-Path ([IO.Path]::GetTempPath()) ('loom-bun-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory $loomTemp | Out-Null
    try {
        Write-Host 'Instalando Bun 1.4.0 privado desde oven-sh/bun...'
        $loomZip = Join-Path $loomTemp 'bun.zip'
        $loomTls = [Net.ServicePointManager]::SecurityProtocol
        try {
            [Net.ServicePointManager]::SecurityProtocol = $loomTls -bor [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest "https://github.com/oven-sh/bun/releases/download/bun-v1.4.0/bun-windows-$loomArch.zip" -UseBasicParsing -OutFile $loomZip
        } finally { [Net.ServicePointManager]::SecurityProtocol = $loomTls }
        Expand-Archive -LiteralPath $loomZip -DestinationPath $loomTemp
        Copy-Item (Join-Path $loomTemp "bun-windows-$loomArch/bun.exe") (Join-Path $loomTarget 'bun.exe')
    } finally { Remove-Item -LiteralPath $loomTemp -Recurse -Force }
    $loomBun = Get-Command (Join-Path $loomTarget 'bun.exe')
}
Push-Location $loomRoot
try {
    & $loomBun.Source tools/classroom.ts setup @args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally { Pop-Location }
