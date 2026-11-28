# Windows hosted candidate build: official PIA/.NET; private keys are never loaded.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Set-StrictMode -Version Latest
$installer = $PSScriptRoot
$work = Join-Path $env:RUNNER_TEMP 'vertex-msbuild-deps'
$pia = Join-Path $work 'pia'
$extract = Join-Path $work 'extracted'
New-Item -ItemType Directory -Force $pia,$extract,(Join-Path $installer 'prerequisites') | Out-Null
$names = @('Extensibility.dll','office.dll','Microsoft.Office.Interop.MSProject.dll')
function Find-Assembly([string]$name) {
  $pf86 = [Environment]::GetFolderPath('ProgramFilesX86')
  $roots = @(
    (Join-Path $pf86 'Microsoft Visual Studio\Shared\Visual Studio Tools for Office\PIA'),
    (Join-Path $env:ProgramFiles 'Microsoft Visual Studio\Shared\Visual Studio Tools for Office\PIA'),
    (Join-Path $env:windir 'Microsoft.NET\assembly'),
    (Join-Path $env:windir 'assembly')
  )
  foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    $found = Get-ChildItem -LiteralPath $root -Filter $name -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) { return $found.FullName }
  }
  return $null
}
function Copy-Available {
  foreach ($name in $names) {
    $dest = Join-Path $pia $name
    if (Test-Path -LiteralPath $dest) { continue }
    $path = Find-Assembly $name
    if ($path) {
      Copy-Item -LiteralPath $path -Destination $dest
      Write-Host ("PIA resolved: {0}" -f $name)
    }
  }
}
Copy-Available
if (@($names | Where-Object { -not (Test-Path -LiteralPath (Join-Path $pia $_)) }).Count -gt 0) {
  $piaExe = Join-Path $work 'PIARedist.exe'
  Invoke-WebRequest -Uri 'https://download.microsoft.com/download/c/1/d/c1d6dbbb-700d-4669-98cf-820ac3ae8e55/PIARedist.exe' -OutFile $piaExe
  $sig = Get-AuthenticodeSignature -FilePath $piaExe
  if ($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'Microsoft') {
    throw 'Office PIA redistributable has invalid Microsoft signature.'
  }
  $seven = Get-Command 7z.exe -ErrorAction SilentlyContinue
  if (-not $seven) { throw '7-Zip required to extract official Office PIA redistributable.' }
  & $seven.Source x $piaExe "-o$extract" -y
  if ($LASTEXITCODE -ne 0) { throw 'Cannot extract official Office PIAs.' }
  $msi = Get-ChildItem -LiteralPath $extract -Recurse -Filter 'O2010pia.msi' -File | Select-Object -First 1
  if (-not $msi) { throw 'Microsoft Office PIA MSI was not found.' }
  $p = Start-Process -FilePath msiexec.exe -ArgumentList @('/i', ('"' + $msi.FullName + '"'), '/qn', '/norestart') -Wait -PassThru
  if ($p.ExitCode -ne 0) { throw "Microsoft PIA MSI failed: $($p.ExitCode)" }
  Copy-Available
}
$missing = @($names | Where-Object { -not (Test-Path -LiteralPath (Join-Path $pia $_)) })
if ($missing.Count) { throw ('Authorized PIAs missing: ' + ($missing -join ', ')) }
$runtime = Join-Path $installer 'prerequisites\dotnet48.exe'
Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/?linkid=2088631' -OutFile $runtime
$sig = Get-AuthenticodeSignature -FilePath $runtime
if ($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'Microsoft Corporation') {
  throw 'Invalid official Microsoft .NET Framework 4.8 runtime signature.'
}
if ((Get-Item -LiteralPath $runtime).Length -lt 10000000) { throw 'Unexpected .NET offline installer size.' }
$vswhere = Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'Microsoft Visual Studio\Installer\vswhere.exe'
if (-not (Test-Path -LiteralPath $vswhere)) { throw 'vswhere is missing.' }
$msbuild = @(& $vswhere -latest -products '*' -requires Microsoft.Component.MSBuild -find 'MSBuild\**\Bin\MSBuild.exe') |
  Where-Object { $_ -match '\\Current\\Bin\\MSBuild.exe$' } | Select-Object -First 1
if (-not $msbuild) { throw 'MSBuild Current not found.' }
$env:PATH = (Split-Path -Path $msbuild -Parent) + ';' + $env:PATH
& (Join-Path $installer 'build.ps1') -OfficePiaPath $pia
if ($LASTEXITCODE -ne 0) { throw "Build failed: $LASTEXITCODE" }
$setup = Join-Path $installer 'output\VERTEX-MSP-Setup.exe'
if (-not (Test-Path -LiteralPath $setup)) { throw 'Installer output missing.' }
Get-FileHash -LiteralPath $setup -Algorithm SHA256 | Format-List
Write-Host 'Candidate built; unsigned and not a production release.'
