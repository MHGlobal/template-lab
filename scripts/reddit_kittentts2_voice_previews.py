#!/usr/bin/env python3
"""Generate only evaluation audio for the two Reddit AITA narration channels."""
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
import soundfile as sf
from kitten_tts_cpp import KittenTTS

OUT = Path("voice-previews")
OUT.mkdir(parents=True, exist_ok=True)
TEXT_PT = "Eu confiei na minha sogra durante anos. Até descobrir o que ela disse sobre meu filho."
TEXT_EN = "I trusted my mother-in-law for years. Then I discovered what she had said about my son."
CASES = [
    ("pt", "Portuguese", TEXT_PT),
    ("pt", "PortugueseBeach", TEXT_PT),
    ("pt", "PortugueseNewsAnchor", TEXT_PT),
    ("en", "Marcus", TEXT_EN),
    ("en", "Dante", TEXT_EN),
    ("en", "Maeve", TEXT_EN),
]
report = {"model":"KittenML/kitten-tts-2", "preset":"expressive", "backend":"kitten_tts_cpp",
          "created_utc": datetime.now(timezone.utc).isoformat(),
          "samples": [], "scope": "voice preview only; no video creation or publication"}

print("Loading KittenTTS 2 on CPU...", flush=True)
model = KittenTTS("KittenML/kitten-tts-2", decoder="student_w4", threads=4, decoder_threads=4)

for language, voice, text in CASES:
    wav = OUT / f"{language}_{voice}.wav"
    mp3 = OUT / f"{language}_{voice}.mp3"
    item = {"language":language, "voice":voice, "text":text}
    try:
        print("Generating",language, voice,flush=True)
        model.generate_to_file(text, str(wav), voice=voice,
                               preset="expressive", normalize=(language=="en"))
        info = sf.info(str(wav))
        if info.duration < 1:
            raise RuntimeError("Unexpectedly short synthesized audio")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
                        "-codec:a", "libmp3lame", "-b:a", "128k", str(mp3)], check=True)
        item.update({"status":"ok","duration_seconds":round(info.duration,2),
                     "wav":str(wav), "mp3":str(mp3)})
        print("GENERATED",mp3,info.duration,flush=True)
    except Exception as exc:
        item.update({"status":"error","error":f"{type(exc).__name__}: {exc}"})
        print("FAILED",language,voice,item["error"],flush=True)
    report["samples"].append(item)

(OUT / "report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
success = sum(s["status"] == "ok" for s in report["samples"])
print("TOTAL",success,len(CASES),flush=True)
if success == 0:
    raise SystemExit("No audio was generated")
