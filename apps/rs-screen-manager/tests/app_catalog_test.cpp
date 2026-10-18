#include "../core/app_catalog.hpp"
#include <cassert>
#include <set>
int main(){
 using namespace rs::catalog;
 auto apps=parsePackages(L"List of packages\r\npackage:com.example.reader\r\npackage:org.fossify.home\r\n"
                         L"package:com.example.reader\npackage:bad;rm -rf\npackage:org.example.notes\n");
 assert(apps.size()==3);
 assert(apps[0]==L"com.example.reader");
 std::set<std::wstring> fav{L"org.example.notes"};
 auto filtered=filterPackages(apps,L"EXAMPLE",fav,false);
 assert(filtered.size()==2);
 assert(filtered[0]==L"org.example.notes");
 auto favorites=filterPackages(apps,L"",fav,true);
 assert(favorites.size()==1 && favorites[0]==L"org.example.notes");
 assert(filterPackages(apps,L"not installed",fav,false).empty());
 assert(decodeFavorites(L"org.example.notes;com.example.reader;bad /cmd").size()==2);
 assert(encodeFavorites(decodeFavorites(L"org.example.notes;com.example.reader"))==L"com.example.reader;org.example.notes");
 return 0;
}
