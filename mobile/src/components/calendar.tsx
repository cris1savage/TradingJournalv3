import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { compact, MONTHS_SHORT, money, today } from '@/lib/format';
import { monthCells, monthPnl } from '@/lib/insights';
import { withAlpha } from '@/lib/theme';
import { useStore } from '@/store/store';

import { Icon } from './icon';
import { Card, Row, tap, Txt } from './ui';

const MONTHS_LONG = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Calendario mensual de P&L: verde días positivos, rojo negativos, intensidad según el importe. */
export function PnlCalendar({ byDay, onPressDay }: { byDay: Map<string, number>; onPressDay?: (date: string) => void }) {
  const { theme: t, prefs } = useStore();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const cells = monthCells(ym.y, ym.m, byDay);
  const max = Math.max(1, ...cells.map((c) => Math.abs(c?.value ?? 0)));
  const total = monthPnl(ym.y, ym.m, byDay);
  const t0 = today();
  const shift = (d: number) => { tap(); setYm(({ y, m }) => { const x = new Date(y, m + d, 1); return { y: x.getFullYear(), m: x.getMonth() }; }); };
  const isCurrent = ym.y === now.getFullYear() && ym.m === now.getMonth();

  return (
    <Card style={{ gap: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <Txt v="h2">{MONTHS_LONG[ym.m]} {ym.y}</Txt>
          <Txt v="small" color={total > 0 ? t.pos : total < 0 ? t.neg : t.muted} style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {money(total, prefs, { signed: true })} en {MONTHS_SHORT[ym.m]}
          </Txt>
        </View>
        <Row style={{ gap: 6 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" hitSlop={6} onPress={() => shift(-1)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center', transform: [{ scaleX: -1 }] }}>
            <Icon name="chevron" size={16} color={t.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" hitSlop={6} disabled={isCurrent} onPress={() => shift(1)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center', opacity: isCurrent ? 0.35 : 1 }}>
            <Icon name="chevron" size={16} color={t.text} />
          </Pressable>
        </Row>
      </Row>
      <View style={{ flexDirection: 'row' }}>
        {DOW.map((d) => <Txt key={d} v="small" style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' }}>{d}</Txt>)}
      </View>
      <View style={{ gap: 4 }}>
        {Array.from({ length: cells.length / 7 }, (_, w) => (
          <View key={w} style={{ flexDirection: 'row', gap: 4 }}>
            {cells.slice(w * 7, w * 7 + 7).map((c, i) => {
              if (!c) return <View key={i} style={{ flex: 1, aspectRatio: 0.82 }} />;
              const v = c.value;
              const a = v === null ? 0 : 0.18 + 0.7 * Math.min(1, Math.abs(v) / max);
              const bg = v === null ? t.surface2 : withAlpha(v >= 0 ? (t.scheme === 'light' ? '#0E9F5E' : '#22C97A') : (t.scheme === 'light' ? '#E0364A' : '#FF5D6E'), a);
              const strong = a > 0.55;
              return (
                <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${c.day}: ${v === null ? 'sin operaciones' : money(v, prefs, { signed: true })}. Abrir nota del día`}
                  onPress={onPressDay ? () => { tap(); onPressDay(c.date); } : undefined}
                  style={{ flex: 1, aspectRatio: 0.82, borderRadius: 8, backgroundColor: bg, padding: 4, justifyContent: 'space-between', borderWidth: c.date === t0 ? 1.5 : 0, borderColor: t.accent }}>
                  <Txt v="small" style={{ fontSize: 10, color: strong ? '#FFFFFF' : t.muted }}>{c.day}</Txt>
                  {v !== null && !prefs.privacy && (
                    <Txt v="small" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 9, fontWeight: '700', color: strong ? '#FFFFFF' : t.text, fontVariant: ['tabular-nums'] }}>
                      {compact(v, prefs.cur)}
                    </Txt>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </Card>
  );
}
