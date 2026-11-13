#!/usr/bin/env python3
"""Comparação de TTS PT-BR: Chatterbox Multilingual V3 (CPU) e Gemini API.

Não fornece áudio falso quando uma API/chave não está disponível.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request
import wave

ROOT = Path("outputs/tts-comparativo")
MODEL_GEMINI = os.getenv("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts")
SAMPLES = {
    "narrador": (
        "Naquela noite, ouvi três batidas na porta do meu quarto. "
        "Esperei alguns segundos. Então perguntei quem estava ali. "
        "A resposta veio baixinho: você não devia ter acordado."
    ),
    "sussurro": (
        "Eu sei que você está acordado. Não olhe para a porta. "
        "Por favor... não olhe."
    ),
    "telefone": (
        "Escuta com atenção. Se alguém bater três vezes na porta, "
        "não abra. Eu estou falando sério."
    ),
}
GEMINI_VOICES = {"narrador": "Charon", "sussurro": "Enceladus", "telefone": "Algieba"}
CHATT_SETTINGS = {
    "narrador": {"exaggeration": 0.58, "cfg_weight": 0.35, "temperature": 0.8},
    "sussurro": {"exaggeration": 0.72, "cfg_weight": 0.30, "temperature": 0.75},
}

def read_args():
    p = argparse.ArgumentParser()
    p.add_argument("--engine", choices=("gemini", "chatterbox", "all"), required=True)
    p.add_argument("--dry-run", action="store_true")
    return p.parse_args()

def save_wav(path: Path, pcm: bytes, sr=24000):
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(sr)
        out.writeframes(pcm)
    if path.stat().st_size < 2048:
        raise RuntimeError(f"Empty WAV from provider: {path}")

def mp3(wav_path: Path, effect: str = ""):
    out = wav_path.with_suffix(".mp3") if not effect else wav_path.with_name(wav_path.stem + "_telefone.mp3")
    cmd = ["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(wav_path)]
    if effect:
        cmd.extend(["-af", "highpass=f=300,lowpass=f=3400,acompressor=threshold=0.089:ratio=2:attack=7:release=80"])
    cmd.extend(["-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-q:a", "3", str(out)])
    subprocess.run(cmd, check=True, timeout=80)
    if out.stat().st_size < 2048:
        raise RuntimeError(f"Empty MP3: {out}")
    return str(out)

def gemini_prompt(role: str, text: str):
    direction = {
        "narrador": (
            "Brazilian Portuguese (pt-BR). Natural, charismatic adult storytelling voice, "
            "conversational rhythm, suspense that grows subtly, real emotional pauses, "
            "no robotic announcer or monster. Warm and intimate delivery."
        ),
        "sussurro": (
            "Brazilian Portuguese (pt-BR). Really WHISPER the entire passage quietly, "
            "breathy close-microphone terrified human whisper. Restrained, believable, "
            "no deepening or distorting the voice, no horror monster. Short hesitant breaths."
        ),
        "telefone": (
            "Brazilian Portuguese (pt-BR). Natural smartphone voice message recorded by "
            "a concerned adult. Everyday, slightly nervous, understandable, never monstrous "
            "or theatrical. Normal pitch."
        ),
    }[role]
    tag = "[whispers] " if role == "sussurro" else ""
    return (
        "Synthesize speech. Read ONLY the Transcript verbatim, not the instructions, labels or tags.\n"
        f"Voice direction: {direction}\n"
        "Transcript:\n" + tag + text
    )

def generate_gemini():
    key = os.getenv("GEMINI_API_KEY", "").strip()
    if not key:
        print("SKIPPED Gemini: GEMINI_API_KEY is absent. No audio generated.", flush=True)
        return False
    dest = ROOT / "gemini"
    dest.mkdir(parents=True, exist_ok=True)
    for role in ("narrador", "sussurro", "telefone"):
        print(f"Gemini {MODEL_GEMINI}: {role}", flush=True)
        prompt = gemini_prompt(role, SAMPLES[role])
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {
                    "voiceConfig": {
                        "prebuiltVoiceConfig": {"voiceName": GEMINI_VOICES[role]}
                    }
                },
            },
        }
        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_GEMINI}:generateContent",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": key,
            },
            method="POST",
        )
        for retry in range(3):
            try:
                with urllib.request.urlopen(req, timeout=140) as r:
                    response = json.load(r)
                break
            except urllib.error.HTTPError as ex:
                detail = ex.read(2048).decode("utf-8", "replace")
                # Reject unsafe quota/billing fallback. Only free-tier Gemini, when available.
                if ex.code in (429, 500, 502, 503) and retry < 2:
                    time.sleep(4 * (retry + 1))
                    continue
                raise RuntimeError(f"Gemini HTTP {ex.code}: {detail[:600]}") from None
        try:
            parts = response["candidates"][0]["content"]["parts"]
            media = next(p["inlineData"] for p in parts if "inlineData" in p)
            raw = base64.b64decode(media["data"], validate=True)
        except (KeyError, IndexError, StopIteration, ValueError) as exc:
            raise RuntimeError(f"Gemini provided no usable audio for {role}: {type(exc).__name__}") from None
        mime = media.get("mimeType", "audio/pcm;rate=24000").lower()
        if "audio/pcm" not in mime and "audio/l16" not in mime:
            raise RuntimeError(f"Unexpected Gemini audio MIME: {mime}")
        import re
        match = re.search(r"rate=(\d+)", mime)
        rate = int(match.group(1)) if match else 24000
        wav = dest / f"gemini_{role}_{GEMINI_VOICES[role].lower()}.wav"
        save_wav(wav, raw, sr=rate)
        mp3(wav)
        if role == "telefone":
            mp3(wav, effect="phone")
    print(f"Gemini OK: {len(list(dest.glob('*.mp3')))} MP3", flush=True)
    return True

def generate_chatterbox():
    import numpy as np
    import torch
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    torch.set_num_threads(min(4, os.cpu_count() or 2))
    print("Loading Chatterbox Multilingual V3 on CPU...", flush=True)
    model = ChatterboxMultilingualTTS.from_pretrained(device="cpu", t3_model="v3")
    dest = ROOT / "chatterbox"
    dest.mkdir(parents=True, exist_ok=True)
    torch.manual_seed(20261113)
    for role in CHATT_SETTINGS:
        print(f"Chatterbox V3: {role}", flush=True)
        audio = model.generate(SAMPLES[role], language_id="pt", **CHATT_SETTINGS[role])
        waveform = audio.squeeze().detach().cpu().numpy()
        if waveform.size < model.sr:
            raise RuntimeError(f"Chatterbox produced too little audio: {role}")
        pcm = (np.clip(waveform, -1, 1) * 32767).astype("<i2").tobytes()
        wav = dest / f"chatterbox_{role}_v3.wav"
        save_wav(wav, pcm, sr=model.sr)
        mp3(wav)
    print(f"Chatterbox OK: {len(list(dest.glob('*.mp3')))} MP3", flush=True)
    return True

def main():
    args = read_args()
    if args.dry_run:
        assert set(CHATT_SETTINGS).issubset(SAMPLES)
        assert set(GEMINI_VOICES) == set(SAMPLES)
        for role, sample in SAMPLES.items():
            assert sample and len(sample) < 300, (role, len(sample))
            assert gemini_prompt(role, sample).endswith(sample)
        print("OK: all narration texts / voice configurations validated")
        return 0

    ROOT.mkdir(parents=True, exist_ok=True)
    # Inputs and provider metadata are written before model download/API call.
    (ROOT / "comparacao.json").write_text(json.dumps({
        "language": "pt-BR",
        "scripts": SAMPLES,
        "gemini_model": MODEL_GEMINI,
        "chatterbox_model": "ResembleAI/chatterbox Multilingual V3",
        "chatterbox_parameters": CHATT_SETTINGS,
        "gemini_voices": GEMINI_VOICES,
        "note": (
            "Chatterbox does not support speech direction prompts; a true whisper "
            "is not guaranteed. Compare with Gemini's whisper tag; phone post-filter "
            "does not change voice pitch. All voice tracks are AI-generated."
        ),
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if args.engine in ("gemini", "all"):
        if not generate_gemini():
            return 3  # visible failure: no fake MP3
    if args.engine in ("chatterbox", "all"):
        generate_chatterbox()
    return 0

if __name__ == "__main__":
    sys.exit(main())
