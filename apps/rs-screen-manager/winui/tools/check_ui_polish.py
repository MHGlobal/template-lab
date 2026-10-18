"""Static native WinUI UI polish regression checks — no additional packages required.

Checks XAML validity, unique named controls, wired event handlers, approved branding,
separation of full dashboard glass from low-cost video/gaming surfaces, and selection
states. Actual Windows UI, keyboard, DPI and Android physical-device checks remain manual.
"""
import re
import sys
from pathlib import Path
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[2]
xaml_file = root / "winui/MainWindow.xaml"
cpp_file = root / "winui/MainWindow.xaml.cpp"
header_file = root / "winui/MainWindow.xaml.h"
xaml = xaml_file.read_text(encoding="utf-8")
cpp = cpp_file.read_text(encoding="utf-8")
header = header_file.read_text(encoding="utf-8")
issues = []
try:
    ET.fromstring(xaml)
except ET.ParseError as exc:
    issues.append(f"Invalid XML: {exc}")
names = re.findall(r'\bx:Name="([A-Za-z_]\w*)"', xaml)
seen = set()
for name in names:
    if name in seen:
        issues.append(f"Duplicate x:Name: {name}")
    seen.add(name)
events = set(re.findall(r'\b(?:Click|SelectionChanged|Loaded|SizeChanged)="([A-Za-z_]\w*)"', xaml))
for name in sorted(events):
    if name + "(" not in header:
        issues.append(f"Event missing in header: {name}")
    if "MainWindow::" + name + "(" not in cpp:
        issues.append(f"Event not implemented: {name}")
for key in ["#007BFF", "#090B10", "#FF6B35", "connect+", 'x:Key="GlassCard"', 'x:Key="PerformanceCard"']:
    if key not in xaml:
        issues.append(f"Brand or design-system token missing: {key}")
for element in ["DevicesEmptyState", "MirrorSessionsEmpty", "VirtualSessionsEmpty", "RecordingsEmpty",
                "StopMirrorSelectedButton", "StopVirtualSelectedButton", "OpenRecordingButton",
                "WelcomeCard", "AdvancedDrawer"]:
    if element not in names:
        issues.append(f"Important interaction-state control missing: {element}")
begin = xaml.find('<ScrollViewer x:Name="HomePanel"')
end = xaml.find('<ScrollViewer x:Name="DevicesPanel"')
home = xaml[begin:end]
if "GlassCard" not in home:
    issues.append("Dashboard lost its full glass cards")
for first, last in [("MirrorPanel", "VirtualPanel"), ("VirtualPanel", "GamingPanel"), ("GamingPanel", "ProfilesPanel")]:
    b = xaml.find(f'<ScrollViewer x:Name="{first}"')
    e = xaml.find(f'<ScrollViewer x:Name="{last}"')
    if b < 0 or e <= b or 'StaticResource PerformanceCard' not in xaml[b:e]:
        issues.append(f"Missing low-overhead surface on {first}")
if xaml.count('<Setter Property="MinHeight" Value="44"/>') < 2:
    issues.append("Button touch targets are not consistently sized")
if issues:
    print("UI polish gate FAILED:")
    print("\n".join(" - " + i for i in issues))
    sys.exit(1)
print(f"UI polish gate passed: {len(names)} named controls; {len(events)} wired handlers; brand and states preserved")
