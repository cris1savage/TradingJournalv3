import { addDays, today } from './format';
import { MOVE_TYPES, type Account, type Market, type Movement, type Period } from './types';

export const signed = (m: Movement) => MOVE_TYPES[m.type].sign * m.amount;
export const pnlOf = (m: Movement) => (MOVE_TYPES[m.type].pnl ? signed(m) : 0);

export function balanceOf(a: Account, moves: Movement[], upto?: string) {
  let b = a.initial;
  for (const m of moves) if (m.acc === a.id && (!upto || m.date <= upto)) b += signed(m);
  return b;
}

/** Capital aportado: inicial + depósitos − retiros. La rentabilidad se mide sobre esto. */
export function contributed(a: Account, moves: Movement[]) {
  let n = a.initial;
  for (const m of moves) if (m.acc === a.id && !MOVE_TYPES[m.type].pnl) n += signed(m);
  return n;
}

export function periodStart(period: Period, accounts: Account[], moves: Movement[]) {
  const t = today();
  if (period !== 'all') return addDays(t, -Number(period) + 1);
  let min = t;
  for (const m of moves) if (m.date < min) min = m.date;
  for (const a of accounts) if (a.created < min) min = a.created;
  return min;
}

export type Summary = {
  total: number;
  own: number;
  funded: number;
  pnl: number;
  ret: number;
  winRate: number;
  wins: number;
  losses: number;
  profitFactor: number;
  series: { date: string; pnl: number; balance: number }[];
};

export function summarize(accounts: Account[], moves: Movement[], start: string): Summary {
  const t = today();
  const ids = new Set(accounts.map((a) => a.id));
  const mine = moves.filter((m) => ids.has(m.acc));
  let total = 0, own = 0, funded = 0;
  for (const a of accounts) {
    const b = balanceOf(a, mine);
    total += b;
    if (a.kind === 'Fondeo') funded += b; else own += b;
  }
  let pnl = 0, gross = 0, lossGross = 0, wins = 0, losses = 0;
  const byDay = new Map<string, Movement[]>();
  for (const m of mine) {
    if (m.date >= start && m.date <= t) {
      pnl += pnlOf(m);
      if (m.type === 'ganancia') { gross += m.amount; wins++; }
      if (m.type === 'perdida') { lossGross += m.amount; losses++; }
      if (m.type === 'comision') lossGross += m.amount;
    }
    const list = byDay.get(m.date);
    if (list) list.push(m); else byDay.set(m.date, [m]);
  }
  const prev = addDays(start, -1);
  // El capital inicial cuenta desde el principio del periodo (simple y sin saltos en la gráfica)
  let base = 0;
  for (const a of accounts) base += balanceOf(a, mine, prev);
  const series: Summary['series'] = [];
  let cum = 0, bal = base, d = start, guard = 0;
  while (d <= t && guard++ < 5000) {
    for (const m of byDay.get(d) ?? []) { cum += pnlOf(m); bal += signed(m); }
    series.push({ date: d, pnl: cum, balance: bal });
    d = addDays(d, 1);
  }
  const startCapital = base || accounts.reduce((s, a) => s + a.initial, 0);
  return {
    total, own, funded, pnl,
    ret: startCapital ? (pnl / startCapital) * 100 : 0,
    winRate: wins + losses ? (wins / (wins + losses)) * 100 : 0,
    wins, losses,
    profitFactor: lossGross ? gross / lossGross : gross ? Infinity : 0,
    series,
  };
}

export function byMarket(accounts: Account[], moves: Movement[]) {
  const map = new Map<Market, number>();
  for (const a of accounts) map.set(a.market, (map.get(a.market) ?? 0) + Math.max(balanceOf(a, moves), 0));
  return [...map.entries()].map(([market, value]) => ({ market, value })).sort((x, y) => y.value - x.value);
}

export function monthly(accounts: Account[], moves: Movement[], months = 6) {
  const ids = new Set(accounts.map((a) => a.id));
  const now = new Date();
  const out: { key: string; month: number; value: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let v = 0;
    for (const m of moves) if (ids.has(m.acc) && m.date.slice(0, 7) === key) v += pnlOf(m);
    out.push({ key, month: d.getMonth(), value: v });
  }
  return out;
}

export function pnlByAccount(accounts: Account[], moves: Movement[], start: string) {
  const t = today();
  return accounts
    .map((a) => {
      let p = 0;
      for (const m of moves) if (m.acc === a.id && m.date >= start && m.date <= t) p += pnlOf(m);
      const b0 = balanceOf(a, moves, addDays(start, -1));
      return { account: a, pnl: p, ret: b0 ? (p / b0) * 100 : 0 };
    })
    .sort((x, y) => y.pnl - x.pnl);
}

export function sparkline(a: Account, moves: Movement[], days = 60) {
  const t = today();
  const start = addDays(t, -days + 1);
  let b = balanceOf(a, moves, addDays(start, -1));
  const byDay = new Map<string, number>();
  for (const m of moves) if (m.acc === a.id && m.date >= start) byDay.set(m.date, (byDay.get(m.date) ?? 0) + signed(m));
  const pts: number[] = [];
  for (let i = 0; i < days; i++) {
    b += byDay.get(addDays(start, i)) ?? 0;
    pts.push(b);
  }
  return pts;
}
