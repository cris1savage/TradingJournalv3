import { addDays, parseDate, today, uuid } from './format';
import type { Account, Movement } from './types';

/** Datos de ejemplo para el primer arranque. Van marcados con `sample` y nunca se suben a Supabase. */
export function sampleData(): { accounts: Account[]; moves: Movement[] } {
  let seed = 11;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const t = today();
  const start = addDays(t, -150);
  const defs = [
    { name: 'IC Markets', broker: 'IC Markets', market: 'Forex', kind: 'Real', initial: 5000, color: '#3D7BFF', p: { wr: 0.56, win: 120, loss: 85, freq: 0.55, wk: true } },
    { name: 'Cartera largo plazo', broker: 'Interactive Brokers', market: 'Acciones', kind: 'Real', initial: 12000, color: '#22C97A', p: { wr: 0.62, win: 260, loss: 170, freq: 0.18, wk: true } },
    { name: 'Binance Spot', broker: 'Binance', market: 'Cripto', kind: 'Real', initial: 3000, color: '#F5A524', p: { wr: 0.5, win: 140, loss: 110, freq: 0.35, wk: false } },
    { name: 'FTMO 100K', broker: 'FTMO · MT5', market: 'Forex', kind: 'Fondeo', initial: 100000, color: '#A78BFA', p: { wr: 0.55, win: 820, loss: 560, freq: 0.4, wk: true } },
    { name: 'Apex 50K', broker: 'Apex · Tradovate', market: 'Futuros', kind: 'Fondeo', initial: 50000, color: '#22D3EE', p: { wr: 0.52, win: 430, loss: 330, freq: 0.45, wk: true } },
  ] as const;
  const accounts: Account[] = defs.map((d) => ({
    id: uuid(), name: d.name, broker: d.broker, market: d.market, kind: d.kind, initial: d.initial, color: d.color, created: start, sample: true,
  }));
  const notes = {
    ganancia: ['Setup A+ en Londres', 'Continuación de tendencia', 'Breakout limpio', 'Rebote en soporte', 'Parcial + BE'],
    perdida: ['Stop por noticia', 'Entrada precipitada', 'Falso breakout', 'Contra tendencia', 'Stop ajustado'],
  };
  const moves: Movement[] = [];
  const add = (acc: Account, date: string, type: Movement['type'], amount: number, note: string) =>
    moves.push({ id: uuid(), acc: acc.id, date, type, amount: Math.round(amount * 100) / 100, note, sample: true });

  for (let i = 1; i <= 150; i++) {
    const d = addDays(start, i);
    const wd = parseDate(d).getDay();
    defs.forEach((def, idx) => {
      if (def.p.wk && (wd === 0 || wd === 6)) return;
      if (rnd() > def.p.freq) return;
      const win = rnd() < def.p.wr;
      const type = win ? 'ganancia' : 'perdida';
      add(accounts[idx], d, type, (win ? def.p.win : def.p.loss) * (0.45 + rnd() * 1.1), notes[type][Math.floor(rnd() * 5)]);
    });
    if (d.endsWith('-01')) {
      add(accounts[0], d, 'comision', 18 + rnd() * 20, 'Comisiones del mes');
      add(accounts[1], d, 'comision', 6 + rnd() * 8, 'Comisiones del mes');
    }
  }
  add(accounts[1], addDays(t, -70), 'deposito', 2000, 'Aportación mensual');
  add(accounts[1], addDays(t, -40), 'deposito', 2000, 'Aportación mensual');
  add(accounts[3], addDays(t, -21), 'retiro', 3200, 'Payout FTMO (80 %)');
  add(accounts[0], addDays(t, -55), 'retiro', 800, 'Retiro a banco');
  return { accounts, moves };
}
