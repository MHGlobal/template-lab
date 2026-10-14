#define UNICODE
#define _UNICODE
#define NOMINMAX
#include <windows.h>
#include <dwmapi.h>
#include <commctrl.h>
#include <string>
#include <vector>
#include <thread>
#include <atomic>
#include <sstream>
#include <algorithm>
#include <cwctype>
#include <memory>
#pragma comment(lib,"dwmapi.lib")
#pragma comment(lib,"comctl32.lib")

namespace {
constexpr UINT WM_DEVICES = WM_APP + 1;
constexpr UINT WM_STATUS = WM_APP + 2;
constexpr int ID_REFRESH=101,ID_DEVICE=102,ID_MIRROR=103,ID_VIRTUAL=104,ID_STOP=105,
 ID_PAIR=106,ID_CONNECT=107,ID_DISCONNECT=108,ID_ENDPOINT=109,ID_CODE=110,
 ID_RES=111,ID_FPS=112,ID_BITRATE=113,ID_AUDIO=114,ID_HID=115,ID_LAUNCHER=116,
 ID_SESSIONS=117,ID_SAVE=118,ID_LANG=119;
HINSTANCE inst{};
HWND win{}, deviceList{},sessionList{},statusBar{},endpointEdit{},codeEdit{},resBox{},fpsBox{},bitrateBox{},audioBox{},hidBox{},launcherEdit{};
HFONT font{},heading{};
std::vector<std::wstring> serials;
struct Session { std::wstring serial; bool virtualDisplay; PROCESS_INFORMATION pi{}; };
std::vector<Session> sessions;
std::atomic<bool> refreshing{false};
bool portuguese=true;
std::wstring dir;
std::wstring title(bool pt, const wchar_t* a,const wchar_t* b) { return pt?a:b; }
std::wstring exePath(const std::wstring& exe) { return dir+L"\\tools\\"+exe; }
std::wstring quoted(const std::wstring& s) {
 std::wstring out=L"\"";
 for (wchar_t c:s) { if(c==L'"')out+=L"\\\"";else out+=c; }
 return out+L"\"";
}
std::wstring from(HWND h) {
 int n=GetWindowTextLengthW(h);
 std::wstring r(size_t(n)+1,L'\0');
 GetWindowTextW(h,r.data(),n+1); r.resize(n); return r;
}
std::wstring settingsPath(){
 wchar_t b[MAX_PATH]{};
 DWORD n=GetEnvironmentVariableW(L"LOCALAPPDATA",b,MAX_PATH);
 std::wstring root = n && n<MAX_PATH ? b : dir;
 root +=L"\\RS Screen Manager";
 CreateDirectoryW(root.c_str(),nullptr);
 return root+L"\\settings.ini";
}
void setStatus(const std::wstring& text) {SetWindowTextW(statusBar,text.c_str());}
void postStatus(std::wstring text){
 if(IsWindow(win))PostMessageW(win,WM_STATUS,0,reinterpret_cast<LPARAM>(new std::wstring(std::move(text))));
}
bool allowedEndpoint(const std::wstring& s) {
 if(s.empty()||s.size()>128)return false;
 return std::all_of(s.begin(),s.end(),[](wchar_t c){return std::iswalnum(c)||c==L'.'||c==L':'||c==L'-'||c==L'['||c==L']';});
}
bool allowedCode(const std::wstring& s) {
 if(s.size()!=6)return false;
 return std::all_of(s.begin(),s.end(),[](wchar_t c){return c>=L'0'&&c<=L'9';});
}
bool runCapture(const std::wstring& program,const std::wstring& args,std::wstring& output,DWORD timeout=12000) {
 SECURITY_ATTRIBUTES sa{sizeof(sa),nullptr,TRUE};
 HANDLE reader{},writer{};
 if(!CreatePipe(&reader,&writer,&sa,0)) return false;
 SetHandleInformation(reader,HANDLE_FLAG_INHERIT,0);
 STARTUPINFOW si{sizeof(si)};si.dwFlags=STARTF_USESTDHANDLES;si.hStdOutput=writer;si.hStdError=writer;si.hStdInput=GetStdHandle(STD_INPUT_HANDLE);
 PROCESS_INFORMATION pi{};
 std::wstring cmd=quoted(program)+L" "+args;
 BOOL ok=CreateProcessW(program.c_str(),cmd.data(),nullptr,nullptr,TRUE,CREATE_NO_WINDOW,nullptr,dir.c_str(),&si,&pi);
 CloseHandle(writer);
 if(!ok){CloseHandle(reader);output=L"Cannot start "+program;return false;}
 DWORD wait=WaitForSingleObject(pi.hProcess,timeout);
 if(wait==WAIT_TIMEOUT){TerminateProcess(pi.hProcess,124);WaitForSingleObject(pi.hProcess,1000);}
 char buf[4096]; DWORD read=0;std::string bytes;
 while(ReadFile(reader,buf,sizeof(buf),&read,nullptr)&&read>0&&bytes.size()<65536)bytes.append(buf,buf+read);
 CloseHandle(reader);
 DWORD code=0;GetExitCodeProcess(pi.hProcess,&code);
 CloseHandle(pi.hThread);CloseHandle(pi.hProcess);
 if(!bytes.empty()){
  int needed=MultiByteToWideChar(CP_UTF8,0,bytes.data(),int(bytes.size()),nullptr,0);
  if(needed>0){output.resize(needed);MultiByteToWideChar(CP_UTF8,0,bytes.data(),int(bytes.size()),output.data(),needed);}
  else output=std::wstring(bytes.begin(),bytes.end());
 }
 return wait!=WAIT_TIMEOUT&&code==0;
}
std::wstring adb(){return exePath(L"adb.exe");}
std::wstring scrcpy(){return exePath(L"scrcpy.exe");}
void refresh(){
 if(refreshing.exchange(true))return;
 std::thread([]{
  std::wstring output;
  bool ok=runCapture(adb(),L"devices -l",output);
  struct Result{bool ok;std::wstring text;std::vector<std::wstring> names;std::vector<std::wstring> ids;};
  auto* r=new Result; r->ok=ok;r->text=output;
  std::wistringstream input(output);std::wstring line;
  while(std::getline(input,line)){
   if(line.find(L"List of devices")!=std::wstring::npos||line.empty()||line.rfind(L"*",0)==0)continue;
   std::wistringstream parts(line);std::wstring serial,state;
   parts>>serial>>state;
   if(serial.empty()||state.empty())continue;
   std::wstring model;
   auto index=line.find(L"model:");
   if(index!=std::wstring::npos){model=line.substr(index+6);auto x=model.find_first_of(L" \r\t");if(x!=std::wstring::npos)model.resize(x);}
   r->ids.push_back(serial);
   r->names.push_back((model.empty()?serial:model+L"   ["+serial+L"]")+L"   "+state);
  }
  if(IsWindow(win))PostMessageW(win,WM_DEVICES,0,reinterpret_cast<LPARAM>(r));else delete r;
  refreshing=false;
 }).detach();
}
std::wstring selectedSerial() {
 int index=int(SendMessageW(deviceList,LB_GETCURSEL,0,0));
 if(index==LB_ERR||index<0||size_t(index)>=serials.size())return {};
 return serials[size_t(index)];
}
std::wstring comboText(HWND h) {
 int index=int(SendMessageW(h,CB_GETCURSEL,0,0));
 if(index==CB_ERR)return L"";
 wchar_t buffer[100]{}; SendMessageW(h,CB_GETLBTEXT,index,reinterpret_cast<LPARAM>(buffer));
 return buffer;
}
void savePrefs(){
 const auto file=settingsPath();
 WritePrivateProfileStringW(L"app",L"resolution",comboText(resBox).c_str(),file.c_str());
 WritePrivateProfileStringW(L"app",L"fps",comboText(fpsBox).c_str(),file.c_str());
 WritePrivateProfileStringW(L"app",L"bitrate",comboText(bitrateBox).c_str(),file.c_str());
 WritePrivateProfileStringW(L"app",L"audio",comboText(audioBox).c_str(),file.c_str());
 WritePrivateProfileStringW(L"app",L"hid",comboText(hidBox).c_str(),file.c_str());
 WritePrivateProfileStringW(L"app",L"launcher",from(launcherEdit).c_str(),file.c_str());
 WritePrivateProfileStringW(L"app",L"language",portuguese?L"pt":L"en",file.c_str());
 setStatus(portuguese?L"Perfil guardado.":L"Profile saved.");
}
void loadPref(HWND h,const wchar_t* key,const wchar_t* def) {
 wchar_t val[128]{};
 GetPrivateProfileStringW(L"app",key,def,val,128,settingsPath().c_str());
 int index=int(SendMessageW(h,CB_FINDSTRINGEXACT,-1,reinterpret_cast<LPARAM>(val)));
 if(index==CB_ERR)index=0;
 SendMessageW(h,CB_SETCURSEL,index,0);
}
void reapSessions(){
 for(size_t i=0;i<sessions.size();) {
  if(WaitForSingleObject(sessions[i].pi.hProcess,0)==WAIT_OBJECT_0){
   CloseHandle(sessions[i].pi.hThread);CloseHandle(sessions[i].pi.hProcess);
   sessions.erase(sessions.begin()+i);
  }else ++i;
 }
 SendMessageW(sessionList,LB_RESETCONTENT,0,0);
 for(auto& s:sessions) {
  std::wstring label=s.serial+(s.virtualDisplay?L"  |  Virtual":L"  |  Mirror");
  SendMessageW(sessionList,LB_ADDSTRING,0,reinterpret_cast<LPARAM>(label.c_str()));
 }
}
void launch(bool virtualDisplay){
 auto serial=selectedSerial();
 if(serial.empty()){setStatus(portuguese?L"Selecione um dispositivo autorizado.":L"Select an authorized device.");return;}
 auto res=comboText(resBox),fps=comboText(fpsBox),bitrate=comboText(bitrateBox),audio=comboText(audioBox),hid=comboText(hidBox);
 std::wstring opts=L"--serial="+quoted(serial)+L" --video-codec=h264 --max-fps="+fps+L" --video-bit-rate="+bitrate+L"M --keep-active";
 if(virtualDisplay){
  opts+=L" --new-display="+res+L" --flex-display";
  auto launcher=from(launcherEdit);
  if(!launcher.empty()){
   if(launcher.size()>200||!std::all_of(launcher.begin(),launcher.end(),[](wchar_t c){return std::iswalnum(c)||c==L'.'||c==L'_';})){
    setStatus(L"Invalid app package name.");return;
   }
   opts+=L" --start-app="+launcher;
  }
 }
 if(audio==L"Off")opts+=L" --no-audio";
 else if(audio==L"Duplicate")opts+=L" --audio-source=playback --audio-dup";
 else opts+=L" --audio-source=output";
 if(hid==L"HID keyboard+mouse")opts+=L" --keyboard=uhid --mouse=uhid";
 else if(hid==L"HID gamepad")opts+=L" --gamepad=uhid";
 else if(hid==L"HID all")opts+=L" --keyboard=uhid --mouse=uhid --gamepad=uhid";
 std::wstring file=scrcpy(),cmd=quoted(file)+L" "+opts;
 STARTUPINFOW si{sizeof(si)};PROCESS_INFORMATION pi{};
 if(!CreateProcessW(file.c_str(),cmd.data(),nullptr,nullptr,FALSE,CREATE_NO_WINDOW|CREATE_NEW_PROCESS_GROUP,nullptr,dir.c_str(),&si,&pi)){
  setStatus(portuguese?L"scrcpy.exe não encontrado. Instale ferramentas em tools\\.":L"scrcpy.exe missing. Install tools in tools\\.");
  return;
 }
 sessions.push_back({serial,virtualDisplay,pi});
 reapSessions();
 setStatus((virtualDisplay?L"Virtual":L"Mirror")+std::wstring(L" started: ")+serial);
}
void stopSession(){
 int index=int(SendMessageW(sessionList,LB_GETCURSEL,0,0));
 if(index==LB_ERR||size_t(index)>=sessions.size())return;
 TerminateProcess(sessions[size_t(index)].pi.hProcess,0);
 reapSessions();
 setStatus(portuguese?L"Sessão encerrada.":L"Session stopped.");
}
void asyncAdb(std::wstring args){
 std::thread([args=std::move(args)]{
  std::wstring out;auto ok=runCapture(adb(),args,out,20000);
  if(out.size()>350)out.resize(350);
  postStatus((ok?L"ADB: ":L"ADB error: ")+out);
  refresh();
 }).detach();
}
HWND label(HWND parent,const wchar_t* text,int x,int y,int w,int h,bool large=false){
 HWND child=CreateWindowW(L"STATIC",text,WS_CHILD|WS_VISIBLE,x,y,w,h,parent,nullptr,inst,nullptr);
 SendMessageW(child,WM_SETFONT,reinterpret_cast<WPARAM>(large?heading:font),TRUE);return child;
}
HWND button(HWND parent,const wchar_t* text,int id,int x,int y,int w,int h) {
 HWND child=CreateWindowW(L"BUTTON",text,WS_CHILD|WS_VISIBLE|WS_TABSTOP|BS_PUSHBUTTON,x,y,w,h,parent,reinterpret_cast<HMENU>(static_cast<INT_PTR>(id)),inst,nullptr);
 SendMessageW(child,WM_SETFONT,reinterpret_cast<WPARAM>(font),TRUE);return child;
}
HWND edit(HWND parent,int id,int x,int y,int w,int h,const wchar_t* text=L""){
 HWND child=CreateWindowExW(WS_EX_CLIENTEDGE,L"EDIT",text,WS_CHILD|WS_VISIBLE|WS_TABSTOP|ES_AUTOHSCROLL,x,y,w,h,parent,reinterpret_cast<HMENU>(static_cast<INT_PTR>(id)),inst,nullptr);
 SendMessageW(child,WM_SETFONT,reinterpret_cast<WPARAM>(font),TRUE);return child;
}
HWND combo(HWND parent,int id,int x,int y,int w,const std::vector<const wchar_t*>& options){
 HWND child=CreateWindowW(L"COMBOBOX",nullptr,WS_CHILD|WS_VISIBLE|WS_TABSTOP|CBS_DROPDOWNLIST|WS_VSCROLL,x,y,w,250,parent,reinterpret_cast<HMENU>(static_cast<INT_PTR>(id)),inst,nullptr);
 SendMessageW(child,WM_SETFONT,reinterpret_cast<WPARAM>(font),TRUE);
 for(auto* p:options)SendMessageW(child,CB_ADDSTRING,0,reinterpret_cast<LPARAM>(p));
 SendMessageW(child,CB_SETCURSEL,0,0);return child;
}
void initControls(){
 label(win,L"RS  SCREEN MANAGER",25,18,580,35,true);
 label(win,L"Android screens  /  USB + Wi-Fi  /  Agentless",25,56,500,23);
 label(win,L"Devices",25,94,220,23);
 deviceList=CreateWindowExW(WS_EX_CLIENTEDGE,L"LISTBOX",nullptr,WS_CHILD|WS_VISIBLE|WS_VSCROLL|LBS_NOTIFY,25,121,440,150,win,reinterpret_cast<HMENU>(ID_DEVICE),inst,nullptr);
 button(win,L"Refresh",ID_REFRESH,480,121,130,35);
 label(win,L"Wireless ADB   (IP:port)",25,288,360,24);
 endpointEdit=edit(win,ID_ENDPOINT,25,318,215,30,L"192.168.1.10:5555");
 codeEdit=edit(win,ID_CODE,250,318,88,30,L"");
 SendMessageW(codeEdit,EM_SETCUEBANNER,0,reinterpret_cast<LPARAM>(L"6-digit PIN"));
 button(win,L"Pair",ID_PAIR,348,318,90,30);
 button(win,L"Connect",ID_CONNECT,446,318,100,30);
 button(win,L"Disconnect",ID_DISCONNECT,553,318,110,30);
 label(win,L"Session options",25,370,300,30,true);
 label(win,L"Resolution",25,415,140,23);resBox=combo(win,ID_RES,25,442,168,{L"1080x1920/320",L"1920x1080/320",L"720x1280/320",L"1280x720/240"});
 label(win,L"FPS",205,415,110,23);fpsBox=combo(win,ID_FPS,205,442,105,{L"60",L"30",L"90",L"120"});
 label(win,L"Bitrate Mbps",325,415,160,23);bitrateBox=combo(win,ID_BITRATE,325,442,113,{L"16",L"8",L"24",L"32"});
 label(win,L"Audio",453,415,110,23);audioBox=combo(win,ID_AUDIO,453,442,130,{L"Output",L"Duplicate",L"Off"});
 label(win,L"PC input mode",25,494,240,23);hidBox=combo(win,ID_HID,25,521,238,{L"Standard",L"HID keyboard+mouse",L"HID gamepad",L"HID all"});
 label(win,L"Virtual app package",278,494,260,23);
 launcherEdit=edit(win,ID_LAUNCHER,278,521,305,28,L"org.fossify.home");
 button(win,L"Save profile",ID_SAVE,600,520,130,32);
 button(win,L"MIRROR PHONE",ID_MIRROR,25,579,260,46);
 button(win,L"NEW VIRTUAL SCREEN",ID_VIRTUAL,296,579,300,46);
 button(win,L"Stop selected",ID_STOP,607,579,133,46);
 label(win,L"Active sessions",25,650,220,26);
 sessionList=CreateWindowExW(WS_EX_CLIENTEDGE,L"LISTBOX",nullptr,WS_CHILD|WS_VISIBLE|WS_VSCROLL,25,680,715,95,win,reinterpret_cast<HMENU>(ID_SESSIONS),inst,nullptr);
 statusBar=label(win,L"Starting...",25,797,715,55);
 for(HWND c:{deviceList,sessionList})SendMessageW(c,WM_SETFONT,reinterpret_cast<WPARAM>(font),TRUE);
 loadPref(resBox,L"resolution",L"1080x1920/320");
 loadPref(fpsBox,L"fps",L"60");loadPref(bitrateBox,L"bitrate",L"16");
 loadPref(audioBox,L"audio",L"Output");loadPref(hidBox,L"hid",L"Standard");
 wchar_t saved[200]{};GetPrivateProfileStringW(L"app",L"launcher",L"org.fossify.home",saved,200,settingsPath().c_str());SetWindowTextW(launcherEdit,saved);
 wchar_t lang[20]{};GetPrivateProfileStringW(L"app",L"language",L"pt",lang,20,settingsPath().c_str());portuguese=wcscmp(lang,L"en")!=0;
}
LRESULT CALLBACK proc(HWND h,UINT msg,WPARAM wp,LPARAM lp){
 switch(msg){
 case WM_CREATE: initControls();SetTimer(h,1,4000,nullptr);refresh();return 0;
 case WM_COMMAND: if(HIWORD(wp)==BN_CLICKED){
  switch(LOWORD(wp)){
   case ID_REFRESH:refresh();break;
   case ID_MIRROR:launch(false);break;
   case ID_VIRTUAL:launch(true);break;
   case ID_STOP:stopSession();break;
   case ID_SAVE:savePrefs();break;
   case ID_PAIR:{auto ip=from(endpointEdit),pin=from(codeEdit);if(allowedEndpoint(ip)&&allowedCode(pin))asyncAdb(L"pair "+ip+L" "+pin);else setStatus(L"Check IP:port and 6-digit pairing code.");break;}
   case ID_CONNECT:{auto ip=from(endpointEdit);if(allowedEndpoint(ip))asyncAdb(L"connect "+ip);else setStatus(L"Invalid IP:port.");break;}
   case ID_DISCONNECT:{auto ip=from(endpointEdit);if(allowedEndpoint(ip))asyncAdb(L"disconnect "+ip);else setStatus(L"Invalid IP:port.");break;}
  }
 }return 0;
 case WM_TIMER: if(wp==1){refresh();reapSessions();}return 0;
 case WM_STATUS:{std::unique_ptr<std::wstring> s(reinterpret_cast<std::wstring*>(lp));setStatus(*s);return 0;}
 case WM_DEVICES:{
  struct Result{bool ok;std::wstring text;std::vector<std::wstring> names;std::vector<std::wstring> ids;};
  std::unique_ptr<Result> r(reinterpret_cast<Result*>(lp));
  auto selected=selectedSerial();
  serials=r->ids;
  SendMessageW(deviceList,LB_RESETCONTENT,0,0);
  for(auto& s:r->names)SendMessageW(deviceList,LB_ADDSTRING,0,reinterpret_cast<LPARAM>(s.c_str()));
  for(size_t i=0;i<serials.size();i++)if(serials[i]==selected)SendMessageW(deviceList,LB_SETCURSEL,i,0);
  if(selectedSerial().empty()&&serials.size()==1)SendMessageW(deviceList,LB_SETCURSEL,0,0);
  if(!r->ok)setStatus(L"ADB not available. Put adb.exe and scrcpy.exe in the tools folder.");
  else if(serials.empty())setStatus(L"No devices connected. Connect USB or pair over Wi-Fi.");
  else setStatus(std::to_wstring(serials.size())+L" Android device(s) detected.");
  return 0;
 }
 case WM_CTLCOLORSTATIC:{
  HDC dc=reinterpret_cast<HDC>(wp);SetTextColor(dc,RGB(215,230,244));SetBkColor(dc,RGB(18,27,42));
  static HBRUSH brush=CreateSolidBrush(RGB(18,27,42));return reinterpret_cast<LRESULT>(brush);
 }
 case WM_ERASEBKGND:{RECT r;GetClientRect(h,&r);HBRUSH br=CreateSolidBrush(RGB(18,27,42));FillRect(reinterpret_cast<HDC>(wp),&r,br);DeleteObject(br);return 1;}
 case WM_DESTROY:
  KillTimer(h,1);
  for(auto& s:sessions){if(WaitForSingleObject(s.pi.hProcess,0)==WAIT_TIMEOUT)TerminateProcess(s.pi.hProcess,0);CloseHandle(s.pi.hThread);CloseHandle(s.pi.hProcess);}
  sessions.clear();DeleteObject(font);DeleteObject(heading);PostQuitMessage(0);return 0;
 }
 return DefWindowProcW(h,msg,wp,lp);
}
}
int WINAPI wWinMain(HINSTANCE h,HINSTANCE,LPWSTR,int show){
 inst=h;
 wchar_t path[MAX_PATH]{};GetModuleFileNameW(nullptr,path,MAX_PATH);
 dir=path;dir=dir.substr(0,dir.find_last_of(L"\\/"));
 INITCOMMONCONTROLSEX ic{sizeof(ic),ICC_STANDARD_CLASSES};InitCommonControlsEx(&ic);
 font=CreateFontW(-17,0,0,0,FW_NORMAL,FALSE,FALSE,FALSE,DEFAULT_CHARSET,0,0,CLEARTYPE_QUALITY,DEFAULT_PITCH,L"Segoe UI");
 heading=CreateFontW(-25,0,0,0,FW_SEMIBOLD,FALSE,FALSE,FALSE,DEFAULT_CHARSET,0,0,CLEARTYPE_QUALITY,DEFAULT_PITCH,L"Segoe UI");
 WNDCLASSEXW wc{sizeof(wc)};wc.hInstance=h;wc.lpszClassName=L"RSScreenManager";wc.lpfnWndProc=proc;wc.hCursor=LoadCursor(nullptr,IDC_ARROW);wc.hIcon=LoadIcon(nullptr,IDI_APPLICATION);
 wc.hbrBackground=CreateSolidBrush(RGB(18,27,42));RegisterClassExW(&wc);
 win=CreateWindowExW(0,wc.lpszClassName,L"RS Screen Manager  |  Native Preview",WS_OVERLAPPEDWINDOW|WS_VISIBLE,100,70,780,910,nullptr,nullptr,h,nullptr);
 if(!win)return 1;
 BOOL dark=TRUE;DwmSetWindowAttribute(win,20,&dark,sizeof(dark));
 int backdrop=2;DwmSetWindowAttribute(win,38,&backdrop,sizeof(backdrop));
 ShowWindow(win,show);UpdateWindow(win);
 MSG m;while(GetMessageW(&m,nullptr,0,0)>0){TranslateMessage(&m);DispatchMessageW(&m);}return int(m.wParam);
}
