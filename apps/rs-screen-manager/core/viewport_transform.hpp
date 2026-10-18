#pragma once
// Coordinate contract for future embedded video and Gaming.
// Preserves aspect ratio and rejects touches in letterbox margins.
// Desktop dimensions are DIPs after Windows scale has been applied.
#include <algorithm>
#include <cmath>
#include <optional>

namespace rs::viewport {
struct Point {double x{},y{};};
struct Rect {double left{},top{},width{},height{};};
class Transform {
 double nativeWidth_{}, nativeHeight_{};
 double shownWidth_{},shownHeight_{};
 int rotation_{};
 Rect content_{};
 bool valid_{false};
public:
 Transform(double physicalWidth,double physicalHeight,double windowWidth,double windowHeight,int clockwiseDegrees){
  rotation_=clockwiseDegrees;
  if(!std::isfinite(physicalWidth)||!std::isfinite(physicalHeight)||
     !std::isfinite(windowWidth)||!std::isfinite(windowHeight)||
     physicalWidth<=0||physicalHeight<=0||windowWidth<=0||windowHeight<=0||
     (clockwiseDegrees!=0&&clockwiseDegrees!=90&&clockwiseDegrees!=180&&clockwiseDegrees!=270))return;
  nativeWidth_=physicalWidth;nativeHeight_=physicalHeight;
  shownWidth_=(rotation_%180==0)?physicalWidth:physicalHeight;
  shownHeight_=(rotation_%180==0)?physicalHeight:physicalWidth;
  double scale=std::min(windowWidth/shownWidth_,windowHeight/shownHeight_);
  content_.width=shownWidth_*scale;content_.height=shownHeight_*scale;
  content_.left=(windowWidth-content_.width)/2;
  content_.top=(windowHeight-content_.height)/2;
  valid_=std::isfinite(scale)&&scale>0;
 }
 bool valid()const{return valid_;}
 Rect content()const{return content_;}
 std::optional<Point> toAndroid(Point windowPoint)const{
  if(!valid_||!std::isfinite(windowPoint.x)||!std::isfinite(windowPoint.y)||
     windowPoint.x<content_.left||windowPoint.y<content_.top||
     windowPoint.x>=content_.left+content_.width||
     windowPoint.y>=content_.top+content_.height)return {};
  double x=(windowPoint.x-content_.left)/content_.width*shownWidth_;
  double y=(windowPoint.y-content_.top)/content_.height*shownHeight_;
  Point out{};
  switch(rotation_){
   case 0:out={x,y};break;
   case 90:out={y,nativeHeight_-x};break;
   case 180:out={nativeWidth_-x,nativeHeight_-y};break;
   case 270:out={nativeWidth_-y,x};break;
  }
  out.x=std::clamp(out.x,0.0,nativeWidth_-0.000001);
  out.y=std::clamp(out.y,0.0,nativeHeight_-0.000001);
  return out;
 }
};
} // namespace rs::viewport
