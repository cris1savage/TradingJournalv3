import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AreaChart, Donut, Meter, SignedBars } from '@/components/charts';
import { MoveRow } from '@/components/move-row';
import { Button, Card, Chips, IconButton, Row, Screen, Segmented, Tag, Txt } from '@/components/ui';
import { byMarket, monthly, periodStart, pnlByAccount, summarize } from '@/lib/calc';
import { group, money, MONTHS_SHORT, pct, shortDate } from '@/lib/format';
import { CHART_PALETTE, withAlpha } from '@/lib/theme';
import type { Period } from '@/lib/types';
import { useStore } from '@/store/store';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7', label: '7D' }, { value: '30', label: '30D' }, { value: '90', label: '90D' }, { value: '365', label: '1A' }, { value: 'all', label: 'Todo' },
];
const PERIOD_TEXT: Record<Period, string> = { '7': 'últimos 7 días', '30': 'últimos 30 días', '90': 'últimos 90 días', '365': 'último año', all: 'desde el inicio' };

export default function Dashboard() {
  const { accounts, moves, prefs, setPrefs, theme: t, hasSample, clearSample } = useStore();
  const [accFilter, setAccFilter] = useState('all');
  const [period, setPeriod] = useState<Period>('30');
  const [mode, setMode] = useState<'pnl' | 'bal'>('pnl');
  const [scrub, setScrub] = useState<number | null>(null);

  const accs = useMemo(() => (accFilter === 'all' ? accounts : accounts.filter((a) => a.id === accFilter)), [accounts, accFilter]);
  const start = useMemo(() => periodStart(period, accounts, moves), [period, accounts, moves]);
  const s = useMemo(() => summarize(accs, moves, start), [accs, moves, start]);
  const markets = useMemo(() => byMarket(accs, moves), [accs, moves]);
  const months = useMemo(() => monthly(accs, moves), [accs, moves]);
  const perAcc = useMemo(() => pnlByAccount(accs, moves, start), [accs, moves, start]);
  const recent = useMemo(() => {
    const ids = new Set(accs.map((a) => a.id));
    return moves.filter((m) => ids.has(m.acc)).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  }, [accs, moves]);

  const fmt = (n: number, o?: { dec?: number; signed?: boolean }) => money(n, prefs, o);
  const values = s.series.map((p) => (mode === 'pnl' ? p.pnl : p.balance));
  const lineColor = mode === 'pnl' && (values[values.length - 1] ?? 0) < 0 ? t.neg : t.accent;
  const scrubPoint = scrub !== null ? s.series[scrub] : null;

  const header = (
    <>
      <IconButton icon={prefs.privacy ? 'eye-off' : 'eye'} label={prefs.privacy ? 'Mostrar importes' : 'Ocultar importes'} onPress={() => setPrefs({ privacy: !prefs.privacy })} />
      <IconButton icon="plus" label="Nuevo movimiento" filled onPress={() => router.push(accounts.length ? '/movimiento' : '/cuenta')} />
    </>
  );

  if (!accounts.length) {
    return (
      <Screen title="Dashboard" right={header}>
        <Card style={{ alignItems: 'center', paddingVertical: 40, gap: 10 }}>
          <Txt v="h2">Crea tu primera cuenta</Txt>
          <Txt v="small" style={{ textAlign: 'center', maxWidth: 280 }}>Añade tu broker, cartera o cuenta de fondeo con su capital inicial para empezar a ver tus números.</Txt>
          <Button title="Nueva cuenta" icon="plus" onPress={() => router.push('/cuenta')} style={{ marginTop: 8 }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen title="Dashboard" subtitle={`Resumen · ${PERIOD_TEXT[period]}`} right={header}>
      {hasSample && (
        <Card style={{ borderStyle: 'dashed', borderColor: withAlpha(t.accent, 0.5), gap: 10 }}>
          <Txt v="body" style={{ fontWeight: '600' }}>Estás viendo datos de ejemplo</Txt>
          <Txt v="small">Bórralos cuando quieras empezar con tus cuentas reales.</Txt>
          <Button title="Borrar ejemplos y empezar" kind="secondary" onPress={clearSample} />
        </Card>
      )}

      <Chips
        value={accFilter}
        onChange={setAccFilter}
        options={[{ value: 'all', label: 'Todas' }, ...accounts.map((a) => ({ value: a.id, label: a.name, color: a.color }))]}
      />
      <Segmented options={PERIODS} value={period} onChange={setPeriod} />

      <Card lift style={{ gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Txt v="label">{scrubPoint ? shortDate(scrubPoint.date) : mode === 'pnl' ? 'P&L del periodo' : 'Balance total'}</Txt>
          <Txt v="bigNum" color={mode === 'pnl' ? (((scrubPoint?.pnl ?? s.pnl) >= 0) ? t.pos : t.neg) : t.text}>
            {mode === 'pnl' ? fmt(scrubPoint?.pnl ?? s.pnl, { signed: true }) : fmt(scrubPoint?.balance ?? s.total, { dec: 0 })}
          </Txt>
          <Row>
            <Tag label={pct(s.ret)} color={s.ret >= 0 ? t.pos : t.neg} />
            <Txt v="small">rentabilidad en el periodo</Txt>
          </Row>
        </View>
        <AreaChart values={values} color={lineColor} onScrub={setScrub} height={190} />
        <Segmented
          options={[{ value: 'pnl', label: 'P&L acumulado' }, { value: 'bal', label: 'Balance' }]}
          value={mode}
          onChange={setMode}
        />
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Kpi label="Balance total" value={fmt(s.total, { dec: 0 })} sub={`${accs.length} ${accs.length === 1 ? 'cuenta' : 'cuentas'}`} />
        <Kpi label="Win rate" value={`${group(s.winRate, 1)} %`} sub={`${s.wins} G · ${s.losses} P`} />
        <Kpi label="Capital propio" value={fmt(s.own, { dec: 0 })} sub="Real y demo" />
        <Kpi label="Capital fondeo" value={fmt(s.funded, { dec: 0 })} sub={`PF ${s.profitFactor === Infinity ? '∞' : group(s.profitFactor, 2)}`} />
      </View>

      <Card style={{ gap: 14 }}>
        <Txt v="h2">Capital por mercado</Txt>
        <Row style={{ gap: 18, alignItems: 'center' }}>
          <Donut items={markets.map((m, i) => ({ label: m.market, value: m.value, color: i === 0 ? t.accent : CHART_PALETTE[(i - 1) % CHART_PALETTE.length] }))} size={132} />
          <View style={{ flex: 1, gap: 8 }}>
            {markets.map((m, i) => {
              const total = markets.reduce((x, y) => x + y.value, 0) || 1;
              return (
                <Row key={m.market} style={{ justifyContent: 'space-between' }}>
                  <Row style={{ gap: 8, flex: 1 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i === 0 ? t.accent : CHART_PALETTE[(i - 1) % CHART_PALETTE.length] }} />
                    <Txt v="body" numberOfLines={1} style={{ fontSize: 14, flexShrink: 1 }}>{m.market}</Txt>
                  </Row>
                  <Txt v="num" style={{ fontSize: 13 }}>{group((m.value / total) * 100, 0)} %</Txt>
                </Row>
              );
            })}
          </View>
        </Row>
      </Card>

      <Card style={{ gap: 14 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="h2">P&L mensual</Txt>
          <Txt v="small">Últimos 6 meses</Txt>
        </Row>
        <SignedBars items={months.map((m) => ({ label: MONTHS_SHORT[m.month], value: m.value }))} />
      </Card>

      {accFilter === 'all' && perAcc.length > 1 && (
        <Card style={{ gap: 14 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="h2">P&L por cuenta</Txt>
            <Txt v="small">{PERIOD_TEXT[period]}</Txt>
          </Row>
          {perAcc.map(({ account, pnl, ret }) => {
            const max = Math.max(1, ...perAcc.map((x) => Math.abs(x.pnl)));
            return (
              <View key={account.id} style={{ gap: 6 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row style={{ gap: 8, flex: 1 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: account.color }} />
                    <Txt v="body" numberOfLines={1} style={{ fontSize: 14, flexShrink: 1 }}>{account.name}</Txt>
                  </Row>
                  <Txt v="num" color={pnl >= 0 ? t.pos : t.neg} style={{ fontSize: 14 }}>{fmt(pnl, { signed: true })}</Txt>
                </Row>
                <Meter value={(Math.abs(pnl) / max) * 100} color={pnl >= 0 ? t.pos : t.neg} track={t.surface2} />
                <Txt v="small" style={{ fontSize: 12 }}>{pct(ret)}</Txt>
              </View>
            );
          })}
        </Card>
      )}

      <Card style={{ gap: 4 }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <Txt v="h2">Últimos movimientos</Txt>
          <Pressable accessibilityRole="link" onPress={() => router.push('/movimientos')} hitSlop={8}>
            <Txt v="small" color={t.accent} style={{ fontWeight: '600' }}>Ver todos</Txt>
          </Pressable>
        </Row>
        {recent.length ? recent.map((m) => <MoveRow key={m.id} m={m} />) : <Txt v="small">Aún no hay movimientos.</Txt>}
      </Card>
    </Screen>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card style={{ flexGrow: 1, flexBasis: '45%', gap: 6, padding: 14 }}>
      <Txt v="label">{label}</Txt>
      <Txt v="num" style={{ fontSize: 20, fontWeight: '700', letterSpacing: -0.4 }} numberOfLines={1} adjustsFontSizeToFit>{value}</Txt>
      <Txt v="small" style={{ fontSize: 12 }}>{sub}</Txt>
    </Card>
  );
}
