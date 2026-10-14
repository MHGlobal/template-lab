#define MyAppName "RS Screen Manager"
#define MyAppVersion "0.2.0-alpha"
#define MyAppPublisher "MHGlobal"
[Setup]
AppId={{D51ECA51-3813-457A-9ED6-1BB84EE05B3B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\RS Screen Manager
DefaultGroupName=RS Screen Manager
DisableProgramGroupPage=yes
OutputDir=../../../dist
OutputBaseFilename=RS-Screen-Manager-WinUI-Setup-x64
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
WizardStyle=modern
UninstallDisplayIcon={app}\RSScreenManagerUI.exe
PrivilegesRequired=lowest
[Files]
Source: "..\..\..\dist\RS-Screen-Manager-WinUI\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{autoprograms}\RS Screen Manager"; Filename: "{app}\RSScreenManagerUI.exe"
Name: "{autodesktop}\RS Screen Manager"; Filename: "{app}\RSScreenManagerUI.exe"; Tasks: desktopicon
[Tasks]
Name: desktopicon; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked
[Run]
Filename: "{app}\RSScreenManagerUI.exe"; Description: "Launch RS Screen Manager"; Flags: nowait postinstall skipifsilent
