param([Parameter(Mandatory=$true)][string]$OfficePiaPath)
$ErrorActionPreference='Stop'
$OfficePiaPath=(Resolve-Path $OfficePiaPath).Path
foreach($name in @('Extensibility.dll','office.dll','Microsoft.Office.Interop.MSProject.dll')) { if(!(Test-Path (Join-Path $OfficePiaPath $name))) { throw "Missing PIA: $name" } }
$runtime=Join-Path $PSScriptRoot 'prerequisites\dotnet48.exe'
if(!(Test-Path $runtime)){throw 'Supply official Microsoft .NET 4.8 offline redistributable as prerequisites\dotnet48.exe'}
$sig=Get-AuthenticodeSignature $runtime
if($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'Microsoft Corporation'){throw 'Invalid Microsoft runtime signature'}
$project=Join-Path $PSScriptRoot '..\add-in\UniversalMspOptimizer.csproj'
& msbuild $project /restore /p:Configuration=Release /p:PlatformTarget=x64 "/p:OfficePiaPath=$OfficePiaPath"
if($LASTEXITCODE -ne 0){throw 'MSBuild failed'}
$iscc=Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6\ISCC.exe'
if(!(Test-Path $iscc)){throw 'Inno Setup 6 missing'}
& $iscc (Join-Path $PSScriptRoot 'Setup.iss')
if($LASTEXITCODE -ne 0){throw 'Installer build failed'}
$setup=Join-Path $PSScriptRoot 'output\VERTEX-MSP-Setup.exe'
if(!(Test-Path $setup)){throw 'Setup.exe missing'}
Get-FileHash $setup -Algorithm SHA256
