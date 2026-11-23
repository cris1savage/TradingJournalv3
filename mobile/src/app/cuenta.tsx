import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Button, Chips, Field, Segmented, success, tap, Txt } from '@/components/ui';
import { today } from '@/lib/format';
import { ACCOUNT_COLORS } from '@/lib/theme';
import {
  CURRENCIES, CURRENCY_SYMBOL, KINDS, MARKETS, STATUS_LABEL, STATUSES,
  type Currency, type Kind, type Market, type Status,
} from '@/lib/types';
import { useStore } from '@/store/store';

const fmtOpt = (n?: number | null) => (n ? String(n).replace('.', ',') : '');
/** Número escrito en estilo español (10.000,50). Vacío → null; inválido → NaN. */
const parseOpt = (s: string) => {
  if (!s.trim()) return null;
  const v = Number(s.replace(/\./g, '').replace(',', '.'));
  return isNaN(v) || v <= 0 ? NaN : Math.round(v * 100) / 100;
};

export default function CuentaForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { accounts, saveAccount, deleteAccount, addMove, moves, prefs, theme: t } = useStore();
  const existing = id ? accounts.find((a) => a.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [broker, setBroker] = useState(existing?.broker ?? '');
  const [market, setMarket] = useState<Market>(existing?.market ?? 'Forex');
  const [kind, setKind] = useState<Kind>(existing?.kind ?? 'Real');
  const [status, setStatus] = useState<Status>(existing?.status ?? 'activa');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? prefs.cur);
  const [initial, setInitial] = useState(existing ? String(existing.initial).replace('.', ',') : '');
  const [color, setColor] = useState(existing?.color ?? ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length]);
  const [dailyLoss, setDailyLoss] = useState(fmtOpt(existing?.dailyLossLimit));
  const [riskPct, setRiskPct] = useState(fmtOpt(existing?.riskPct));
  const [maxTrades, setMaxTrades] = useState(fmtOpt(existing?.maxTradesPerDay));
  const [target, setTarget] = useState(fmtOpt(existing?.profitTarget));
  const [maxDd, setMaxDd] = useState(fmtOpt(existing?.maxDrawdown));
  const [ddType, setDdType] = useState<'static' | 'trailing'>(existing?.drawdownType ?? 'static');
  const [minDays, setMinDays] = useState(fmtOpt(existing?.minTradingDays));
  const [cost, setCost] = useState('');
  const [errors, setErrors] = useState<{ name?: string; initial?: string; rules?: string }>({});

  const sym = CURRENCY_SYMBOL[currency];
  const isFunded = kind === 'Fondeo';

  const pickKind = (k: Kind) => {
    setKind(k);
    // una cuenta de fondeo nueva suele empezar en challenge
    if (!existing && k === 'Fondeo' && status === 'activa') setStatus('challenge');
    if (!existing && k !== 'Fondeo' && status === 'challenge') setStatus('activa');
  };

  const save = async () => {
    const value = Number(initial.replace(/\./g, '').replace(',', '.'));
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Ponle un nombre a la cuenta.';
    if (!initial.trim() || isNaN(value) || value < 0) e.initial = 'Indica el capital inicial (0 o más).';
    const rules = {
      dailyLossLimit: parseOpt(dailyLoss),
      riskPct: parseOpt(riskPct),
      maxTradesPerDay: parseOpt(maxTrades),
      profitTarget: parseOpt(target),
      maxDrawdown: isFunded ? parseOpt(maxDd) : null,
      drawdownType: ddType,
      minTradingDays: isFunded ? parseOpt(minDays) : null,
    };
    const costValue = isFunded && !existing ? parseOpt(cost) : null;
    if ([...Object.values(rules), costValue].some((r) => typeof r === 'number' && isNaN(r))) e.rules = 'Las reglas deben ser números mayores que 0 (o déjalas vacías).';
    if (rules.riskPct && rules.riskPct > 100) e.rules = 'El riesgo por trade es un porcentaje entre 0 y 100.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const clean = {
      ...rules,
      maxTradesPerDay: rules.maxTradesPerDay ? Math.round(rules.maxTradesPerDay) : null,
      minTradingDays: rules.minTradingDays ? Math.round(rules.minTradingDays) : null,
    };
    const accId = await saveAccount({ id: existing?.id, name: name.trim(), broker: broker.trim() || '—', market, kind, status, currency, initial: Math.round(value * 100) / 100, color, ...clean });
    // el coste del challenge se apunta como gasto del negocio del fondeo
    if (costValue) await addMove({ acc: accId, date: today(), type: 'coste', amount: costValue, note: 'Coste del challenge' });
    success();
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    const n = moves.filter((m) => m.acc === existing.id).length;
    Alert.alert('Eliminar cuenta', `Se eliminará «${existing.name}» y sus ${n} movimientos. Si solo quieres dejar de verla, márcala como Quemada o Retirada y se archivará.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteAccount(existing.id); router.back(); } },
    ]);
  };

  const box = { gap: 12, padding: 14, borderRadius: Math.min(t.r, 16), borderWidth: 1, borderColor: t.border, backgroundColor: t.surface };

  return (
    <Sheet title={existing ? 'Editar cuenta' : 'Nueva cuenta'}>
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ej.: FTMO 100K · Fase 1" maxLength={40} error={errors.name} autoFocus={!existing} returnKeyType="next" />
      <Field label="Broker o prop firm" value={broker} onChangeText={setBroker} placeholder="Ej.: Axi, FTMO, Binance" maxLength={40} />

      <View style={{ gap: 8 }}>
        <Txt v="label">Tipo de cuenta</Txt>
        <Segmented options={KINDS.map((k) => ({ value: k, label: k }))} value={kind} onChange={pickKind} />
      </View>

      <View style={{ gap: 8 }}>
        <Txt v="label">Estado</Txt>
        <Chips options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} value={status} onChange={setStatus} />
        {(status === 'quemada' || status === 'retirada') && (
          <Txt v="small" style={{ fontSize: 12 }}>Se archivará: deja de contar en tus totales, pero conservas su historial.</Txt>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <Txt v="label">Moneda de la cuenta</Txt>
        <Segmented options={CURRENCIES.map((c) => ({ value: c, label: `${c} ${CURRENCY_SYMBOL[c]}` }))} value={currency} onChange={setCurrency} />
      </View>

      <Field
        label={`Capital inicial (${sym})`}
        value={initial}
        onChangeText={setInitial}
        placeholder="10.000"
        keyboardType="decimal-pad"
        error={errors.initial}
        style={{ fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }}
      />

      <View style={box}>
        <Txt v="h2">Reglas de la cuenta</Txt>
        <Txt v="small">Todas opcionales. La app te avisa antes de romperlas.</Txt>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label={`Pérdida diaria (${sym})`} value={dailyLoss} onChangeText={setDailyLoss} placeholder="Ej.: 500" keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1 }}><Field label="Riesgo/trade (%)" value={riskPct} onChangeText={setRiskPct} placeholder="Ej.: 0,5" keyboardType="decimal-pad" /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Máx. trades/día" value={maxTrades} onChangeText={setMaxTrades} placeholder="Ej.: 3" keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field label={`Objetivo (${sym})`} value={target} onChangeText={setTarget} placeholder="Ej.: 10.000" keyboardType="decimal-pad" /></View>
        </View>

        {isFunded && (
          <>
            <View style={{ height: 1, backgroundColor: t.border, marginVertical: 2 }} />
            <Txt v="body" style={{ fontWeight: '700' }}>Reglas de la prop firm</Txt>
            <Field label={`Drawdown máximo (${sym})`} value={maxDd} onChangeText={setMaxDd} placeholder="Ej.: 10.000" keyboardType="decimal-pad" />
            <Segmented options={[{ value: 'static', label: 'Estático' }, { value: 'trailing', label: 'Trailing' }]} value={ddType} onChange={setDdType} />
            <Txt v="small" style={{ fontSize: 12 }}>
              {ddType === 'static' ? 'Estático: se mide desde el capital inicial (estilo FTMO).' : 'Trailing: el límite sube con tu balance máximo (estilo Apex o Topstep).'}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Días mínimos" value={minDays} onChangeText={setMinDays} placeholder="Ej.: 4" keyboardType="number-pad" /></View>
              {!existing && <View style={{ flex: 1 }}><Field label={`Coste challenge (${sym})`} value={cost} onChangeText={setCost} placeholder="Ej.: 540" keyboardType="decimal-pad" /></View>}
            </View>
          </>
        )}
        {errors.rules ? <Txt v="small" color={t.neg}>{errors.rules}</Txt> : null}
      </View>

      <View style={{ gap: 8 }}>
        <Txt v="label">Mercado</Txt>
        <Chips options={MARKETS.map((m) => ({ value: m, label: m }))} value={market} onChange={setMarket} />
      </View>
      <View style={{ gap: 8 }}>
        <Txt v="label">Color</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {ACCOUNT_COLORS.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="radio"
              accessibilityLabel={`Color ${c}`}
              accessibilityState={{ selected: c === color }}
              onPress={() => { tap(); setColor(c); }}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c === color ? t.text : 'transparent' }}>
              {c === color && <Icon name="check" size={16} color="#0A0C10" stroke={3} />}
            </Pressable>
          ))}
        </View>
      </View>
      <Button title={existing ? 'Guardar cambios' : 'Crear cuenta'} onPress={save} />
      {existing && <Button title="Eliminar cuenta" kind="danger" icon="trash" onPress={remove} />}
    </Sheet>
  );
}
