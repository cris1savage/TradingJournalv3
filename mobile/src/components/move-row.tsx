import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { signed } from '@/lib/calc';
import { group, money, shortDate } from '@/lib/format';
import { withAlpha } from '@/lib/theme';
import { MOVE_TYPES, rMultiple, type Movement } from '@/lib/types';
import { useStore } from '@/store/store';

import { Icon } from './icon';
import { Txt } from './ui';

export function MoveRow({ m, onLongPress, editable = true }: { m: Movement; onLongPress?: () => void; editable?: boolean }) {
  const { accounts, prefs, theme: t } = useStore();
  const a = accounts.find((x) => x.id === m.acc);
  // Payout se muestra como dinero que entra en tu bolsillo; coste, como gasto
  const v = m.type === 'payout' ? m.amount : m.type === 'coste' ? -m.amount : signed(m);
  const icon = m.type === 'ganancia' ? 'up' : m.type === 'perdida' ? 'down' : m.type === 'comision' || m.type === 'coste' ? 'coin' : m.type === 'deposito' ? 'in' : 'out';
  const color = m.type === 'ganancia' || m.type === 'payout' ? t.pos : m.type === 'perdida' ? t.neg : m.type === 'comision' || m.type === 'coste' ? t.warn : m.type === 'deposito' ? t.accent : t.muted;
  const title = m.symbol ? (m.note ? `${m.symbol} · ${m.note}` : m.symbol) : m.note || MOVE_TYPES[m.type].label;
  const r = rMultiple(m);
  return (
    <Pressable
      accessibilityRole={editable ? 'button' : undefined}
      accessibilityHint={editable ? 'Abre el movimiento para editarlo' : undefined}
      onPress={editable ? () => router.push({ pathname: '/movimiento', params: { id: m.id } }) : undefined}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, opacity: pressed && (editable || onLongPress) ? 0.6 : 1 })}>
      <View style={{ width: 36, height: 36, borderRadius: Math.min(t.r, 12), backgroundColor: withAlpha(color, 0.14), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt v="body" numberOfLines={1} style={{ fontWeight: '600', flexShrink: 1 }}>{title}</Txt>
          {m.side && <Txt v="small" color={m.side === 'long' ? t.pos : t.neg} style={{ fontSize: 10.5, fontWeight: '700' }}>{m.side === 'long' ? 'BUY' : 'SELL'}</Txt>}
          {(m.shot || m.shotLocal) && <Icon name="camera" size={12} color={t.muted} />}
        </View>
        <Txt v="small" numberOfLines={1}>{[shortDate(m.date), a?.name ?? '—', m.setup].filter(Boolean).join(' · ')}</Txt>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Txt v="num" color={v >= 0 ? t.pos : t.neg}>{money(v, { ...prefs, cur: a?.currency ?? 'USD' }, { dec: 2, signed: true })}</Txt>
        {r !== null && <Txt v="small" style={{ fontSize: 11, fontVariant: ['tabular-nums'] }} color={r >= 0 ? t.pos : t.neg}>{r >= 0 ? '+' : ''}{group(r, 1)} R</Txt>}
      </View>
    </Pressable>
  );
}
