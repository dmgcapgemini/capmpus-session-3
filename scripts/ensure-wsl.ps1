#requires -Version 5.1
# Invocado por setup solo para PostgreSQL local con Podman en Windows.
$ErrorActionPreference = 'Stop'
$loomWsl = Get-Command wsl.exe -ErrorAction SilentlyContinue
if (-not $loomWsl) {
    throw 'No se encuentra wsl.exe. Actualiza Windows o instala WSL por el canal corporativo y repite setup.'
}

function Test-LoomWslReady {
    # PowerShell 5.1 can treat native stderr as a terminating error when redirected.
    $loomPriorPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $loomWsl.Source --status *> $null
        return ($LASTEXITCODE -eq 0)
    } finally { $ErrorActionPreference = $loomPriorPreference }
}
if (Test-LoomWslReady) { return }

Write-Host 'Preparando WSL 2 para Podman. Windows puede solicitar permisos de administrador...'
try {
    $loomInstaller = Start-Process -FilePath $loomWsl.Source -ArgumentList '--install', '--no-distribution' -Verb RunAs -WindowStyle Hidden -Wait -PassThru
} catch {
    throw 'No se pudo instalar WSL: acepta el aviso de administrador o solicita la instalacion a soporte. Repite setup despues.'
}
if ($loomInstaller.ExitCode -in @(3010, 1641)) {
    throw 'La instalacion de WSL requiere reiniciar Windows. Reinicia y repite .\scripts\setup.ps1 --storage postgres.'
}
if ($loomInstaller.ExitCode -ne 0) {
    throw "La instalacion de WSL fallo (codigo $($loomInstaller.ExitCode)). Revisa los permisos y la virtualizacion del equipo; consulta INSTALLATION.es.md."
}
if (-not (Test-LoomWslReady)) {
    throw 'WSL aun no esta disponible. Reinicia Windows y repite .\scripts\setup.ps1 --storage postgres. Si persiste, revisa la virtualizacion o consulta a soporte.'
}
Write-Host 'WSL preparado. Continuando con Podman...'
