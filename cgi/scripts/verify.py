"""Strict contiguous frame and codec verification (stdlib)."""
import argparse,json,struct,subprocess,tempfile
from pathlib import Path
def ranges(n):
    return [(n*i//3+1,n*(i+1)//3) for i in range(3)]
def check(folder,count,w,h):
    found=sorted(folder.glob("frame_*.png"))
    expected=[f"frame_{i:05d}.png" for i in range(1,count+1)]
    if [x.name for x in found]!=expected:raise ValueError("Missing, repeated or extra frames")
    for path in found:
        with path.open("rb") as f:buf=f.read(24)
        if buf[:8]!=b"\x89PNG\r\n\x1a\n" or buf[12:16]!=b"IHDR" or struct.unpack(">II",buf[16:24])!=(w,h):
            raise ValueError("Invalid PNG dimensions or header: "+str(path))
    print("Verified",count,"PNG frames")
def check_mp4(path,count,w,h,fps):
    cmd=["ffprobe","-v","error","-count_frames","-select_streams","v:0",
         "-show_entries","stream=codec_name,width,height,nb_read_frames,r_frame_rate","-of","json",str(path)]
    data=json.loads(subprocess.run(cmd,capture_output=True,text=True,check=True).stdout)["streams"][0]
    actual=(data["codec_name"],int(data["width"]),int(data["height"]),int(data["nb_read_frames"]),data["r_frame_rate"])
    if actual!=("h264",w,h,count,f"{fps}/1"):raise ValueError(f"Bad MP4 {actual}")
    print("Validated MP4",actual)
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--selftest",action="store_true")
    p.add_argument("--frames",type=Path);p.add_argument("--video",type=Path)
    p.add_argument("--count",type=int);p.add_argument("--width",type=int)
    p.add_argument("--height",type=int);p.add_argument("--fps",type=int)
    a=p.parse_args()
    if a.selftest:
        for count in (24,30,48,120,600):
            flat=[j for start,end in ranges(count) for j in range(start,end+1)]
            assert flat==list(range(1,count+1))
        with tempfile.TemporaryDirectory() as d:
            try:check(Path(d),24,360,640)
            except ValueError:pass
            else:raise AssertionError("Did not reject incomplete frames")
        print("Partition and validation tests: PASS")
    else:
        check(a.frames,a.count,a.width,a.height)
        if a.video:check_mp4(a.video,a.count,a.width,a.height,a.fps)
