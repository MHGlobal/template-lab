#include "pch.h"
#include "MainWindow.xaml.h"
#if __has_include("MainWindow.g.cpp")
#include "MainWindow.g.cpp"
#endif
#include <algorithm>
#include <cwctype>
#include <sstream>
using namespace winrt;
using namespace Microsoft::UI::Xaml;

namespace winrt::RSScreenManagerUI::implementation {
namespace {
 std::wstring quote(const std::wstring& str) {
  std::wstring result=L"\"";
  for(auto c:str)result+=(c==L'"'?L"\\\"":std::wstring(1,c));
  return result+L"\"";
 }
 bool valid(const std::wstring& s,bool pin=false) {
  if(s.empty()||s.size()>128|| (pin&&s.size()!=6))return false;
  for(auto c:s)if(pin?!(c>=L'0'&&c<=L'9'):!(std::iswalnum(c)||c==L'.'||c==L'-'||c==L'['||c==L']'||c==L':'))return false;
  return true;
 }
 bool process(const std::wstring& exe,const std::wstring& args,PROCESS_INFORMATION& pi,bool capture,HANDLE output=nullptr) {
  STARTUPINFOW start{sizeof(start)};
  if(capture){start.dwFlags=STARTF_USESTDHANDLES;start.hStdOutput=output;start.hStdError=output;start.hStdInput=GetStdHandle(STD_INPUT_HANDLE);}
  std::wstring cmd=quote(exe)+L" "+args;
  return CreateProcessW(exe.c_str(),cmd.data(),nullptr,nullptr,capture,CREATE_NO_WINDOW|CREATE_NEW_PROCESS_GROUP,nullptr,nullptr,&start,&pi);
 }
}
MainWindow::MainWindow(){ /* Initialized by generated WinUI XAML machinery. */ }
MainWindow::~MainWindow(){
 for(auto& p:children_){if(WaitForSingleObject(p.hProcess,0)==WAIT_TIMEOUT)TerminateProcess(p.hProcess,0);CloseHandle(p.hThread);CloseHandle(p.hProcess);}
}
std::wstring MainWindow::tools(const wchar_t* file) const {
 wchar_t buf[MAX_PATH]{};GetModuleFileNameW(nullptr,buf,MAX_PATH);
 std::wstring dir=buf;dir.resize(dir.find_last_of(L"\\/"));
 return dir+L"\\tools\\"+file;
}
void MainWindow::status(const wchar_t* txt){StatusText().Text(txt);}
std::wstring MainWindow::option(Microsoft::UI::Xaml::Controls::ComboBox const& combo) const {
 auto selected=combo.SelectedItem();
 return selected?std::wstring(unbox_value<hstring>(selected)):L"";
}
std::wstring MainWindow::selected() const {
 int idx=DevicesCombo().SelectedIndex();
 return idx>=0&&size_t(idx)<serials_.size()?serials_[idx]:std::wstring{};
}
void MainWindow::refresh(){
 SECURITY_ATTRIBUTES sa{sizeof(sa),nullptr,TRUE};HANDLE reader{},writer{};
 if(!CreatePipe(&reader,&writer,&sa,0)){status(L"Failed to read ADB.");return;}
 SetHandleInformation(reader,HANDLE_FLAG_INHERIT,0);
 PROCESS_INFORMATION pi{};
 bool ok=process(tools(L"adb.exe"),L"devices -l",pi,true,writer);
 CloseHandle(writer);
 if(!ok){CloseHandle(reader);status(L"ADB not found in tools.");return;}
 WaitForSingleObject(pi.hProcess,10000);
 std::string bytes;char block[2048];DWORD read=0;
 while(ReadFile(reader,block,sizeof(block),&read,nullptr)&&read)bytes.append(block,read);
 CloseHandle(reader);CloseHandle(pi.hThread);CloseHandle(pi.hProcess);
 std::wstring value(bytes.begin(),bytes.end());
 std::wistringstream stream(value);std::wstring line;
 serials_.clear();DevicesCombo().Items().Clear();
 while(std::getline(stream,line)){
  if(line.find(L"List of devices")!=std::wstring::npos||line.empty()||line[0]==L'*')continue;
  std::wistringstream parts(line);std::wstring id,state;parts>>id>>state;
  if(id.empty()||state.empty())continue;
  serials_.push_back(id);
  DevicesCombo().Items().Append(box_value(hstring(id+L" | "+state)));
 }
 if(serials_.size())DevicesCombo().SelectedIndex(0);
 status(serials_.empty()?L"No devices found. Connect USB or pair over Wi-Fi.":L"Device list updated.");
}
void MainWindow::start(bool v){
 auto serial=selected();if(serial.empty()){status(L"Select a device.");return;}
 auto fps=option(FpsCombo()),bitrate=option(BitrateCombo()),resolution=option(ResolutionCombo());
 std::wstring args=L"--serial="+quote(serial)+L" --max-fps="+fps+L" --video-bit-rate="+bitrate+L"M --video-codec=h264 --keep-active";
 if(v){
  args+=L" --new-display="+resolution+L" --flex-display";
  auto app=std::wstring(LauncherBox().Text());
  if(!app.empty()){
   if(!std::all_of(app.begin(),app.end(),[](auto c){return std::iswalnum(c)||c==L'.'||c==L'_';})){status(L"Invalid launcher package.");return;}
   args+=L" --start-app="+app;
  }
 }
 if(DuplicateAudio().IsOn())args+=L" --audio-source=playback --audio-dup";
 else args+=L" --audio-source=output";
 PROCESS_INFORMATION pi{};
 if(!process(tools(L"scrcpy.exe"),args,pi,false)){status(L"scrcpy.exe is not bundled in tools.");return;}
 children_.push_back(pi);status(v?L"Virtual display started.":L"Physical screen mirroring started.");
}
void MainWindow::command(const std::wstring& args) {
 PROCESS_INFORMATION pi{};
 if(!process(tools(L"adb.exe"),args,pi,false)){status(L"Could not start ADB.");return;}
 CloseHandle(pi.hThread);CloseHandle(pi.hProcess);status(L"ADB command submitted.");
}
void MainWindow::Refresh_Click(IInspectable const&, RoutedEventArgs const&){refresh();}
void MainWindow::Mirror_Click(IInspectable const&, RoutedEventArgs const&){start(false);}
void MainWindow::Virtual_Click(IInspectable const&, RoutedEventArgs const&){start(true);}
void MainWindow::Stop_Click(IInspectable const&, RoutedEventArgs const&){
 if(children_.empty()){status(L"No active session.");return;}
 auto p=children_.back();children_.pop_back();
 TerminateProcess(p.hProcess,0);CloseHandle(p.hThread);CloseHandle(p.hProcess);status(L"Session stopped.");
}
void MainWindow::Pair_Click(IInspectable const&, RoutedEventArgs const&){
 auto ep=std::wstring(EndpointBox().Text()),pin=std::wstring(PairCodeBox().Text());
 if(!valid(ep)||!valid(pin,true)){status(L"Enter IP:port and 6-digit PIN.");return;}command(L"pair "+ep+L" "+pin);
}
void MainWindow::Connect_Click(IInspectable const&, RoutedEventArgs const&){
 auto ep=std::wstring(EndpointBox().Text());if(!valid(ep)){status(L"Enter valid IP:port.");return;}command(L"connect "+ep);
}
void MainWindow::Disconnect_Click(IInspectable const&, RoutedEventArgs const&){
 auto ep=std::wstring(EndpointBox().Text());if(!valid(ep)){status(L"Enter valid IP:port.");return;}command(L"disconnect "+ep);
}
void MainWindow::Advanced_Click(IInspectable const&, RoutedEventArgs const&){
 wchar_t path[MAX_PATH]{};GetModuleFileNameW(nullptr,path,MAX_PATH);
 std::wstring loc=path;loc.resize(loc.find_last_of(L"\\/"));
 PROCESS_INFORMATION pi{};
 if(!process(loc+L"\\RS-Screen-Manager.exe",L"",pi,false)){status(L"Native manager unavailable.");return;}
 CloseHandle(pi.hThread);CloseHandle(pi.hProcess);
}
}
