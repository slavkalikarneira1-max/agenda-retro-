// Detección de fechas y horas en lenguaje natural (español) para proponer recordatorios.
import { canonical } from './text.js';

export const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
export const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTH_RE = '(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)';

export const DEFAULT_HOUR = 7;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function monthIndex(name) {
  return name === 'setiembre' ? 8 : MONTHS.indexOf(name);
}

/** Interpreta una hora: "a las 3", "a las 10:30 am", "a las 4 y media de la tarde", "al mediodía". */
export function parseTime(t) {
  const MER = '(a\\.?\\s?m\\.?|p\\.?\\s?m\\.?|de la manana|de la tarde|de la noche)';
  let h, min = 0, mer = null;
  let m = t.match(new RegExp(`\\b(?:a|para|desde) las? (\\d{1,2})(?:(?::|\\.|h)(\\d{2})| y (media|cuarto))?(?:\\s*${MER})?`));
  if (m) {
    h = +m[1];
    if (m[2]) min = +m[2];
    else if (m[3]) min = m[3] === 'media' ? 30 : 15;
    mer = m[4] || null;
  } else if ((m = t.match(new RegExp(`\\b(\\d{1,2}):(\\d{2})(?:\\s*${MER})?`)))) {
    h = +m[1];
    min = +m[2];
    mer = m[3] || null;
  } else if ((m = t.match(/\b(\d{1,2})\s?(a\.?\s?m\.?|p\.?\s?m\.?)(?=\s|$)/))) {
    h = +m[1];
    mer = m[2];
  } else if (/\b(al |a )?mediodia\b/.test(t)) {
    return { h: 12, m: 0 };
  } else {
    return null;
  }
  if (mer) {
    const pm = /^p|tarde|noche/.test(mer);
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  } else if (h >= 1 && h <= 6) {
    h += 12; // "a las 3" en contexto escolar/laboral suele ser de la tarde
  }
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

/**
 * Próxima sesión según un horario semanal [{day: 0-6, time: "HH:MM"}],
 * estrictamente posterior a `now`.
 */
export function nextClass(schedule, now = new Date()) {
  if (!schedule?.length) return null;
  for (let d = 0; d <= 7; d++) {
    const day = addDays(startOfDay(now), d);
    const slots = schedule
      .filter((s) => Number(s.day) === day.getDay() && /^\d{1,2}:\d{2}$/.test(s.time))
      .map((s) => {
        const [hh, mm] = s.time.split(':').map(Number);
        const x = new Date(day);
        x.setHours(hh, mm, 0, 0);
        return x;
      })
      .sort((a, b) => a - b);
    const hit = slots.find((x) => x > now);
    if (hit) return hit;
  }
  return null;
}

function nextWeekday(now, target) {
  let diff = (target - now.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  return addDays(startOfDay(now), diff);
}

function findDay(t, now) {
  let m;
  // Fecha explícita: "15 de noviembre", "3 de marzo de 2027"
  if ((m = t.match(new RegExp(`\\b(\\d{1,2}) de ${MONTH_RE}(?: de (\\d{4}))?`)))) {
    const day = +m[1];
    const month = monthIndex(m[2]);
    let year = m[3] ? +m[3] : now.getFullYear();
    let d = new Date(year, month, day);
    if (!m[3] && d < startOfDay(now)) d = new Date(year + 1, month, day);
    if (d.getDate() === day) return { day: d, matched: m[0] };
  }
  // "15/11" o "15/11/2026"
  if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    const day = +m[1];
    const month = +m[2] - 1;
    let year = m[3] ? +m[3] : now.getFullYear();
    if (year < 100) year += 2000;
    let d = new Date(year, month, day);
    if (!m[3] && d < startOfDay(now)) d = new Date(year + 1, month, day);
    if (month < 12 && d.getDate() === day) return { day: d, matched: m[0] };
  }
  if ((m = t.match(/\bpasado manana\b/))) return { day: addDays(startOfDay(now), 2), matched: m[0] };
  // "mañana" como día, no "de la mañana"
  if ((m = t.match(/(?<!\bla )\bmanana\b/))) return { day: addDays(startOfDay(now), 1), matched: m[0] };
  if ((m = t.match(/\b(?:dentro de|en) (\d{1,2}) (dias?|semanas?|mes(?:es)?)\b/))) {
    const n = +m[1];
    const base = startOfDay(now);
    if (m[2].startsWith('dia')) return { day: addDays(base, n), matched: m[0] };
    if (m[2].startsWith('semana')) return { day: addDays(base, 7 * n), matched: m[0] };
    const d = new Date(base);
    d.setMonth(d.getMonth() + n);
    return { day: d, matched: m[0] };
  }
  if ((m = t.match(new RegExp(`\\b(${WEEKDAYS.join('|')})\\b`)))) {
    return { day: nextWeekday(now, WEEKDAYS.indexOf(m[1])), matched: m[0] };
  }
  if ((m = t.match(/\b(?:la|para la) (?:proxima|otra) semana\b|\bla semana que viene\b/))) {
    return { day: addDays(startOfDay(now), 7), matched: m[0] };
  }
  if ((m = t.match(/\b(?:para el|el) (\d{1,2})\b(?! de)/))) {
    const day = +m[1];
    if (day >= 1 && day <= 31) {
      let d = new Date(now.getFullYear(), now.getMonth(), day);
      if (d < startOfDay(now)) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
      if (d.getDate() === day) return { day: d, matched: m[0] };
    }
  }
  if ((m = t.match(/\bhoy\b|\besta (?:tarde|noche)\b/))) return { day: startOfDay(now), matched: m[0], today: true };
  return null;
}

/**
 * Busca en el texto una referencia temporal y propone el momento del recordatorio.
 * @param {string} text
 * @param {{now?: Date, schedule?: Array<{day:number,time:string}>}} opts
 * @returns {null | {at: Date|null, kind: 'proxima-clase'|'fecha', matched: string, needsSchedule?: boolean}}
 */
export function detectReminder(text, { now = new Date(), schedule = [] } = {}) {
  const t = canonical(text);
  if (!t) return null;

  const pc = t.match(/\b(?:la )?(?:proxima|siguiente|otra) (?:clase|sesion|reunion|visita|cita)\b/);
  if (pc) {
    const at = nextClass(schedule, now);
    return at
      ? { at, kind: 'proxima-clase', matched: pc[0] }
      : { at: null, kind: 'proxima-clase', matched: pc[0], needsSchedule: true };
  }

  const time = parseTime(t);
  const found = findDay(t, now);
  if (!found && !time) return null;

  let at;
  if (found) {
    at = new Date(found.day);
    if (time) at.setHours(time.h, time.m, 0, 0);
    else if (found.today) at = roundUp(new Date(now.getTime() + 60 * 60 * 1000));
    else at.setHours(DEFAULT_HOUR, 0, 0, 0);
  } else {
    at = startOfDay(now);
    at.setHours(time.h, time.m, 0, 0);
    if (at <= now) at = addDays(at, 1);
  }
  return { at, kind: 'fecha', matched: found?.matched ?? 'hora' };
}

function roundUp(d) {
  const x = new Date(d);
  x.setSeconds(0, 0);
  const extra = (15 - (x.getMinutes() % 15)) % 15;
  x.setMinutes(x.getMinutes() + extra);
  return x;
}

const fmtWhen = new Intl.DateTimeFormat('es', {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
});
const fmtTime = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false });

export function formatWhen(d) {
  return fmtWhen.format(new Date(d));
}

export function formatTime(d) {
  return fmtTime.format(new Date(d));
}

export function sameDay(a, b) {
  a = new Date(a);
  b = new Date(b);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Valor para <input type="datetime-local"> en hora local. */
export function toLocalInput(d) {
  const x = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
}

export { startOfDay, addDays };
