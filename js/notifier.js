// Notificaciones de recordatorios.
// - App nativa (Capacitor): LocalNotifications, que avisa aunque la app esté cerrada.
// - Web/TWA: se revisan los recordatorios vencidos mientras la app está abierta o en segundo plano.

function native() {
  return globalThis.Capacitor?.Plugins?.LocalNotifications || null;
}

/** Id numérico estable a partir del id de texto (LocalNotifications exige enteros). */
export function numericId(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) || 1;
}

export function permissionState() {
  if (native()) return 'native';
  if (!('Notification' in globalThis)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestPermission() {
  const ln = native();
  if (ln) {
    const r = await ln.requestPermissions();
    return r.display === 'granted' ? 'granted' : 'denied';
  }
  if (!('Notification' in globalThis)) return 'unsupported';
  return Notification.requestPermission();
}

export async function schedule(reminder) {
  const ln = native();
  if (!ln) return;
  const at = new Date(reminder.at);
  if (at <= new Date()) return;
  await ln.schedule({
    notifications: [{
      id: numericId(reminder.id),
      title: reminder.categoryName ? `Ficha ${reminder.categoryName}` : 'Recordatorio',
      body: reminder.title,
      schedule: { at, allowWhileIdle: true },
    }],
  });
}

export async function cancel(reminder) {
  const ln = native();
  if (!ln) return;
  await ln.cancel({ notifications: [{ id: numericId(reminder.id) }] });
}

async function show(title, body, tag) {
  if (permissionState() !== 'granted') return false;
  const reg = await navigator.serviceWorker?.getRegistration?.();
  const opts = { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' };
  if (reg) await reg.showNotification(title, opts);
  else new Notification(title, opts);
  return true;
}

/**
 * Comprueba periódicamente los recordatorios vencidos (solo modo web).
 * @param {() => object} getState
 * @param {(reminder: object) => void} markNotified
 */
export function startWatcher(getState, markNotified, categoryName) {
  if (native()) return () => {};
  const tick = async () => {
    const now = Date.now();
    for (const r of getState().reminders) {
      if (r.done || r.notified || new Date(r.at).getTime() > now) continue;
      const ok = await show(`Ficha ${categoryName(r.categoryId) || ''}`.trim(), r.title, r.id);
      if (ok) markNotified(r);
    }
  };
  tick();
  const timer = setInterval(tick, 30 * 1000);
  return () => clearInterval(timer);
}
