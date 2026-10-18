#pragma once
#include <string>
#include <cwctype>
#include <algorithm>
namespace rs::display {
inline std::wstring virtualDisplayArgs(int mode) {
 switch (mode) {
  case 1: return L" --new-display=1080x1920/320";
  case 2: return L" --new-display=720x1280/320";
  case 3: return L" --new-display=1920x1080/320";
  default:return L" --new-display";
 }
}
inline std::wstring clipboardArgs(int preference) {
 // scrcpy synchronizes Android -> PC clipboard by default; Ctrl+V pastes PC -> Android.
 // Preference 1 opts out of Android-to-PC automatic clipboard updates.
 return preference==1 ? L" --no-clipboard-autosync" : L"";
}
inline bool validPackage(const std::wstring& name) {
 if(name.empty()||name.size()>200)return false;
 return std::all_of(name.begin(),name.end(),[](wchar_t c) {
  return (c>=L'a'&&c<=L'z')||(c>=L'A'&&c<=L'Z')||(c>=L'0'&&c<=L'9')||c==L'.'||c==L'_';
 });
}
}
