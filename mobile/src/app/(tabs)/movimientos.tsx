import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, RefreshControl, View } from 'react-native';

import { MoveRow } from '@/components/move-row';
import { Button, Card, Chips, Divider, IconButton, Row, Screen, Txt } from '@/components/ui';
import { signed } from '@/lib/calc';
import { longDate, money } from '@/lib/format';
import { MOVE_TYPE_KEYS, MOVE_TYPES, type Movement, type MoveType } from '@/lib/types';
import { useStore } from '@/store/store';

export default function Movimientos() {
  const { accounts, moves, prefs, theme: t, deleteMove, session, refresh, syncing } = useStore();
  const [acc, setAcc] = useState('all');
  const [type, setType] = useState<'all' | MoveType>('all');
  const [limit, setLimit] = useState(60);

  const filtered = useMemo(
    () => moves
      .filter((m) => (acc === 'all' || m.acc === acc) && (type === 'all' || m.type === type))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [moves, acc, type],
  );
  const net = filtered.reduce((s, m) => s + signed(m), 0);

  const groups = useMemo(() => {
    const out: { date: string; items: Movement[] }[] = [];
    for (const m of filtered.slice(0, limit)) {
      const g = out[out.length - 1];
      if (g && g.date === m.date) g.items.push(m); else out.push({ date: m.date, items: [m] });
    }
    return out;
  }, [filtered, limit]);

  const confirmDelete = (m: Movement) =>
    Alert.alert('Eliminar movimiento', `${MOVE_TYPES[m.type].label} de ${money(m.amount, { ...prefs, privacy: false })}`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMove(m.id) },
    ]);

  return (
    <Screen
      title="Movimientos"
      subtitle="Toca uno para editarlo · mantén pulsado para borrar"
      refresh={session ? <RefreshControl refreshing={syncing} onRefresh={refresh} tintColor={t.accent} /> : undefined}
      right={<IconButton icon="plus" label="Nuevo movimiento" filled onPress={() => router.push(accounts.length ? '/movimiento' : '/cuenta')} />}>
      <Chips value={acc} onChange={setAcc} options={[{ value: 'all', label: 'Todas las cuentas' }, ...accounts.map((a) => ({ value: a.id, label: a.name, color: a.color }))]} />
      <Chips value={type} onChange={setType} options={[{ value: 'all' as const, label: 'Todos' }, ...MOVE_TYPE_KEYS.map((k) => ({ value: k, label: MOVE_TYPES[k].label }))]} />

      <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Txt v="label">Neto</Txt>
          <Txt v="num" color={net >= 0 ? t.pos : t.neg} style={{ fontSize: 22, fontWeight: '700', marginTop: 2 }}>{money(net, prefs, { dec: 2, signed: true })}</Txt>
        </View>
        <Txt v="small">{filtered.length} movimientos</Txt>
      </Card>

      {groups.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 6 }}>
          <Txt v="h2">Sin movimientos</Txt>
          <Txt v="small" style={{ textAlign: 'center' }}>Apunta tu primera ganancia o pérdida con el botón +.</Txt>
        </Card>
      ) : (
        groups.map((g) => {
          const day = g.items.reduce((s, m) => s + signed(m), 0);
          return (
            <View key={g.date} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between', paddingHorizontal: 4 }}>
                <Txt v="label">{longDate(g.date)}</Txt>
                <Txt v="small" color={day >= 0 ? t.pos : t.neg} style={{ fontVariant: ['tabular-nums'], fontWeight: '600' }}>{money(day, prefs, { dec: 2, signed: true })}</Txt>
              </Row>
              <Card style={{ paddingVertical: 4 }}>
                {g.items.map((m, i) => (
                  <View key={m.id}>
                    {i > 0 && <Divider />}
                    <MoveRow m={m} onLongPress={() => confirmDelete(m)} />
                  </View>
                ))}
              </Card>
            </View>
          );
        })
      )}
      {filtered.length > limit && <Button title="Cargar más" kind="secondary" onPress={() => setLimit((l) => l + 60)} />}
    </Screen>
  );
}
