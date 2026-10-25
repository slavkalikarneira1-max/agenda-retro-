// Detecta a qué ficha (categoría) pertenece una nota dictada.
import { canonical, escapeRegExp } from './text.js';

function termPattern(term) {
  // Para nombres numéricos ("701") se aceptan separadores: "7 01", "7-01", "7.01".
  const body = /^\d+$/.test(term)
    ? term.split('').map(escapeRegExp).join('[\\s.\\-]?')
    : term.split(' ').map(escapeRegExp).join('\\s+');
  return new RegExp(`(^|[^a-z0-9])(${body})(?=$|[^a-z0-9])`, 'g');
}

/** Términos con los que se reconoce una categoría: su nombre y sus alias. */
export function categoryTerms(category) {
  return [category.name, ...(category.aliases || [])]
    .map(canonical)
    .filter(Boolean);
}

/**
 * Devuelve la mejor categoría para el texto, o null.
 * Gana la que más veces se menciona; a igualdad, la mencionada primero.
 * @returns {{categoryId: string, term: string, index: number} | null}
 */
export function classify(text, categories) {
  const t = canonical(text);
  if (!t) return null;
  let best = null;
  for (const category of categories) {
    for (const term of categoryTerms(category)) {
      const re = termPattern(term);
      let count = 0;
      let first = -1;
      let m;
      while ((m = re.exec(t))) {
        if (first < 0) first = m.index + m[1].length;
        count++;
      }
      if (!count) continue;
      const score = count * 100 + term.length;
      if (
        !best ||
        score > best.score ||
        (score === best.score && first < best.index)
      ) {
        best = { categoryId: category.id, term, index: first, score };
      }
    }
  }
  if (!best) return null;
  const { score, ...result } = best;
  return result;
}
