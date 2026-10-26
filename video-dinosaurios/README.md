# ¿Adiós, dinosaurios? — video infantil para Reels

Video animado de 40 s en formato vertical 1080×1920 (9:16) hecho con Remotion,
para niños de 4 años: estilo caricatura, colores pastel y personajes sonrientes.

| Escena | Tiempo | Qué pasa |
|---|---|---|
| 1 | 0–8 s | Dinosaurios jugando en la selva (título) |
| 2 | 8–16 s | El asteroide cruza el cielo como estrella fugaz |
| 3 | 16–24 s | "¡Bum!" suave, nubes de polvo, el sol se esconde |
| 4 | 24–32 s | Frío, plantas marchitas, los dinos se duermen y se desvanecen |
| 5 | 32–40 s | Un pajarito feliz: ¡los pájaros son dinosaurios! |

Los textos van en la zona segura de Reels (x 150–930, lejos de los botones de
arriba, de abajo y de la columna derecha).

## Cómo generar el video completo

```bash
pip install edge-tts numpy
npm install
npm run todo        # voz + música + render → out/adios-dinosaurios.mp4
```

Por pasos:

- `npm run voz`: narración con edge-tts (`es-CO-SalomeNeural`, más lenta y
  alegre). Escribe `public/audio/escena-N.mp3` y `src/narracion.json`, que coloca
  cada frase al inicio de su escena y baja la música mientras habla la voz.
- `npm run musica`: música de caja musical y efectos, sintetizados con numpy (sin licencias).
- `npm run render`: exporta el MP4 (H.264 + AAC, yuv420p, 30 fps), listo para Instagram.
- `npm run studio`: abre la vista previa interactiva de Remotion.

Si Remotion no encuentra Chrome, indica uno con `REMOTION_CHROME=/ruta/al/chrome`.
