#include "pch.h"
#include "MainWindow.xaml.h"
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
void MainWindow::status(const wchar_t* message){StatusText().Text(message);}
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
 const bool narrow=args.NewSize().Width<800;
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
 if(AutoRestoreSwitch().IsOn()){
  const auto ep=ini(settingsPath(),L"wireless",L"endpoint");
  if(valid(ep)){
   PROCESS_INFORMATION pi{};
   if(process(tools(L"adb.exe"),L"connect "+ep,pi,false)){
    WaitForSingleObject(pi.hProcess,8000);
    CloseHandle(pi.hThread);CloseHandle(pi.hProcess);
   }
  }
 }
 refresh();
 restoreSessions();
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
void MainWindow::loadSettings(){
 const auto path=settingsPath();
 choose(FpsCombo(),ini(path,L"video",L"fps",L"60"));
 choose(BitrateCombo(),ini(path,L"video",L"bitrate",L"16"));
 choose(ResolutionCombo(),ini(path,L"video",L"resolution",L"1920x1080/320"));
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
 OnlineBadge().Text(authorized?L"● Android conectado":L"○ Sem Android autorizado");
 std::wstring diagnostics=L"ADB: "+std::wstring(GetFileAttributesW(tools(L"adb.exe").c_str())!=INVALID_FILE_ATTRIBUTES?L"disponível":L"não encontrado");
 diagnostics+=L"\nscrcpy: "+std::wstring(GetFileAttributesW(tools(L"scrcpy.exe").c_str())!=INVALID_FILE_ATTRIBUTES?L"disponível":L"não encontrado");
 diagnostics+=L"\nDispositivos detetados: "+std::to_wstring(serials_.size());
 diagnostics+=L"\nDispositivos autorizados: "+std::to_wstring(authorized);
 diagnostics+=L"\nSessões ativas: "+std::to_wstring(active);
 for(size_t i=0;i<serials_.size();++i)diagnostics+=L"\n"+serials_[i]+L" — "+deviceStates_[i];
 DiagnosticsText().Text(hstring(diagnostics));
 HistoryText().Text(hstring(history_.empty()?std::wstring(L"Ainda não há sessões registadas."):history_));
 refreshSessionLists();
}
void MainWindow::refresh(){
 const auto previous=DevicesCombo().SelectedIndex();
 std::wstring selectedSerial=previous>=0&&static_cast<size_t>(previous)<serials_.size()?serials_[previous]:L"";
 SECURITY_ATTRIBUTES sa{sizeof(sa),nullptr,TRUE};
 HANDLE reader{},writer{};
 if(!CreatePipe(&reader,&writer,&sa,0)){status(L"Falha ao consultar ADB.");return;}
 SetHandleInformation(reader,HANDLE_FLAG_INHERIT,0);
 PROCESS_INFORMATION pi{};
 bool ok=process(tools(L"adb.exe"),L"devices -l",pi,true,writer);
 CloseHandle(writer);
 if(!ok){CloseHandle(reader);status(L"adb.exe não encontrado no pacote.");updateSummary();return;}
 DWORD wait=WaitForSingleObject(pi.hProcess,8000);
 if(wait==WAIT_TIMEOUT){TerminateProcess(pi.hProcess,1);WaitForSingleObject(pi.hProcess,2000);}
 std::string bytes;
 char block[2048];DWORD read=0;
 while(ReadFile(reader,block,sizeof(block),&read,nullptr)&&read)bytes.append(block,read);
 CloseHandle(reader);CloseHandle(pi.hThread);CloseHandle(pi.hProcess);
 std::wstring output(bytes.begin(),bytes.end());
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
  auto label=hstring(id+L"  ·  "+state);
  DevicesCombo().Items().Append(box_value(label));
  DeviceGrid().Items().Append(box_value(label));
 }
 int32_t found=-1;
 for(size_t i=0;i<serials_.size();++i)if(serials_[i]==selectedSerial){found=static_cast<int32_t>(i);break;}
 if(found<0&&serials_.size())found=0;
 if(found>=0){DevicesCombo().SelectedIndex(found);DeviceGrid().SelectedIndex(found);}
 syncing_=false;
 updateSummary();
 if(wait==WAIT_TIMEOUT)status(L"ADB demorou a responder; verifica o dispositivo.");
 else if(serials_.empty())status(L"Nenhum Android encontrado. Abre Dispositivos para ajuda.");
 else status(L"Lista de dispositivos atualizada.");
}
void MainWindow::saveSessions(){
 const auto path=settingsPath();
 size_t count=0;
 for(auto& s:sessions_){
  if(!s.process.hProcess||WaitForSingleObject(s.process.hProcess,0)!=WAIT_TIMEOUT)continue;
  if(count>=16)break;
  auto sk=L"serial"+std::to_wstring(count);
  auto vk=L"virtual"+std::to_wstring(count);
  writeIni(path,L"resume",sk.c_str(),s.serial);
  writeIni(path,L"resume",vk.c_str(),s.virtualDisplay?L"1":L"0");
  ++count;
 }
 writeIni(path,L"resume",L"count",std::to_wstring(count));
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
 int count=static_cast<int>(GetPrivateProfileIntW(L"resume",L"count",0,path.c_str()));
 count=std::clamp(count,0,16);
 std::vector<std::pair<std::wstring,bool>> requested;
 for(int i=0;i<count;++i){
  auto sk=L"serial"+std::to_wstring(i);
  auto vk=L"virtual"+std::to_wstring(i);
  auto serial=ini(path,L"resume",sk.c_str());
  if(!serial.empty())requested.push_back({serial,ini(path,L"resume",vk.c_str())==L"1"});
 }
 // ADB authorization is verified again for every recovered session. Never bypass Android prompts.
 for(auto const& r:requested){
  bool allowed=false;
  for(size_t i=0;i<serials_.size();++i)if(serials_[i]==r.first&&deviceStates_[i]==L"device")allowed=true;
  if(allowed)startFor(r.first,r.second,false);
 }
 if(!requested.empty()&&sessions_.empty())status(L"Sessões anteriores encontradas; liga e autoriza o dispositivo para as recuperar.");
 if(!sessions_.empty())saveSessions();
}
void MainWindow::startFor(const std::wstring& serial,bool virtualDisplay,bool persist){
 const auto fps=option(FpsCombo()),bitrate=option(BitrateCombo()),resolution=option(ResolutionCombo());
 if(fps.empty()||bitrate.empty()||(virtualDisplay&&resolution.empty())){status(L"Seleciona definições de vídeo válidas.");return;}
 std::wstring args=L"--serial="+quote(serial)+L" --max-fps="+fps+L" --video-bit-rate="+bitrate+L"M --video-codec=h264 --keep-active";
 if(virtualDisplay){
  args+=L" --new-display="+resolution+L" --flex-display";
  const auto launcher=std::wstring(LauncherBox().Text().c_str());
  if(!launcher.empty()){
   if(!std::all_of(launcher.begin(),launcher.end(),[](wchar_t c){return std::iswalnum(c)||c==L'.'||c==L'_';})){
    status(L"Pacote launcher inválido.");return;
   }
   args+=L" --start-app="+launcher;
  }
 }
 if(DuplicateAudio().IsOn())args+=L" --audio-source=playback --audio-dup";
 else args+=L" --audio-source=output";
 bool recording=virtualDisplay?RecordVirtualToggle().IsOn():RecordMirrorToggle().IsOn();
 std::wstring recordingFile;
 // Resumed sessions deliberately start without recording: avoid endless duplicate MP4 files on reconnect.
 if(!persist)recording=false;
 if(recording){
  recordingFile=newMediaPath(L".mp4");
  args+=L" --record="+quote(recordingFile);
 }
 PROCESS_INFORMATION pi{};
 if(!process(tools(L"scrcpy.exe"),args,pi,false)){status(L"scrcpy.exe não encontrado no pacote.");return;}
 sessions_.push_back(Session{pi,serial,virtualDisplay,recording,recordingFile});
 history_+=(virtualDisplay?L"Ecrã virtual — ":L"Espelhamento — ")+serial+(recording?L" (a gravar MP4)":L"")+L"\n";
 if(persist)saveSessions();
 saveSettings();
 updateSummary();
 status(virtualDisplay?L"Ecrã virtual iniciado em janela independente.":L"Espelhamento iniciado em janela independente.");
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
 if(h==INVALID_HANDLE_VALUE)return;
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
