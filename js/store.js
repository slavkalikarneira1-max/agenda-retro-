// Persistencia local (el MVP no usa servidor: todo queda en el teléfono).

const KEY = 'dictario:v1';
const COLORS = ['khaki', 'oliva', 'terracota', 'crema'];

export function emptyState() {
  return {
    version: 1,
    categories: [],
    notes: [],
    reminders: [],
    settings: { onboarded: false, scheduleHintDismissed: false },
  };
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function load(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return emptyState();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function save(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('No se pudo guardar', e);
  }
}

export function migrate(data) {
  const base = emptyState();
  return {
    ...base,
    ...data,
    settings: { ...base.settings, ...(data?.settings || {}) },
    categories: Array.isArray(data?.categories) ? data.categories : [],
    notes: Array.isArray(data?.notes) ? data.notes : [],
    reminders: Array.isArray(data?.reminders) ? data.reminders : [],
  };
}

export function makeCategory(name, index = 0) {
  return {
    id: uid(),
    name: name.trim(),
    aliases: [],
    color: COLORS[index % COLORS.length],
    schedule: [],
  };
}
