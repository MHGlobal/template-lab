#!/usr/bin/env python3
"""Kokoro 82M PT voice CPU benchmark, no instruction tags, no voice cloning."""
import json
from pathlib import Path
import subprocess
import time

ROOT=Path("outputs/kokoro-ptbr")
SAMPLES={
 "narrador":"Naquela noite, ouvi três batidas na porta do meu quarto. Esperei alguns segundos. Então perguntei quem estava ali. A resposta veio baixinho: você não devia ter acordado.",
 "medo":"Eu reconheci aquela voz. Era impossível! Minha mãe tinha desaparecido há dez anos.",
 "sussurro":"Eu sei que você está acordado. Não olhe para a porta. Por favor... não olhe.",
 "telefone":"Escuta com atenção. Se alguém bater três vezes na porta, não abra. Eu estou falando sério."
}
def main():
 import numpy as np
 import soundfile as sf
 from kokoro import KPipeline
 ROOT.mkdir(parents=True,exist_ok=True)
 print("Loading Kokoro 82M Portuguese model",flush=True)
 pipeline=KPipeline(lang_code="p")
 report={"engine":"Kokoro 82M","voice":"pm_alex","gemini_clone":False,
         "warning":"No genuine whisper control; voice filter alone does not count as whisper.",
         "samples":[]}
 for role,text in SAMPLES.items():
  start=time.monotonic()
  segments=[np.asarray(audio,dtype=np.float32) for _,_,audio in pipeline(text,voice="pm_alex",speed=1)]
  assert segments and all(x.size>100 for x in segments), f"invalid {role}"
  audio=np.concatenate([s for item in segments for s in (item,np.zeros(1800,dtype=np.float32))])
  wav=ROOT/f"kokoro_{role}.wav"
  sf.write(wav,audio,24000)
  mp3=wav.with_suffix(".mp3")
  subprocess.run(["ffmpeg","-nostdin","-y","-v","error","-i",str(wav),"-codec:a","libmp3lame","-q:a","3",str(mp3)],check=True)
  assert mp3.stat().st_size>2048
  report["samples"].append({"role":role,"mp3":mp3.name,"duration":round(len(audio)/24000,2),
                            "generation_seconds":round(time.monotonic()-start,1)})
  (ROOT/"manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
 print("VALIDATED",len(report["samples"]))
if __name__=="__main__":
 main()
