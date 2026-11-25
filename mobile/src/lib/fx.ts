import type { Account, Currency, Movement, Prefs } from './types';

/** Cambio aproximado de reserva, solo si nunca se han podido descargar los del BCE. */
const FALLBACK = { EUR: 0.92, GBP: 0.79 };

type Fx = NonNullable<Prefs['fx']>;

/** Unidades de `cur` por 1 USD. */
function perUsd(cur: Currency, fx: Prefs['fx']) {
  if (cur === 'USD') return 1;
  return fx?.[cur] ?? FALLBACK[cur];
}

export function convert(amount: number, from: Currency = 'USD', to: Currency = 'USD', fx: Prefs['fx'] = null) {
  if (from === to) return amount;
  return (amount / perUsd(from, fx)) * perUsd(to, fx);
}

/** Descarga los cambios del día (Banco Central Europeo vía frankfurter.app). Devuelve null si no hay conexión. */
export async function fetchFx(): Promise<Fx | null> {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP');
    if (!r.ok) return null;
    const j = (await r.json()) as { rates?: { EUR?: number; GBP?: number }; date?: string };
    if (!j.rates?.EUR || !j.rates?.GBP) return null;
    return { EUR: j.rates.EUR, GBP: j.rates.GBP, at: j.date ?? new Date().toISOString().slice(0, 10) };
  } catch {
    return null;
  }
}

/**
 * Copia de cuentas y movimientos con todos los importes en la moneda de visualización,
 * para que los totales sumen cuentas en €, $ y £.
 */
export function toDisplay(accounts: Account[], moves: Movement[], to: Currency, fx: Prefs['fx']) {
  const curOf = new Map(accounts.map((a) => [a.id, a.currency ?? 'USD']));
  const c = (n: number | null | undefined, from: Currency) => (n == null ? n : convert(n, from, to, fx));
  return {
    accounts: accounts.map((a) => {
      const from = a.currency ?? 'USD';
      if (from === to) return a;
      return { ...a, initial: convert(a.initial, from, to, fx), dailyLossLimit: c(a.dailyLossLimit, from), maxDrawdown: c(a.maxDrawdown, from), profitTarget: c(a.profitTarget, from), currency: to };
    }),
    moves: moves.map((m) => {
      const from = curOf.get(m.acc) ?? 'USD';
      return from === to ? m : { ...m, amount: convert(m.amount, from, to, fx), risk: c(m.risk, from) };
    }),
  };
}
