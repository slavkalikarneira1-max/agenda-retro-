// Dictado por voz. Usa el plugin nativo de Capacitor si existe; si no, la Web Speech API
// (disponible en Chrome para Android, y por tanto en una app TWA de Play Store).

function speechLang() {
  const lang = navigator.language || 'es-ES';
  return lang.toLowerCase().startsWith('es') ? lang : 'es-ES';
}

function nativePlugin() {
  return globalThis.Capacitor?.Plugins?.SpeechRecognition || null;
}

export function speechSupported() {
  return Boolean(nativePlugin() || globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition);
}

/**
 * @param {{onText: (text: string) => void, onEnd: () => void, onError: (msg: string) => void}} handlers
 * @returns {{start: () => void, stop: () => void}}
 */
export function createRecognizer(handlers) {
  return nativePlugin() ? nativeRecognizer(handlers) : webRecognizer(handlers);
}

function webRecognizer({ onText, onEnd, onError }) {
  const SR = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  let committed = '';
  let stopped = false;
  let rec = null;

  // Se usa continuous=false y se reinicia al terminar cada frase: en Android el modo
  // continuo devuelve resultados duplicados.
  function begin() {
    rec = new SR();
    rec.lang = speechLang();
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0].transcript.trim();
        if (e.results[i].isFinal) committed = join(committed, piece);
        else interim = join(interim, piece);
      }
      onText(join(committed, interim));
    };
    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      stopped = true;
      onError(
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Sin permiso para usar el micrófono.'
          : 'El dictado se interrumpió (' + e.error + ').'
      );
    };
    rec.onend = () => {
      if (stopped) {
        onEnd();
      } else {
        try { begin(); } catch { stopped = true; onEnd(); }
      }
    };
    rec.start();
  }

  return {
    start() {
      stopped = false;
      committed = '';
      try {
        begin();
      } catch (e) {
        onError('No se pudo iniciar el dictado.');
      }
    },
    stop() {
      stopped = true;
      try { rec?.stop(); } catch { onEnd(); }
    },
  };
}

function nativeRecognizer({ onText, onEnd, onError }) {
  const SR = nativePlugin();
  let committed = '';
  let last = '';
  let stopped = false;

  async function begin() {
    last = '';
    await SR.start({ language: speechLang(), partialResults: true, popup: false });
  }

  return {
    async start() {
      stopped = false;
      committed = '';
      try {
        const perm = await SR.requestPermissions?.();
        if (perm && perm.speechRecognition && perm.speechRecognition !== 'granted') {
          onError('Sin permiso para usar el micrófono.');
          return;
        }
        await SR.addListener('partialResults', (data) => {
          last = data?.matches?.[0] || '';
          onText(join(committed, last));
        });
        await SR.addListener('listeningState', async (s) => {
          if (s?.status !== 'stopped') return;
          committed = join(committed, last);
          if (stopped) {
            onText(committed);
            await SR.removeAllListeners?.();
            onEnd();
          } else {
            begin().catch(() => onEnd());
          }
        });
        await begin();
      } catch (e) {
        onError('No se pudo iniciar el dictado.');
      }
    },
    async stop() {
      stopped = true;
      try { await SR.stop(); } catch { onEnd(); }
    },
  };
}

function join(a, b) {
  return [a, b].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}
