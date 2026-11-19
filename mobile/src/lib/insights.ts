import { balanceOf, pnlOf } from './calc';
import { addDays, dstr, parseDate, today } from './format';
import type { Account, Movement } from './types';

/** P&L por día (solo movimientos de trading) de las cuentas indicadas. */
export function dailyPnl(accounts: Account[], moves: Movement[]) {
  const ids = new Set(accounts.map((a) => a.id));
  const map = new Map<string, number>();
  for (const m of moves) {
    if (!ids.has(m.acc)) continue;
    const v = pnlOf(m);
    if (v) map.set(m.date, (map.get(m.date) ?? 0) + v);
  }
  return map;
}

export type Streaks = {
  bestDay: { date: string; value: number } | null;
  worstDay: { date: string; value: number } | null;
  currentWin: number;
  longestWin: number;
  greenDays: number;
  redDays: number;
};

export function streaks(byDay: Map<string, number>, start: string): Streaks {
  const days = [...byDay.entries()].filter(([d]) => d >= start).sort(([a], [b]) => (a < b ? -1 : 1));
  let best: Streaks['bestDay'] = null, worst: Streaks['worstDay'] = null;
  let run = 0, longest = 0, green = 0, red = 0;
  for (const [date, value] of days) {
    if (!best || value > best.value) best = { date, value };
    if (!worst || value < worst.value) worst = { date, value };
    if (value > 0) { green++; run++; longest = Math.max(longest, run); } else if (value < 0) { red++; run = 0; }
  }
  return { bestDay: best && best.value > 0 ? best : null, worstDay: worst && worst.value < 0 ? worst : null, currentWin: run, longestWin: longest, greenDays: green, redDays: red };
}

/** Celdas de un mes para el calendario (semana empieza en lunes). */
export function monthCells(year: number, month: number, byDay: Map<string, number>) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: ({ date: string; day: number; value: number | null } | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = dstr(new Date(year, month, d));
    cells.push({ date, day: d, value: byDay.has(date) ? byDay.get(date)! : null });
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function monthPnl(year: number, month: number, byDay: Map<string, number>) {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  let v = 0;
  for (const [d, x] of byDay) if (d.startsWith(key)) v += x;
  return v;
}

export type RuleState = {
  label: string;
  used: number; // 0..100+
  usedAmount: number;
  limit: number;
  remaining: number;
  kind: 'risk' | 'goal';
};

/** Estado de las reglas de fondeo de una cuenta. Drawdown estático desde el capital inicial. */
export function propRules(a: Account, moves: Movement[]): RuleState[] {
  const out: RuleState[] = [];
  const t = today();
  const balance = balanceOf(a, moves);
  if (a.dailyLossLimit) {
    let dayPnl = 0;
    for (const m of moves) if (m.acc === a.id && m.date === t) dayPnl += pnlOf(m);
    const loss = Math.max(0, -dayPnl);
    out.push({ label: 'Pérdida diaria', used: (loss / a.dailyLossLimit) * 100, usedAmount: loss, limit: a.dailyLossLimit, remaining: a.dailyLossLimit - loss, kind: 'risk' });
  }
  if (a.maxDrawdown) {
    const dd = Math.max(0, a.initial - balance);
    out.push({ label: 'Drawdown máximo', used: (dd / a.maxDrawdown) * 100, usedAmount: dd, limit: a.maxDrawdown, remaining: a.maxDrawdown - dd, kind: 'risk' });
  }
  if (a.profitTarget) {
    const gain = Math.max(0, balance - a.initial);
    out.push({ label: 'Objetivo', used: (gain / a.profitTarget) * 100, usedAmount: gain, limit: a.profitTarget, remaining: Math.max(0, a.profitTarget - gain), kind: 'goal' });
  }
  return out;
}

export function monthStart() {
  const d = parseDate(today());
  return dstr(new Date(d.getFullYear(), d.getMonth(), 1));
}

export const yesterday = () => addDays(today(), -1);
