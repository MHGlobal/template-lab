#include "../core/game_mapping.hpp"
#include <cassert>
#include <iostream>
using namespace rs::input;
int main(){
 Viewport v{100,50,1000,600,1920,1080,0};
 assert(!mapPoint(v,99,90).has_value());
 auto p=mapPoint(v,600,350);assert(p);assert(p->x>958&&p->x<960);assert(p->y>538&&p->y<541);
 v.rotation=180;auto p2=mapPoint(v,600,350);assert(p2&&p2->x>958&&p2->x<960);
 Mapper mapper;
 mapper.movement(L'W',true);mapper.movement(L'D',true);
 auto moves=mapper.consume();assert(moves.size()>=3);
 assert(moves[0].pointer==101&&moves[0].phase==Phase::Down);
 mapper.aimStart();mapper.aimMove(10,-5,.004f);mapper.fire(true);
 auto multitouch=mapper.consume();
 assert(multitouch.size()==3);assert(multitouch[0].pointer==102);assert(multitouch[2].pointer==103);
 assert(mapper.hasActiveTouches());
 mapper.releaseAll();auto released=mapper.consume();
 assert(released.size()==3);
 for(auto& c:released)assert(c.phase==Phase::Up);
 assert(!mapper.hasActiveTouches());
 mapper.releaseAll();assert(mapper.consume().empty());
 mapper.movement(L'A',true);mapper.movement(L'D',true);
 auto cancel=mapper.consume();assert(cancel.size()>=2);
 mapper.releaseAll();mapper.consume();
 std::cout<<"PASS game input state, multitouch, rotation, coordinate bounds and release safety\n";
}
