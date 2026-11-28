param([Parameter(Mandatory=$true)][string]$Directory)
$ErrorActionPreference='Stop'
$dir=[IO.Path]::GetFullPath($Directory)
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if($dir.Equals($repo,[StringComparison]::OrdinalIgnoreCase) -or $dir.StartsWith($repo+'\',[StringComparison]::OrdinalIgnoreCase)){throw 'Choose a protected directory outside repository'}
if(Test-Path -LiteralPath $dir){throw 'Directory must not already exist'}
New-Item -ItemType Directory -Path $dir | Out-Null
$acl=Get-Acl -LiteralPath $dir
$acl.SetAccessRuleProtection($true,$false)
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
$rule=New-Object Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
$acl.SetAccessRule($rule)
Set-Acl -LiteralPath $dir -AclObject $acl
$rsa=New-Object Security.Cryptography.RSACryptoServiceProvider(3072)
$rsa.PersistKeyInCsp=$false
try{
 [IO.File]::WriteAllText((Join-Path $dir 'private.xml'),$rsa.ToXmlString($true))
 [IO.File]::WriteAllText((Join-Path $dir 'public.xml'),$rsa.ToXmlString($false))
 Write-Host 'Key pair created. Share ONLY public.xml. Keep private.xml offline and backed up securely.'
}finally{$rsa.Dispose()}
