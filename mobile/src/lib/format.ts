import type { Prefs } from './types';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const MONTHS_SHORT = MONTHS;

const pad = (n: number) => (n < 10 ? '0' : '') + n;

export function dstr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function today() {
  return dstr(new Date());
}
export function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s: string, n: number) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return dstr(d);
}
export function shortDate(s: string) {
  const [, m, d] = s.split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}
export function longDate(s: string) {
  const d = parseDate(s);
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const t = today();
  if (s === t) return 'Hoy';
  if (s === addDays(t, -1)) return 'Ayer';
  return `${days[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Agrupa miles con punto y decimales con coma (estilo español), siempre. */
export function group(n: number, dec = 0) {
  const neg = n < 0;
  const [int, frac] = Math.abs(n).toFixed(dec).split('.');
  const g = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '−' : '') + g + (dec ? ',' + frac : '');
}

const SYMBOL: Record<Prefs['cur'], string> = { USD: '$', EUR: '€', GBP: '£' };

/** Importe con símbolo: € detrás (estilo español), $ y £ delante. */
function withSymbol(g: string, cur: Prefs['cur']) {
  if (cur === 'EUR') return `${g} €`;
  const s = g[0] === '−' || g[0] === '+' ? g[0] : '';
  return `${s}${SYMBOL[cur]}${s ? g.slice(1) : g}`;
}

export function money(n: number, prefs: Pick<Prefs, 'cur' | 'privacy'>, opts: { dec?: number; signed?: boolean } = {}) {
  if (prefs.privacy) return withSymbol('••••', prefs.cur);
  const dec = opts.dec ?? (Math.abs(n) >= 10000 ? 0 : 2);
  let g = group(n, dec);
  if (opts.signed && n > 0) g = '+' + g;
  return withSymbol(g, prefs.cur);
}

export function compact(n: number, cur: Prefs['cur']) {
  const a = Math.abs(n);
  const s = a >= 1e6 ? group(a / 1e6, 1) + 'M' : a >= 1e3 ? group(a / 1e3, a >= 1e4 ? 0 : 1) + 'k' : group(a, 0);
  return withSymbol((n < 0 ? '−' : '') + s, cur);
}

export function pct(n: number) {
  return (n > 0 ? '+' : '') + group(n, 2) + ' %';
}

export function uuid() {
  // v4 sin dependencias nativas; suficiente para identificadores de filas
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
