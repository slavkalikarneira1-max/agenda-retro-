import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, wordsToDigits, canonical } from '../js/text.js';
import { classify } from '../js/classifier.js';
import { detectReminder, nextClass, parseTime } from '../js/dates.js';

const cats = [
  { id: 'a', name: '701', aliases: [] },
  { id: 'b', name: '702', aliases: [] },
  { id: 'c', name: '801', aliases: ['octavo uno'] },
  { id: 'd', name: 'Cliente Pérez', aliases: [] },
];

// Domingo 25 de octubre de 2026, 10:00
const NOW = new Date(2026, 9, 25, 10, 0);
const ymdhm = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];

test('normalize quita tildes y signos', () => {
  assert.equal(normalize('¡Mañana, Él trabajó!'), 'manana el trabajo');
});

test('wordsToDigits convierte números dictados', () => {
  assert.equal(wordsToDigits('en setecientos uno'), 'en 701');
  assert.equal(wordsToDigits('grupo siete cero dos'), 'grupo 702');
  assert.equal(wordsToDigits('treinta y uno de octubre'), '31 de octubre');
  assert.equal(wordsToDigits('grado once'), 'grado 11');
  assert.equal(wordsToDigits('ciento cinco'), '105');
});

test('clasifica el ejemplo de la idea', () => {
  const r = classify('En 701 trabajé números racionales, hacer examen la próxima clase', cats);
  assert.equal(r.categoryId, 'a');
});

test('clasifica números dictados en palabras y con separadores', () => {
  assert.equal(classify('en setecientos dos vimos fracciones', cats).categoryId, 'b');
  assert.equal(classify('el grupo 7-02 entregó tarea', cats).categoryId, 'b');
  assert.equal(classify('octavo uno salió temprano', cats).categoryId, 'c');
});

test('clasifica nombres de texto sin importar tildes ni mayúsculas', () => {
  assert.equal(classify('llamar al cliente perez el lunes', cats).categoryId, 'd');
});

test('no confunde 701 con 7010 ni devuelve nada sin mención', () => {
  assert.equal(classify('código 7010', cats), null);
  assert.equal(classify('comprar pan', cats), null);
});

test('elige la categoría más mencionada', () => {
  assert.equal(classify('702 ayudó a 701; 701 tiene examen', cats).categoryId, 'a');
});

test('parseTime', () => {
  assert.deepEqual(parseTime(canonical('a las tres y media')), { h: 15, m: 30 });
  assert.deepEqual(parseTime(canonical('a las 9:15 a. m.')), { h: 9, m: 15 });
  assert.deepEqual(parseTime(canonical('a las 8 de la noche')), { h: 20, m: 0 });
  assert.deepEqual(parseTime(canonical('a las 10')), { h: 10, m: 0 });
  assert.equal(parseTime(canonical('en 701')), null);
});

test('mañana / pasado mañana / de la mañana', () => {
  assert.deepEqual(ymdhm(detectReminder('mañana revisar cuadernos', { now: NOW }).at), [2026, 10, 26, 7, 0]);
  assert.deepEqual(ymdhm(detectReminder('pasado mañana a las 3', { now: NOW }).at), [2026, 10, 27, 15, 0]);
  assert.deepEqual(ymdhm(detectReminder('reunión a las 9 de la mañana', { now: NOW }).at), [2026, 10, 26, 9, 0]);
});

test('fechas explícitas y días de la semana', () => {
  assert.deepEqual(ymdhm(detectReminder('entregar notas el 15 de noviembre', { now: NOW }).at), [2026, 11, 15, 7, 0]);
  assert.deepEqual(ymdhm(detectReminder('reunión el 3 de marzo a las 2', { now: NOW }).at), [2027, 3, 3, 14, 0]);
  assert.deepEqual(ymdhm(detectReminder('el martes llevar el proyector', { now: NOW }).at), [2026, 10, 27, 7, 0]);
  assert.deepEqual(ymdhm(detectReminder('el domingo', { now: NOW }).at), [2026, 11, 1, 7, 0]);
  assert.deepEqual(ymdhm(detectReminder('en tres días', { now: NOW }).at), [2026, 10, 28, 7, 0]);
  assert.deepEqual(ymdhm(detectReminder('entregar el 20/11', { now: NOW }).at), [2026, 11, 20, 7, 0]);
});

test('sin referencia temporal no propone recordatorio', () => {
  assert.equal(detectReminder('En 701 trabajé números racionales', { now: NOW }), null);
});

test('la próxima clase usa el horario', () => {
  const schedule = [{ day: 1, time: '08:00' }, { day: 3, time: '10:30' }];
  const r = detectReminder('En 701 hacer examen la próxima clase', { now: NOW, schedule });
  assert.equal(r.kind, 'proxima-clase');
  assert.deepEqual(ymdhm(r.at), [2026, 10, 26, 8, 0]);

  const r2 = detectReminder('hacer examen la próxima clase', { now: NOW });
  assert.equal(r2.needsSchedule, true);
  assert.equal(r2.at, null);
});

test('nextClass salta la clase que ya empezó hoy', () => {
  const monday9 = new Date(2026, 9, 26, 9, 0);
  const schedule = [{ day: 1, time: '08:00' }, { day: 1, time: '13:00' }];
  assert.deepEqual(ymdhm(nextClass(schedule, monday9)), [2026, 10, 26, 13, 0]);
  const monday14 = new Date(2026, 9, 26, 14, 0);
  assert.deepEqual(ymdhm(nextClass(schedule, monday14)), [2026, 11, 2, 8, 0]);
});

test('originalSnippet recupera tildes del texto dictado', async () => {
  const { originalSnippet } = await import('../js/text.js');
  assert.equal(originalSnippet('Hacer examen la Próxima clase.', 'la proxima clase'), 'la Próxima clase');
  assert.equal(originalSnippet('Llamar mañana', 'manana'), 'mañana');
});
