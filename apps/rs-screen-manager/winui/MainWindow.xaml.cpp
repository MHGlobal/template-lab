#include "pch.h"
#include "MainWindow.xaml.h"
#if __has_include("MainWindow.g.cpp")
#include "MainWindow.g.cpp"
#endif
#include <algorithm>
#include <cwctype>
#include <sstream>
#include <utility>

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
 for(auto& p:children_){
  if(p.hProcess&&WaitForSingleObject(p.hProcess,0)==WAIT_TIMEOUT)TerminateProcess(p.hProcess,0);
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
 for(auto& p:children_)if(p.hProcess&&WaitForSingleObject(p.hProcess,0)==WAIT_TIMEOUT)++active;
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
 size_t count=(std::min)(sessionInfo_.size(),size_t(16));
 writeIni(path,L"resume",L"count",std::to_wstring(count));
 for(size_t i=0;i<count;++i){
  auto key1=L"serial"+std::to_wstring(i);
  auto key2=L"virtual"+std::to_wstring(i);
  writeIni(path,L"resume",key1.c_str(),sessionInfo_[i].first);
  writeIni(path,L"resume",key2.c_str(),sessionInfo_[i].second?L"1":L"0");
 }
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
 if(!requested.empty()&&sessionInfo_.empty())status(L"Sessões anteriores encontradas; liga e autoriza o dispositivo para as recuperar.");
 if(!sessionInfo_.empty())saveSessions();
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
 PROCESS_INFORMATION pi{};
 if(!process(tools(L"scrcpy.exe"),args,pi,false)){status(L"scrcpy.exe não encontrado no pacote.");return;}
 children_.push_back(pi);
 sessionInfo_.push_back({serial,virtualDisplay});
 history_+=(virtualDisplay?L"Ecrã virtual — ":L"Espelhamento — ")+serial+L"\n";
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
 if(children_.empty()){status(L"Não existem sessões desta execução para terminar.");return;}
 auto pi=children_.back();children_.pop_back();
 sessionInfo_.pop_back();
 if(pi.hProcess&&WaitForSingleObject(pi.hProcess,0)==WAIT_TIMEOUT)TerminateProcess(pi.hProcess,0);
 CloseHandle(pi.hThread);CloseHandle(pi.hProcess);
 saveSessions();
 updateSummary();
 status(L"Última sessão terminada.");
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
