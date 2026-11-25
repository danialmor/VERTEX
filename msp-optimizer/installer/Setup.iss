#define AppVersion "0.5.0-beta"
[Setup]
AppId=UniversalMspOptimizer
AppName=Universal MSP Optimizer (Experimental)
AppVersion={#AppVersion}
DefaultDirName={autopf}\VERTEX\MSPOptimizer
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
OutputDir=output
OutputBaseFilename=Setup
UninstallDisplayName=Universal MSP Optimizer (Experimental)
Compression=lzma2
SolidCompression=yes
[Files]
Source: "..\add-in\bin\Release\net48\UniversalMspOptimizer.dll"; DestDir: "{app}"; Flags: ignoreversion
[Registry]
Root: HKLM64; Subkey: "Software\Microsoft\Office\MS Project\Addins\UniversalMspOptimizer.Connect"; ValueType: string; ValueName: "FriendlyName"; ValueData: "Universal MSP Optimizer (Experimental)"; Flags: uninsdeletekey
Root: HKLM64; Subkey: "Software\Microsoft\Office\MS Project\Addins\UniversalMspOptimizer.Connect"; ValueType: dword; ValueName: "LoadBehavior"; ValueData: "3"
[Code]
function InitializeSetup(): Boolean;
begin
 Result := FileExists(ExpandConstant('{win}\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe')) and (RegKeyExists(HKLM64, 'SOFTWARE\Microsoft\Office\16.0\MS Project') or RegKeyExists(HKLM64, 'SOFTWARE\Microsoft\Office\ClickToRun\Configuration'));
 if not Result then MsgBox('Requires .NET Framework and Microsoft Project 2016 x64. Verify prerequisites manually.', mbError, MB_OK);
 if Result then Result := MsgBox('Experimental build. Close Microsoft Project before continuing. Use disposable MPP copies only. Continue?', mbConfirmation, MB_YESNO) = IDYES;
end;
procedure CurStepChanged(CurStep: TSetupStep);
var Code: Integer;
begin
 if CurStep = ssPostInstall then begin
 if not Exec(ExpandConstant('{win}\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe'), '"' + ExpandConstant('{app}\UniversalMspOptimizer.dll') + '" /codebase', '', SW_HIDE, ewWaitUntilTerminated, Code) then RaiseException('Cannot launch RegAsm');
 if Code <> 0 then RaiseException('COM registration failed. Uninstall before retrying.');
 end;
end;
[UninstallRun]
Filename: "{win}\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe"; Parameters: """{app}\UniversalMspOptimizer.dll"" /unregister"; Flags: runhidden waituntilterminated
