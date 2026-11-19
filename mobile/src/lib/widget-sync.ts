import { Platform } from 'react-native';

import { balanceOf, pnlOf } from './calc';
import { money, MONTHS_SHORT, today } from './format';
import type { Account, Movement, Prefs } from './types';

/** Envía al widget de la pantalla de inicio el resumen actual. No hace nada fuera de iOS o en Expo Go. */
export function syncWidget(accounts: Account[], moves: Movement[], prefs: Prefs) {
  if (Platform.OS !== 'ios') return;
  try {
    // require diferido: el módulo nativo no existe en Expo Go
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const widget = require('@/widgets/BalanceWidget').default;
    const t = today();
    const month = t.slice(0, 7);
    let total = 0, dayPnl = 0, monthPnl = 0;
    for (const a of accounts) total += balanceOf(a, moves);
    for (const m of moves) {
      const v = pnlOf(m);
      if (m.date === t) dayPnl += v;
      if (m.date.startsWith(month)) monthPnl += v;
    }
    // En el widget los importes también se ocultan si el modo privado está activo
    const fmt = (n: number, signed = false) => money(n, prefs, { dec: Math.abs(n) >= 1000 ? 0 : 2, signed });
    const now = new Date();
    widget.updateSnapshot({
      balance: fmt(total),
      today: fmt(dayPnl, true),
      todayPositive: dayPnl >= 0,
      month: fmt(monthPnl, true),
      monthPositive: monthPnl >= 0,
      monthLabel: `En ${MONTHS_SHORT[now.getMonth()]}`,
      accounts: `${accounts.length} ${accounts.length === 1 ? 'cuenta' : 'cuentas'}`,
      updated: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      accent: prefs.accent,
    });
  } catch {
    // sin widget disponible (Expo Go / web): se ignora
  }
}
