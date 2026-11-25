import { balanceOf, pnlOf, signed } from './calc';
import { addDays, dstr, parseDate, today } from './format';
import { isTradeMove, rMultiple, type Account, type Movement } from './types';

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
  /** money: importes en la moneda de la cuenta; count: número de trades o días */
  unit: 'money' | 'count';
};

const isTrade = (m: Movement) => m.type === 'ganancia' || m.type === 'perdida';

/**
 * Estado de las reglas de una cuenta (importes en su moneda).
 * Drawdown estático: desde el capital inicial. Trailing: desde el balance máximo alcanzado.
 */
export function propRules(a: Account, moves: Movement[]): RuleState[] {
  const out: RuleState[] = [];
  const t = today();
  const mine = moves.filter((m) => m.acc === a.id);
  const balance = balanceOf(a, mine);
  if (a.dailyLossLimit) {
    let dayPnl = 0;
    for (const m of mine) if (m.date === t) dayPnl += pnlOf(m);
    const loss = Math.max(0, -dayPnl);
    out.push({ label: 'Pérdida diaria', used: (loss / a.dailyLossLimit) * 100, usedAmount: loss, limit: a.dailyLossLimit, remaining: a.dailyLossLimit - loss, kind: 'risk', unit: 'money' });
  }
  if (a.maxTradesPerDay) {
    const n = mine.filter((m) => m.date === t && isTrade(m)).length;
    out.push({ label: 'Trades hoy', used: (n / a.maxTradesPerDay) * 100, usedAmount: n, limit: a.maxTradesPerDay, remaining: a.maxTradesPerDay - n, kind: 'risk', unit: 'count' });
  }
  if (a.maxDrawdown) {
    let peak = a.initial;
    if (a.drawdownType === 'trailing') {
      let bal = a.initial;
      const sorted = [...mine].sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
      // depósitos, retiros y payouts mueven el balance y el pico por igual: solo cuenta el trading
      for (const m of sorted) {
        bal += signed(m);
        if (m.type === 'deposito' || m.type === 'retiro' || m.type === 'payout') peak += signed(m);
        else peak = Math.max(peak, bal);
      }
    } else {
      // estático: el nivel de partida se ajusta con lo que metes o sacas
      for (const m of mine) if (m.type === 'deposito' || m.type === 'retiro' || m.type === 'payout') peak += signed(m);
    }
    const dd = Math.max(0, peak - balance);
    out.push({ label: a.drawdownType === 'trailing' ? 'Drawdown trailing' : 'Drawdown máximo', used: (dd / a.maxDrawdown) * 100, usedAmount: dd, limit: a.maxDrawdown, remaining: a.maxDrawdown - dd, kind: 'risk', unit: 'money' });
  }
  if (a.profitTarget) {
    const gain = Math.max(0, balance - a.initial);
    out.push({ label: 'Objetivo', used: (gain / a.profitTarget) * 100, usedAmount: gain, limit: a.profitTarget, remaining: Math.max(0, a.profitTarget - gain), kind: 'goal', unit: 'money' });
  }
  if (a.minTradingDays) {
    const days = new Set(mine.filter(isTrade).map((m) => m.date)).size;
    out.push({ label: 'Días operados', used: (days / a.minTradingDays) * 100, usedAmount: days, limit: a.minTradingDays, remaining: Math.max(0, a.minTradingDays - days), kind: 'goal', unit: 'count' });
  }
  return out;
}

export type StopAlert = { account: Account; text: string; severe: boolean };

/** Avisos de «para por hoy»: pérdida diaria al 80 % o más, o máximo de trades alcanzado. */
export function stopAlerts(accounts: Account[], moves: Movement[]): StopAlert[] {
  const out: StopAlert[] = [];
  for (const a of accounts) {
    for (const r of propRules(a, moves)) {
      if (r.label === 'Pérdida diaria' && r.used >= 80) out.push({ account: a, severe: r.used >= 100, text: r.used >= 100 ? 'Has superado tu pérdida diaria' : `Has usado el ${Math.round(r.used)} % de tu pérdida diaria` });
      if (r.label === 'Trades hoy' && r.used >= 100) out.push({ account: a, severe: false, text: `Has hecho tus ${r.limit} trades de hoy` });
      if (r.label.startsWith('Drawdown') && r.used >= 80) out.push({ account: a, severe: r.used >= 100, text: r.used >= 100 ? 'Has superado el drawdown máximo' : `Drawdown al ${Math.round(r.used)} %` });
    }
  }
  return out;
}

/** Negocio del fondeo: lo invertido en challenges frente a los payouts cobrados (moneda ya convertida). */
export function fundingBusiness(accounts: Account[], moves: Movement[]) {
  const funded = new Set(accounts.filter((a) => a.kind === 'Fondeo').map((a) => a.id));
  let cost = 0, payouts = 0;
  for (const m of moves) {
    if (m.type === 'coste') cost += m.amount;
    if (m.type === 'payout') payouts += m.amount;
  }
  const fundedAccounts = accounts.filter((a) => funded.has(a.id));
  return {
    cost,
    payouts,
    net: payouts - cost,
    roi: cost ? ((payouts - cost) / cost) * 100 : null,
    total: fundedAccounts.length,
    approved: fundedAccounts.filter((a) => a.status === 'aprobada' || a.status === 'activa').length,
    burned: fundedAccounts.filter((a) => a.status === 'quemada').length,
    show: fundedAccounts.length > 0 || cost > 0 || payouts > 0,
  };
}

export function monthStart() {
  const d = parseDate(today());
  return dstr(new Date(d.getFullYear(), d.getMonth(), 1));
}

export const yesterday = () => addDays(today(), -1);

export type WithdrawalPlan = {
  base: number; // capital aportado (inicial + depósitos), sin restar retiros
  balance: number;
  threshold: number; // balance al que toca retirar
  progress: number; // 0..100 hacia el umbral
  due: boolean;
  amount: number; // cuánto retirar ahora (0 si aún no toca)
  withdrawn: number; // total retirado de la cuenta
};

/**
 * Plan de retiros de una cuenta: cuando el balance supera el capital aportado en un X %,
 * se propone retirar un Y % del beneficio. Ej.: 150 € con 100 % / 50 % → al llegar a 300 €, retirar 75 €.
 */
export function withdrawalPlan(a: Account, moves: Movement[]): WithdrawalPlan | null {
  if (!a.withdrawTriggerPct || !a.withdrawPct) return null;
  const mine = moves.filter((m) => m.acc === a.id);
  const base = a.initial + mine.filter((m) => m.type === 'deposito').reduce((s, m) => s + m.amount, 0);
  const withdrawn = mine.filter((m) => m.type === 'retiro' || m.type === 'payout').reduce((s, m) => s + m.amount, 0);
  const balance = balanceOf(a, mine);
  const threshold = base * (1 + a.withdrawTriggerPct / 100);
  const due = base > 0 && balance >= threshold;
  const profit = Math.max(0, balance - base);
  const progress = base > 0 ? Math.max(0, Math.min(100, ((balance - base) / (threshold - base)) * 100)) : 0;
  return { base, balance, threshold, progress, due, amount: due ? Math.floor(profit * a.withdrawPct) / 100 : 0, withdrawn };
}

export type EdgeRow = { key: string; trades: number; pnl: number; winRate: number; avgR: number | null };
export type Edge = {
  trades: number; // trades con algún detalle
  bySymbol: EdgeRow[];
  bySetup: EdgeRow[];
  byEmotion: EdgeRow[];
  plan: { yes: EdgeRow | null; no: EdgeRow | null };
  avgR: number | null;
  bySide: { long: EdgeRow | null; short: EdgeRow | null };
};

/** Qué te funciona y qué no: resultados por símbolo, setup, emoción, dirección y si seguiste el plan. */
export function edgeStats(moves: Movement[], ids: Set<string>, from: string | null): Edge {
  const trades = moves.filter((m) => ids.has(m.acc) && isTradeMove(m) && (!from || m.date >= from));
  const detailed = trades.filter((m) => m.symbol || m.setup || m.emotion || m.followedPlan != null || m.side || m.risk);
  const row = (key: string, list: Movement[]): EdgeRow => {
    const pnl = list.reduce((s, m) => s + pnlOf(m), 0);
    const wins = list.filter((m) => m.type === 'ganancia').length;
    const rs = list.map(rMultiple).filter((r): r is number => r !== null);
    return { key, trades: list.length, pnl, winRate: list.length ? (wins / list.length) * 100 : 0, avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null };
  };
  const group = (get: (m: Movement) => string | null | undefined) => {
    const g = new Map<string, Movement[]>();
    for (const m of detailed) { const k = get(m); if (k) g.set(k, [...(g.get(k) ?? []), m]); }
    return [...g.entries()].map(([k, l]) => row(k, l)).sort((a, b) => b.pnl - a.pnl);
  };
  const yes = detailed.filter((m) => m.followedPlan === true);
  const no = detailed.filter((m) => m.followedPlan === false);
  const long = detailed.filter((m) => m.side === 'long');
  const short = detailed.filter((m) => m.side === 'short');
  const rs = detailed.map(rMultiple).filter((r): r is number => r !== null);
  return {
    trades: detailed.length,
    bySymbol: group((m) => m.symbol),
    bySetup: group((m) => m.setup),
    byEmotion: group((m) => m.emotion),
    plan: { yes: yes.length ? row('si', yes) : null, no: no.length ? row('no', no) : null },
    avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
    bySide: { long: long.length ? row('long', long) : null, short: short.length ? row('short', short) : null },
  };
}
