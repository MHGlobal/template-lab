#include "../core/viewport_transform.hpp"
#include <cassert>
#include <cmath>
int main(){
 using namespace rs::viewport;
 Transform portrait(1080,1920,1920,1080,0);
 assert(portrait.valid());
 auto r=portrait.content();
 assert(std::abs(r.width-607.5)<0.001);
 assert(std::abs(r.left-656.25)<0.001);
 assert(!portrait.toAndroid({0,540}).has_value()); // letterbox is not tappable
 auto center=portrait.toAndroid({960,540});
 assert(center && std::abs(center->x-540)<0.01 && std::abs(center->y-960)<0.01);
 for(auto rotation:{0,90,180,270}){
  Transform t(1080,1920,1000,800,rotation);
  assert(t.valid());
  auto rect=t.content();
  auto point=t.toAndroid({rect.left+rect.width/2,rect.top+rect.height/2});
  assert(point && std::abs(point->x-540)<0.01 && std::abs(point->y-960)<0.01);
  assert(!t.toAndroid({rect.left-1,rect.top}).has_value());
 }
 assert(!Transform(0,1920,500,500,0).valid());
 assert(!Transform(1080,1920,500,500,45).valid());
 assert(!Transform(1080,1920,0,500,0).valid());
 return 0;
}
