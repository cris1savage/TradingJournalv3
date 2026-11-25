import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Meter, Sparkline } from '@/components/charts';
import { Icon } from '@/components/icon';
import { PropRules } from '@/components/prop-rules';
import { Button, Card, Chips, IconButton, Row, Screen, Tag, Txt } from '@/components/ui';
import { balanceOf, contributed, sparkline } from '@/lib/calc';
import { propRules, withdrawalPlan } from '@/lib/insights';
import { money, pct } from '@/lib/format';
import { isArchived, STATUS_LABEL, type Account, type Status } from '@/lib/types';
import { useStore } from '@/store/store';

export default function Cuentas() {
  const { accounts, moves, theme: t } = useStore();
  const [filter, setFilter] = useState<'activas' | 'fondeo' | 'archivadas'>('activas');
  const active = accounts.filter((a) => !isArchived(a));
  const archived = accounts.filter(isArchived);
  const list = filter === 'archivadas' ? archived : filter === 'fondeo' ? active.filter((a) => a.kind === 'Fondeo') : active;

  return (
    <Screen
      title="Cuentas"
      subtitle={`${active.length} activas${archived.length ? ` · ${archived.length} archivadas` : ''}`}
      right={<IconButton icon="plus" label="Nueva cuenta" filled onPress={() => router.push('/cuenta')} />}>
      {accounts.length > 0 && (
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'activas' as const, label: `Activas · ${active.length}` },
            { value: 'fondeo' as const, label: 'Fondeo' },
            { value: 'archivadas' as const, label: `Archivadas · ${archived.length}` },
          ]}
        />
      )}
      {list.map((a) => <AccountCard key={a.id} a={a} moves={moves} />)}
      {filter === 'archivadas' && !archived.length && (
        <Card style={{ alignItems: 'center', paddingVertical: 24, gap: 6 }}>
          <Txt v="body" style={{ fontWeight: '700' }}>Sin cuentas archivadas</Txt>
          <Txt v="small" style={{ textAlign: 'center' }}>Cuando marques una cuenta como Quemada o Retirada aparecerá aquí, con todo su historial.</Txt>
        </Card>
      )}
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
  const { prefs: basePrefs, theme: t } = useStore();
  // los importes de cada cuenta se muestran en su propia moneda
  const prefs = { ...basePrefs, cur: a.currency ?? 'USD' };
  const { bal, pnl, ret, spark, count, rules, plan } = useMemo(() => {
    const bal = balanceOf(a, moves);
    const dep = contributed(a, moves);
    return { bal, pnl: bal - dep, ret: dep ? ((bal - dep) / dep) * 100 : 0, spark: sparkline(a, moves), count: moves.filter((m) => m.acc === a.id).length, rules: propRules(a, moves), plan: withdrawalPlan(a, moves) };
  }, [a, moves]);
  const status: Status = a.status ?? 'activa';
  const statusColor = status === 'quemada' ? t.neg : status === 'retirada' ? t.muted : status === 'challenge' ? t.accent : status === 'aprobada' ? t.warn : t.pos;
  const archived = isArchived(a);

  return (
    <Card lift={!archived} style={{ gap: 14, overflow: 'hidden', paddingTop: 19, opacity: archived ? 0.75 : 1 }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: a.color }} />
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Txt v="h2" numberOfLines={1}>{a.name}</Txt>
          <Txt v="small" numberOfLines={1}>{a.kind} · {a.broker} · {a.currency ?? 'USD'}</Txt>
        </View>
        <Tag label={STATUS_LABEL[status]} color={statusColor} />
      </Row>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Txt v="label">Balance</Txt>
          <Txt v="num" style={{ fontSize: 23, fontWeight: '700', letterSpacing: -0.6, marginTop: 2 }}>{money(bal, prefs, { dec: 2 })}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt v="num" color={pnl >= 0 ? t.pos : t.neg}>{money(pnl, prefs, { dec: 2, signed: true })}</Txt>
          <Txt v="small" color={ret >= 0 ? t.pos : t.neg} style={{ fontVariant: ['tabular-nums'] }}>{pct(ret)}</Txt>
        </View>
      </Row>
      <Sparkline values={spark} color={a.color} />
      {!archived && <PropRules rules={rules} currency={a.currency ?? 'USD'} />}
      {!archived && plan && (
        <View style={{ gap: 5 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="small" style={{ fontSize: 12, color: t.text, fontWeight: '600' }}>Próximo retiro</Txt>
            <Txt v="small" style={{ fontSize: 12, fontVariant: ['tabular-nums'] }} color={plan.due ? t.pos : t.muted}>
              {plan.due ? `✓ Retira ${money(plan.amount, prefs, { dec: 0 })}` : `${Math.round(plan.progress)} % · meta ${money(plan.threshold, prefs, { dec: 0 })}`}
            </Txt>
          </Row>
          <Meter value={plan.progress} color={t.pos} track={t.surface2} />
          {plan.withdrawn > 0 && <Txt v="small" style={{ fontSize: 12 }}>Ya te has llevado {money(plan.withdrawn, prefs, { dec: 0 })} a casa</Txt>}
        </View>
      )}
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="small" style={{ fontSize: 12 }}>Inicial {money(a.initial, prefs, { dec: 0 })}</Txt>
        <Txt v="small" style={{ fontSize: 12 }}>{count} movimientos</Txt>
      </Row>
      <Row>
        {!archived && <Button title="Movimiento" icon="plus" onPress={() => router.push({ pathname: '/movimiento', params: { acc: a.id } })} style={{ flex: 1, height: 42 }} />}
        <Button title="Editar" kind="secondary" onPress={() => router.push({ pathname: '/cuenta', params: { id: a.id } })} style={{ flex: 1, height: 42 }} />
      </Row>
    </Card>
  );
}
