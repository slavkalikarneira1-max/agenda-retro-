"""Genera la música de fondo (caja musical suave) y dos efectos tiernos.

Todo se sintetiza aquí mismo con numpy, así que no hay problemas de licencia.
Salida:
  public/audio/musica.wav     40 s, canción de cuna alegre en Do mayor
  public/audio/sfx-bum.wav    "puf" suave y redondo para la escena 3
  public/audio/sfx-pio.wav    "pío, pío" del pajarito para la escena 5
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100
DURACION = 40.0
BPM = 100
BEAT = 60 / BPM
SALIDA = Path(__file__).resolve().parent.parent / "public" / "audio"


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


NOTAS = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def nota(nombre):
    """'E4' -> número MIDI."""
    return 12 * (int(nombre[-1]) + 1) + NOTAS[nombre[0]]


def caja_musical(f, dur):
    t = np.arange(int(SR * dur)) / SR
    env = np.exp(-t * 3.2) * np.minimum(1, t / 0.004)
    tono = (np.sin(2 * np.pi * f * t)
            + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6)
            + 0.08 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 9))
    return tono * env


def colchon(fs, dur):
    """Acorde suave tipo 'pad' con ataque y caída lentos."""
    t = np.arange(int(SR * dur)) / SR
    env = np.minimum(1, t / 0.35) * np.minimum(1, (dur - t) / 0.5)
    s = sum(np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t) for f in fs)
    return s * env / len(fs)


def bajo(f, dur):
    t = np.arange(int(SR * dur)) / SR
    env = np.exp(-t * 2.5) * np.minimum(1, t / 0.01)
    return np.sin(2 * np.pi * f * t) * env


def mezclar(pista, señal, inicio):
    i = int(inicio * SR)
    fin = min(len(pista), i + len(señal))
    if fin > i:
        pista[i:fin] += señal[: fin - i]


def guardar(nombre, mono_o_estereo):
    datos = mono_o_estereo
    if datos.ndim == 1:
        datos = np.stack([datos, datos], axis=1)
    datos = datos / (np.abs(datos).max() + 1e-9) * 0.7  # pico a -3 dBFS
    pcm = (datos * 32767).astype("<i2")
    with wave.open(str(SALIDA / nombre), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print("Escrito", SALIDA / nombre)


def musica():
    n = int(SR * DURACION)
    izq = np.zeros(n)
    der = np.zeros(n)

    acordes = [("C3", "E3", "G3"), ("A2", "C3", "E3"), ("F2", "A2", "C3"), ("G2", "B2", "D3")]
    melodia = [
        # Frase A
        ("E4", 1), ("G4", 1), ("C5", 1), ("G4", 1),
        ("A4", 1), ("C5", 1), ("E5", 2),
        ("F4", 1), ("A4", 1), ("C5", 1), ("A4", 1),
        ("G4", 1), ("B4", 1), ("D5", 2),
        # Frase B
        ("E5", 1), ("D5", 1), ("C5", 1), ("G4", 1),
        ("A4", 1), ("B4", 1), ("C5", 2),
        ("A4", 1), ("G4", 1), ("F4", 1), ("A4", 1),
        ("G4", 3), (None, 1),
    ]

    compases = 16
    for c in range(compases):
        inicio = c * 4 * BEAT
        tonos = [midi(nota(x)) for x in acordes[c % 4]]
        p = colchon([f * 2 for f in tonos], 4 * BEAT + 0.3) * 0.18
        mezclar(izq, p, inicio)
        mezclar(der, p, inicio)
        for b in (0, 2):
            mezclar(izq, bajo(tonos[0], 2 * BEAT) * 0.28, inicio + b * BEAT)
            mezclar(der, bajo(tonos[0], 2 * BEAT) * 0.28, inicio + b * BEAT)

    t = 0.0
    for vuelta in range(2):
        for nombre, beats in melodia:
            if nombre:
                f = midi(nota(nombre))
                s = caja_musical(f, beats * BEAT + 1.2) * 0.5
                mezclar(izq, s, t)
                mezclar(der, s * 0.85, t + 0.012)  # un poquito de amplitud estéreo
                if vuelta == 1:  # segunda vuelta: armonía una octava abajo, muy suave
                    s2 = caja_musical(f / 2, beats * BEAT + 1.0) * 0.18
                    mezclar(izq, s2 * 0.8, t)
                    mezclar(der, s2, t)
            t += beats * BEAT

    # Final: acorde de Do que se apaga despacito
    fin = 16 * 4 * BEAT
    for x in ("C4", "E4", "G4", "C5"):
        s = caja_musical(midi(nota(x)), DURACION - fin) * 0.3
        mezclar(izq, s, fin)
        mezclar(der, s, fin + 0.01)
    p = colchon([midi(nota(x)) for x in ("C4", "E4", "G4")], DURACION - fin) * 0.18
    mezclar(izq, p, fin)
    mezclar(der, p, fin)

    estereo = np.stack([izq, der], axis=1)
    # Eco suave para que suene "de cuento"
    eco = int(0.24 * SR)
    estereo[eco:] += 0.22 * estereo[:-eco]
    tt = np.arange(n) / SR
    fade = np.minimum(1, tt / 1.0) * np.clip((DURACION - tt) / 2.5, 0, 1)
    estereo *= fade[:, None]
    guardar("musica.wav", estereo)


def sfx_bum():
    dur = 1.2
    t = np.arange(int(SR * dur)) / SR
    f = 140 * np.exp(-t * 2.2) + 55  # tono que baja, redondo, sin estruendo
    fase = 2 * np.pi * np.cumsum(f) / SR
    golpe = np.sin(fase) * np.exp(-t * 4) * np.minimum(1, t / 0.02)
    ruido = np.random.default_rng(4).standard_normal(len(t))
    # ruido suavizado = "puf" de polvo
    k = 220
    ruido = np.convolve(ruido, np.ones(k) / k, mode="same") * np.exp(-t * 3) * 3
    guardar("sfx-bum.wav", golpe + 0.5 * ruido)


def sfx_pio():
    out = np.zeros(int(SR * 1.0))
    for inicio in (0.0, 0.32):
        dur = 0.18
        t = np.arange(int(SR * dur)) / SR
        f = 2600 + 1400 * np.sin(np.pi * t / dur)
        fase = 2 * np.pi * np.cumsum(f) / SR
        s = np.sin(fase) * np.sin(np.pi * t / dur) ** 2
        mezclar(out, s, inicio)
    guardar("sfx-pio.wav", out)


if __name__ == "__main__":
    SALIDA.mkdir(parents=True, exist_ok=True)
    musica()
    sfx_bum()
    sfx_pio()
