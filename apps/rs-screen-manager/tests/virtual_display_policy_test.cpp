#include "../core/virtual_display_policy.hpp"
#include <cassert>
#include <string>
int main() {
 using namespace rs::display;
 assert(virtualDisplayArgs(0)==L" --new-display");
 assert(virtualDisplayArgs(99)==L" --new-display");
 assert(virtualDisplayArgs(1)==L" --new-display=1080x1920/320");
 assert(virtualDisplayArgs(2)==L" --new-display=720x1280/320");
 assert(virtualDisplayArgs(3)==L" --new-display=1920x1080/320");
 assert(clipboardArgs(0).empty());
 assert(clipboardArgs(1)==L" --no-clipboard-autosync");
 assert(clipboardArgs(2).empty());
 assert(validPackage(L"org.fossify.home"));
 assert(validPackage(L"com.example.app_1"));
 assert(!validPackage(L""));
 assert(!validPackage(L"bad package"));
 assert(!validPackage(L"app;cmd"));
 assert(!validPackage(L"../bad"));
 return 0;
}
