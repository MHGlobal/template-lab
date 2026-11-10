#!/usr/bin/env python3
"""Ponto Animado v0.2: deterministic 2D cutout animation using approved artwork.
No AI video generation. Character assets and voice audio must be present.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import math, subprocess, json, wave, struct, os, sys, textwrap, time
ROOT=Path(__file__).resolve().parents[1]
EP=ROOT/"episodes"/"EP001"
OUT=EP/"video"; OUT.mkdir(parents=True,exist_ok=True)
W,H=720,1280
FPS=24
fontfile="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
regularfile="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
def font(sz,bold=True):
 return ImageFont.truetype(fontfile if bold else regularfile,sz)
def txt(d,xy,s,size=42,fill="#FFFFFF",stroke=4,anchor=None,bold=True):
 d.text(xy,s,font=font(size,bold),fill=fill,stroke_width=stroke,stroke_fill="#091F4E",anchor=anchor)
def labelbox(d,xy,words,width=640,height=114,fontsize=39,fill="#0D3475"):
 x,y=xy
 d.rounded_rectangle((x,y,x+width,y+height),radius=26,fill=fill,outline="white",width=3)
 lines=textwrap.wrap(words, width=29,break_long_words=False,break_on_hyphens=False)
 if len(lines)>3: lines=lines[:2]+[" ".join(lines[2:])]
 step=43
 top=y+(height-len(lines)*step)//2
 for k,line in enumerate(lines): txt(d,(x+width/2,top+k*step),line,size=fontsize,anchor="ma",stroke=2)
def background():
 im=Image.new("RGB",(W+90,H+70))
 pix=im.load()
 for y in range(im.height):
  for x in range(im.width):
   if y<890:
    q=y/890.0
    pix[x,y]=(int(54+115*q),int(173+46*q),int(240-9*q))
   else:
    yy=(y-890)/400
    val=int(221-25*yy);pix[x,y]=(val,max(0,val+2),int(val-4))
 d=ImageDraw.Draw(im)
 # clouds, midground town and trees
 for x,y,sz in [(70,160,1.0),(430,125,.7),(640,270,.82),(305,340,.6)]:
  d.ellipse((x-67*sz,y-20*sz,x+70*sz,y+33*sz),fill="#F8FEFF")
  d.ellipse((x-32*sz,y-43*sz,x+37*sz,y+27*sz),fill="#FFFFFF")
 for x,col in [(15,"#ECCF9F"),(205,"#B8DEF5"),(434,"#F8D18E"),(630,"#C2E9FA")]:
  d.rounded_rectangle((x,460,x+175,885),radius=5,fill=col,outline="#5D6C75",width=4)
  for xx in (x+24,x+95):
   for yy in (505,645):
    d.rectangle((xx,yy,xx+47,yy+72),fill="#7FC6F2",outline="#FFFFFF",width=6)
  d.polygon([(x-15,465),(x+87,406),(x+190,465)],fill="#E29E79")
 for x,y in [(70,540),(746,550)]:
  d.rounded_rectangle((x-24,y+76,x+23,930),radius=12,fill="#6D5234",outline="#503821",width=4)
  for dx,dy,r in [(-55,15,94),(23,-32,92),(68,24,77)]:
   d.ellipse((x+dx-r,y+dy-r,x+dx+r,y+dy+r),fill="#328F5C",outline="#0F6044",width=8)
 d.rectangle((0,890,W+90,H+70),outline=None)
 for y in range(920,H,68):
  d.line((0,y,W+90,y),fill="#C7C8B8",width=3)
 d.line((0,910,W+90,910),fill="#A7A69C",width=7)
 return im
BG=background()
sprites={}
for nm in ["girl_neutral","girl_happy","boy_neutral","boy_happy"]:
 p=ROOT/"assets"/"characters"/(nm+".png")
 if not p.exists():raise FileNotFoundError(str(p))
 sprites[nm]=Image.open(p).convert("RGBA")
def tile(canvas,name,x,y,height,progress):
 raw=sprites[name]
 width=round(height*raw.width/raw.height)
 amp=4.5*math.sin(progress*2*math.pi*1.3)
 # subtle relative zoom and bobbing
 q=1+.015*math.sin(progress*2*math.pi*.6)
 w2,h2=int(width*q),int(height*q)
 sprite=raw.resize((w2,h2),Image.LANCZOS)
 canvas.alpha_composite(sprite,(int(x+(width-w2)/2),int(y+amp+(height-h2)/2)))
def badge(d,cx,cy,main,sub=None):
 d.rounded_rectangle((cx-125,cy-58,cx+125,cy+55),radius=25,fill="#004EA7",outline="#FFFFFF",width=5)
 txt(d,(cx,cy-33),main,size=48,anchor="ma",stroke=2)
 if sub:txt(d,(cx,cy+20),sub,size=20,anchor="ma",stroke=2)
def glasses(d,count,shine):
 for i in range(10):
  x=117+i*49;y=857
  color="#F7CD38" if i<count else "#D9F3FF"
  d.rounded_rectangle((x,y,x+26,y+45),radius=8,outline="#123864",fill=color,width=3)
  if i<count:
   d.arc((x+3,y-8,x+22,y+10),180,355,fill="white",width=2)
def desk(d):
 d.rounded_rectangle((78,921,645,1068),radius=24,fill="#8B5D3D",outline="#442A25",width=10)
 d.rounded_rectangle((102,958,625,1033),radius=16,fill="#FFFFFF",outline="#1359BA",width=8)
 txt(d,(363,973),"LIMONADA",size=47,anchor="ma",fill="#1359BA",stroke=0)
 d.rounded_rectangle((94,898,630,948),radius=12,fill="#D6B38A",outline="#70482B",width=8)
 d.line((108,928,624,928),fill="#F9D7A4",width=3)
 # pitcher at far right foreground
 d.rounded_rectangle((585,838,642,906),radius=12,fill="#F4CE43",outline="#125388",width=5)
 d.ellipse((583,832,638,847),fill="#E8F9FF",outline="#1763A6",width=4)
def ease(z):return z*z*(3-2*z)
manifest=json.loads((EP/"voice_manifest.json").read_text())
durations=[a["duration"] for a in manifest]
bounds=[0]
for a in durations:bounds.append(bounds[-1]+a)
bounds[-1]=30.0
scene_titles=["10 COPOS. UMA HORA!","UM DESAFIO...","NOVE VENDIDOS!","FALTA UM!","O ÚLTIMO COPO","ELA DISSE NÃO?!"]
captions=[a["text"] for a in manifest]
def render_frame(t,scale=.0):
 idx=next((i for i in range(6) if t<bounds[i+1]),5)
 dur=bounds[idx+1]-bounds[idx]; p=max(0,min(1,(t-bounds[idx])/max(.1,dur)))
 # gentle camera pan and zoom
 dx=int(12*math.sin(t*.27))
 base=BG.crop((28+dx,22,W+28+dx,H+22)).convert("RGBA")
 dr=ImageDraw.Draw(base)
 # sky accent
 dr.rounded_rectangle((0,0,W,106),radius=0,fill="#105FC3")
 txt(dr,(34,28),"PONTO ANIMADO",size=39,stroke=0)
 dr.rounded_rectangle((573,25,686,76),radius=17,fill="white")
 txt(dr,(630,36),"EP. 01",size=23,anchor="ma",fill="#064CA0",stroke=0)
 # title panel
 dr.rounded_rectangle((45,127,675,230),radius=32,fill="#FFFFFF",outline="#125DAF",width=5)
 txt(dr,(360,156),scene_titles[idx],size=40 if len(scene_titles[idx])<18 else 34,anchor="ma",fill="#0A55AF",stroke=0)
 # sparse decorative motion lines
 yy=280+int(9*math.sin(p*math.pi))
 for xx in (57,660):
  dr.line((xx,yy,xx+(-14 if xx>400 else 14),yy-22),fill="#FFFFFF",width=6)
 if idx==0:
  tile(base,"girl_neutral",138,344,572,p)
  dr=ImageDraw.Draw(base);badge(dr,359,300,"10 COPOS","1 HORA")
 elif idx==1:
  tile(base,"girl_neutral",12,400,525,p)
  tile(base,"boy_happy",368,354,570,p)
  dr=ImageDraw.Draw(base);badge(dr,360,300,"ACEITAS?","DESAFIO")
 elif idx==2:
  tile(base,"girl_happy",52,365,570,p)
  tile(base,"boy_happy",365,390,542,p)
  dr=ImageDraw.Draw(base)
  badge(dr,360,290,f"{min(9,max(1,int(1+p*10)))}/10","VENDIDOS")
 elif idx==3:
  tile(base,"girl_neutral",17,392,545,p)
  tile(base,"boy_neutral",377,398,530,p)
  dr=ImageDraw.Draw(base);badge(dr,360,295,"00:05","RESTANTES")
 elif idx==4:
  tile(base,"girl_happy",23,382,555,p)
  tile(base,"boy_happy",369,365,568,p)
  dr=ImageDraw.Draw(base);badge(dr,360,298,"10/10","VENDIDOS?")
 else:
  tile(base,"girl_neutral",55,385,545,p)
  tile(base,"boy_neutral",360,406,523,p)
  dr=ImageDraw.Draw(base)
  # sudden suspense overlay accent, rather than replacement of characters
  dr.rounded_rectangle((180,269,535,345),radius=27,fill="#154A92",outline="white",width=5)
  txt(dr,(357,285),"MAS PORQUÊ?",size=32,anchor="ma",stroke=2)
 dr=ImageDraw.Draw(base)
 if idx in (2,3): glasses(dr,9,0)
 desk(dr)
 if idx==5:
  dr.rounded_rectangle((115,749,609,835),radius=22,fill="#E7F3FF",outline="#1465C6",width=5)
  txt(dr,(363,766),"CONTINUA...",size=37,anchor="ma",fill="#195FAE",stroke=0)
 # captions safe above bottom TikTok UI
 labelbox(dr,(34,1096),captions[idx],width=652,height=112,fontsize=30)
 dr.rounded_rectangle((70,1228,650,1240),radius=6,fill="#B4CBDE")
 dr.rounded_rectangle((70,1228,70+int(580*t/30),1240),radius=6,fill="#1778D8")
 return base.convert("RGB")
def music(path):
 rate=24000
 freqs=[392.0,493.88,587.33,659.25,587.33,493.88,440,392]
 with wave.open(str(path),"wb") as f:
  f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
  chunk=bytearray()
  for i in range(rate*30):
   sec=i/rate
   note_idx=int(sec/.62)%len(freqs)
   f0=freqs[note_idx]
   env=(1-(sec%0.62)/.62)**2
   melodic=math.sin(2*math.pi*f0*sec)+.24*math.sin(2*math.pi*2*f0*sec)
   low=math.sin(2*math.pi*196*sec)*.20
   val=int(2200*(.32*melodic*env+.15*low))
   chunk.extend(struct.pack("<h",val))
   if len(chunk)>=262144:f.writeframesraw(chunk);chunk.clear()
  if chunk:f.writeframesraw(chunk)
def run():
 start=time.time()
 files=[str(EP/"audio"/(a["scene"]+".mp3")) for a in manifest]
 for f in files:
  if not Path(f).exists():raise FileNotFoundError(f)
 (EP/"audio/concat.txt").write_text("\n".join("file '"+f.replace("'","")+"' " for f in files))
 narration=EP/"audio/dialogue.wav"
 subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-f","concat","-safe","0","-i",str(EP/"audio/concat.txt"),"-ar","24000","-ac","1",str(narration)],check=True)
 musicfile=EP/"audio/music_original.wav"
 if not musicfile.exists():music(musicfile)
 target=OUT/"ponto_animado_ep001.mp4"
 cmd=["ffmpeg","-hide_banner","-loglevel","error","-y",
      "-f","rawvideo","-vcodec","rawvideo","-s",f"{W}x{H}","-pix_fmt","rgb24","-r",str(FPS),"-i","pipe:0",
      "-i",str(narration),"-i",str(musicfile),
      "-filter_complex","[1:a]volume=1.4[a1];[2:a]volume=0.16[a2];[a1][a2]amix=inputs=2:duration=longest:dropout_transition=0[a]",
      "-map","0:v","-map","[a]","-t","30","-c:v","libx264","-preset","ultrafast","-crf","23","-pix_fmt","yuv420p",
      "-r",str(FPS),"-c:a","aac","-b:a","128k","-movflags","+faststart",str(target)]
 proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
 try:
  for i in range(FPS*30):
   frame=render_frame(i/FPS)
   proc.stdin.write(frame.tobytes())
   if i in (12,252,492,660):
    frame.save(OUT/f"frame_{i//FPS:02d}.jpg",quality=86)
  proc.stdin.close()
  err=proc.stderr.read().decode(errors="replace");code=proc.wait()
  if code: raise RuntimeError(f"ffmpeg failed ({code}): {err[-2000:]}")
 except Exception:
  proc.kill();proc.wait();raise
 qc=subprocess.run(["ffprobe","-v","error","-show_entries","format=duration,size:stream=codec_name,width,height","-of","json",str(target)],capture_output=True,text=True,check=True)
 data=json.loads(qc.stdout)
 (OUT/"qc.json").write_text(json.dumps({"render_seconds":round(time.time()-start,1),"media":data,"audio_provider":"edge-tts preview: distribution rights not verified","characters":"approved user original cutouts","animation_method":"Pillow keyframes + FFmpeg (not AI video)"},indent=2))
 print(json.dumps({"video":str(target),"bytes":target.stat().st_size,"qc":data,"elapsed":round(time.time()-start,1)},ensure_ascii=False))
if __name__=="__main__":run()