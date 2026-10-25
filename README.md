# Dictario — Agenda multifuncional por voz

> *Dictar + diario.* Nombre provisional; ver [ideas de nombre](#nombre).

Aplicación móvil para guardar notas y recordatorios **hablando**. Lo dictado se
archiva solo en la **ficha** (categoría) que el usuario mencionó, y si la nota
habla de una fecha o de “la próxima clase”, la app propone un recordatorio.
Pensada para docentes, útil para cualquiera (clientes, proyectos, materias…).

> “En 701 trabajé números racionales, hacer examen la próxima clase”
> → se archiva en la ficha **701** y propone un recordatorio para el
> **lunes 08:00**, la próxima clase de 701 según su horario.

## Qué incluye este MVP

| Función de la idea | Estado |
|---|---|
| 1. Configuración inicial de categorías (con ejemplos: docente, clientes, materias) | ✅ |
| Editar, agregar, eliminar fichas en cualquier momento; alias (“séptimo uno”) | ✅ |
| 2. Dictado con clasificación automática | ✅ entiende “701”, “setecientos uno”, “siete cero uno”, “7-01” |
| 3. Escritura manual eligiendo la ficha | ✅ |
| 4. Recordatorios inteligentes: mañana, pasado mañana, el martes, 15 de noviembre, 20/11, en 3 días, a las 3 y media, de la tarde… | ✅ |
| “La próxima clase” usando el horario de cada grupo | ✅ |
| Notificaciones | ✅ web (app abierta o en segundo plano) · nativas preparadas (ver abajo) |
| 5. Microagenda: hoja de almanaque + tira de 7 días con recordatorios | ✅ |
| Estética retro: khaki, crema, oliva, terracota; Special Elite / Courier Prime | ✅ |
| Fichas como tarjetas de archivo; texto que aparece letra por letra; micrófono de radio antiguo | ✅ |
| Funciona sin conexión; copia de seguridad (exportar/importar) | ✅ |

Todo se guarda **solo en el teléfono** (sin cuentas ni servidor), lo que simplifica la
privacidad y la publicación.

## Probarla

Requiere Node 18+ (sin dependencias).

```bash
npm start      # http://localhost:5173
npm test       # pruebas de clasificación y fechas
```

El dictado usa la Web Speech API: funciona en **Chrome para Android** y en Chrome de
escritorio. Para probar en el celular, publica la carpeta en cualquier hosting con HTTPS
(GitHub Pages, Netlify, Vercel) y ábrela en Chrome → menú → *Instalar app*.

## Estructura

```
index.html            página única
css/styles.css        estilo retro (tokens de color al inicio)
js/app.js             pantallas: bienvenida, inicio, ficha, editor de nota, ajustes
js/classifier.js      detecta la ficha mencionada en el texto
js/dates.js           detecta fechas/horas y calcula “la próxima clase”
js/text.js            normalización y números dictados en palabras → dígitos
js/speech.js          dictado (Web Speech API o plugin nativo de Capacitor)
js/notifier.js        notificaciones (web o LocalNotifications nativas)
js/typewriter.js      efecto máquina de escribir
js/store.js           guardado local
sw.js                 modo sin conexión y apertura desde notificaciones
tests/                pruebas con node:test
```

## Publicar en Play Store

Hay dos caminos; el código ya está preparado para ambos.

**A. TWA (Trusted Web Activity) — el más rápido.** Empaqueta la web como app Android que
corre en Chrome, así que el dictado funciona tal cual.

1. Publica la carpeta en un dominio con HTTPS.
2. `npx @bubblewrap/cli init --manifest https://TU-DOMINIO/manifest.webmanifest`
3. `npx @bubblewrap/cli build` → genera el `.aab` para subir a Play Console.
4. Sube `/.well-known/assetlinks.json` (Bubblewrap te lo da) a tu dominio.

Limitación: las notificaciones web no pueden programarse con la app cerrada; llegan
al abrirla o mientras sigue en segundo plano.

**B. Capacitor — app nativa, recordatorios aunque la app esté cerrada.**

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android \
      @capacitor/local-notifications @capacitor-community/speech-recognition
mkdir -p www && cp -r index.html manifest.webmanifest sw.js css js icons www/
npx cap init Dictario com.tunombre.dictario --web-dir www
npx cap add android && npx cap sync && npx cap open android
```

`js/speech.js` y `js/notifier.js` detectan los plugins automáticamente y los usan en
lugar de las APIs web. (Esta integración nativa está escrita pero aún no se probó en un
dispositivo.) Recomendación: empezar con A para validar con docentes y pasar a B antes
del lanzamiento público.

## Próximos pasos

1. **Probar con 5–10 docentes** durante dos semanas: ¿qué frases no entiende? (agregarlas
   a `tests/logic.test.js` y luego al detector).
2. Recordatorio *antes* de la clase (p. ej., 10 min) configurable.
3. Buscar en las notas; filtrar por fecha.
4. Respaldo opcional en Google Drive.
5. Clasificación con IA para notas que no nombran la ficha (“los de séptimo uno”, “el
   grupo de la tarde”) — hoy se resuelve con alias.
6. Ficha de Play Store: capturas, política de privacidad (sencilla: nada sale del teléfono).

## Nombre

Ideas: **Dictario**, Fichero Parlante, Libreta de Voz, Almanaque, La Libreta, Tecleo.
Antes de decidir, conviene buscar el nombre en Play Store y en el registro de marcas.
