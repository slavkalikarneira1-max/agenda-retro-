// Utilidades de texto: normalización y conversión de números dictados a dígitos.

/** Minúsculas, sin tildes, sin signos (salvo : / . -) y con espacios simples. */
export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9:\/.\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const UNITS = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4,
  cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
};
const TEENS = {
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27,
  veintiocho: 28, veintinueve: 29,
};
const TENS = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60,
  setenta: 70, ochenta: 80, noventa: 90,
};
const HUNDREDS = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200,
  trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400,
  quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800,
  novecientos: 900, novecientas: 900,
};

function parseNumberAt(tokens, i) {
  let value = 0;
  let j = i;
  let found = false;
  if (HUNDREDS[tokens[j]] != null) {
    value += HUNDREDS[tokens[j]];
    j++;
    found = true;
  }
  if (TENS[tokens[j]] != null) {
    value += TENS[tokens[j]];
    j++;
    found = true;
    if (tokens[j] === 'y' && UNITS[tokens[j + 1]] > 0) {
      value += UNITS[tokens[j + 1]];
      j += 2;
    }
  } else if (TEENS[tokens[j]] != null) {
    value += TEENS[tokens[j]];
    j++;
    found = true;
  } else if (UNITS[tokens[j]] != null && !(found && UNITS[tokens[j]] === 0)) {
    value += UNITS[tokens[j]];
    j++;
    found = true;
  }
  return found ? { value, next: j } : null;
}

/**
 * Convierte números escritos en palabras a dígitos (0–999).
 * "setecientos uno" → "701", "siete cero uno" → "701", "grado once" → "grado 11".
 * Espera texto ya normalizado.
 */
export function wordsToDigits(text) {
  const tokens = text.split(' ').filter(Boolean);
  const out = [];
  let chaining = false; // dígitos sueltos dictados uno a uno
  let i = 0;
  while (i < tokens.length) {
    const parsed = parseNumberAt(tokens, i);
    if (!parsed) {
      out.push(tokens[i]);
      chaining = false;
      i++;
      continue;
    }
    const single = parsed.next - i === 1 && parsed.value < 10;
    if (single && chaining) {
      out[out.length - 1] += String(parsed.value);
    } else {
      out.push(String(parsed.value));
    }
    chaining = single;
    i = parsed.next;
  }
  return out.join(' ');
}

/** Normaliza y convierte números: la forma canónica usada para comparar. */
export function canonical(text) {
  return wordsToDigits(normalize(text));
}

export function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Recupera del texto original el fragmento que corresponde a `needle` (ya normalizado),
 * para mostrarlo con sus tildes. Si no se encuentra, devuelve `needle`.
 */
export function originalSnippet(text, needle) {
  const src = String(text ?? '');
  const folded = src.split('').map((ch) => normalize(ch) || ' ').join('');
  const at = folded.indexOf(needle);
  return at < 0 ? needle : src.slice(at, at + needle.length);
}
