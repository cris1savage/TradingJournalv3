import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

import { signed } from './calc';
import { MOVE_TYPES, type Account, type Movement } from './types';

const cell = (v: string | number) => {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
/** Número con coma decimal para que Excel en español lo lea bien. */
const num = (n: number) => n.toFixed(2).replace('.', ',');

export function buildCsv(accounts: Account[], moves: Movement[], cur: string) {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const header = ['Fecha', 'Cuenta', 'Broker', 'Mercado', 'Tipo de cuenta', 'Tipo', `Importe (${cur})`, 'Nota'];
  const rows = [...moves]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((m) => {
      const a = byId.get(m.acc);
      return [m.date, a?.name ?? '', a?.broker ?? '', a?.market ?? '', a?.kind ?? '', MOVE_TYPES[m.type].label, num(signed(m)), m.note];
    });
  // BOM + separador ";" → se abre directamente en Excel/Numbers con acentos correctos
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\n');
}

export async function shareCsv(accounts: Account[], moves: Movement[], cur: string) {
  if (Platform.OS === 'web') return;
  if (!moves.length) {
    Alert.alert('Nada que exportar', 'Todavía no tienes movimientos.');
    return;
  }
  try {
    const file = new File(Paths.cache, `tjpro-movimientos-${new Date().toISOString().slice(0, 10)}.csv`);
    if (file.exists) file.delete();
    file.create();
    file.write(buildCsv(accounts, moves, cur));
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Exportar movimientos' });
  } catch (e) {
    Alert.alert('No se pudo exportar', e instanceof Error ? e.message : String(e));
  }
}
