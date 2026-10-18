#pragma once
// RS Screen Manager — Windows Wi-Fi/hotspot discovery.
// Local enumeration only. Never connects to unknown networks or starts ADB on its own.
#ifndef _WIN32
#error Windows hotspot discovery is Windows-only
#endif
#include <windows.h>
#include <iphlpapi.h>
#include <wlanapi.h>
#include <netioapi.h>
#include <string>
#include <vector>
#include <map>
#include <algorithm>
#include <cstdint>
#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "wlanapi.lib")

namespace rs::hotspot {
struct InterfaceInfo {
 std::wstring name;
 std::wstring ssid;    // nonempty only if Windows reports a connected WLAN SSID
 std::wstring gateway; // a candidate Android hotspot host, NEVER assumed to be Android/ADB
 ULONG index=0;
 bool connected=false;
};

inline std::wstring ipv4(const SOCKADDR* addr) {
 if (!addr || addr->sa_family!=AF_INET) return {};
 auto* v=reinterpret_cast<const sockaddr_in*>(addr);
 auto* bytes=reinterpret_cast<const unsigned char*>(&v->sin_addr);
 return std::to_wstring(bytes[0])+L"."+std::to_wstring(bytes[1])+L"."+std::to_wstring(bytes[2])+L"."+std::to_wstring(bytes[3]);
}
inline bool validIPv4(const std::wstring& host) {
 if (host.size()<7 || host.size()>15) return false;
 unsigned long part=0;int components=0;int digits=0;
 for (size_t i=0;i<=host.size();++i) {
  const wchar_t c=i==host.size()?L'.':host[i];
  if (c==L'.') {
   if (!digits || part>255) return false;
   if (components==0 && (part==0 || part>=224 || part==127)) return false;
   if (++components>4) return false;
   digits=0;part=0;
  } else if (c>=L'0' && c<=L'9') {
   if (++digits>3)return false;
   part=part*10+(c-L'0');
  } else return false;
 }
 return components==4;
}
inline std::wstring decodeSSID(const DOT11_SSID& ssid) {
 if (ssid.uSSIDLength==0 || ssid.uSSIDLength>DOT11_SSID_MAX_LENGTH)return {};
 const auto* chars=reinterpret_cast<const char*>(ssid.ucSSID);
 int count=MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,chars,static_cast<int>(ssid.uSSIDLength),nullptr,0);
 UINT codepage=CP_UTF8;
 if (count<=0) {
  codepage=CP_ACP;
  count=MultiByteToWideChar(CP_ACP,0,chars,static_cast<int>(ssid.uSSIDLength),nullptr,0);
 }
 if (count<=0)return {};
 std::wstring out(static_cast<size_t>(count),L'\0');
 MultiByteToWideChar(codepage,codepage==CP_UTF8?MB_ERR_INVALID_CHARS:0,chars,
  static_cast<int>(ssid.uSSIDLength),out.data(),count);
 return out;
}
inline std::map<ULONG,std::wstring> connectedSSIDs() {
 std::map<ULONG,std::wstring> result;
 HANDLE wlan=nullptr;
 DWORD negotiated=0;
 if(WlanOpenHandle(2,nullptr,&negotiated,&wlan)!=ERROR_SUCCESS)return result;
 PWLAN_INTERFACE_INFO_LIST list=nullptr;
 if(WlanEnumInterfaces(wlan,nullptr,&list)==ERROR_SUCCESS && list){
  for(DWORD i=0;i<list->dwNumberOfItems;++i){
   auto& iface=list->InterfaceInfo[i];
   if(iface.isState!=wlan_interface_state_connected)continue;
   NET_LUID luid{};NET_IFINDEX index=0;
   if(ConvertInterfaceGuidToLuid(&iface.InterfaceGuid,&luid)!=NO_ERROR ||
      ConvertInterfaceLuidToIndex(&luid,&index)!=NO_ERROR)continue;
   DWORD size=0;PVOID data=nullptr;WLAN_OPCODE_VALUE_TYPE type{};
   if(WlanQueryInterface(wlan,&iface.InterfaceGuid,wlan_intf_opcode_current_connection,nullptr,&size,&data,&type)==ERROR_SUCCESS && data){
    if(size>=sizeof(WLAN_CONNECTION_ATTRIBUTES)){
     auto* attr=reinterpret_cast<WLAN_CONNECTION_ATTRIBUTES*>(data);
     result[index]=decodeSSID(attr->wlanAssociationAttributes.dot11Ssid);
    }
   }
   if(data)WlanFreeMemory(data);
  }
 }
 if(list)WlanFreeMemory(list);
 WlanCloseHandle(wlan,nullptr);
 return result;
}
inline std::vector<InterfaceInfo> discover() {
 auto ssids=connectedSSIDs();
 ULONG bytes=16384;
 std::vector<unsigned char> storage(bytes);
 ULONG err=GetAdaptersAddresses(AF_INET,GAA_FLAG_INCLUDE_GATEWAYS,nullptr,
  reinterpret_cast<PIP_ADAPTER_ADDRESSES>(storage.data()),&bytes);
 if(err==ERROR_BUFFER_OVERFLOW && bytes<=1024*1024){
  storage.resize(bytes);
  err=GetAdaptersAddresses(AF_INET,GAA_FLAG_INCLUDE_GATEWAYS,nullptr,
   reinterpret_cast<PIP_ADAPTER_ADDRESSES>(storage.data()),&bytes);
 }
 std::vector<InterfaceInfo> found;
 if(err!=NO_ERROR)return found;
 for(auto* a=reinterpret_cast<PIP_ADAPTER_ADDRESSES>(storage.data());a;a=a->Next){
  if(a->IfType!=IF_TYPE_IEEE80211)continue;
  InterfaceInfo net{};
  net.index=a->IfIndex;
  net.name=a->FriendlyName?a->FriendlyName:L"Wi-Fi";
  net.connected=a->OperStatus==IfOperStatusUp;
  auto it=ssids.find(a->IfIndex);
  if(it!=ssids.end())net.ssid=it->second;
  for(auto* g=a->FirstGatewayAddress;g;g=g->Next){
   auto candidate=ipv4(g->Address.lpSockaddr);
   if(validIPv4(candidate)){net.gateway=candidate;break;}
  }
  found.push_back(std::move(net));
 }
 return found;
}
} // namespace rs::hotspot
