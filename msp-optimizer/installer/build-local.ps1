$ErrorActionPreference='Stop'
$work=Join-Path $env:TEMP ('VERTEX-PIA-'+[guid]::NewGuid())
New-Item -ItemType Directory $work | Out-Null
try {
 foreach($name in @('Extensibility.dll','office.dll','Microsoft.Office.Interop.MSProject.dll')){
 $f=Get-ChildItem "$env:windir\assembly","$env:windir\Microsoft.NET\assembly" -Filter $name -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
 if(!$f){throw "Missing installed Office PIA: $name"}
 Copy-Item $f.FullName (Join-Path $work $name)
 }
 $ms=Get-ChildItem "${env:ProgramFiles(x86)}\Microsoft Visual Studio","$env:ProgramFiles\Microsoft Visual Studio" -Filter MSBuild.exe -Recurse -File -ErrorAction SilentlyContinue | Where-Object {$_.FullName -match '\\MSBuild\\Current\\Bin\\MSBuild.exe$'} | Select-Object -First 1
 if(!$ms){throw 'MSBuild not found'}
 $env:PATH=$ms.DirectoryName+';'+$env:PATH
 & (Join-Path $PSScriptRoot 'build.ps1') -OfficePiaPath $work
 if($LASTEXITCODE -ne 0){throw 'Build failed'}
} finally {Remove-Item -LiteralPath $work -Recurse -Force}
