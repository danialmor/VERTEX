param(
 [Parameter(Mandatory=$true)][string]$SetupPath,
 [Parameter(Mandatory=$true)][string]$Version,
 [Parameter(Mandatory=$true)][string]$PrivateKeyPath,
 [Parameter(Mandatory=$true)][string]$OutputDirectory
)
$ErrorActionPreference='Stop'
if($Version -notmatch '^\d+\.\d+\.\d+$'){throw 'Stable numeric version required'}
$setup=(Resolve-Path -LiteralPath $SetupPath).Path
$key=(Resolve-Path -LiteralPath $PrivateKeyPath).Path
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if($key.StartsWith($repo+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Keep private key outside repository'}
if((Get-Item -LiteralPath $setup).Length -gt 200000000){throw 'Package exceeds updater limit'}
if(Test-Path -LiteralPath $OutputDirectory){throw 'Use a new output directory'}
$rsa=New-Object System.Security.Cryptography.RSACryptoServiceProvider
$rsa.PersistKeyInCsp=$false
try {
 $rsa.FromXmlString([IO.File]::ReadAllText($key))
 if($rsa.KeySize -lt 3072 -or $rsa.PublicOnly){throw 'RSA private key >=3072 bits required'}
 $checker=Get-Content -Raw (Join-Path $PSScriptRoot '..\add-in\UpdateChecker.cs')
 if(!$checker.Contains('const string TrustedPublicKey="'+$rsa.ToXmlString($false)+'";')){throw 'Public key does not match pinned updater key'}
 if(!$checker.Contains('const string Build="'+$Version+'";')){throw 'Source build version must match release'}
 $manifest=[ordered]@{tag="msp-v$Version";asset='VERTEX-MSP-Setup.exe';sha256=(Get-FileHash -LiteralPath $setup -Algorithm SHA256).Hash.ToLowerInvariant()}
 $bytes=[Text.Encoding]::UTF8.GetBytes(($manifest|ConvertTo-Json -Compress))
 $signature=$rsa.SignData($bytes,[Security.Cryptography.CryptoConfig]::MapNameToOID('SHA256'))
 if(!$rsa.VerifyData($bytes,[Security.Cryptography.CryptoConfig]::MapNameToOID('SHA256'),$signature)){throw 'Signature self-test failed'}
 $dir=New-Item -ItemType Directory -Path $OutputDirectory
 Copy-Item -LiteralPath $setup -Destination (Join-Path $dir.FullName 'VERTEX-MSP-Setup.exe')
 [IO.File]::WriteAllBytes((Join-Path $dir.FullName 'msp-manifest.json'),$bytes)
 [IO.File]::WriteAllBytes((Join-Path $dir.FullName 'msp-manifest.sig'),$signature)
 if((Get-FileHash (Join-Path $dir.FullName 'VERTEX-MSP-Setup.exe')).Hash.ToLowerInvariant() -ne $manifest.sha256){throw 'Copied package mismatch'}
 Write-Host 'Signed assets staged locally; no release published.'
} finally {$rsa.Dispose()}
