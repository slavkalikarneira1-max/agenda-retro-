"""Genera la narración con edge-tts (voz es-CO-SalomeNeural) y la sincroniza.

Cada frase se guarda en public/audio/escena-N.mp3 y su duración se escribe en
src/narracion.json, que el video usa para colocar la voz al inicio de su escena
y bajar la música mientras se habla.

La voz va un poco más lenta (rate -12 %) y algo más aguda (alegre). Si una frase
no cabe en sus 8 segundos, se acelera de a poquito hasta que quepa.

Uso:  pip install edge-tts && python3 scripts/generar_voz.py
"""
import asyncio
import json
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

FRASES = [
    "Hace muchísimo tiempo, la Tierra estaba llena de dinosaurios. "
    "¡Grandes, pequeños, con cuello largo y con colas gigantes!",
    "Un día, una roca enorme del espacio, llamada asteroide, viajó por el cielo…",
    "¡Y bum! Cayó en la Tierra. Se levantó mucho polvo y el sol se escondió.",
    "Hizo frío, no había comida, y los grandes dinosaurios desaparecieron.",
    "Pero algunos dinosaurios pequeñitos siguieron aquí… "
    "¡y hoy son los pajaritos! ¡Pío, pío!",
]


def duracion(ruta):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", str(ruta),
    ])
    return float(out)


async def sintetizar(texto, ruta, rate):
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    com = edge_tts.Communicate(texto, VOZ, rate=f"{rate:+d}%", pitch=TONO, proxy=proxy)
    await com.save(str(ruta))


async def main():
    AUDIO.mkdir(parents=True, exist_ok=True)
    limite = SEGUNDOS_ESCENA - INICIO_VOZ - MARGEN_FINAL
    escenas = []
    for i, texto in enumerate(FRASES, start=1):
        ruta = AUDIO / f"escena-{i}.mp3"
        rate = RATE_INICIAL
        while True:
            await sintetizar(texto, ruta, rate)
            seg = duracion(ruta)
            if seg <= limite or rate >= RATE_MAXIMO:
                break
            rate += 3
        aviso = "" if seg <= limite else "  (¡ojo! un poquito más larga que la escena)"
        print(f"Escena {i}: {seg:.2f} s con rate {rate:+d}%{aviso}")
        escenas.append({
            "archivo": f"audio/escena-{i}.mp3",
            "inicio": (i - 1) * SEGUNDOS_ESCENA + INICIO_VOZ,
            "segundos": round(seg, 3),
            "texto": texto,
        })
    (RAIZ / "src" / "narracion.json").write_text(
        json.dumps({"voz": VOZ, "escenas": escenas}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("Sincronización escrita en src/narracion.json")


if __name__ == "__main__":
    asyncio.run(main())
