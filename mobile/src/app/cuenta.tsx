import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { Button, Chips, Field, Segmented, success, tap, Txt } from '@/components/ui';
import { ACCOUNT_COLORS } from '@/lib/theme';
import { KINDS, MARKETS, type Kind, type Market } from '@/lib/types';
import { useStore } from '@/store/store';

export default function CuentaForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { accounts, saveAccount, deleteAccount, moves, theme: t } = useStore();
  const existing = id ? accounts.find((a) => a.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [broker, setBroker] = useState(existing?.broker ?? '');
  const [market, setMarket] = useState<Market>(existing?.market ?? 'Forex');
  const [kind, setKind] = useState<Kind>(existing?.kind ?? 'Real');
  const [initial, setInitial] = useState(existing ? String(existing.initial).replace('.', ',') : '');
  const [color, setColor] = useState(existing?.color ?? ACCOUNT_COLORS[accounts.length % ACCOUNT_COLORS.length]);
  const [errors, setErrors] = useState<{ name?: string; initial?: string; rules?: string }>({});
  const fmtOpt = (n?: number | null) => (n ? String(n).replace('.', ',') : '');
  const [dailyLoss, setDailyLoss] = useState(fmtOpt(existing?.dailyLossLimit));
  const [maxDd, setMaxDd] = useState(fmtOpt(existing?.maxDrawdown));
  const [target, setTarget] = useState(fmtOpt(existing?.profitTarget));
  const parseOpt = (s: string) => {
    if (!s.trim()) return null;
    const v = Number(s.replace(/\./g, '').replace(',', '.'));
    return isNaN(v) || v <= 0 ? NaN : Math.round(v * 100) / 100;
  };

  const save = async () => {
    const value = Number(initial.replace(/\./g, '').replace(',', '.'));
    const e: typeof errors = {};
    if (!name.trim()) e.name = 'Ponle un nombre a la cuenta.';
    if (!initial.trim() || isNaN(value) || value < 0) e.initial = 'Indica el capital inicial (0 o más).';
    const rules = kind === 'Fondeo'
      ? { dailyLossLimit: parseOpt(dailyLoss), maxDrawdown: parseOpt(maxDd), profitTarget: parseOpt(target) }
      : { dailyLossLimit: null, maxDrawdown: null, profitTarget: null };
    if (Object.values(rules).some((r) => typeof r === 'number' && isNaN(r))) e.rules = 'Las reglas deben ser importes mayores que 0 (o déjalas vacías).';
    setErrors(e);
    if (Object.keys(e).length) return;
    await saveAccount({ id: existing?.id, name: name.trim(), broker: broker.trim() || '—', market, kind, initial: Math.round(value * 100) / 100, color, ...rules });
    success();
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    const n = moves.filter((m) => m.acc === existing.id).length;
    Alert.alert('Eliminar cuenta', `Se eliminará «${existing.name}» y sus ${n} movimientos.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteAccount(existing.id); router.back(); } },
    ]);
  };

  return (
    <Sheet title={existing ? 'Editar cuenta' : 'Nueva cuenta'}>
      <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ej.: FTMO 100K, Cartera dividendos" maxLength={40} error={errors.name} autoFocus={!existing} returnKeyType="next" />
      <Field label="Broker o cartera" value={broker} onChangeText={setBroker} placeholder="Ej.: IC Markets, Binance, IBKR" maxLength={40} />
      <Field
        label="Capital inicial"
        value={initial}
        onChangeText={setInitial}
        placeholder="10.000"
        keyboardType="decimal-pad"
        error={errors.initial}
        style={{ fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }}
      />
      <View style={{ gap: 8 }}>
        <Txt v="label">Tipo de cuenta</Txt>
        <Segmented options={KINDS.map((k) => ({ value: k, label: k }))} value={kind} onChange={setKind} />
      </View>
      {kind === 'Fondeo' && (
        <View style={{ gap: 12, padding: 14, borderRadius: Math.min(t.r, 16), borderWidth: 1, borderColor: t.border, backgroundColor: t.surface }}>
          <Txt v="h2">Reglas de la prop firm</Txt>
          <Txt v="small">Opcional. La app te avisa cuando te acercas a los límites. Importes en tu moneda.</Txt>
          <Field label="Pérdida diaria máxima" value={dailyLoss} onChangeText={setDailyLoss} placeholder="Ej.: 5.000" keyboardType="decimal-pad" />
          <Field label="Drawdown máximo (desde el capital inicial)" value={maxDd} onChangeText={setMaxDd} placeholder="Ej.: 10.000" keyboardType="decimal-pad" />
          <Field label="Objetivo de beneficio" value={target} onChangeText={setTarget} placeholder="Ej.: 10.000" keyboardType="decimal-pad" error={errors.rules} />
        </View>
      )}
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
