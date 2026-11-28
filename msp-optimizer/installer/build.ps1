param([Parameter(Mandatory=$true)][string]$OfficePiaPath)
$ErrorActionPreference='Stop'
$OfficePiaPath=(Resolve-Path $OfficePiaPath).Path
foreach($name in @('Extensibility.dll','office.dll','Microsoft.Office.Interop.MSProject.dll')) { if(!(Test-Path (Join-Path $OfficePiaPath $name))) { throw "Missing PIA: $name" } }
$runtime=Join-Path $PSScriptRoot 'prerequisites\dotnet48.exe'
if(!(Test-Path $runtime)){throw 'Supply official Microsoft .NET 4.8 offline redistributable as prerequisites\dotnet48.exe'}
$sig=Get-AuthenticodeSignature $runtime
if($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'Microsoft Corporation'){throw 'Invalid Microsoft runtime signature'}
$project=Join-Path $PSScriptRoot '..\add-in\UniversalMspOptimizer.csproj'
& msbuild $project /t:Rebuild /p:Configuration=Release /p:PlatformTarget=x64 "/p:OfficePiaPath=$OfficePiaPath"
if($LASTEXITCODE -ne 0){throw 'MSBuild failed'}
& msbuild (Join-Path $PSScriptRoot '..\updater\VertexUpdater.csproj') /t:Rebuild /p:Configuration=Release /p:PlatformTarget=x64
if($LASTEXITCODE -ne 0){throw 'Updater build failed'}
$iscc=@(foreach($root in @($env:ProgramFiles,${env:ProgramFiles(x86)})){foreach($v in @(7,6)){if($root){Join-Path $root "Inno Setup $v\ISCC.exe"}}}) | Where-Object {Test-Path $_} | Select-Object -First 1
if(!$iscc){throw 'Inno Setup 6 or 7 missing'}
& $iscc (Join-Path $PSScriptRoot 'Setup.iss')
if($LASTEXITCODE -ne 0){throw 'Installer build failed'}
$setup=Join-Path $PSScriptRoot 'output\VERTEX-MSP-Setup.exe'
if(!(Test-Path $setup)){throw 'Setup.exe missing'}
Get-FileHash $setup -Algorithm SHA256
