import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Sparkline } from '@/components/charts';
import { Icon } from '@/components/icon';
import { PropRules } from '@/components/prop-rules';
import { Button, Card, Chips, IconButton, Row, Screen, Tag, Txt } from '@/components/ui';
import { balanceOf, contributed, sparkline } from '@/lib/calc';
import { propRules } from '@/lib/insights';
import { money, pct } from '@/lib/format';
import { MARKETS, type Account } from '@/lib/types';
import { useStore } from '@/store/store';

export default function Cuentas() {
  const { accounts, moves, theme: t } = useStore();
  const [market, setMarket] = useState<string>('all');
  const markets = MARKETS.filter((m) => accounts.some((a) => a.market === m));
  const list = market === 'all' ? accounts : accounts.filter((a) => a.market === market);

  return (
    <Screen
      title="Cuentas"
      subtitle="Capital real, fondeo y demo"
      right={<IconButton icon="plus" label="Nueva cuenta" filled onPress={() => router.push('/cuenta')} />}>
      {accounts.length > 0 && (
        <Chips
          value={market}
          onChange={setMarket}
          options={[{ value: 'all', label: `Todas · ${accounts.length}` }, ...markets.map((m) => ({ value: m, label: m }))]}
        />
      )}
      {list.map((a) => <AccountCard key={a.id} a={a} moves={moves} />)}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/cuenta')}
        style={({ pressed }) => ({
          borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.border, borderRadius: t.r, paddingVertical: 28,
          alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1,
        })}>
        <Icon name="plus" size={26} color={t.muted} />
        <Txt v="body" style={{ fontWeight: '700' }}>Añadir cuenta</Txt>
        <Txt v="small">Broker, cartera o cuenta de fondeo</Txt>
      </Pressable>
    </Screen>
  );
}

function AccountCard({ a, moves }: { a: Account; moves: ReturnType<typeof useStore>['moves'] }) {
  const { prefs, theme: t } = useStore();
  const { bal, pnl, ret, spark, count, rules } = useMemo(() => {
    const bal = balanceOf(a, moves);
    const dep = contributed(a, moves);
    return { bal, pnl: bal - dep, ret: dep ? ((bal - dep) / dep) * 100 : 0, spark: sparkline(a, moves), count: moves.filter((m) => m.acc === a.id).length, rules: propRules(a, moves) };
  }, [a, moves]);
  const kindColor = a.kind === 'Fondeo' ? t.accent : a.kind === 'Real' ? t.pos : t.warn;

  return (
    <Card lift style={{ gap: 14, overflow: 'hidden', paddingTop: 19 }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: a.color }} />
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Txt v="h2" numberOfLines={1}>{a.name}</Txt>
          <Txt v="small" numberOfLines={1}>{a.broker} · {a.market}</Txt>
        </View>
        <Tag label={a.kind} color={kindColor} />
      </Row>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Txt v="label">Balance</Txt>
          <Txt v="num" style={{ fontSize: 26, fontWeight: '700', letterSpacing: -0.6, marginTop: 2 }}>{money(bal, prefs, { dec: 2 })}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt v="num" color={pnl >= 0 ? t.pos : t.neg}>{money(pnl, prefs, { dec: 2, signed: true })}</Txt>
          <Txt v="small" color={ret >= 0 ? t.pos : t.neg} style={{ fontVariant: ['tabular-nums'] }}>{pct(ret)}</Txt>
        </View>
      </Row>
      <Sparkline values={spark} color={a.color} />
      <PropRules rules={rules} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="small" style={{ fontSize: 12 }}>Inicial {money(a.initial, prefs, { dec: 0 })}</Txt>
        <Txt v="small" style={{ fontSize: 12 }}>{count} movimientos</Txt>
      </Row>
      <Row>
        <Button title="Movimiento" icon="plus" onPress={() => router.push({ pathname: '/movimiento', params: { acc: a.id } })} style={{ flex: 1, height: 42 }} />
        <Button title="Editar" kind="secondary" onPress={() => router.push({ pathname: '/cuenta', params: { id: a.id } })} style={{ flex: 1, height: 42 }} />
      </Row>
    </Card>
  );
}
