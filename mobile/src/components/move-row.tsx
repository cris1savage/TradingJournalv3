import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { signed } from '@/lib/calc';
import { money, shortDate } from '@/lib/format';
import { withAlpha } from '@/lib/theme';
import { MOVE_TYPES, type Movement } from '@/lib/types';
import { useStore } from '@/store/store';

import { Icon } from './icon';
import { Txt } from './ui';

export function MoveRow({ m, onLongPress, editable = true }: { m: Movement; onLongPress?: () => void; editable?: boolean }) {
  const { accounts, prefs, theme: t } = useStore();
  const a = accounts.find((x) => x.id === m.acc);
  const v = signed(m);
  const icon = m.type === 'ganancia' ? 'up' : m.type === 'perdida' ? 'down' : m.type === 'comision' ? 'coin' : m.type === 'deposito' ? 'in' : 'out';
  const color = m.type === 'ganancia' ? t.pos : m.type === 'perdida' ? t.neg : m.type === 'comision' ? t.warn : m.type === 'deposito' ? t.accent : t.muted;
  return (
    <Pressable
      accessibilityRole={editable ? 'button' : undefined}
      accessibilityHint={editable ? 'Abre el movimiento para editarlo' : undefined}
      onPress={editable ? () => router.push({ pathname: '/movimiento', params: { id: m.id } }) : undefined}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, opacity: pressed && (editable || onLongPress) ? 0.6 : 1 })}>
      <View style={{ width: 40, height: 40, borderRadius: Math.min(t.r, 14), backgroundColor: withAlpha(color, 0.14), alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="body" numberOfLines={1} style={{ fontWeight: '600' }}>{m.note || MOVE_TYPES[m.type].label}</Txt>
        <Txt v="small" numberOfLines={1}>{shortDate(m.date)} · {a?.name ?? '—'}</Txt>
      </View>
      <Txt v="num" color={v >= 0 ? t.pos : t.neg}>{money(v, prefs, { dec: 2, signed: true })}</Txt>
    </Pressable>
  );
}
