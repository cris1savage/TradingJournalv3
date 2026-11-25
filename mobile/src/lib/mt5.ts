/**
 * Lectura del informe de historial de MetaTrader 5 (Historial → clic derecho → Informe → HTML).
 * Vale para cualquier broker o prop firm con MT5 (Axi, FTMO, FundedNext…).
 * El informe suele venir en UTF-16; se detecta y decodifica aquí.
 */
import type { MoveType } from './types';

export type ImportedMove = { key: string; date: string; type: MoveType; amount: number; note: string; symbol?: string; side?: 'long' | 'short'; lots?: number | null; entry?: number | null; exit?: number | null };

/** Decodifica los bytes del archivo: UTF-16 (LE/BE, con o sin BOM) o UTF-8. */
export function decodeReport(bytes: Uint8Array): string {
  const le = bytes[0] === 0xff && bytes[1] === 0xfe;
  const be = bytes[0] === 0xfe && bytes[1] === 0xff;
  // sin BOM: si casi todos los bytes impares son 0, es UTF-16 LE
  let zeros = 0;
  for (let i = 1; i < Math.min(bytes.length, 400); i += 2) if (bytes[i] === 0) zeros++;
  const guessLe = !le && !be && zeros > 150;
  if (le || be || guessLe) {
    const start = le || be ? 2 : 0;
    let out = '';
    for (let i = start; i + 1 < bytes.length; i += 2) {
      const code = be ? (bytes[i] << 8) | bytes[i + 1] : bytes[i] | (bytes[i + 1] << 8);
      out += String.fromCharCode(code);
    }
    return out;
  }
  let s = '';
  try {
    s = new TextDecoder('utf-8').decode(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  }
  return s;
}

const cleanCell = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** Número de MT5: "1 234.56", "-12.30", "1,234.56" o "1 234,56". */
export function parseNum(s: string): number | null {
  const t = s.replace(/\s/g, '');
  if (!/^-?[\d.,]+$/.test(t)) return null;
  let norm = t;
  if (t.includes(',') && t.includes('.')) norm = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  else if (t.includes(',')) norm = /,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '');
  const v = Number(norm);
  return isNaN(v) ? null : v;
}

const DATE_RE = /^(\d{4})[.\-/](\d{2})[.\-/](\d{2})/;
const toDate = (s: string) => {
  const m = s.match(DATE_RE);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

/** Filas de la tabla como listas de textos de celda. */
function rows(html: string): string[][] {
  const out: string[][] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(html))) {
    const cells: string[] = [];
    const tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let td: RegExpExecArray | null;
    while ((td = tdRe.exec(tr[1]))) cells.push(cleanCell(td[1]));
    if (cells.length) out.push(cells);
  }
  return out;
}

export type ParseResult = { moves: ImportedMove[]; positions: number; balanceOps: number; account?: string };

/**
 * Convierte el informe en movimientos:
 * - cada posición cerrada → una ganancia o pérdida neta (beneficio + comisión + swap), con su símbolo;
 * - cada operación de balance (depósito o retiro) → depósito o retiro.
 */
export function parseMt5Report(html: string): ParseResult {
  const all = rows(html);
  const moves: ImportedMove[] = [];
  let positions = 0, balanceOps = 0;
  let account: string | undefined;
  const seen = new Set<string>();

  for (const c of all) {
    const joined = c.join(' ');
    if (!account) {
      const acc = joined.match(/(?:Account|Cuenta)\s*:\s*(\d{4,})/i);
      if (acc) account = acc[1];
    }
    // Posición: Time | Position | Symbol | Type | Volume | Price | S/L | T/P | Time | Price | Commission | Swap | Profit
    if (c.length >= 13 && toDate(c[0]) && /^\d+$/.test(c[1]) && /^(buy|sell)$/i.test(c[3])) {
      const close = toDate(c[8]) ?? toDate(c[0])!;
      const commission = parseNum(c[c.length - 3]) ?? 0;
      const swap = parseNum(c[c.length - 2]) ?? 0;
      const profit = parseNum(c[c.length - 1]);
      if (profit === null) continue;
      const net = Math.round((profit + commission + swap) * 100) / 100;
      const key = `MT5 #${c[1]}`;
      if (seen.has(key) || net === 0) continue;
      seen.add(key);
      positions++;
      const lots = parseNum(c[4]);
      const entry = parseNum(c[5]);
      const exit = parseNum(c[9]);
      moves.push({
        key, date: close, type: net >= 0 ? 'ganancia' : 'perdida', amount: Math.abs(net),
        note: `${c[2]} ${c[3].toLowerCase() === 'buy' ? 'compra' : 'venta'} · ${key}`,
        symbol: c[2].slice(0, 20) || undefined, side: c[3].toLowerCase() === 'buy' ? 'long' : 'short',
        lots: lots && lots > 0 ? lots : null, entry: entry && entry > 0 ? entry : null, exit: exit && exit > 0 ? exit : null,
      });
      continue;
    }
    // Operación de balance en la tabla de transacciones: Time | Deal | Symbol | Type=balance | … | Profit | Balance | Comment
    const typeIdx = c.findIndex((x) => /^balance$/i.test(x));
    if (typeIdx >= 0 && toDate(c[0]) && c.length >= 6) {
      const numbers = c.slice(typeIdx + 1).map(parseNum).filter((v): v is number => v !== null);
      // el importe es el penúltimo número (el último es el balance resultante)
      const amount = numbers.length >= 2 ? numbers[numbers.length - 2] : numbers[0];
      if (!amount) continue;
      const key = `MT5 balance ${c[1] || c[0]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      balanceOps++;
      moves.push({ key, date: toDate(c[0])!, type: amount > 0 ? 'deposito' : 'retiro', amount: Math.abs(amount), note: `${amount > 0 ? 'Depósito' : 'Retiro'} · ${key}` });
    }
  }
  return { moves, positions, balanceOps, account };
}
