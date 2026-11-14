#!/usr/bin/env python3
"""Ponto Animado TTS A/B on public Template Lab Actions.

Text-only, synthetic test passages; no private studio content or API key.
The reference is a previously generated Gemini TTS artifact from this repository.
Never claim a whisper/similar voice before human listening.
"""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import subprocess
import time
import wave

ROOT = Path("outputs/tts-oss-ab")
BASELINE = Path("reference-gemini")
REFERENCE = {
    "narrador": ("gemini/gemini_narrador_charon.wav", "Naquela noite, ouvi três batidas na porta do meu quarto. Esperei alguns segundos. Então perguntei quem estava ali. A resposta veio baixinho: você não devia ter acordado."),
    "sussurro": ("gemini/gemini_sussurro_enceladus.wav", "Eu sei que você está acordado. Não olhe para a porta. Por favor... não olhe."),
    "telefone": ("gemini/gemini_telefone_algieba.wav", "Escuta com atenção. Se alguém bater três vezes na porta, não abra. Eu estou falando sério."),
}
SAMPLES = {
    "narrador": REFERENCE["narrador"][1],
    "medo": "Eu reconheci aquela voz. Era impossível! Minha mãe tinha desaparecido há dez anos.",
    "sussurro": REFERENCE["sussurro"][1],
    "telefone": REFERENCE["telefone"][1],
}
# Tags only for the TTS engine with documented expression-conditioning.
KITTEN_EXPRESSIVE = {
    "medo": "[nervous] Eu reconheci aquela voz. <gasp> Era impossível! Minha mãe tinha desaparecido há dez anos.",
    "sussurro": "[nervous] Eu sei que você está acordado. Não olhe para a porta. <pause> Por favor... não olhe.",
}
def ref_for(role):
    # The emotional sample uses the narrator's identity.
    key = role if role in REFERENCE else "narrador"
    file, transcript = REFERENCE[key]
    path = BASELINE / file
    return (path if path.is_file() and path.stat().st_size > 2048 else None), transcript

def run(cmd, timeout=900):
    print("+", " ".join(map(str, cmd[:4])), "...", flush=True)
    subprocess.run([str(x) for x in cmd], check=True, timeout=timeout)

def ffprobe(path):
    proc = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                           "format=duration:stream=codec_name,sample_rate,channels",
                           "-of", "json", str(path)], check=True, capture_output=True, text=True)
    data = json.loads(proc.stdout)
    assert path.stat().st_size > 2048, f"Too small: {path}"
    assert float(data["format"]["duration"]) > 0.7, f"Too short: {path}"
    return data

def encode(wav, role):
    dest = wav.with_suffix(".mp3")
    run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
         "-i", wav, "-ar", "24000", "-ac", "1", "-codec:a", "libmp3lame",
         "-q:a", "3", dest], timeout=120)
    ffprobe(dest)
    if role == "telefone":
        # Unfiltered output retained; this is a *separate* telephone edit,
        # not a substitute for emotional performance or proper whispering.
        phone = wav.with_name(wav.stem + "_telefone_fx.mp3")
        run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
             "-i", wav, "-af", "highpass=f=320,lowpass=f=3200,acompressor=threshold=0.08:ratio=2",
             "-codec:a", "libmp3lame", "-q:a", "4", phone], timeout=120)
        ffprobe(phone)
    return dest

def pocket(role, text, wav):
    ref, _ = ref_for(role)
    voice = str(ref) if ref else "rafael"
    run(["pocket-tts", "generate", "--language", "portuguese",
         "--voice", voice, "--text", text,
         "--output-path", str(wav)], timeout=1100)
    return "Gemini clip" if ref else "built-in Rafael"

def kitten(role, text, wav, model):
    ref, transcript = ref_for(role)
    input_text = KITTEN_EXPRESSIVE.get(role, text)
    kwargs = {"preset": "expressive" if role in ("medo", "sussurro") else "stable",
              "normalize": False}
    if ref is not None:
        kwargs.update({"reference": str(ref), "reference_text": transcript})
    else:
        kwargs["voice"] = "Portuguese"
    import soundfile as sf
    audio = model.generate(input_text, **kwargs)
    sf.write(str(wav), audio, model.sample_rate)
    return "Gemini clip" if ref else "built-in Portuguese"

def chatterbox(role, text, wav, model):
    import numpy as np
    ref, _ = ref_for(role)
    kw = {"language_id": "pt", "exaggeration": 0.64 if role == "medo" else 0.56,
          "cfg_weight": 0.35, "temperature": 0.77}
    if ref:
        kw["audio_prompt_path"] = str(ref)
    audio = model.generate(text, **kw)
    samples = audio.squeeze().detach().cpu().numpy()
    assert samples.size > model.sr
    pcm = (np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes()
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(model.sr)
        w.writeframes(pcm)
    return "Gemini clip" if ref else "default speaker"

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--engine", choices=("pocket", "kitten", "chatterbox"), required=True)
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()
    assert set(SAMPLES) == {"narrador", "medo", "sussurro", "telefone"}
    assert all(len(x) < 300 for x in SAMPLES.values())
    if args.dry_run:
        print("OK: transcript-only roles, documented Kitten emotion tags, CPU engines")
        return
    dest = ROOT / args.engine
    dest.mkdir(parents=True, exist_ok=True)
    model = None
    if args.engine == "kitten":
        from kittenml import KittenTTS
        model = KittenTTS("KittenML/kitten-tts-2", weights="emb4")
    elif args.engine == "chatterbox":
        import torch
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        torch.set_num_threads(min(4, os.cpu_count() or 2))
        model = ChatterboxMultilingualTTS.from_pretrained(device="cpu", t3_model="v3")
    report = {"engine": args.engine, "language": "pt-BR", "baseline_run": 43492866506,
              "gemini_reference_available": bool(ref_for("narrador")[0]), "samples": [],
              "warnings": ["Whisper authenticity, emotional expressiveness and speaker identity need human listening.",
                           "TTS emotions are not guaranteed; phone filter is a separately labelled edit."]}
    start = time.monotonic()
    for role, text in SAMPLES.items():
        wav = dest / f"{args.engine}_{role}_raw.wav"
        print(f"START engine={args.engine} role={role}", flush=True)
        t0 = time.monotonic()
        if args.engine == "pocket":
            voice = pocket(role, text, wav)
        elif args.engine == "kitten":
            voice = kitten(role, text, wav, model)
        else:
            voice = chatterbox(role, text, wav, model)
        info = ffprobe(wav)
        mp3 = encode(wav, role)
        report["samples"].append({"role": role, "transcript": text,
                                  "raw_wav": wav.name, "raw_mp3": mp3.name,
                                  "voice_source": voice,
                                  "seconds": float(info["format"]["duration"]),
                                  "generation_seconds": round(time.monotonic() - t0, 1)})
        (dest / "manifest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    report["elapsed_seconds"] = round(time.monotonic() - start, 1)
    (dest / "manifest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    assert len(list(dest.glob("*_raw.mp3"))) == len(SAMPLES)
    print("VALIDATED", json.dumps(report, ensure_ascii=False), flush=True)

if __name__ == "__main__":
    main()
