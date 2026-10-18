#pragma once
// Offline Android application catalog: package IDs come only from the selected, authorized device.
#include "virtual_display_policy.hpp"
#include <algorithm>
#include <cwctype>
#include <set>
#include <sstream>
#include <string>
#include <vector>

namespace rs::catalog {
inline std::vector<std::wstring> parsePackages(const std::wstring& adb) {
 std::wistringstream stream(adb);
 std::wstring line;
 std::vector<std::wstring> packages;
 while(std::getline(stream,line)){
  if(!line.empty() && line.back()==L'\r')line.pop_back();
  constexpr wchar_t prefix[]=L"package:";
  if(line.rfind(prefix,0)!=0)continue;
  auto id=line.substr(8);
  if(rs::display::validPackage(id))packages.push_back(std::move(id));
 }
 std::sort(packages.begin(),packages.end());
 packages.erase(std::unique(packages.begin(),packages.end()),packages.end());
 return packages;
}
inline std::wstring lowercase(std::wstring s){
 for(wchar_t& c:s)c=static_cast<wchar_t>(std::towlower(c));
 return s;
}
inline std::vector<std::wstring> filterPackages(
 const std::vector<std::wstring>& packages,const std::wstring& text,
 const std::set<std::wstring>& favorites,bool onlyFavorites) {
 const auto term=lowercase(text);
 std::vector<std::wstring> out;
 for(const auto& id:packages) {
  if(onlyFavorites && !favorites.find(id)!=favorites.end())continue;
  if(!term.empty() && lowercase(id).find(term)==std::wstring::npos)continue;
  out.push_back(id);
 }
 std::stable_sort(out.begin(),out.end(),[&](const auto& a,const auto& b){
  const bool fa=favorites.find(a)!=favorites.end(),fb=favorites.find(b)!=favorites.end();
  return fa!=fb?fa:a<b;
 });
 return out;
}
inline std::set<std::wstring> decodeFavorites(const std::wstring& data) {
 std::set<std::wstring> fav;
 std::wistringstream in(data);
 std::wstring part;
 while(std::getline(in,part,L';'))if(rs::display::validPackage(part))fav.insert(part);
 return fav;
}
inline std::wstring encodeFavorites(const std::set<std::wstring>& fav) {
 std::wstring result;
 for(const auto& pkg:fav){
  if(!rs::display::validPackage(pkg))continue;
  if(result.size()+pkg.size()+1>=1800)break;
  if(!result.empty())result+=L';';
  result+=pkg;
 }
 return result;
}
} // namespace rs::catalog
