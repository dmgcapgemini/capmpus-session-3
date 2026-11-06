#requires -Version 5.1
$ErrorActionPreference = 'Stop'
$loomRoot = Split-Path -Parent $PSScriptRoot
$env:PATH = (Join-Path $loomRoot '.loom/toolchain/bin') + [IO.Path]::PathSeparator + (Join-Path $HOME '.bun/bin') + [IO.Path]::PathSeparator + $env:PATH
$loomBun = Get-Command bun -ErrorAction SilentlyContinue
if (-not $loomBun) { throw 'Ejecuta primero .\scripts\setup.ps1 --storage postgres.' }
Push-Location $loomRoot
try {
    & $loomBun.Source (Join-Path $loomRoot 'tools/classroom.ts') stop @args
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally { Pop-Location }
