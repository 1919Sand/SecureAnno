<#
Runs SecureAnno with a local Node backend.
Usage: .\run.ps1
#>
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Test-Path '.env')) {
    if (Test-Path '.env.example') {
        Copy-Item '.env.example' '.env' -Force
        Write-Host 'Created .env from .env.example'
    }
}

if (-not (Test-Path 'data')) {
    New-Item -Path 'data' -ItemType Directory | Out-Null
}

if (-not (Test-Path 'data\leads.jsonl')) {
    New-Item -Path 'data\leads.jsonl' -ItemType File | Out-Null
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Error 'Node.js is required to run this app. Install Node.js 18 or newer and rerun this script.'
    exit 1
}

$nodeVersion = & $node.Source --version 2>$null
if ($?) {
    if ($nodeVersion -notmatch '^v(1[89]|[2-9][0-9])') {
        Write-Warning "Detected Node.js version $nodeVersion. Node.js 18+ is recommended."
    }
}

Write-Host 'Starting SecureAnno...'
Write-Host 'Press Ctrl+C to stop.'
Write-Host 'Open http://localhost:3000 in your browser.'

& $node.Source server.js
