#include "../core/windows_hotspot.hpp"
#include <cassert>
int main(){
 using namespace rs::hotspot;
 assert(validIPv4(L"192.168.43.1"));
 assert(validIPv4(L"10.0.0.1"));
 assert(validIPv4(L"172.20.10.1"));
 assert(validIPv4(L"192.168.0.254"));
 assert(!validIPv4(L""));
 assert(!validIPv4(L"0.0.0.0"));
 assert(!validIPv4(L"127.0.0.1"));
 assert(!validIPv4(L"224.0.0.1"));
 assert(!validIPv4(L"256.2.3.4"));
 assert(!validIPv4(L"192.168.43"));
 assert(!validIPv4(L"192.168.43.1:5555"));
 assert(!validIPv4(L"192.168.43.01x"));
 assert(!validIPv4(L"1..2.3"));
 auto adapters=discover();  // may be empty on CI runner; must never crash
 for(const auto& net:adapters){
  assert(!net.name.empty());
  if(!net.ssid.empty())assert(net.connected);
  assert(net.gateway.empty() || validIPv4(net.gateway));
 }
 return 0;
}