#pragma once
#include <algorithm>
#include <cmath>
#include <vector>
#include <cstdint>
#include <optional>

namespace rs::input {
enum class Phase { Down, Move, Up };
struct Point { float x=0,y=0; };
struct Contact { int pointer=0; Phase phase=Phase::Down; Point position{}; };
struct Viewport {
 int x=0,y=0,width=1,height=1,screenWidth=1,screenHeight=1,rotation=0;
};
inline std::optional<Point> mapPoint(const Viewport& v,int mouseX,int mouseY) {
 if(v.width<=0||v.height<=0||v.screenWidth<=0||v.screenHeight<=0)return std::nullopt;
 if(mouseX<v.x||mouseY<v.y||mouseX>=v.x+v.width||mouseY>=v.y+v.height)return std::nullopt;
 float nx=std::clamp(float(mouseX-v.x)/float(v.width),0.0f,1.0f);
 float ny=std::clamp(float(mouseY-v.y)/float(v.height),0.0f,1.0f);
 switch((v.rotation%360+360)%360){
 case 90: {float old=nx;nx=ny;ny=1.0f-old;break;}
 case 180: nx=1.0f-nx;ny=1.0f-ny;break;
 case 270: {float old=nx;nx=1.0f-ny;ny=old;break;}
 default:break;
 }
 return Point{nx*float(v.screenWidth-1),ny*float(v.screenHeight-1)};
}
inline Point clampNormalized(Point p){
 return {std::clamp(p.x,0.0f,1.0f),std::clamp(p.y,0.0f,1.0f)};
}
class Mapper {
 bool up_=false,down_=false,left_=false,right_=false;
 bool stickActive_=false,fireActive_=false,aimActive_=false;
 Point stickCenter_{.17f,.79f},firePosition_{.88f,.75f},aimPosition_{.5f,.5f};
 float radius_=.092f;
 std::vector<Contact> pending_;
 static constexpr int stickId=101,aimId=102,fireId=103;
 void emit(int id,Phase phase,Point p){pending_.push_back(Contact{id,phase,clampNormalized(p)});}
 void updateStick() {
  float dx=float(right_)-float(left_),dy=float(down_)-float(up_);
  bool active=(dx!=0||dy!=0);
  if(active){float len=std::sqrt(dx*dx+dy*dy);dx/=len;dy/=len;}
  Point target{stickCenter_.x+dx*radius_,stickCenter_.y+dy*radius_};
  if(active&&!stickActive_){emit(stickId,Phase::Down,stickCenter_);stickActive_=true;}
  if(active)emit(stickId,Phase::Move,target);
  if(!active&&stickActive_){emit(stickId,Phase::Up,stickCenter_);stickActive_=false;}
 }
public:
 // Key states are obtained from Raw Input (Windows), never injected as native Android keyboard events.
 void movement(wchar_t key,bool pressed){
  switch(key){case L'W':up_=pressed;break;case L'S':down_=pressed;break;case L'A':left_=pressed;break;case L'D':right_=pressed;break;default:return;}
  updateStick();
 }
 void fire(bool pressed){
  if(fireActive_==pressed)return;
  fireActive_=pressed;
  emit(fireId,pressed?Phase::Down:Phase::Up,firePosition_);
 }
 // Relative PC mouse movement becomes a virtual touch drag when aim mode is active.
 void aimStart(){if(aimActive_)return;aimActive_=true;emit(aimId,Phase::Down,aimPosition_);}
 void aimMove(float deltaX,float deltaY,float sensitivity){
  if(!aimActive_)return;
  aimPosition_=clampNormalized({aimPosition_.x+deltaX*sensitivity,aimPosition_.y+deltaY*sensitivity});
  emit(aimId,Phase::Move,aimPosition_);
 }
 void aimStop(){if(!aimActive_)return;emit(aimId,Phase::Up,aimPosition_);aimActive_=false;}
 void releaseAll(){
  up_=down_=left_=right_=false;
  if(stickActive_){emit(stickId,Phase::Up,stickCenter_);stickActive_=false;}
  if(fireActive_){emit(fireId,Phase::Up,firePosition_);fireActive_=false;}
  if(aimActive_){emit(aimId,Phase::Up,aimPosition_);aimActive_=false;}
 }
 std::vector<Contact> consume(){std::vector<Contact> v;v.swap(pending_);return v;}
 bool hasActiveTouches() const{return stickActive_||fireActive_||aimActive_;}
};
}
