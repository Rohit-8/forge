<#
.SYNOPSIS
  Thin Windows wrapper around install.mjs (the cross-platform installer).

.DESCRIPTION
  forge ships a single Node-based installer (install.mjs). This script
  exists so Windows users can run a one-liner without thinking about file
  extensions. The wrapper requires Node 18+ on PATH.

  Examples:
    powershell -ExecutionPolicy Bypass -File install.ps1 -Target .
    powershell -ExecutionPolicy Bypass -File install.ps1 -Target C:\repo -Agents copilot,cursor -Force
#>
param(
  [string] $Target   = '.',
  [string] $Agents   = 'all',
  [switch] $Force,
  [switch] $NoDetect
)
$ErrorActionPreference = 'Stop'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node 18+ is required. Install from https://nodejs.org'
  exit 1
}

$installer = Join-Path $PSScriptRoot 'install.mjs'
if (-not (Test-Path $installer)) { throw "install.mjs not found at $installer" }

$argList = @('--target', $Target, '--agents', $Agents)
if ($Force.IsPresent)    { $argList += '--force' }
if ($NoDetect.IsPresent) { $argList += '--no-detect' }

& node $installer @argList
exit $LASTEXITCODE
