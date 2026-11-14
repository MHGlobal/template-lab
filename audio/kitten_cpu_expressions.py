#!/usr/bin/env python3
"""Quick CPU C++ KittenTTS2 PT test; built-in Portuguese voice, no Gemini clone."""
import json
import subprocess
import time
from pathlib import Path

OUTPUT = Path("outputs/kitten-cpp-ptbr")
PHRASES = {
    "narrador": "Naquela noite, ouvi três batidas na porta do meu quarto. Esperei alguns segundos. Então perguntei quem estava ali. A resposta veio baixinho: você não devia ter acordado.",
    "medo": "[nervous] Eu reconheci aquela voz. <gasp> Era impossível! Minha mãe tinha desaparecido há dez anos.",
    "sussurro": "[nervous] Eu sei que você está acordado. <pause> Não olhe para a porta. Por favor... não olhe.",
    "telefone": "Escuta com atenção. Se alguém bater três vezes na porta, não abra. Eu estou falando sério."
}
def main():
    from kitten_tts_cpp import KittenTTS
    OUTPUT.mkdir(parents=True, exist_ok=True)
    print("Loading KittenTTS2 native CPU", flush=True)
    m=KittenTTS("KittenML/kitten-tts-2",decoder="student_w4",threads=4)
    report={"engine":"KittenTTS2 C++","voice":"Portuguese","gemini_clone":False,
            "note":"Emotion tags supported but human listening needed to confirm vocal delivery.",
            "samples":[]}
    for name,text in PHRASES.items():
        print("GENERATE",name,flush=True)
        start=time.monotonic()
        wav=OUTPUT / f"kitten_cpp_{name}.wav"
        try:
            m.generate_to_file(text,str(wav),voice="Portuguese",preset="expressive")
        except TypeError:
            m.generate_to_file(text,str(wav),voice="Portuguese")
            report["note"]="Wrapper omitted preset=expressive; only model-internal expression tags tested."
        assert wav.is_file() and wav.stat().st_size>2048, f"Missing {wav}"
        mp3=wav.with_suffix(".mp3")
        subprocess.run(["ffmpeg","-nostdin","-y","-v","error","-i",str(wav),
                        "-c:a","libmp3lame","-q:a","3",str(mp3)],check=True,timeout=120)
        assert mp3.stat().st_size>2048
        report["samples"].append({"role":name,"wav":wav.name,"mp3":mp3.name,
             "generation_seconds":round(time.monotonic()-start,1)})
        (OUTPUT/"manifest.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    print("OK",len(report["samples"]),"audio samples",flush=True)
if __name__=="__main__":
    main()
