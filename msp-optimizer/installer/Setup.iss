#define AppVersion "1.7.2"
[Setup]
AppId=UniversalMspOptimizer
AppName=VERTEX MSP (Release Candidate)
AppPublisher=danialmor
AppPublisherURL=https://danialmor.github.io/VERTEX/
AppSupportURL=https://t.me/Danimor1991
AppVersion={#AppVersion}
DefaultDirName={autopf}\VERTEX\MSPOptimizer
DisableDirPage=yes
UsePreviousAppDir=no
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
OutputDir=output
OutputBaseFilename=VERTEX-MSP-Setup
UninstallDisplayName=Universal MSP Optimizer (Experimental)
Compression=lzma2
SolidCompression=yes
CloseApplications=no
RestartApplications=no
[Files]
Source: "..\updater\bin\Release\VertexUpdater.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\add-in\bin\Release\net48\UniversalMspOptimizer.dll"; DestDir: "{app}"; Flags: ignoreversion
#ifexist "..\add-in\bin\Release\net48\Microsoft.VisualStudio.Interop.dll"
Source: "..\add-in\bin\Release\net48\Microsoft.VisualStudio.Interop.dll"; DestDir: "{app}"; Flags: ignoreversion
#endif
Source: "prerequisites\dotnet48.exe"; Flags: dontcopy
[Registry]
Root: HKLM64; Subkey: "Software\Microsoft\Office\MS Project\Addins\UniversalMspOptimizer.Connect"; ValueType: string; ValueName: "FriendlyName"; ValueData: "Universal MSP Optimizer (Experimental)"; Flags: uninsdeletekey
Root: HKLM64; Subkey: "Software\Microsoft\Office\MS Project\Addins\UniversalMspOptimizer.Connect"; ValueType: dword; ValueName: "LoadBehavior"; ValueData: "3"
[Code]
function InitializeSetup(): Boolean;
var Platform, Products: String;
begin
 Result := False;
 if RegQueryStringValue(HKLM64, 'SOFTWARE\Microsoft\Office\ClickToRun\Configuration', 'Platform', Platform) then begin
 if CompareText(Platform, 'x64') = 0 then
 if RegQueryStringValue(HKLM64, 'SOFTWARE\Microsoft\Office\ClickToRun\Configuration', 'ProductReleaseIds', Products) then
 Result := Pos('project', Lowercase(Products)) > 0;
 end else Result := RegKeyExists(HKLM64, 'SOFTWARE\Microsoft\Office\16.0\MS Project');
 if not Result then MsgBox('Microsoft Project desktop x64 is required. Install a licensed compatible version first.', mbError, MB_OK);
 if Result then Result := MsgBox('Experimental build. Close Microsoft Project before continuing. Use disposable MPP copies only. Continue?', mbConfirmation, MB_YESNO) = IDYES;
end;
function HasNet48(): Boolean;
var Release: Cardinal;
begin
 Result := RegQueryDWordValue(HKLM64, 'SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full', 'Release', Release);
 if Result then Result := Release >= 528040;
end;
function PrepareToInstall(var NeedsRestart: Boolean): String;
var Code: Integer;
begin
 Result := '';
 if CheckForMutexes('Global\\VERTEX-MSP-InstallBlock') then begin Result := 'Close Microsoft Project first.'; exit; end;
 if CompareText(ExpandConstant('{app}'), ExpandConstant('{autopf}\VERTEX\MSPOptimizer')) <> 0 then begin Result := 'Fixed protected installation directory required.'; exit; end;
 if not HasNet48() then begin
 ExtractTemporaryFile('dotnet48.exe');
 if not Exec(ExpandConstant('{tmp}\dotnet48.exe'), '/passive /norestart /ChainingPackage VERTEX', '', SW_SHOW, ewWaitUntilTerminated, Code) then begin
 Result := 'Cannot start .NET Framework installer'; exit;
 end;
 if (Code = 3010) or (Code = 1641) then begin
 NeedsRestart := True; Result := 'Restart Windows and run setup again.'; exit;
 end;
 if (Code <> 0) or not HasNet48() then begin Result := '.NET Framework installation failed: ' + IntToStr(Code); exit; end;
 end;
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
Filename: "{win}\Microsoft.NET\Framework64\v4.0.30319\RegAsm.exe"; Parameters: """{app}\UniversalMspOptimizer.dll"" /unregister"; Flags: runhidden waituntilterminated; RunOnceId: "UnregisterVertexMsp"
