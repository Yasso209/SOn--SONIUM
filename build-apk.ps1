$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable('Path','Machine')
  $user = [Environment]::GetEnvironmentVariable('Path','User')
  $env:Path = "$machine;$user"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw 'Node.js is missing and winget is unavailable. Install Node.js LTS from https://nodejs.org/ then rerun this script.'
  }
  Write-Host 'Installing Node.js LTS...' -ForegroundColor Cyan
  winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-package-agreements --accept-source-agreements
  Refresh-Path
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js installation completed but this terminal cannot find node. Close PowerShell, reopen it, and run this script again.'
}

Write-Host 'Installing SONIUM dependencies...' -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }

Write-Host 'Sign in to your Expo account. If you do not have one, create it at https://expo.dev/signup.' -ForegroundColor Cyan
npx eas-cli login
if ($LASTEXITCODE -ne 0) { throw 'EAS login failed.' }

npx eas-cli build:configure
if ($LASTEXITCODE -ne 0) { throw 'EAS configuration failed.' }

Write-Host 'Starting Android APK cloud build...' -ForegroundColor Green
npx eas-cli build --platform android --profile preview
if ($LASTEXITCODE -ne 0) { throw 'EAS build failed. Read the build log above.' }
