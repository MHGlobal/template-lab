#include "pch.h"
#include "MainWindow.xaml.h"
#include "../core/virtual_display_policy.hpp"
#include "../core/windows_hotspot.hpp"
#if __has_include("MainWindow.g.cpp")
#include "MainWindow.g.cpp"
#endif
#include <algorithm>
#include <cwctype>
#include <sstream>
#include <utility>
#include <chrono>
#include <iterator>
#include <cstddef>
#include <shellapi.h>
#pragma comment(lib,"shell32.lib")

using namespace winrt;
using namespace Microsoft::UI::Xaml;

namespace winrt::RSScreenManagerUI::implementation {
namespace {
std::wstring quote(const std::wstring& s) {
 std::wstring result=L"\"";
 for(wchar_t c:s) result+=(c==L'"'?L"\\\"":std::wstring(1,c));
 return result+L"\"";
}
bool valid(const std::wstring& s,bool pin=false) {
 if(s.empty()||s.size()>128||(pin&&s.size()!=6))return false;
 for(wchar_t c:s)if(pin?!(c>=L'0'&&c<=L'9'):!(std::iswalnum(c)||c==L'.'||c==L'-'||c==L'['||c==L']'||c==L':'))return false;
 return true;
}
bool process(const std::wstring& exe,const std::wstring& args,PROCESS_INFORMATION& pi,bool capture,HANDLE output=nullptr) {
 STARTUPINFOW start{sizeof(start)};
 if(capture){start.dwFlags=STARTF_USESTDHANDLES;start.hStdOutput=output;start.hStdError=output;start.hStdInput=GetStdHandle(STD_INPUT_HANDLE);}
 std::wstring cmd=quote(exe)+L" "+args;
 return CreateProcessW(exe.c_str(),cmd.data(),nullptr,nullptr,capture,CREATE_NO_WINDOW|CREATE_NEW_PROCESS_GROUP,nullptr,nullptr,&start,&pi)!=0;
}
std::wstring ini(const std::wstring& path,const wchar_t* section,const wchar_t* key,const wchar_t* fallback=L"") {
 wchar_t b[2048]{};
 GetPrivateProfileStringW(section,key,fallback,b,2048,path.c_str());
 return b;
}
void writeIni(const std::wstring& path,const wchar_t* section,const wchar_t* key,const std::wstring& value){
 WritePrivateProfileStringW(section,key,value.c_str(),path.c_str());
}
void choose(Controls::ComboBox const& combo,const std::wstring& value){
 for(uint32_t i=0;i<combo.Items().Size();++i){
  auto v=unbox_value<hstring>(combo.Items().GetAt(i));
  if(value==std::wstring(v.c_str())){combo.SelectedIndex(static_cast<int32_t>(i));return;}
 }
}
}

MainWindow::MainWindow() {}
MainWindow::~MainWindow(){
 if(maintenanceTimer_)maintenanceTimer_.Stop();
 // Preserve session manifest so the next launch can restore it.
 saveSessions();
 for(auto& session:sessions_){
  auto& p=session.process;
  if(p.hProcess&&WaitForSingleObject(p.hProcess,0)==WAIT_TIMEOUT){
   const auto pid=p.dwProcessId;
   EnumWindows([](HWND window,LPARAM param)->BOOL{
    DWORD owner=0;GetWindowThreadProcessId(window,&owner);
    if(owner==static_cast<DWORD>(param))PostMessageW(window,WM_CLOSE,0,0);
    return TRUE;
   },static_cast<LPARAM>(pid));
   if(WaitForSingleObject(p.hProcess,2500)==WAIT_TIMEOUT)TerminateProcess(p.hProcess,0);
  }
  if(p.hThread)CloseHandle(p.hThread);
  if(p.hProcess)CloseHandle(p.hProcess);
 }
}
std::wstring MainWindow::tools(const wchar_t* file) const{
 wchar_t path[MAX_PATH]{};
 GetModuleFileNameW(nullptr,path,MAX_PATH);
 std::wstring dir=path;
 auto slash=dir.find_last_of(L"\\/");
 if(slash==std::wstring::npos)return file;
 dir.resize(slash);
 return dir+L"\\tools\\"+file;
}
std::wstring MainWindow::settingsPath() const{
 wchar_t data[32768]{};
 DWORD size=GetEnvironmentVariableW(L"LOCALAPPDATA",data,32768);
 if(size==0||size>=32768)return L"RS-Screen-Manager-WinUI.ini";
 std::wstring folder=std::wstring(data)+L"\\RS Screen Manager";
 CreateDirectoryW(folder.c_str(),nullptr);
 return folder+L"\\winui-settings.ini";
}
std::wstring MainWindow::recordingsPath() const{
 auto path=settingsPath();
 const auto slash=path.find_last_of(L"\\/");
 if(slash!=std::wstring::npos)path.resize(slash);
 auto folder=path+L"\\Recordings";
 CreateDirectoryW(folder.c_str(),nullptr);
 return folder;
}
std::wstring MainWindow::newMediaPath(const wchar_t* extension) const{
 SYSTEMTIME t{};GetLocalTime(&t);
 wchar_t stamp[64]{};
 swprintf_s(stamp,L"%04d%02d%02d-%02d%02d%02d-%03d-%lu",t.wYear,t.wMonth,t.wDay,t.wHour,t.wMinute,t.wSecond,t.wMilliseconds,GetCurrentProcessId());
 return recordingsPath()+L"\\RS-"+stamp+extension;
}
void MainWindow::status(const wchar_t* message){
 StatusText().Text(message);
 Microsoft::UI::Xaml::Controls::ToolTipService::SetToolTip(StatusText(),box_value(hstring(message)));
}
std::wstring MainWindow::option(Controls::ComboBox const& combo) const{
 auto item=combo.SelectedItem();
 return item?std::wstring(unbox_value<hstring>(item).c_str()):L"";
}
std::wstring MainWindow::selected(){
 int32_t i=DevicesCombo().SelectedIndex();
 if(i<0||static_cast<size_t>(i)>=serials_.size())return {};
 if(deviceStates_[i]!=L"device")return {};
 return serials_[i];
}
void MainWindow::navigate(int page){
 using Microsoft::UI::Xaml::Visibility;
 HomePanel().Visibility(page==0?Visibility::Visible:Visibility::Collapsed);
 DevicesPanel().Visibility(page==1?Visibility::Visible:Visibility::Collapsed);
 MirrorPanel().Visibility(page==2?Visibility::Visible:Visibility::Collapsed);
 VirtualPanel().Visibility(page==3?Visibility::Visible:Visibility::Collapsed);
 GamingPanel().Visibility(page==4?Visibility::Visible:Visibility::Collapsed);
 MapperPanel().Visibility(page==5?Visibility::Visible:Visibility::Collapsed);
 ProfilesPanel().Visibility(page==6?Visibility::Visible:Visibility::Collapsed);
 DiagnosticsPanel().Visibility(page==7?Visibility::Visible:Visibility::Collapsed);
 SettingsPanel().Visibility(page==8?Visibility::Visible:Visibility::Collapsed);
 HistoryPanel().Visibility(page==9?Visibility::Visible:Visibility::Collapsed);
 HelpPanel().Visibility(page==10?Visibility::Visible:Visibility::Collapsed);
 const wchar_t* captions[]={L"Visão geral",L"Dispositivos",L"Espelhamento",L"Ecrãs virtuais",
  L"Gaming",L"Editor de controlos",L"Perfis",L"Diagnóstico",L"Definições",L"Biblioteca",L"Ajuda"};
 if(page<0||page>=11)return;
 CurrentLocationText().Text(captions[page]);
 const int group=(page==0?0:page==1?1:page>=2&&page<=3?2:page>=4&&page<=6?3:page==9?4:5);
 auto resources=RootGrid().Resources();
 auto active=resources.Lookup(box_value(hstring(L"NavActiveButton"))).as<Microsoft::UI::Xaml::Style>();
 auto idle=resources.Lookup(box_value(hstring(L"NavButton"))).as<Microsoft::UI::Xaml::Style>();
 std::vector<Microsoft::UI::Xaml::Controls::Button> tabs{
  NavHome(),NavDevices(),NavSessions(),NavGaming(),NavLibrary(),NavTools()};
 for(size_t i=0;i<tabs.size();++i)tabs[i].Style(i==static_cast<size_t>(group)?active:idle);
}
void MainWindow::updateResponsive(double width){
 HomeActionsPanel().Orientation(width<780?Controls::Orientation::Vertical:Controls::Orientation::Horizontal);
 // Overlay widths are updated at every window resize, not only at breakpoints.
 using Microsoft::UI::Xaml::Visibility;
 HeroVisual().Visibility(width<960?Visibility::Collapsed:Visibility::Visible);
 CurrentLocationText().Visibility(width<1020?Visibility::Collapsed:Visibility::Visible);
 ConnectivityChip().Visibility(width<760?Visibility::Collapsed:Visibility::Visible);
 const bool narrow=width<800;
 auto grid=HomeStatsGrid();
 grid.RowDefinitions().Clear();
 grid.ColumnDefinitions().Clear();
 Microsoft::UI::Xaml::Controls::ColumnDefinition first;
 first.Width(Microsoft::UI::Xaml::GridLength{1,Microsoft::UI::Xaml::GridUnitType::Star});
 grid.ColumnDefinitions().Append(first);
 if(!narrow){
  Microsoft::UI::Xaml::Controls::ColumnDefinition second;
  second.Width(Microsoft::UI::Xaml::GridLength{1,Microsoft::UI::Xaml::GridUnitType::Star});
  grid.ColumnDefinitions().Append(second);
 }
 Microsoft::UI::Xaml::Controls::RowDefinition top;
 top.Height(Microsoft::UI::Xaml::GridLength{1,Microsoft::UI::Xaml::GridUnitType::Auto});
 grid.RowDefinitions().Append(top);
 if(narrow){
  Microsoft::UI::Xaml::Controls::RowDefinition bottom;
  bottom.Height(Microsoft::UI::Xaml::GridLength{1,Microsoft::UI::Xaml::GridUnitType::Auto});
  grid.RowDefinitions().Append(bottom);
 }
 Microsoft::UI::Xaml::Controls::Grid::SetRow(DevicesStatCard(),0);
 Microsoft::UI::Xaml::Controls::Grid::SetColumn(DevicesStatCard(),0);
 Microsoft::UI::Xaml::Controls::Grid::SetRow(SessionsStatCard(),narrow?1:0);
 Microsoft::UI::Xaml::Controls::Grid::SetColumn(SessionsStatCard(),narrow?0:1);
}
void MainWindow::Root_SizeChanged(IInspectable const&,SizeChangedEventArgs const& args){
 const double width=args.NewSize().Width;
 AdvancedDrawer().Width((std::min)(500.0,(std::max)(180.0,width-16.0)));
 WelcomeCard().Width((std::min)(630.0,(std::max)(180.0,width-44.0)));
 const bool narrow=width<800;
 if(narrow==lastNarrow_ && (args.NewSize().Width<960)==lastHeroHidden_ && (args.NewSize().Width<1020)==lastBreadcrumbHidden_ && (args.NewSize().Width<760)==lastChipHidden_)return;
 lastNarrow_=narrow;
 lastHeroHidden_=args.NewSize().Width<960;
 lastBreadcrumbHidden_=args.NewSize().Width<1020;
 lastChipHidden_=args.NewSize().Width<760;
 updateResponsive(args.NewSize().Width);
}
void MainWindow::Home_Click(IInspectable const&,RoutedEventArgs const&){navigate(0);}
void MainWindow::Devices_Click(IInspectable const&,RoutedEventArgs const&){navigate(1);}
void MainWindow::MirrorPage_Click(IInspectable const&,RoutedEventArgs const&){navigate(2);}
void MainWindow::VirtualPage_Click(IInspectable const&,RoutedEventArgs const&){navigate(3);}
void MainWindow::Gaming_Click(IInspectable const&,RoutedEventArgs const&){navigate(4);}
void MainWindow::Mapper_Click(IInspectable const&,RoutedEventArgs const&){navigate(5);}
void MainWindow::Profiles_Click(IInspectable const&,RoutedEventArgs const&){navigate(6);}
void MainWindow::Diagnostics_Click(IInspectable const&,RoutedEventArgs const&){navigate(7);}
void MainWindow::Settings_Click(IInspectable const&,RoutedEventArgs const&){navigate(8);}
void MainWindow::History_Click(IInspectable const&,RoutedEventArgs const&){navigate(9);}
void MainWindow::Help_Click(IInspectable const&,RoutedEventArgs const&){navigate(10);}
void MainWindow::Root_Loaded(IInspectable const&,RoutedEventArgs const&){
 if(loaded_)return;
 loaded_=true;
 navigate(0);
 loadSettings();
 pendingInitialRestore_=true;
 pendingNetworkReconnect_=AutoRestoreSwitch().IsOn();
 refresh();
 refreshRecordings();
 maintenanceTimer_=Microsoft::UI::Xaml::DispatcherTimer();
 maintenanceTimer_.Interval(std::chrono::seconds(3));
 maintenanceTimer_.Tick({this,&MainWindow::Maintenance_Tick});
 maintenanceTimer_.Start();
 if(GetPrivateProfileIntW(L"onboarding",L"completed",0,settingsPath().c_str())!=1)
  WelcomeOverlay().Visibility(Microsoft::UI::Xaml::Visibility::Visible);
}
void MainWindow::WelcomeNext_Click(IInspectable const&,RoutedEventArgs const&){
 ++onboardingStep_;
 if(onboardingStep_==1){
  WelcomeStepTitle().Text(L"1. Liga o teu Android");
  WelcomeStepText().Text(L"Ativa a depuração USB nas opções de programador, liga o cabo e autoriza o pedido RSA no telemóvel. Para Wi-Fi, utiliza o assistente da página Dispositivos.");
  WelcomeProgress().Text(L"Passo 2 de 3");
 }else if(onboardingStep_==2){
  WelcomeStepTitle().Text(L"2. Cria o teu espaço");
  WelcomeStepText().Text(L"Seleciona o dispositivo, abre o ecrã físico ou cria um ecrã virtual. As sessões anteriores serão recuperadas automaticamente sempre que o Android voltar a estar autorizado.");
  WelcomeProgress().Text(L"Passo 3 de 3");
  WelcomeNextButton().Content(box_value(hstring(L"Começar →")));
 }else{
  WelcomeOverlay().Visibility(Microsoft::UI::Xaml::Visibility::Collapsed);
  writeIni(settingsPath(),L"onboarding",L"completed",L"1");
  status(L"Configuração inicial concluída. Bem-vindo!");
 }
}
void MainWindow::ClipboardPC_Click(IInspectable const&,RoutedEventArgs const&){
 ClipboardModeCombo().SelectedIndex(1);
 saveSettings();
 status(L"Clipboard: preferência PC guardada. Abrir uma nova sessão aplica o modo.");
}
void MainWindow::ClipboardAndroid_Click(IInspectable const&,RoutedEventArgs const&){
 ClipboardModeCombo().SelectedIndex(2);
 saveSettings();
 status(L"Clipboard: preferência Android guardada. Abrir uma nova sessão aplica o modo.");
}
void MainWindow::ClipboardMode_Changed(IInspectable const&,Controls::SelectionChangedEventArgs const&){
 if(!loaded_)return;
 const int mode=ClipboardModeCombo().SelectedIndex();
 if(mode==1){
  ActiveClipboardStatus().Text(L"Preferir PC: cópia automática Android → Windows desligada. Ctrl+V no scrcpy cola do PC.");
  ClipboardHint().Text(L"Evita substituir a cópia do computador. Nas novas sessões, usa Ctrl+V no scrcpy para enviar texto PC → Android.");
 }else if(mode==2){
  ActiveClipboardStatus().Text(L"Preferir Android: ao copiar no Android, o scrcpy atualiza o clipboard do computador.");
  ClipboardHint().Text(L"Copiar no Android sincroniza com Windows. Ctrl+V no Android continua disponível; esta preferência não bloqueia o PC.");
 }else{
  ActiveClipboardStatus().Text(L"Automático: cópias Android vão para o PC e Ctrl+V no scrcpy cola do Windows.");
  ClipboardHint().Text(L"Sincronização nativa scrcpy. Quando o ecrã Android tem o foco, utiliza Ctrl+C e Ctrl+V.");
 }
}
void MainWindow::AdvancedSettings_Click(IInspectable const&,RoutedEventArgs const&){
 AdvancedLayer().Visibility(Visibility::Visible);
}
void MainWindow::CloseAdvanced_Click(IInspectable const&,RoutedEventArgs const&){
 AdvancedLayer().Visibility(Visibility::Collapsed);
}
void MainWindow::SaveAdvanced_Click(IInspectable const&,RoutedEventArgs const&){
 saveSettings();
 AdvancedLayer().Visibility(Visibility::Collapsed);
 status(L"Definições avançadas guardadas. As sessões abertas continuam com as opções originais.");
}
void MainWindow::LaunchMode_Changed(IInspectable const&,Controls::SelectionChangedEventArgs const&){
 if(!loaded_)return;
 updateLaunchInputs();
 if(LaunchModeCombo().SelectedIndex()==1 && appPackages_.empty())refreshInstalledApps();
}
void MainWindow::Resolution_Changed(IInspectable const&,Controls::SelectionChangedEventArgs const&){
 if(!loaded_)return;
 OrientationWarning().Visibility(ResolutionCombo().SelectedIndex()==3?Visibility::Visible:Visibility::Collapsed);
}
void MainWindow::updateLaunchInputs(){
 const int mode=LaunchModeCombo().SelectedIndex();
 InstalledAppsPanel().Visibility(mode==1?Visibility::Visible:Visibility::Collapsed);
 CustomLauncherHint().Visibility(mode==2?Visibility::Visible:Visibility::Collapsed);
}
std::wstring MainWindow::captureAdbOutput(const std::wstring& args,DWORD timeoutMs){
 // A temporary file prevents the UI deadlocking when adb prints more than a pipe buffer.
 wchar_t dir[MAX_PATH]{};wchar_t temp[MAX_PATH]{};
 if(!GetTempPathW(MAX_PATH,dir)||!GetTempFileNameW(dir,L"RSM",0,temp))return {};
 SECURITY_ATTRIBUTES sa{sizeof(sa),nullptr,TRUE};
 HANDLE file=CreateFileW(temp,GENERIC_READ|GENERIC_WRITE,FILE_SHARE_READ|FILE_SHARE_WRITE,
  &sa,CREATE_ALWAYS,FILE_ATTRIBUTE_TEMPORARY,nullptr);
 if(file==INVALID_HANDLE_VALUE){DeleteFileW(temp);return {};}
 PROCESS_INFORMATION pi{};
 if(!process(tools(L"adb.exe"),args,pi,true,file)){
  CloseHandle(file);DeleteFileW(temp);return {};
 }
 if(WaitForSingleObject(pi.hProcess,timeoutMs)==WAIT_TIMEOUT){
  TerminateProcess(pi.hProcess,1);
  WaitForSingleObject(pi.hProcess,1500);
 }
 CloseHandle(pi.hThread);CloseHandle(pi.hProcess);
 LARGE_INTEGER len{};
 std::wstring result;
 if(GetFileSizeEx(file,&len)&&len.QuadPart>0&&len.QuadPart<=262144){
  SetFilePointer(file,0,nullptr,FILE_BEGIN);
  std::string bytes(static_cast<size_t>(len.QuadPart),'\0');
  DWORD got=0;
  if(ReadFile(file,bytes.data(),static_cast<DWORD>(bytes.size()),&got,nullptr))
   result.assign(bytes.begin(),bytes.begin()+static_cast<std::ptrdiff_t>(got));
 }
 CloseHandle(file);DeleteFileW(temp);
 return result;
}
void MainWindow::refreshInstalledApps(){
 int previous=InstalledAppsCombo().SelectedIndex();
 auto previousPackage=(previous>=0&&static_cast<size_t>(previous)<appPackages_.size())?appPackages_[previous]:std::wstring();
 const auto serial=selected();
 ++appScanGeneration_;
 if(serial.empty()){
  appPackages_.clear();
  InstalledAppsCombo().Items().Clear();
  InstalledAppsCombo().IsEnabled(false);
  InstalledAppsHint().Text(L"Seleciona um Android autorizado na página Dispositivos.");
  return;
 }
 InstalledAppsHint().Text(L"A identificar aplicações instaladas no Android...");
 InstalledAppsCombo().IsEnabled(false);
 refreshInstalledAppsAsync(serial,previousPackage,appScanGeneration_);
}
winrt::fire_and_forget MainWindow::refreshInstalledAppsAsync(std::wstring serial,std::wstring previousPackage,uint64_t generation){
 auto strong=get_strong();
 auto dispatcher=DispatcherQueue();
 co_await winrt::resume_background();
 auto output=captureAdbOutput(L"-s "+quote(serial)+L" shell pm list packages -3",8000);
 std::wistringstream stream(output);
 std::wstring line;
 std::vector<std::wstring> packages;
 while(std::getline(stream,line)){
  if(!line.empty()&&line.back()==L'\r')line.pop_back();
  constexpr wchar_t prefix[]=L"package:";
  if(line.rfind(prefix,0)!=0)continue;
  auto pkg=line.substr(8);
  if(!rs::display::validPackage(pkg))continue;
  packages.push_back(pkg);
 }
 std::sort(packages.begin(),packages.end());
 packages.erase(std::unique(packages.begin(),packages.end()),packages.end());
 dispatcher.TryEnqueue([strong,serial=std::move(serial),previousPackage=std::move(previousPackage),
                       generation,packages=std::move(packages)]() mutable{
  auto* that=strong.get();
  if(generation!=that->appScanGeneration_ || that->selected()!=serial)return;
  that->appPackages_=std::move(packages);
  auto combo=that->InstalledAppsCombo();
  combo.Items().Clear();
  int preferred=-1;
  for(size_t i=0;i<that->appPackages_.size();++i){
   combo.Items().Append(box_value(hstring(that->appPackages_[i])));
   if(that->appPackages_[i]==previousPackage)preferred=static_cast<int>(i);
  }
  if(preferred>=0)combo.SelectedIndex(preferred);
  combo.IsEnabled(!that->appPackages_.empty());
  that->InstalledAppsHint().Text(that->appPackages_.empty()?
   L"Não foi possível listar apps instaladas. Confirma a autorização Android e tenta novamente.":
   L"Aplicações instaladas encontradas. A compatibilidade de abertura depende da aplicação; os nomes técnicos serão substituídos por nomes e ícones após validação dos metadados.");
 });
}
void MainWindow::RefreshApps_Click(IInspectable const&,RoutedEventArgs const&){
 refreshInstalledApps();
 status(appPackages_.empty()?L"Sem aplicações para mostrar. Confirma a ligação Android.":L"Lista de aplicações atualizada.");
}
void MainWindow::loadSettings(){
 const auto path=settingsPath();
 choose(FpsCombo(),ini(path,L"video",L"fps",L"60"));
 choose(BitrateCombo(),ini(path,L"video",L"bitrate",L"16"));
 auto res=ini(path,L"video",L"resolution",L"");
 // Previous builds applied landscape by default; migrate them safely to auto.
 ResolutionCombo().SelectedIndex(0);
 if(res==L"Vertical · 1080×1920"||res==L"1080x1920/320")ResolutionCombo().SelectedIndex(1);
 else if(res==L"Vertical leve · 720×1280"||res==L"720x1280/320")ResolutionCombo().SelectedIndex(2);
 // Landscape is never migrated automatically; users must opt in explicitly.
 LaunchModeCombo().SelectedIndex(std::clamp(static_cast<int>(GetPrivateProfileIntW(L"virtual",L"launch_mode",0,path.c_str())),0,2));
 ClipboardModeCombo().SelectedIndex(std::clamp(static_cast<int>(GetPrivateProfileIntW(L"clipboard",L"mode",0,path.c_str())),0,2));
 updateLaunchInputs();
 LauncherBox().Text(ini(path,L"video",L"launcher",L"org.fossify.home"));
 DuplicateAudio().IsOn(ini(path,L"video",L"audio_dup",L"0")==L"1");
 AutoRestoreSwitch().IsOn(ini(path,L"startup",L"auto_restore",L"1")==L"1");
 EndpointBox().Text(ini(path,L"wireless",L"endpoint",L""));
 RecordMirrorToggle().IsOn(ini(path,L"recording",L"mirror",L"0")==L"1");
 RecordVirtualToggle().IsOn(ini(path,L"recording",L"virtual",L"0")==L"1");
}
void MainWindow::saveSettings(){
 const auto path=settingsPath();
 writeIni(path,L"video",L"fps",option(FpsCombo()));
 writeIni(path,L"video",L"bitrate",option(BitrateCombo()));
 writeIni(path,L"video",L"resolution",option(ResolutionCombo()));
 writeIni(path,L"virtual",L"launch_mode",std::to_wstring(LaunchModeCombo().SelectedIndex()));
 writeIni(path,L"clipboard",L"mode",std::to_wstring(ClipboardModeCombo().SelectedIndex()));
 writeIni(path,L"video",L"launcher",std::wstring(LauncherBox().Text().c_str()));
 writeIni(path,L"video",L"audio_dup",DuplicateAudio().IsOn()?L"1":L"0");
 writeIni(path,L"startup",L"auto_restore",AutoRestoreSwitch().IsOn()?L"1":L"0");
 auto endpoint=std::wstring(EndpointBox().Text().c_str());
 if(endpoint.empty()||valid(endpoint))writeIni(path,L"wireless",L"endpoint",endpoint);
 writeIni(path,L"recording",L"mirror",RecordMirrorToggle().IsOn()?L"1":L"0");
 writeIni(path,L"recording",L"virtual",RecordVirtualToggle().IsOn()?L"1":L"0");
}
void MainWindow::SaveSettings_Click(IInspectable const&,RoutedEventArgs const&){
 saveSettings();status(L"Definições guardadas localmente.");
}
void MainWindow::updateSummary(){
 size_t authorized=0;
 for(auto& d:deviceStates_)if(d==L"device")++authorized;
 DeviceCountText().Text(hstring(std::to_wstring(authorized)+L" autorizado(s)"));
 DeviceSummaryText().Text(authorized?L"Dispositivo(s) autorizado(s), pronto(s) para abrir sessões.":L"Liga por USB e autoriza a depuração, ou emparelha por Wi-Fi.");
 size_t active=0;
 for(auto& s:sessions_)if(s.process.hProcess&&WaitForSingleObject(s.process.hProcess,0)==WAIT_TIMEOUT)++active;
 SessionCountText().Text(hstring(std::to_wstring(active)+L" sessão(ões) ativa(s)"));
 OnlineBadge().Text(authorized?L"Android conectado":L"A aguardar Android");
 ConnectivityChip().Background(Microsoft::UI::Xaml::Media::SolidColorBrush(
  authorized?winrt::Windows::UI::Color{255,19,47,38}:winrt::Windows::UI::Color{255,53,42,28}));
 ConnectivityChip().BorderBrush(Microsoft::UI::Xaml::Media::SolidColorBrush(
  authorized?winrt::Windows::UI::Color{255,45,111,79}:winrt::Windows::UI::Color{255,118,88,53}));
 ConnectivityIcon().Foreground(Microsoft::UI::Xaml::Media::SolidColorBrush(
  authorized?winrt::Windows::UI::Color{255,131,217,164}:winrt::Windows::UI::Color{255,236,194,125}));
 OnlineBadge().Foreground(Microsoft::UI::Xaml::Media::SolidColorBrush(
  authorized?winrt::Windows::UI::Color{255,142,229,177}:winrt::Windows::UI::Color{255,232,192,119}));
 std::wstring diagnostics=L"ADB: "+std::wstring(GetFileAttributesW(tools(L"adb.exe").c_str())!=INVALID_FILE_ATTRIBUTES?L"disponível":L"não encontrado");
 diagnostics+=L"\nscrcpy: "+std::wstring(GetFileAttributesW(tools(L"scrcpy.exe").c_str())!=INVALID_FILE_ATTRIBUTES?L"disponível":L"não encontrado");
 diagnostics+=L"\nDispositivos detetados: "+std::to_wstring(serials_.size());
 diagnostics+=L"\nDispositivos autorizados: "+std::to_wstring(authorized);
 diagnostics+=L"\nSessões ativas: "+std::to_wstring(active);
 for(size_t i=0;i<serials_.size();++i)diagnostics+=L"\n"+serials_[i]+L" — "+deviceStates_[i];
 DiagnosticsText().Text(hstring(diagnostics));
 HistoryText().Text(hstring(history_.empty()?std::wstring(L"Ainda não há sessões registadas."):history_));
 DevicesEmptyState().Visibility(serials_.empty()?Visibility::Visible:Visibility::Collapsed);
 DeviceGrid().Visibility(serials_.empty()?Visibility::Collapsed:Visibility::Visible);
 refreshSessionLists();
 updateActionAvailability();
}
void MainWindow::refresh(){
 if(refreshBusy_){status(L"A atualização dos dispositivos já está em curso.");return;}
 refreshBusy_=true;
 std::wstring endpoint;
 if(pendingNetworkReconnect_){
  pendingNetworkReconnect_=false;
  auto saved=ini(settingsPath(),L"wireless",L"endpoint");
  if(valid(saved))endpoint=saved;
 }
 status(L"A verificar dispositivos Android em segundo plano...");
 refreshAsync(std::move(endpoint));
}
winrt::fire_and_forget MainWindow::refreshAsync(std::wstring endpoint){
 auto strong=get_strong();
 auto dispatcher=DispatcherQueue();
 co_await winrt::resume_background();
 if(!endpoint.empty())captureAdbOutput(L"connect "+endpoint,7500);
 auto output=captureAdbOutput(L"devices -l",9500);
 dispatcher.TryEnqueue([strong,output=std::move(output)]{
  auto* that=strong.get();
  that->refreshBusy_=false;
  that->applyDeviceOutput(output);
 });
}
void MainWindow::applyDeviceOutput(const std::wstring& output){
 const auto previous=DevicesCombo().SelectedIndex();
 std::wstring selectedSerial=previous>=0&&static_cast<size_t>(previous)<serials_.size()?serials_[previous]:L"";
 std::wistringstream stream(output);
 std::wstring line;
 syncing_=true;
 serials_.clear();deviceStates_.clear();
 DevicesCombo().Items().Clear();
 DeviceGrid().Items().Clear();
 while(std::getline(stream,line)){
  if(line.empty()||line.find(L"List of devices")!=std::wstring::npos||line[0]==L'*')continue;
  std::wistringstream parts(line);
  std::wstring id,state;parts>>id>>state;
  if(id.empty()||state.empty())continue;
  if(state!=L"device"&&state!=L"unauthorized"&&state!=L"offline")continue;
  serials_.push_back(id);deviceStates_.push_back(state);
  auto displayState=(state==L"device"?L"Pronto":state==L"unauthorized"?L"Autorizar no Android":L"Desligado");
  auto label=hstring(id+L"  ·  "+displayState);
  DevicesCombo().Items().Append(box_value(label));
  DeviceGrid().Items().Append(box_value(label));
 }
 int32_t found=-1;
 for(size_t i=0;i<serials_.size();++i)if(serials_[i]==selectedSerial){found=static_cast<int32_t>(i);break;}
 if(found<0&&serials_.size())found=0;
 if(found>=0){DevicesCombo().SelectedIndex(found);DeviceGrid().SelectedIndex(found);}
 syncing_=false;
 if(LaunchModeCombo().SelectedIndex()==1)refreshInstalledApps();
 updateSummary();
 if(pendingInitialRestore_){
  bool authorized=false;
  for(const auto& st:deviceStates_)if(st==L"device"){authorized=true;break;}
  if(authorized){pendingInitialRestore_=false;restoreSessions();}
 }
 if(output.empty())status(L"O ADB não respondeu ou não foi encontrado. Confirma a ligação e volta a tentar.");
 else if(serials_.empty())status(L"Nenhum Android encontrado. Abre Dispositivos para ajuda.");
 else status(L"Lista de dispositivos atualizada.");
}
void MainWindow::saveSessions(){
 const auto path=settingsPath();
 size_t count=0;
 for(auto& session:sessions_){
  if(!session.process.hProcess||WaitForSingleObject(session.process.hProcess,0)!=WAIT_TIMEOUT)continue;
  if(count>=16)break;
  auto idx=std::to_wstring(count);
  auto sk=L"serial"+idx;auto vk=L"virtual"+idx;auto tk=L"target"+idx;auto rk=L"resolution"+idx;auto ck=L"clipboard"+idx;
  writeIni(path,L"resume",sk.c_str(),session.serial);
  writeIni(path,L"resume",vk.c_str(),session.virtualDisplay?L"1":L"0");
  writeIni(path,L"resume",tk.c_str(),session.appTarget);
  writeIni(path,L"resume",rk.c_str(),std::to_wstring(session.resolutionIndex));
  writeIni(path,L"resume",ck.c_str(),std::to_wstring(session.clipboardIndex));
  ++count;
 }
 writeIni(path,L"resume",L"count",std::to_wstring(count));
}
void MainWindow::ListSelection_Changed(IInspectable const&,Controls::SelectionChangedEventArgs const&){
 updateActionAvailability();
}
void MainWindow::updateActionAvailability(){
 const bool hasSessions=!sessions_.empty();
 const bool hasMedia=!recordings_.empty();
 MirrorSessionsEmpty().Visibility(hasSessions?Visibility::Collapsed:Visibility::Visible);
 VirtualSessionsEmpty().Visibility(hasSessions?Visibility::Collapsed:Visibility::Visible);
 RecordingsEmpty().Visibility(hasMedia?Visibility::Collapsed:Visibility::Visible);
 StopMirrorSelectedButton().IsEnabled(hasSessions&&MirrorSessionsList().SelectedIndex()>=0);
 StopVirtualSelectedButton().IsEnabled(hasSessions&&VirtualSessionsList().SelectedIndex()>=0);
 OpenRecordingButton().IsEnabled(hasMedia&&RecordingsList().SelectedIndex()>=0);
}
void MainWindow::refreshSessionLists(){
 auto mirror=MirrorSessionsList();
 auto virtuals=VirtualSessionsList();
 int mi=mirror.SelectedIndex(),vi=virtuals.SelectedIndex();
 mirror.Items().Clear();
 virtuals.Items().Clear();
 for(const auto& session:sessions_){
  auto label=hstring((session.virtualDisplay?L"Ecrã virtual":L"Espelhamento")+std::wstring(L" · ")+session.serial+
    (session.recording?L" · ● MP4":L"") +L" · PID "+std::to_wstring(session.process.dwProcessId));
  mirror.Items().Append(box_value(label));
  virtuals.Items().Append(box_value(label));
 }
 if(mi>=0&&static_cast<size_t>(mi)<sessions_.size())mirror.SelectedIndex(mi);
 if(vi>=0&&static_cast<size_t>(vi)<sessions_.size())virtuals.SelectedIndex(vi);
 updateActionAvailability();
}
void MainWindow::reapExitedSessions(){
 bool changed=false;
 for(size_t i=0;i<sessions_.size();){
  auto& sess=sessions_[i];
  if(sess.process.hProcess&&WaitForSingleObject(sess.process.hProcess,0)==WAIT_TIMEOUT){++i;continue;}
  if(sess.recording){history_+=L"Gravação finalizada: "+sess.recordingFile+L"\n";refreshRecordings();}
  if(sess.process.hThread)CloseHandle(sess.process.hThread);
  if(sess.process.hProcess)CloseHandle(sess.process.hProcess);
  sessions_.erase(sessions_.begin()+static_cast<std::ptrdiff_t>(i));
  changed=true;
 }
 if(changed){saveSessions();updateSummary();}
}
void MainWindow::Maintenance_Tick(IInspectable const&,IInspectable const&){
 reapExitedSessions();
}
void MainWindow::stopAt(size_t i){
 if(i>=sessions_.size()){status(L"Seleciona uma sessão ativa.");return;}
 auto& session=sessions_[i];
 DWORD pid=session.process.dwProcessId;
 EnumWindows([](HWND window,LPARAM param)->BOOL{
  DWORD owner=0;GetWindowThreadProcessId(window,&owner);
  if(owner==static_cast<DWORD>(param))PostMessageW(window,WM_CLOSE,0,0);
  return TRUE;
 },static_cast<LPARAM>(pid));
 if(WaitForSingleObject(session.process.hProcess,3500)==WAIT_TIMEOUT){
  // No responsive scrcpy window; fall back to force-stop.
  TerminateProcess(session.process.hProcess,0);
  if(session.recording)status(L"Sessão forçada a terminar; o MP4 pode não estar finalizado.");
 }
 if(session.recording){history_+=L"MP4: "+session.recordingFile+L"\n";refreshRecordings();}
 if(session.process.hThread)CloseHandle(session.process.hThread);
 if(session.process.hProcess)CloseHandle(session.process.hProcess);
 sessions_.erase(sessions_.begin()+static_cast<std::ptrdiff_t>(i));
 saveSessions();updateSummary();
 status(L"Sessão selecionada terminada.");
}
void MainWindow::restoreSessions(){
 if(!AutoRestoreSwitch().IsOn())return;
 const auto path=settingsPath();
 int count=std::clamp(static_cast<int>(GetPrivateProfileIntW(L"resume",L"count",0,path.c_str())),0,16);
 struct ResumeData{std::wstring serial;bool virtualDisplay;std::wstring target;int resolution;int clipboard;};
 std::vector<ResumeData> requested;
 for(int i=0;i<count;++i){
  auto idx=std::to_wstring(i);
  auto serial=ini(path,L"resume",(L"serial"+idx).c_str());
  if(serial.empty())continue;
  bool virt=ini(path,L"resume",(L"virtual"+idx).c_str())==L"1";
  auto target=ini(path,L"resume",(L"target"+idx).c_str());
  int res=GetPrivateProfileIntW(L"resume",(L"resolution"+idx).c_str(),0,path.c_str());
  int clip=GetPrivateProfileIntW(L"resume",(L"clipboard"+idx).c_str(),0,path.c_str());
  requested.push_back({serial,virt,target,std::clamp(res,0,3),std::clamp(clip,0,2)});
 }
 // Always recheck Android ADB authorization before launching a saved session.
 for(const auto& item:requested){
  bool allowed=false;
  for(size_t i=0;i<serials_.size();++i)if(serials_[i]==item.serial&&deviceStates_[i]==L"device")allowed=true;
  if(allowed)startFor(item.serial,item.virtualDisplay,false,item.target,item.resolution,item.clipboard);
 }
 if(!requested.empty()&&sessions_.empty())status(L"Há sessões guardadas. Liga e autoriza o Android para as recuperar.");
 if(!sessions_.empty())saveSessions();
}
void MainWindow::startFor(const std::wstring& serial,bool virtualDisplay,bool persist,const std::wstring& overrideTarget,int overrideResolution,int overrideClipboard){
 const auto fps=option(FpsCombo()),bitrate=option(BitrateCombo());
 if(fps.empty()||bitrate.empty()){status(L"Seleciona um perfil de vídeo válido.");return;}
 int resolution=std::clamp(overrideResolution>=0?overrideResolution:ResolutionCombo().SelectedIndex(),0,3);
 int clipboard=std::clamp(overrideClipboard>=0?overrideClipboard:ClipboardModeCombo().SelectedIndex(),0,2);
 std::wstring target;
 if(virtualDisplay){
  if(overrideResolution>=0)target=overrideTarget;
  else {
   const int mode=LaunchModeCombo().SelectedIndex();
   if(mode==1){
    int index=InstalledAppsCombo().SelectedIndex();
    if(index<0||static_cast<size_t>(index)>=appPackages_.size()){
     status(L"Escolhe uma aplicação instalada antes de iniciar.");navigate(3);return;
    }
    target=appPackages_[index];
   }else if(mode==2)target=std::wstring(LauncherBox().Text().c_str());
  }
  if(!target.empty()&&!rs::display::validPackage(target)){
   status(L"O identificador Android contém caracteres inválidos.");return;
  }
 }
 std::wstring args=L"--serial="+quote(serial)+L" --max-fps="+fps+L" --video-bit-rate="+bitrate+L"M --video-codec=h264 --keep-active";
 if(virtualDisplay){
  // Auto mode uses Android native dimensions; never force landscape implicitly.
  args+=rs::display::virtualDisplayArgs(resolution);
  if(!target.empty())args+=L" --start-app="+target;
 }
 // scrcpy owns Android↔Windows clipboard sync. PC preference disables automatic Android overwrite.
 args+=rs::display::clipboardArgs(clipboard);
 if(DuplicateAudio().IsOn())args+=L" --audio-source=playback --audio-dup";
 else args+=L" --audio-source=output";
 bool recording=virtualDisplay?RecordVirtualToggle().IsOn():RecordMirrorToggle().IsOn();
 std::wstring recordingFile;
 if(!persist)recording=false; // restored session must never begin recording unexpectedly
 if(recording){
  recordingFile=newMediaPath(L".mp4");
  args+=L" --record="+quote(recordingFile);
 }
 PROCESS_INFORMATION pi{};
 if(!process(tools(L"scrcpy.exe"),args,pi,false)){status(L"scrcpy.exe não encontrado no pacote.");return;}
 sessions_.push_back(Session{pi,serial,virtualDisplay,recording,recordingFile,target,resolution,clipboard});
 history_+=(virtualDisplay?L"Ecrã virtual — ":L"Espelhamento — ")+serial+(recording?L" (a gravar MP4)":L"")+L"\n";
 if(persist)saveSessions();
 saveSettings();
 updateSummary();
 status(virtualDisplay?L"Ecrã virtual iniciado; orientação automática salvo escolha manual.":L"Espelhamento iniciado. Ctrl+C/V funciona na janela Android.");
}
void MainWindow::start(bool virtualDisplay){
 const auto serial=selected();
 if(serial.empty()){status(L"Seleciona um Android com estado device (autorizado).");navigate(1);return;}
 startFor(serial,virtualDisplay,true);
}
void MainWindow::command(const std::wstring& args){
 PROCESS_INFORMATION pi{};
 if(!process(tools(L"adb.exe"),args,pi,false)){status(L"Não foi possível executar ADB.");return;}
 CloseHandle(pi.hThread);CloseHandle(pi.hProcess);
 status(L"Comando ADB enviado. Atualiza os dispositivos após concluir.");
}
void MainWindow::Refresh_Click(IInspectable const&,RoutedEventArgs const&){refresh();}
void MainWindow::Mirror_Click(IInspectable const&,RoutedEventArgs const&){start(false);}
void MainWindow::Virtual_Click(IInspectable const&,RoutedEventArgs const&){start(true);}
void MainWindow::Stop_Click(IInspectable const&,RoutedEventArgs const&){
 if(sessions_.empty()){status(L"Não existem sessões ativas.");return;}
 stopAt(sessions_.size()-1);
}
void MainWindow::StopMirrorSelected_Click(IInspectable const&,RoutedEventArgs const&){
 int i=MirrorSessionsList().SelectedIndex();
 if(i<0){status(L"Seleciona uma sessão na lista.");return;}
 stopAt(static_cast<size_t>(i));
}
void MainWindow::StopVirtualSelected_Click(IInspectable const&,RoutedEventArgs const&){
 int i=VirtualSessionsList().SelectedIndex();
 if(i<0){status(L"Seleciona uma sessão na lista.");return;}
 stopAt(static_cast<size_t>(i));
}
void MainWindow::refreshRecordings(){
 recordings_.clear();
 auto list=RecordingsList();
 list.Items().Clear();
 const auto search=recordingsPath()+L"\\*";
 WIN32_FIND_DATAW item{};
 HANDLE h=FindFirstFileW(search.c_str(),&item);
 if(h==INVALID_HANDLE_VALUE){updateActionAvailability();return;}
 do{
  if((item.dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY)!=0)continue;
  std::wstring name(item.cFileName);
  auto dot=name.find_last_of(L'.');
  if(dot==std::wstring::npos)continue;
  auto extension=name.substr(dot);
  std::transform(extension.begin(),extension.end(),extension.begin(),[](wchar_t c){return static_cast<wchar_t>(std::towlower(c));});
  if(extension!=L".mp4"&&extension!=L".png")continue;
  recordings_.push_back(name);
 }while(FindNextFileW(h,&item)&&recordings_.size()<500);
 FindClose(h);
 std::sort(recordings_.rbegin(),recordings_.rend());
 for(const auto& name:recordings_)list.Items().Append(box_value(hstring(name)));
 updateActionAvailability();
}
void MainWindow::RefreshRecordings_Click(IInspectable const&,RoutedEventArgs const&){
 refreshRecordings();
 status(L"Lista de gravações e screenshots atualizada.");
}
void MainWindow::OpenSelectedRecording_Click(IInspectable const&,RoutedEventArgs const&){
 int index=RecordingsList().SelectedIndex();
 if(index<0||static_cast<size_t>(index)>=recordings_.size()){status(L"Seleciona um ficheiro da lista.");return;}
 const auto file=recordingsPath()+L"\\"+recordings_[index];
 auto result=reinterpret_cast<INT_PTR>(ShellExecuteW(nullptr,L"open",file.c_str(),nullptr,nullptr,SW_SHOWNORMAL));
 if(result<=32)status(L"Não foi possível abrir o ficheiro com o Windows.");
}
void MainWindow::OpenRecordings_Click(IInspectable const&,RoutedEventArgs const&){
 const auto folder=recordingsPath();
 auto result=reinterpret_cast<INT_PTR>(ShellExecuteW(nullptr,L"open",folder.c_str(),nullptr,nullptr,SW_SHOWNORMAL));
 if(result<=32)status(L"Não foi possível abrir a pasta de gravações.");
}
void MainWindow::Screenshot_Click(IInspectable const&,RoutedEventArgs const&){
 const auto serial=selected();
 if(serial.empty()){status(L"Seleciona primeiro um Android autorizado.");navigate(1);return;}
 const auto file=newMediaPath(L".png");
 HANDLE out=CreateFileW(file.c_str(),GENERIC_WRITE,0,nullptr,CREATE_NEW,FILE_ATTRIBUTE_NORMAL,nullptr);
 if(out==INVALID_HANDLE_VALUE){status(L"Não foi possível criar a imagem na pasta de gravações.");return;}
 SECURITY_ATTRIBUTES sa{sizeof(sa),nullptr,TRUE};HANDLE reader{},writer{};
 if(!CreatePipe(&reader,&writer,&sa,0)){CloseHandle(out);DeleteFileW(file.c_str());status(L"Erro ao preparar a captura.");return;}
 SetHandleInformation(reader,HANDLE_FLAG_INHERIT,0);
 PROCESS_INFORMATION pi{};
 const auto cmd=L"-s "+quote(serial)+L" exec-out screencap -p";
 if(!process(tools(L"adb.exe"),cmd,pi,true,writer)){
  CloseHandle(writer);CloseHandle(reader);CloseHandle(out);DeleteFileW(file.c_str());
  status(L"Não foi possível iniciar a captura ADB.");return;
 }
 CloseHandle(writer);
 char block[16384];DWORD got=0,written=0;
 size_t total=0;bool success=true;unsigned char signature[8]{};size_t sigCount=0;
 while(ReadFile(reader,block,sizeof(block),&got,nullptr)&&got){
  for(DWORD i=0;i<got&&sigCount<8;++i)signature[sigCount++]=static_cast<unsigned char>(block[i]);
  total+=got;
  if(total>64ull*1024ull*1024ull||!WriteFile(out,block,got,&written,nullptr)||written!=got){success=false;break;}
 }
 CloseHandle(reader);
 if(!success)TerminateProcess(pi.hProcess,1);
 WaitForSingleObject(pi.hProcess,5000);
 DWORD exitCode=1;GetExitCodeProcess(pi.hProcess,&exitCode);
 CloseHandle(pi.hThread);CloseHandle(pi.hProcess);CloseHandle(out);
 constexpr unsigned char png[8]={137,80,78,71,13,10,26,10};
 if(!success||exitCode!=0||total<8||!std::equal(std::begin(signature),std::end(signature),std::begin(png))){
  DeleteFileW(file.c_str());
  status(L"A captura falhou; confirma que o dispositivo está autorizado e desbloqueado.");return;
 }
 history_+=L"Screenshot: "+file+L"\n";refreshRecordings();updateSummary();
 status(L"Screenshot do ecrã físico guardado na pasta Recordings.");
}
void MainWindow::hotspotBusy(bool busy){
 hotspotBusy_=busy;
 HotspotProgress().Visibility(busy?Visibility::Visible:Visibility::Collapsed);
 HotspotProgress().IsActive(busy);
 HotspotScanButton().IsEnabled(!busy);
 HotspotUsbButton().IsEnabled(!busy);
 HotspotConnectButton().IsEnabled(!busy);
}
void MainWindow::OpenWindowsWifi_Click(IInspectable const&,RoutedEventArgs const&){
 auto r=reinterpret_cast<INT_PTR>(ShellExecuteW(nullptr,L"open",L"ms-settings:network-wifi",nullptr,nullptr,SW_SHOWNORMAL));
 if(r<=32)status(L"Não foi possível abrir as definições Wi-Fi. Abre Definições > Rede e Internet > Wi-Fi.");
}
void MainWindow::ScanHotspot_Click(IInspectable const&,RoutedEventArgs const&){
 if(hotspotBusy_)return;
 hotspotBusy(true);
 HotspotResult().Text(L"A identificar as redes Wi-Fi e o endereço de gateway local...");
 hotspotScanAsync();
}
winrt::fire_and_forget MainWindow::hotspotScanAsync(){
 auto strong=get_strong();
 auto dispatcher=DispatcherQueue();
 co_await winrt::resume_background();
 auto interfaces=rs::hotspot::discover();
 dispatcher.TryEnqueue([strong,interfaces=std::move(interfaces)]() mutable{
  auto* that=strong.get();
  that->hotspotGateways_.clear();
  auto combo=that->HotspotInterfaceCombo();
  combo.Items().Clear();
  for(const auto& net:interfaces){
   std::wstring label=net.name;
   if(!net.ssid.empty())label+=L" — "+net.ssid;
   label+=net.connected?L" · conectada":L" · sem ligação";
   combo.Items().Append(box_value(hstring(label)));
   that->hotspotGateways_.push_back(net.connected?net.gateway:L"");
  }
  if(!interfaces.empty()){
   combo.SelectedIndex(0);
   that->HotspotResult().Text(L"Interfaces Wi-Fi identificadas. Confirma que o SSID é o hotspot do Android e que o ADB está autorizado antes de conectar.");
  }else{
   that->HotspotNetworkInfo().Text(L"Nenhum adaptador Wi-Fi detetado. Verifica se o PC tem Wi-Fi ativado; pode ser necessário um adaptador USB Wi-Fi.");
   that->HotspotResult().Text(L"Não foi encontrada nenhuma interface Wi-Fi. Abre as definições Windows e liga-te ao hotspot primeiro.");
  }
  that->hotspotBusy(false);
 });
}
void MainWindow::HotspotInterface_Changed(IInspectable const&,Controls::SelectionChangedEventArgs const&){
 int32_t i=HotspotInterfaceCombo().SelectedIndex();
 if(i<0||static_cast<size_t>(i)>=hotspotGateways_.size())return;
 auto gateway=hotspotGateways_[i];
 if(rs::hotspot::validIPv4(gateway)){
  HotspotNetworkInfo().Text(hstring(L"Gateway Wi-Fi candidato: "+gateway+L". Este IP pode pertencer ao hotspot, mas ainda não há prova de ADB autorizado."));
  HotspotEndpointBox().Text(hstring(gateway+L":5555"));
 }else{
  HotspotNetworkInfo().Text(L"A interface selecionada não tem gateway IPv4 válido. Conecta o PC ao hotspot e atualiza a lista.");
 }
}
void MainWindow::EnableUsbTcpip_Click(IInspectable const&,RoutedEventArgs const&){
 if(hotspotBusy_)return;
 const auto serial=selected();
 if(serial.empty()){status(L"Seleciona primeiro um Android USB autorizado.");navigate(1);return;}
 if(serial.find(L':')!=std::wstring::npos){
  status(L"Seleciona uma ligação USB autorizada, não uma conexão ADB de rede.");return;
 }
 hotspotBusy(true);
 HotspotResult().Text(L"A ativar ADB TCP/IP no dispositivo USB autorizado...");
 hotspotAdbAsync(L"-s "+quote(serial)+L" tcpip 5555",L"",true);
}
void MainWindow::ConnectHotspot_Click(IInspectable const&,RoutedEventArgs const&){
 if(hotspotBusy_)return;
 auto endpoint=std::wstring(HotspotEndpointBox().Text().c_str());
 auto colon=endpoint.rfind(L':');
 if(colon==std::wstring::npos||!rs::hotspot::validIPv4(endpoint.substr(0,colon))){
  status(L"Indica o endereço IPv4 válido do Android e a porta ADB, por exemplo 192.168.43.1:5555.");return;
 }
 auto port=endpoint.substr(colon+1);
 if(port.empty()||port.size()>5||!std::all_of(port.begin(),port.end(),[](wchar_t v){return v>=L'0'&&v<=L'9';})){
  status(L"A porta ADB precisa de ser um número entre 1 e 65535.");return;
 }
 unsigned long number=std::stoul(port);
 if(number==0||number>65535){status(L"A porta ADB deve estar entre 1 e 65535.");return;}
 hotspotBusy(true);
 HotspotResult().Text(L"A conectar ao endereço informado. A ligação só fica pronta após autorização ADB.");
 hotspotAdbAsync(L"connect "+endpoint,endpoint,false);
}
winrt::fire_and_forget MainWindow::hotspotAdbAsync(std::wstring args,std::wstring endpoint,bool tcpip){
 auto strong=get_strong();
 auto dispatcher=DispatcherQueue();
 co_await winrt::resume_background();
 auto output=captureAdbOutput(args,10000);
 bool passed=false;
 std::wstring followup;
 if(tcpip){
  passed=output.find(L"restarting in TCP mode")!=std::wstring::npos;
  followup=passed?L"ADB TCP/IP ativado via USB. Confirma o IP do hotspot, retira o cabo se necessário e usa «Conectar ao Android pela rede».":L"ADB não confirmou TCP/IP. Verifica a autorização USB e tenta novamente.";
 }else{
  bool connected=(output.find(L"connected to")!=std::wstring::npos||output.find(L"already connected")!=std::wstring::npos);
  if(connected){
   auto devices=captureAdbOutput(L"devices",6000);
   passed=devices.find(endpoint+L"\tdevice")!=std::wstring::npos ||
          devices.find(endpoint+L" device")!=std::wstring::npos;
  }
  followup=passed?L"ADB de rede autorizado. O Android está pronto para abrir sessões. Atualiza Dispositivos para selecioná-lo.":
   L"O PC pode estar ligado ao hotspot, mas o ADB não está autorizado. Confirma a porta, a Depuração sem fios ou ativa TCP/IP primeiro com USB.";
 }
 dispatcher.TryEnqueue([strong,followup=std::move(followup),passed,tcpip]{
  auto* that=strong.get();
  that->HotspotResult().Text(hstring(followup));
  that->hotspotBusy(false);
  that->status(passed?(tcpip?L"ADB TCP/IP confirmado.":L"ADB autorizado pelo hotspot.") :
    L"ADB não confirmou a autorização. Consulta o assistente do hotspot.");
  if(passed&&!tcpip)that->refresh();
 });
}
void MainWindow::Pair_Click(IInspectable const&,RoutedEventArgs const&){
 const auto ep=std::wstring(EndpointBox().Text().c_str());
 const auto pin=std::wstring(PairCodeBox().Text().c_str());
 if(!valid(ep)||!valid(pin,true)){status(L"Indica IP:porta e PIN numérico de 6 dígitos.");return;}
 command(L"pair "+ep+L" "+pin);
}
void MainWindow::Connect_Click(IInspectable const&,RoutedEventArgs const&){
 const auto ep=std::wstring(EndpointBox().Text().c_str());
 if(!valid(ep)){status(L"Indica um endereço IP:porta válido.");return;}
 saveSettings();command(L"connect "+ep);
}
void MainWindow::Disconnect_Click(IInspectable const&,RoutedEventArgs const&){
 const auto ep=std::wstring(EndpointBox().Text().c_str());
 if(!valid(ep)){status(L"Indica um endereço IP:porta válido.");return;}
 command(L"disconnect "+ep);
}
void MainWindow::ApplyProfile_Click(IInspectable const&,RoutedEventArgs const&){
 const int index=ProfileCombo().SelectedIndex();
 switch(index){
  case 0:FpsCombo().SelectedIndex(1);BitrateCombo().SelectedIndex(1);ProfileSummaryText().Text(L"Eco: 30 FPS e 8 Mbps.");break;
  case 1:FpsCombo().SelectedIndex(0);BitrateCombo().SelectedIndex(0);ProfileSummaryText().Text(L"Equilibrado: 60 FPS e 16 Mbps.");break;
  case 2:FpsCombo().SelectedIndex(0);BitrateCombo().SelectedIndex(2);ProfileSummaryText().Text(L"Qualidade: 60 FPS e 24 Mbps.");break;
  case 3:FpsCombo().SelectedIndex(3);BitrateCombo().SelectedIndex(2);ProfileSummaryText().Text(L"Gaming: alvo de 120 FPS e 24 Mbps, se suportado.");break;
  default:status(L"Escolhe um perfil antes de aplicar.");return;
 }
 saveSettings();status(L"Perfil de desempenho aplicado.");
}
void MainWindow::DeviceSelection_Changed(IInspectable const&,Controls::SelectionChangedEventArgs const&){
 if(syncing_)return;
 syncing_=true;DeviceGrid().SelectedIndex(DevicesCombo().SelectedIndex());syncing_=false;
 updateSummary();
}
void MainWindow::GridSelection_Changed(IInspectable const&,Controls::SelectionChangedEventArgs const&){
 if(syncing_)return;
 syncing_=true;DevicesCombo().SelectedIndex(DeviceGrid().SelectedIndex());syncing_=false;
 updateSummary();
}
void MainWindow::Advanced_Click(IInspectable const&,RoutedEventArgs const&){
 wchar_t path[MAX_PATH]{};GetModuleFileNameW(nullptr,path,MAX_PATH);
 std::wstring dir=path;auto slash=dir.find_last_of(L"\\/");
 if(slash==std::wstring::npos){status(L"Gestor nativo não encontrado.");return;}
 dir.resize(slash);
 PROCESS_INFORMATION pi{};
 if(!process(dir+L"\\RS-Screen-Manager.exe",L"",pi,false)){status(L"Gestor nativo não disponível.");return;}
 CloseHandle(pi.hThread);CloseHandle(pi.hProcess);
 status(L"Gestor nativo aberto.");
}
}
