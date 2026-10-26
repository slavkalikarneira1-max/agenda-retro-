"""Genera la narración con edge-tts (voz es-CO-SalomeNeural) y la sincroniza.

Cada frase se guarda en public/audio/escena-N.mp3 y su duración se escribe en
src/narracion.json, que el video usa para colocar la voz al inicio de su escena
y bajar la música mientras se habla.

La voz va un poco más lenta (rate -12 %) y algo más aguda (alegre). Si una frase
no cabe en sus 8 segundos, se acelera de a poquito (nunca más rápido que lo
normal); si aun así se alarga, la frase siguiente espera a que termine.

Uso:  pip install edge-tts && python3 scripts/generar_voz.py
"""
import asyncio
import json
import re
import os
import subprocess
from pathlib import Path

import edge_tts

RAIZ = Path(__file__).resolve().parent.parent
AUDIO = RAIZ / "public" / "audio"
VOZ = "es-CO-SalomeNeural"
TONO = "+6Hz"
RATE_INICIAL = -12
RATE_MAXIMO = 0          # nunca más rápida que la velocidad normal
SEGUNDOS_ESCENA = 8.0
INICIO_VOZ = 0.3         # la voz entra 0.3 s después de empezar la escena
MARGEN_FINAL = 0.25
PAUSA_ENTRE_FRASES = 0.3

FRASES = [
    "Hace muchísimo tiempo, la Tierra estaba llena de dinosaurios. "
    "¡Grandes, pequeños, con cuello largo y con colas gigantes!",
    "Un día, una roca enorme del espacio, llamada asteroide, viajó por el cielo…",
    "¡Y bum! Cayó en la Tierra. Se levantó mucho polvo y el sol se escondió.",
    "Hizo frío, no había comida, y los grandes dinosaurios desaparecieron.",
    "Pero algunos dinosaurios pequeñitos siguieron aquí… "
    "¡y hoy son los pajaritos! ¡Pío, pío!",
]


def fin_de_voz(ruta):
    """Segundo en que termina de hablar (sin contar el silencio final del mp3)."""
    total = float(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", str(ruta),
    ]))
    log = subprocess.run(
        ["ffmpeg", "-i", str(ruta), "-af", "silencedetect=noise=-40dB:d=0.25", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    inicios = re.findall(r"silence_start: ([0-9.]+)", log)
    finales = re.findall(r"silence_end: ([0-9.]+)", log)
    if inicios and finales and abs(float(finales[-1]) - total) < 0.05:
        return float(inicios[-1])
    return total


async def sintetizar(texto, ruta, rate):
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    com = edge_tts.Communicate(texto, VOZ, rate=f"{rate:+d}%", pitch=TONO, proxy=proxy)
    await com.save(str(ruta))


async def main():
    AUDIO.mkdir(parents=True, exist_ok=True)
    escenas = []
    fin_anterior = 0.0
    for i, texto in enumerate(FRASES, start=1):
        ruta = AUDIO / f"escena-{i}.mp3"
        inicio_escena = (i - 1) * SEGUNDOS_ESCENA
        fin_escena = i * SEGUNDOS_ESCENA
        # Si la frase anterior se alargó, esta espera a que termine para no pisarla.
        inicio = max(inicio_escena + INICIO_VOZ, fin_anterior + PAUSA_ENTRE_FRASES)
        limite = fin_escena - MARGEN_FINAL - inicio
        rate = RATE_INICIAL
        while True:
            await sintetizar(texto, ruta, rate)
            seg = fin_de_voz(ruta)
            if seg <= limite or rate >= RATE_MAXIMO:
                break
            rate += 3
        aviso = "" if seg <= limite else "  (se alarga; la siguiente frase espera a que termine)"
        print(f"Escena {i}: habla de {inicio:.2f} s a {inicio + seg:.2f} s, rate {rate:+d}%{aviso}")
        escenas.append({
            "archivo": f"audio/escena-{i}.mp3",
            "inicio": round(inicio, 3),
            "segundos": round(seg, 3),
            "texto": texto,
        })
        fin_anterior = inicio + seg
    if fin_anterior > len(FRASES) * SEGUNDOS_ESCENA:
        raise SystemExit("La narración no cabe en el video")
    (RAIZ / "src" / "narracion.json").write_text(
        json.dumps({"voz": VOZ, "escenas": escenas}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("Sincronización escrita en src/narracion.json")


if __name__ == "__main__":
    asyncio.run(main())
