import { classify } from './classifier.js';
import { originalSnippet } from './text.js';
import {
  detectReminder, nextClass, formatWhen, formatTime, sameDay, toLocalInput,
  startOfDay, addDays, WEEKDAY_LABELS,
} from './dates.js';
import * as store from './store.js';
import { createRecognizer, speechSupported } from './speech.js';
import * as notifier from './notifier.js';
import { Typewriter } from './typewriter.js';

let state = store.load();
const ui = { selectedDay: startOfDay(new Date()), draftCategories: [] };

const app = document.getElementById('app');
const modalRoot = document.getElementById('modal-root');

const MIC_SVG = `
<svg viewBox="0 0 64 96" aria-hidden="true" class="mic-svg">
  <defs>
    <linearGradient id="chrome" x1="0" x2="1">
      <stop offset="0" stop-color="#8d8467"/><stop offset=".35" stop-color="#efe6c9"/>
      <stop offset=".6" stop-color="#b9ae8a"/><stop offset="1" stop-color="#6e6648"/>
    </linearGradient>
  </defs>
  <rect x="14" y="4" width="36" height="56" rx="18" fill="url(#chrome)" stroke="#3A3326" stroke-width="2"/>
  <g stroke="#3A3326" stroke-width="1.4" opacity=".55">
    <line x1="18" y1="14" x2="46" y2="14"/><line x1="16" y1="19" x2="48" y2="19"/>
    <line x1="15" y1="24" x2="49" y2="24"/><line x1="15" y1="40" x2="49" y2="40"/>
    <line x1="15" y1="45" x2="49" y2="45"/><line x1="16" y1="50" x2="48" y2="50"/>
  </g>
  <rect x="13" y="29" width="38" height="6" rx="2" fill="#B5603F" stroke="#3A3326" stroke-width="1.5"/>
  <path d="M8 34 v6 a24 24 0 0 0 48 0 v-6" fill="none" stroke="#3A3326" stroke-width="3" stroke-linecap="round"/>
  <line x1="32" y1="64" x2="32" y2="82" stroke="#3A3326" stroke-width="4"/>
  <rect x="18" y="82" width="28" height="8" rx="3" fill="#4E5232" stroke="#3A3326" stroke-width="1.5"/>
</svg>`;

/* ---------- utilidades ---------- */

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function persist() {
  store.save(state);
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 3200);
}

const cat = (id) => state.categories.find((c) => c.id === id);
const catName = (id) => cat(id)?.name ?? '';

function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [view, id] = h.split('/');
  return { view: view || 'inicio', id };
}

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------- render principal ---------- */

function render() {
  closeModal();
  if (!state.settings.onboarded) return renderOnboarding();
  const r = route();
  if (r.view === 'ficha' && cat(r.id)) return renderCategory(cat(r.id));
  if (r.view === 'ajustes') return renderSettings();
  return renderHome();
}

/* ---------- bienvenida ---------- */

function renderOnboarding() {
  const chips = ui.draftCategories
    .map((n, i) => `<span class="chip">${esc(n)}<button data-rm="${i}" aria-label="Quitar ${esc(n)}">×</button></span>`)
    .join('');
  app.innerHTML = `
    <section class="onboard paper">
      <p class="eyebrow">Bienvenida</p>
      <h1 class="brand">Dictario</h1>
      <p class="lead">Dicta tus notas en voz alta y se archivan solas en su ficha.</p>
      <ol class="steps">
        <li>Crea tus <strong>fichas</strong>: cursos, clientes, proyectos, materias…</li>
        <li>Toca el micrófono y habla: <em>“En 701 trabajé números racionales, hacer examen la próxima clase”.</em></li>
        <li>La nota va a la ficha <strong>701</strong> y te propongo un recordatorio.</li>
      </ol>
      <form id="addForm" class="row">
        <label class="sr" for="newCat">Nombre de la ficha</label>
        <input id="newCat" placeholder="Ej.: 701 (puedes separar con comas)" autocomplete="off">
        <button class="btn" type="submit">Agregar</button>
      </form>
      <div class="chips">${chips || '<span class="muted">Aún no hay fichas.</span>'}</div>
      <p class="examples">Ejemplos:
        <button class="link" data-ex="701, 702, 801, 802">Docente</button> ·
        <button class="link" data-ex="Cliente Pérez, Cliente Gómez, Proveedores">Clientes</button> ·
        <button class="link" data-ex="Matemáticas, Historia, Inglés">Materias</button>
      </p>
      <button id="start" class="btn btn-primary btn-block" ${ui.draftCategories.length ? '' : 'disabled'}>Empezar</button>
    </section>`;

  const input = app.querySelector('#newCat');
  const add = (text) => {
    for (const name of text.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!ui.draftCategories.some((n) => n.toLowerCase() === name.toLowerCase())) ui.draftCategories.push(name);
    }
    renderOnboarding();
    app.querySelector('#newCat').focus();
  };
  app.querySelector('#addForm').onsubmit = (e) => { e.preventDefault(); add(input.value); };
  app.querySelectorAll('[data-ex]').forEach((b) => (b.onclick = () => add(b.dataset.ex)));
  app.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => {
    ui.draftCategories.splice(+b.dataset.rm, 1);
    renderOnboarding();
  }));
  app.querySelector('#start').onclick = () => {
    if (input.value.trim()) add(input.value);
    state.categories = ui.draftCategories.map((n, i) => store.makeCategory(n, i));
    state.settings.onboarded = true;
    persist();
    go('#/');
  };
}

/* ---------- inicio ---------- */

function almanacHTML(now) {
  const month = capitalize(now.toLocaleDateString('es', { month: 'long' }));
  const weekday = capitalize(now.toLocaleDateString('es', { weekday: 'long' }));
  const start = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.round((startOfDay(now) - start) / 86400000) + 1;
  return `
    <div class="almanac" aria-label="Hoy es ${esc(weekday)} ${now.getDate()} de ${esc(month)}">
      <div class="almanac-rings"><span></span><span></span></div>
      <div class="almanac-month">${esc(month)} · ${now.getFullYear()}</div>
      <div class="almanac-day">${now.getDate()}</div>
      <div class="almanac-weekday">${esc(weekday)}</div>
      <div class="almanac-foot">Día ${dayOfYear} del año</div>
    </div>`;
}

function remindersOn(day) {
  return state.reminders
    .filter((r) => sameDay(r.at, day))
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}

function reminderItem(r, { inCategory = false } = {}) {
  const c = inCategory ? null : cat(r.categoryId);
  return `
    <li class="rem ${r.done ? 'done' : ''}">
      <label class="check"><input type="checkbox" data-done="${r.id}" ${r.done ? 'checked' : ''}><span></span></label>
      <span class="rem-time">${inCategory ? esc(formatWhen(r.at)) : formatTime(r.at)}</span>
      <span class="rem-body">
        ${c ? `<a class="tag tag-${c.color}" href="#/ficha/${c.id}">${esc(c.name)}</a>` : ''}
        ${esc(r.title)}
      </span>
      <button class="icon-btn small" data-delrem="${r.id}" aria-label="Borrar recordatorio">×</button>
    </li>`;
}

function renderHome() {
  const now = new Date();
  const today = startOfDay(now);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const overdue = state.reminders
    .filter((r) => !r.done && new Date(r.at) < today)
    .sort((a, b) => new Date(a.at) - new Date(b.at));
  const dayList = remindersOn(ui.selectedDay);
  const weekCount = state.reminders.filter((r) => !r.done && new Date(r.at) >= today && new Date(r.at) < addDays(today, 7)).length;
  const noSchedule = !state.categories.some((c) => c.schedule?.length);

  app.innerHTML = `
    <header class="topbar">
      <h1 class="brand small">Dictario</h1>
      <a class="icon-btn" href="#/ajustes" aria-label="Ajustes">⚙</a>
    </header>

    <section class="agenda">
      ${almanacHTML(now)}
      <div class="week paper">
        <div class="week-head">
          <h2>Microagenda</h2>
          <span class="muted">${weekCount} pendiente${weekCount === 1 ? '' : 's'} esta semana</span>
        </div>
        <div class="week-strip" role="tablist">
          ${days.map((d) => {
            const n = remindersOn(d).filter((r) => !r.done).length;
            const sel = sameDay(d, ui.selectedDay);
            return `<button role="tab" aria-selected="${sel}" class="wday ${sel ? 'sel' : ''} ${sameDay(d, today) ? 'today' : ''}" data-day="${d.getTime()}">
              <span class="wd">${WEEKDAY_LABELS[d.getDay()].slice(0, 3)}</span>
              <span class="dn">${d.getDate()}</span>
              <span class="dots">${'•'.repeat(Math.min(n, 3))}</span>
            </button>`;
          }).join('')}
        </div>
        ${overdue.length ? `<h3 class="list-title alert">Atrasados</h3><ul class="rems">${overdue.map((r) => reminderItem(r)).join('')}</ul>` : ''}
        <h3 class="list-title">${sameDay(ui.selectedDay, today) ? 'Hoy' : capitalize(ui.selectedDay.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>
        ${dayList.length ? `<ul class="rems">${dayList.map((r) => reminderItem(r)).join('')}</ul>` : '<p class="muted empty">Sin recordatorios.</p>'}
      </div>
    </section>

    ${noSchedule && !state.settings.scheduleHintDismissed ? `
      <aside class="hint paper">
        <p>¿Quieres que entienda <em>“la próxima clase”</em>? Carga el horario de cada ficha.</p>
        <div class="row"><a class="btn" href="#/ajustes">Cargar horario</a><button class="link" id="dismissHint">Ahora no</button></div>
      </aside>` : ''}

    <section class="fichero">
      <h2>Fichero</h2>
      <div class="cards">
        ${state.categories.map((c) => {
          const notes = state.notes.filter((n) => n.categoryId === c.id);
          const last = notes.sort((a, b) => b.createdAt - a.createdAt)[0];
          return `<a class="ficha ficha-${c.color}" href="#/ficha/${c.id}">
            <span class="ficha-tab">${esc(c.name)}</span>
            <span class="ficha-body">
              <span class="ficha-count">${notes.length} nota${notes.length === 1 ? '' : 's'}</span>
              <span class="ficha-last">${last ? esc(last.text.slice(0, 70)) : '—'}</span>
            </span>
          </a>`;
        }).join('')}
      </div>
    </section>

    ${dockHTML()}`;

  bindReminderActions();
  bindDock();
  app.querySelectorAll('[data-day]').forEach((b) => (b.onclick = () => {
    ui.selectedDay = new Date(+b.dataset.day);
    renderHome();
  }));
  const dh = app.querySelector('#dismissHint');
  if (dh) dh.onclick = () => { state.settings.scheduleHintDismissed = true; persist(); renderHome(); };
}

function dockHTML() {
  return `
    <div class="dock">
      <button class="btn btn-write" id="writeBtn">✎ Escribir</button>
      <button class="mic-btn" id="micBtn" aria-label="Dictar nota">${MIC_SVG}</button>
      <span class="dock-label">Toca para dictar</span>
    </div>`;
}

function bindDock(presetCategoryId = null) {
  app.querySelector('#micBtn').onclick = () => openEditor({ mode: 'voz', presetCategoryId });
  app.querySelector('#writeBtn').onclick = () => openEditor({ mode: 'texto', presetCategoryId });
}

function bindReminderActions(rerender = renderHome) {
  app.querySelectorAll('[data-done]').forEach((el) => (el.onchange = () => {
    const r = state.reminders.find((x) => x.id === el.dataset.done);
    if (!r) return;
    r.done = el.checked;
    if (r.done) notifier.cancel(r);
    persist();
    rerender();
  }));
  app.querySelectorAll('[data-delrem]').forEach((el) => (el.onclick = () => {
    const r = state.reminders.find((x) => x.id === el.dataset.delrem);
    if (!r) return;
    deleteReminder(r);
    persist();
    rerender();
  }));
}

function deleteReminder(r) {
  notifier.cancel(r);
  state.reminders = state.reminders.filter((x) => x.id !== r.id);
  for (const n of state.notes) if (n.reminderId === r.id) n.reminderId = null;
}

/* ---------- ficha ---------- */

function scheduleSummary(c) {
  if (!c.schedule?.length) return 'Sin horario';
  return c.schedule
    .slice()
    .sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7) || a.time.localeCompare(b.time))
    .map((s) => `${WEEKDAY_LABELS[s.day].slice(0, 3)} ${s.time}`)
    .join(' · ');
}

function renderCategory(c) {
  const notes = state.notes.filter((n) => n.categoryId === c.id).sort((a, b) => b.createdAt - a.createdAt);
  const upcoming = state.reminders.filter((r) => r.categoryId === c.id && !r.done).sort((a, b) => new Date(a.at) - new Date(b.at));
  const nc = nextClass(c.schedule, new Date());
  app.innerHTML = `
    <header class="topbar">
      <a class="icon-btn" href="#/" aria-label="Volver">←</a>
      <h1 class="brand small">Ficha ${esc(c.name)}</h1>
      <a class="icon-btn" href="#/ajustes" aria-label="Ajustes">⚙</a>
    </header>
    <section class="ficha-sheet ficha-${c.color}">
      <span class="ficha-tab big">${esc(c.name)}</span>
      <div class="ficha-meta">
        <span>Horario: ${esc(scheduleSummary(c))}</span>
        ${nc ? `<span>Próxima clase: ${esc(formatWhen(nc))}</span>` : ''}
      </div>
      ${upcoming.length ? `<h3 class="list-title">Recordatorios</h3><ul class="rems">${upcoming.map((r) => reminderItem(r, { inCategory: true })).join('')}</ul>` : ''}
      <h3 class="list-title">Notas</h3>
      ${notes.length ? `<ol class="notes">${notes.map((n) => `
        <li class="note">
          <div class="note-head">
            <span>${esc(formatWhen(n.createdAt))}</span>
            <span class="muted">${n.source === 'voz' ? '🎙 dictada' : '✎ escrita'}</span>
            <button class="icon-btn small" data-delnote="${n.id}" aria-label="Borrar nota">×</button>
          </div>
          <p>${esc(n.text)}</p>
        </li>`).join('')}</ol>` : '<p class="muted empty">Esta ficha está en blanco. Dicta la primera nota.</p>'}
    </section>
    ${dockHTML()}`;

  bindDock(c.id);
  bindReminderActions(() => renderCategory(c));
  app.querySelectorAll('[data-delnote]').forEach((el) => (el.onclick = () => {
    if (!confirm('¿Borrar esta nota?')) return;
    const n = state.notes.find((x) => x.id === el.dataset.delnote);
    const r = n?.reminderId && state.reminders.find((x) => x.id === n.reminderId);
    if (r && confirm('¿Borrar también su recordatorio?')) deleteReminder(r);
    state.notes = state.notes.filter((x) => x.id !== el.dataset.delnote);
    persist();
    renderCategory(c);
  }));
}

/* ---------- editor de nota (dictado o escritura) ---------- */

function closeModal() {
  modalRoot.innerHTML = '';
  document.body.classList.remove('modal-open');
}

function openEditor({ mode, presetCategoryId }) {
  const voice = mode === 'voz' && speechSupported();
  if (mode === 'voz' && !voice) toast('Este navegador no permite dictado. Escribe la nota (o usa el micrófono del teclado).');

  const ed = {
    categoryId: presetCategoryId || '',
    categoryTouched: false,
    reminderTouched: false,
    detection: null,
    recording: false,
  };

  modalRoot.innerHTML = `
    <div class="backdrop">
      <div class="sheet paper" role="dialog" aria-modal="true" aria-labelledby="edTitle">
        <div class="sheet-head">
          <h2 id="edTitle">${voice ? '<span class="rec-dot"></span> Escuchando…' : 'Nueva nota'}</h2>
          <button class="icon-btn" id="edClose" aria-label="Cerrar">×</button>
        </div>
        <div class="typed" id="typed" ${voice ? '' : 'hidden'}></div>
        <label class="sr" for="edText">Texto de la nota</label>
        <textarea id="edText" rows="5" placeholder="Ej.: En 701 trabajé números racionales, hacer examen la próxima clase" ${voice ? 'hidden' : ''}></textarea>
        <div class="field">
          <label for="edCat">Ficha</label>
          <select id="edCat">
            <option value="">— Elegir ficha —</option>
            ${state.categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
          </select>
          <small id="edCatHint" class="muted"></small>
        </div>
        <div id="edRem" class="rem-box"></div>
        <div class="sheet-actions">
          <button class="btn" id="edCancel">Descartar</button>
          ${voice ? '<button class="btn btn-accent" id="edStop">■ Detener</button>' : ''}
          <button class="btn btn-primary" id="edSave" ${voice ? 'hidden' : ''}>Archivar</button>
        </div>
      </div>
    </div>`;
  document.body.classList.add('modal-open');

  const $ = (s) => modalRoot.querySelector(s);
  const text = $('#edText');
  const sel = $('#edCat');
  sel.value = ed.categoryId;

  const update = (value) => {
    if (!ed.categoryTouched) {
      const hit = classify(value, state.categories);
      if (hit) {
        ed.categoryId = hit.categoryId;
        $('#edCatHint').textContent = 'Detectada automáticamente';
      } else {
        ed.categoryId = presetCategoryId || '';
        $('#edCatHint').textContent = presetCategoryId ? '' : 'No mencionaste ninguna ficha: elígela.';
      }
      sel.value = ed.categoryId;
    }
    if (!ed.reminderTouched) {
      const c = cat(ed.categoryId);
      ed.detection = detectReminder(value, { schedule: c?.schedule || [] });
      renderReminderBox();
    }
  };

  const renderReminderBox = () => {
    const box = $('#edRem');
    const d = ed.detection;
    const c = cat(ed.categoryId);
    if (!d) {
      box.innerHTML = `
        <label class="check-line"><input type="checkbox" id="remOn"> Agregar recordatorio</label>
        <input type="datetime-local" id="remAt" hidden>`;
    } else if (d.needsSchedule) {
      box.innerHTML = `
        <p class="detect">Mencionaste <strong>“${esc(originalSnippet(text.value, d.matched))}”</strong>, pero ${c ? `la ficha <strong>${esc(c.name)}</strong>` : 'esta ficha'} no tiene horario.
          <a href="#/ajustes" id="goSched">Cargar horario</a> o elige la fecha:</p>
        <label class="check-line"><input type="checkbox" id="remOn" checked> Crear recordatorio</label>
        <input type="datetime-local" id="remAt" value="${toLocalInput(addDays(startOfDay(new Date()), 1).setHours(7))}">`;
    } else {
      box.innerHTML = `
        <p class="detect">📅 Detecté <strong>“${esc(d.matched === 'hora' ? 'una hora' : originalSnippet(text.value, d.matched))}”</strong>
          → ${esc(formatWhen(d.at))}${d.kind === 'proxima-clase' ? ' (inicio de la clase)' : ''}</p>
        <label class="check-line"><input type="checkbox" id="remOn" checked> Crear recordatorio</label>
        <input type="datetime-local" id="remAt" value="${toLocalInput(d.at)}">`;
    }
    const on = box.querySelector('#remOn');
    const at = box.querySelector('#remAt');
    on.onchange = () => {
      ed.reminderTouched = true;
      at.hidden = !on.checked;
      if (on.checked && !at.value) at.value = toLocalInput(addDays(startOfDay(new Date()), 1).setHours(7));
    };
    at.onchange = () => { ed.reminderTouched = true; };
    const gs = box.querySelector('#goSched');
    if (gs) gs.onclick = () => closeModal();
  };

  sel.onchange = () => {
    ed.categoryTouched = true;
    ed.categoryId = sel.value;
    $('#edCatHint').textContent = '';
    sel.classList.remove('invalid');
    if (!ed.reminderTouched) {
      ed.detection = detectReminder(text.value, { schedule: cat(ed.categoryId)?.schedule || [] });
      renderReminderBox();
    }
  };
  text.oninput = () => update(text.value);
  update('');

  let rec = null;
  const finishRecording = () => {
    if (!ed.recording) return;
    ed.recording = false;
    tw?.finish();
    $('#typed').hidden = true;
    text.hidden = false;
    $('#edTitle').textContent = 'Revisa tu nota';
    $('#edStop')?.remove();
    $('#edSave').hidden = false;
    update(text.value);
    if (!text.value) text.focus();
  };

  const tw = voice ? new Typewriter($('#typed')) : null;
  if (voice) {
    ed.recording = true;
    rec = createRecognizer({
      onText: (t) => {
        if (!ed.recording) return;
        text.value = t;
        tw.setTarget(t);
        update(t);
      },
      onEnd: finishRecording,
      onError: (msg) => { toast(msg); finishRecording(); },
    });
    rec.start();
    $('#edStop').onclick = () => {
      // Se espera el último resultado del reconocedor; si tarda, se cierra igual.
      $('#edStop').disabled = true;
      $('#edTitle').textContent = 'Terminando…';
      rec.stop();
      setTimeout(finishRecording, 1500);
    };
  } else {
    setTimeout(() => text.focus(), 50);
  }

  const cancel = () => {
    if (ed.recording) { ed.recording = false; rec?.stop(); }
    closeModal();
  };
  $('#edCancel').onclick = cancel;
  $('#edClose').onclick = cancel;

  $('#edSave').onclick = async () => {
    const value = text.value.trim();
    if (!value) return toast('La nota está vacía.');
    if (!ed.categoryId) {
      sel.classList.add('invalid');
      sel.focus();
      return toast('Elige en qué ficha archivarla.');
    }
    const note = {
      id: store.uid(),
      categoryId: ed.categoryId,
      text: value,
      createdAt: Date.now(),
      source: voice ? 'voz' : 'texto',
      reminderId: null,
    };
    const on = $('#remOn');
    const at = $('#remAt');
    let reminder = null;
    if (on?.checked && at?.value) {
      reminder = {
        id: store.uid(),
        noteId: note.id,
        categoryId: note.categoryId,
        title: value.length > 90 ? value.slice(0, 87) + '…' : value,
        at: new Date(at.value).toISOString(),
        done: false,
        notified: false,
      };
      note.reminderId = reminder.id;
      state.reminders.push(reminder);
    }
    state.notes.push(note);
    persist();
    closeModal();
    toast(`Archivada en ${catName(note.categoryId)}${reminder ? ' · recordatorio ' + formatWhen(reminder.at) : ''}`);
    if (reminder) {
      ensurePermission();
      notifier.schedule({ ...reminder, categoryName: catName(reminder.categoryId) }).catch(() => {});
    }
    render();
  };
}

async function ensurePermission() {
  if (notifier.permissionState() === 'default') {
    try { await notifier.requestPermission(); } catch { /* sin permiso: solo se verá en la agenda */ }
  }
}

/* ---------- ajustes ---------- */

function renderSettings() {
  const perm = notifier.permissionState();
  const permText = {
    native: 'Avisos nativos activos.',
    granted: 'Activadas.',
    denied: 'Bloqueadas en el navegador. Actívalas desde los ajustes del sistema.',
    default: 'Aún no autorizadas.',
    unsupported: 'Este navegador no admite notificaciones.',
  }[perm];

  app.innerHTML = `
    <header class="topbar">
      <a class="icon-btn" href="#/" aria-label="Volver">←</a>
      <h1 class="brand small">Ajustes</h1>
      <span></span>
    </header>

    <section class="settings">
      <h2>Fichas y horarios</h2>
      <p class="muted">El horario sirve para entender “la próxima clase”. Los <em>alias</em> son otras formas en que nombras la ficha al hablar (ej.: “séptimo uno”).</p>
      ${state.categories.map((c) => `
        <article class="ficha-edit ficha-${c.color}" data-cat="${c.id}">
          <div class="row">
            <label class="sr" for="n-${c.id}">Nombre</label>
            <input id="n-${c.id}" class="cat-name" value="${esc(c.name)}">
            <button class="icon-btn" data-delcat="${c.id}" aria-label="Eliminar ficha ${esc(c.name)}">🗑</button>
          </div>
          <label class="mini" for="a-${c.id}">Alias (separados por comas)</label>
          <input id="a-${c.id}" class="cat-aliases" value="${esc((c.aliases || []).join(', '))}" placeholder="séptimo uno, grupo A">
          <div class="mini">Horario de clases / sesiones</div>
          <ul class="slots">
            ${(c.schedule || []).map((s, i) => `
              <li class="row">
                <select data-slot-day="${i}">${WEEKDAY_LABELS.map((w, d) => `<option value="${d}" ${+s.day === d ? 'selected' : ''}>${w}</option>`).join('')}</select>
                <input type="time" data-slot-time="${i}" value="${esc(s.time)}">
                <button class="icon-btn small" data-slot-del="${i}" aria-label="Quitar">×</button>
              </li>`).join('')}
          </ul>
          <button class="link" data-slot-add>+ Agregar día y hora</button>
        </article>`).join('')}
      <form id="newCatForm" class="row">
        <label class="sr" for="newCatName">Nueva ficha</label>
        <input id="newCatName" placeholder="Nueva ficha (ej.: 902)">
        <button class="btn" type="submit">Agregar</button>
      </form>

      <h2>Notificaciones</h2>
      <p>${esc(permText)}</p>
      ${perm === 'default' ? '<button class="btn" id="permBtn">Activar notificaciones</button>' : ''}
      ${perm !== 'native' ? '<p class="muted">En la versión web los avisos llegan mientras la app está abierta o en segundo plano. La versión nativa (Capacitor) avisa aunque esté cerrada.</p>' : ''}

      <h2>Datos</h2>
      <p class="muted">Todo se guarda solo en este teléfono. Exporta una copia de seguridad de vez en cuando.</p>
      <div class="row wrap">
        <button class="btn" id="exportBtn">Exportar copia</button>
        <label class="btn" for="importFile">Importar copia</label>
        <input type="file" id="importFile" accept="application/json" hidden>
        <button class="btn btn-danger" id="resetBtn">Borrar todo</button>
      </div>
      <p class="muted colophon">Dictario 0.1 · MVP</p>
    </section>`;

  app.querySelectorAll('[data-cat]').forEach((card) => {
    const c = cat(card.dataset.cat);
    card.querySelector('.cat-name').onchange = (e) => {
      const v = e.target.value.trim();
      if (!v) { e.target.value = c.name; return; }
      c.name = v;
      persist();
    };
    card.querySelector('.cat-aliases').onchange = (e) => {
      c.aliases = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
      persist();
    };
    card.querySelectorAll('[data-slot-day]').forEach((el) => (el.onchange = () => {
      c.schedule[+el.dataset.slotDay].day = +el.value;
      persist();
    }));
    card.querySelectorAll('[data-slot-time]').forEach((el) => (el.onchange = () => {
      c.schedule[+el.dataset.slotTime].time = el.value;
      persist();
    }));
    card.querySelectorAll('[data-slot-del]').forEach((el) => (el.onclick = () => {
      c.schedule.splice(+el.dataset.slotDel, 1);
      persist();
      renderSettings();
    }));
    card.querySelector('[data-slot-add]').onclick = () => {
      c.schedule = c.schedule || [];
      const last = c.schedule[c.schedule.length - 1];
      c.schedule.push({ day: last ? (last.day % 6) + 1 : 1, time: last?.time || '07:00' });
      persist();
      renderSettings();
    };
    card.querySelector('[data-delcat]').onclick = () => {
      const count = state.notes.filter((n) => n.categoryId === c.id).length;
      if (!confirm(`¿Eliminar la ficha ${c.name}${count ? ` y sus ${count} nota(s)` : ''}?`)) return;
      state.reminders.filter((r) => r.categoryId === c.id).forEach(deleteReminder);
      state.notes = state.notes.filter((n) => n.categoryId !== c.id);
      state.categories = state.categories.filter((x) => x.id !== c.id);
      persist();
      renderSettings();
    };
  });

  app.querySelector('#newCatForm').onsubmit = (e) => {
    e.preventDefault();
    const input = app.querySelector('#newCatName');
    for (const name of input.value.split(',').map((s) => s.trim()).filter(Boolean)) {
      state.categories.push(store.makeCategory(name, state.categories.length));
    }
    persist();
    renderSettings();
  };

  const pb = app.querySelector('#permBtn');
  if (pb) pb.onclick = async () => { await notifier.requestPermission(); renderSettings(); };

  app.querySelector('#exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dictario-${toLocalInput(new Date()).slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  app.querySelector('#importFile').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.categories)) throw new Error('formato');
      if (!confirm('Esto reemplaza los datos actuales. ¿Continuar?')) return;
      state = store.migrate(data);
      persist();
      toast('Copia importada.');
      renderSettings();
    } catch {
      toast('El archivo no es una copia válida de Dictario.');
    }
  };
  app.querySelector('#resetBtn').onclick = () => {
    if (!confirm('¿Borrar todas las fichas, notas y recordatorios? No se puede deshacer.')) return;
    state.reminders.forEach((r) => notifier.cancel(r));
    state = store.emptyState();
    ui.draftCategories = [];
    persist();
    go('#/');
  };
}

/* ---------- arranque ---------- */

window.addEventListener('hashchange', render);
render();

notifier.startWatcher(
  () => state,
  (r) => { r.notified = true; persist(); },
  catName
);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
