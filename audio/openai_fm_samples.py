#!/usr/bin/env python3
"""Generate PT-BR OpenAI.fm-style voice auditions with OpenAI Speech API."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request

MODEL = "gpt-4o-mini-tts"
ENDPOINT = "https://api.openai.com/v1/audio/speech"
DEST = Path("outputs/openai-fm-ptbr")

EXAMPLES = {
    "narrator": {
        "text": "Naquela noite, ouvi três batidas na porta do meu quarto. Esperei alguns segundos... e perguntei quem estava ali. A resposta veio baixinho: 'Você não devia ter acordado.'",
        "instructions": (
            "Speak Brazilian Portuguese (pt-BR), with a convincing contemporary Brazilian accent. "
            "You are a charismatic human storyteller confiding a strange experience to a friend, not an announcer. "
            "Use natural conversational rhythm, subtle breath, human irregularities, warm clear tone, "
            "genuine fear slowly growing and short meaningful pauses. Do not sound robotic or melodramatic. "
            "No monster voices or effects. Read the provided Portuguese words verbatim, with no additions."
        ),
        "voices": ["marin", "cedar", "coral"],
        "speed": 0.96,
    },
    "whisper": {
        "text": "Eu sei que você está acordado... Não olhe para a porta. Por favor, não olhe.",
        "instructions": (
            "Speak Brazilian Portuguese (pt-BR), as a frightened adult whispering very close to a microphone. "
            "Use a TRUE breathy, low-volume whisper throughout, mostly airy unvoiced delivery, hesitant pauses, "
            "quiet uneven breaths and understandable words. No normal full-volume speaking, no growling, "
            "no pitch-lowered monster or demonic sound, no theatrical trailer voice. "
            "Sound urgent and human. Read the words exactly and add nothing."
        ),
        "voices": ["cedar", "ash"],
        "speed": 0.89,
    },
    "phone": {
        "text": "Mensagem recebida às duas e dezessete da manhã. Escuta com atenção: se alguém bater três vezes, não abra a porta.",
        "instructions": (
            "Speak Brazilian Portuguese (pt-BR) like an ordinary adult recording a real smartphone voice message. "
            "Sound close, clear, slightly nervous, naturally paced and fully understandable. "
            "No monster, demon, pitch shift, creepy robot, narrator, or artificial growl. "
            "Do not whisper. Speak the exact words without adding anything."
        ),
        "voices": ["nova", "onyx"],
        "speed": 1.0,
    },
}

def command(args):
    subprocess.run(args, check=True, timeout=120, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

def duration(path):
    try:
        p = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
            capture_output=True, text=True, check=True, timeout=15)
        return round(float(p.stdout.strip()), 2)
    except (OSError, subprocess.CalledProcessError, ValueError, subprocess.TimeoutExpired):
        return None

def speech(key, voice, text, instructions, speed, output):
    body = json.dumps({
        "model": MODEL, "voice": voice, "input": text, "instructions": instructions,
        "speed": speed, "response_format": "mp3",
    }, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(ENDPOINT, data=body, method="POST", headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    })
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                data = res.read()
            if len(data) < 2048 or not (data.startswith(b"ID3") or data[:1] == b"\xff"):
                raise RuntimeError("OpenAI returned an invalid or empty MP3 payload.")
            temp = output.with_suffix(".part")
            temp.write_bytes(data)
            temp.replace(output)
            return
        except urllib.error.HTTPError as exc:
            if exc.code in (429, 500, 502, 503, 504) and attempt < 3:
                time.sleep(2 ** (attempt + 1))
                continue
            errors = {
                400: "Check model and input.",
                401: "Invalid GitHub Actions OPENAI_API_KEY secret.",
                403: "API access denied.",
                404: "Model or endpoint unavailable.",
                429: "API rate limit or insufficient credits.",
            }
            raise RuntimeError(f"OpenAI Speech API HTTP {exc.code}: {errors.get(exc.code, 'Check API account/status.')}") from None
        except urllib.error.URLError as exc:
            if attempt < 3:
                time.sleep(2 ** (attempt + 1))
                continue
            raise RuntimeError(f"Network failure: {exc.reason}") from None

def phone_effect(src, out):
    # Narrowband phone response, normal pitch and NO monstrous distortion.
    command([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src),
        "-af", "highpass=f=300,lowpass=f=3400,acompressor=threshold=0.089:ratio=2:attack=7:release=80,volume=0.95",
        "-ar", "24000", "-ac", "1", "-codec:a", "libmp3lame", "-q:a", "3", str(out),
    ])

def comparison(paths, output):
    listing = output.parent / "_concat_list.txt"
    listing.write_text("".join("file '" + p.resolve().as_posix() + "'\n" for p in paths), encoding="utf-8")
    try:
        command(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                 "-f", "concat", "-safe", "0", "-i", str(listing),
                 "-ar", "24000", "-ac", "1", "-codec:a", "libmp3lame",
                 "-q:a", "3", str(output)])
    finally:
        listing.unlink(missing_ok=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--preset", choices=["all", *EXAMPLES], default="all")
    parser.add_argument("--text", default="", help="Optional PT-BR script <= 900 characters")
    parser.add_argument("--dry-run", action="store_true")
    a = parser.parse_args()
    if len(a.text.strip()) > 900:
        parser.error("--text must contain at most 900 characters")
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not a.dry_run and not key:
        print("ERROR: Missing OPENAI_API_KEY. Set GitHub repository Actions secret before running.", file=sys.stderr)
        return 2
    selected = EXAMPLES if a.preset == "all" else {a.preset: EXAMPLES[a.preset]}
    DEST.mkdir(parents=True, exist_ok=True)
    files = []
    outputs = []
    n = 1
    for role, sample in selected.items():
        script = a.text.strip() or sample["text"]
        for voice in sample["voices"]:
            filename = f"{n:02d}_{role}_{voice}.mp3"
            path = DEST / filename
            print(f"Generating {filename} ({len(script)} characters)", flush=True)
            if not a.dry_run:
                speech(key, voice, script, sample["instructions"], sample["speed"], path)
                outputs.append(path)
            files.append({
                "file": filename, "role": role, "voice": voice, "text": script,
                "instructions": sample["instructions"], "speed": sample["speed"],
                "duration_seconds": duration(path) if not a.dry_run else None,
            })
            n += 1
            if role == "phone":
                processed = path.with_name(path.stem + "_telefone.mp3")
                if not a.dry_run:
                    phone_effect(path, processed)
                    outputs.append(processed)
                files.append({
                    "file": processed.name, "role": "phone_effect", "derived_from": filename,
                    "processing": "300-3400Hz telephone EQ, mild compression, NO pitch shift",
                    "duration_seconds": duration(processed) if not a.dry_run else None,
                })
    if not a.dry_run:
        comparison(outputs, DEST / "00_comparativo.mp3")
    (DEST / "manifest.json").write_text(json.dumps({
        "provider": "OpenAI Speech API, same model as OpenAI.fm demo",
        "model": MODEL, "preset": a.preset,
        "synthetic_voice_disclosure": "Voz gerada por inteligência artificial.",
        "retirement_notice": "gpt-4o-mini-tts shutdown planned 2027-01-06",
        "files": files,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (DEST / "LEIA-ME.txt").write_text(
        "PONTO ANIMADO - Testes de vozes OpenAI.fm (PT-BR)\n\n"
        "Escute primeiro 00_comparativo.mp3 e depois compare os ficheiros individuais.\n"
        "narrator: narração natural.\nwhisper: sussurro verdadeiro pedido ao motor.\n"
        "phone: gravação de telemóvel; _telefone: filtro de banda telefónica sem alterar pitch.\n"
        "Vozes geradas por IA. Modelo demonstrado em openai.fm: gpt-4o-mini-tts.\n"
        "Desativação prevista do modelo: 2027-01-06.\n", encoding="utf-8")
    print("Validated presets (dry run)" if a.dry_run else f"Audio generated: {len(files)} individual files")
    return 0

if __name__ == "__main__":
    sys.exit(main())
