import soundfile as sf, sys
from kokoro_onnx import Kokoro
k = Kokoro("kokoro.onnx", "voices.bin")
lines = [
 "Jean Day.",
 "Seis de noviembre.",
 "Entrada: tres mil.",
 "Con la cancelación de tu aporte, participarás en la rifa de una pizza... y más.",
 "¡Cuatro oportunidades de ganar!",
 "Jean Day. Seis de noviembre. Ponte tu mejor jean.",
]
for i,t in enumerate(lines):
    a, sr = k.create(t, voice="em_alex", speed=0.9, lang="es")
    sf.write(f"v{i}.wav", a, sr); print(i, len(a)/sr)
