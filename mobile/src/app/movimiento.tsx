import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Switch, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Sheet } from '@/components/sheet';
import { detailsOf, parseDetails, TradeDetails, type Details } from '@/components/trade-details';
import { Button, Chips, Field, success, tap, Txt } from '@/components/ui';
import { addDays, group, longDate, parseNumber, today } from '@/lib/format';
import { keepLocal } from '@/lib/shots';
import { withAlpha } from '@/lib/theme';
import { CURRENCY_SYMBOL, isArchived, isTradeMove, MOVE_TYPE_KEYS, MOVE_TYPES, MULTI_TYPES, type Movement, type MoveType } from '@/lib/types';
import { useStore } from '@/store/store';

const parseAmount = (s: string) => {
  const v = parseNumber(s);
  return !s.trim() || isNaN(v) || v <= 0 ? null : Math.round(v * 100) / 100;
};

export default function MovimientoForm() {
  const params = useLocalSearchParams<{ acc?: string; id?: string }>();
  const { accounts, moves, addMove, addMoves, updateMove, deleteMove, prefs, theme: t } = useStore();
  const existing = params.id ? moves.find((m) => m.id === params.id) : undefined;
  // se apunta en cuentas activas; al editar se mantiene la cuenta original aunque esté archivada
  const usable = accounts.filter((a) => !isArchived(a) || a.id === existing?.acc);
  const firstAcc = [params.acc, prefs.lastAcc].find((id) => id && usable.some((a) => a.id === id)) ?? usable[0]?.id ?? '';

  const [type, setType] = useState<MoveType>(existing?.type ?? 'ganancia');
  const [acc, setAcc] = useState(existing?.acc ?? firstAcc);
  const [amount, setAmount] = useState(existing ? group(existing.amount, 2) : '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(existing?.date ?? today());
  const [error, setError] = useState<string>();
  const [multi, setMulti] = useState(false);
  const [picked, setPicked] = useState<Record<string, boolean>>(firstAcc ? { [firstAcc]: true } : {});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [det, setDet] = useState<Details>(() => detailsOf(existing));
  // pausa tras pérdidas: para apuntar una operación nueva hay que escribir por qué
  const paused = !existing && !!prefs.pausedUntil && prefs.pausedUntil > today() && (type === 'ganancia' || type === 'perdida') && date >= today();

  const canMulti = !existing && MULTI_TYPES.includes(type) && usable.length > 1;
  const isMulti = multi && canMulti;
  const symOf = (id: string) => CURRENCY_SYMBOL[accounts.find((a) => a.id === id)?.currency ?? 'USD'];
  const typeColor = (k: MoveType) =>
    k === 'ganancia' || k === 'payout' ? t.pos : k === 'perdida' ? t.neg : k === 'comision' || k === 'coste' ? t.warn : k === 'deposito' ? t.accent : t.muted;

  /** Detalles del trade listos para guardar (solo en ganancias y pérdidas). */
  const tradeFields = (): Partial<Movement> | null => {
    const empty: Partial<Movement> = { symbol: null, side: null, lots: null, entry: null, exit: null, sl: null, tp: null, risk: null, setup: null, emotion: null, followedPlan: null, rating: null, shot: null, shotLocal: null };
    if (!isTradeMove({ type })) return empty;
    const r = parseDetails(det);
    if (r.error) { setError(r.error); return null; }
    return r.fields!;
  };

  const save = async () => {
    if (paused && reason.trim().length < 10) { setError('Estás en pausa. Escribe por qué operas hoy (mínimo 10 letras) o vuelve cuando acabe.'); return; }
    if (isMulti) {
      const chosen = usable.filter((a) => picked[a.id]);
      if (!chosen.length) { setError('Elige al menos una cuenta.'); return; }
      const rows = chosen.map((a) => ({ a, v: parseAmount(amounts[a.id] ?? amount) }));
      if (rows.some((r) => r.v === null)) { setError('Pon un importe mayor que 0 en cada cuenta elegida (siempre en positivo).'); return; }
      const f = tradeFields();
      if (!f) return;
      // cada cuenta guarda su propia copia de la foto
      await addMoves(rows.map(({ a, v }) => ({ acc: a.id, type, amount: v!, note: note.trim(), date, ...f, lots: null, risk: null, shotLocal: f.shotLocal ? keepLocal(f.shotLocal, a.id) : null })));
      success();
      router.back();
      return;
    }
    const v = parseAmount(amount);
    if (v === null) { setError('Escribe un importe mayor que 0. Va siempre en positivo: el tipo decide si suma o resta.'); return; }
    if (!acc) { setError('Elige una cuenta.'); return; }
    const f = tradeFields();
    if (!f) return;
    if (f.shotLocal && f.shotLocal !== existing?.shotLocal) f.shotLocal = keepLocal(f.shotLocal, existing?.id ?? 'nuevo');
    const data = { ...f, acc, type, amount: v, note: (paused ? `[En pausa: ${reason.trim()}] ${note.trim()}` : note.trim()).trim().slice(0, 200), date };
    if (existing) await updateMove({ ...existing, ...data });
    else await addMove(data);
    success();
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert('Eliminar movimiento', '¿Seguro? No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteMove(existing.id); router.back(); } },
    ]);
  };

  const t0 = today();
  const quick = Array.from({ length: 14 }, (_, i) => addDays(t0, -i));
  if (!quick.includes(date)) quick.push(date);
  const shortLabel = (d: string) => {
    if (d === t0) return 'Hoy';
    if (d === addDays(t0, -1)) return 'Ayer';
    return longDate(d).split(',')[1]?.trim().split(' ').slice(0, 2).join(' ') ?? d;
  };
  const hint: Partial<Record<MoveType, string>> = {
    payout: 'Dinero que cobras de una cuenta de fondeo. Sale de la cuenta y cuenta como ingreso del negocio.',
    coste: 'Lo que pagas por un challenge, un reset o una suscripción. No cambia el balance de la cuenta.',
  };

  return (
    <Sheet title={existing ? 'Editar movimiento' : 'Nuevo movimiento'}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {MOVE_TYPE_KEYS.map((k) => {
          const on = k === type, c = typeColor(k);
          return (
            <Pressable
              key={k}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => { tap(); setType(k); setError(undefined); }}
              style={{ flexGrow: 1, flexBasis: '30%', height: 44, paddingHorizontal: 4, borderRadius: Math.min(t.r, 14), alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: on ? c : t.border, backgroundColor: on ? withAlpha(c, 0.16) : t.surface }}>
              <Txt v="body" numberOfLines={1} adjustsFontSizeToFit color={on ? t.text : t.muted} style={{ fontWeight: '700', fontSize: 13 }}>{MOVE_TYPES[k].label}</Txt>
            </Pressable>
          );
        })}
      </View>
      {hint[type] ? <Txt v="small" style={{ fontSize: 12, marginTop: -8 }}>{hint[type]}</Txt> : null}

      {canMulti && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Math.min(t.r, 16), backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}>
          <View style={{ flex: 1 }}>
            <Txt v="body" style={{ fontWeight: '700' }}>Varias cuentas a la vez</Txt>
            <Txt v="small">El mismo trade copiado en cada cuenta</Txt>
          </View>
          <Switch value={multi} onValueChange={(v) => { tap(); setMulti(v); }} trackColor={{ true: t.accent, false: t.surface2 }} accessibilityLabel="Varias cuentas a la vez" />
        </View>
      )}

      <Field
        label={isMulti ? 'Importe por defecto' : `Importe (${symOf(acc)})`}
        value={amount}
        onChangeText={(s) => { setAmount(s); setError(undefined); }}
        placeholder="250,00"
        keyboardType="decimal-pad"
        autoFocus={!existing}
        error={error ? ' ' : undefined}
        style={{ height: 58, fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums'], color: typeColor(type) }}
      />

      {isMulti ? (
        <View style={{ gap: 8 }}>
          <Txt v="label">Cuentas e importe de cada una</Txt>
          {usable.map((a) => {
            const on = !!picked[a.id];
            return (
              <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: Math.min(t.r, 14), backgroundColor: t.surface, borderWidth: 1, borderColor: on ? withAlpha(t.accent, 0.5) : t.border }}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={a.name}
                  onPress={() => { tap(); setPicked((p) => ({ ...p, [a.id]: !p[a.id] })); }}
                  hitSlop={6}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: on ? t.accent : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
                    {on && <Icon name="check" size={15} color={t.accentInk} stroke={3} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt v="body" numberOfLines={1} style={{ fontWeight: '600', fontSize: 14 }}>{a.name}</Txt>
                    <Txt v="small" numberOfLines={1} style={{ fontSize: 12 }}>{a.broker} · {a.currency ?? 'USD'}</Txt>
                  </View>
                </Pressable>
                {on && (
                  <TextInput
                    accessibilityLabel={`Importe en ${a.name}`}
                    value={amounts[a.id] ?? amount}
                    onChangeText={(s) => setAmounts((x) => ({ ...x, [a.id]: s }))}
                    placeholder={amount || '0'}
                    placeholderTextColor={t.muted}
                    keyboardType="decimal-pad"
                    keyboardAppearance={t.scheme}
                    maxFontSizeMultiplier={1.15}
                    style={{ width: 110, height: 40, borderRadius: 10, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border, color: typeColor(type), textAlign: 'right', paddingHorizontal: 10, fontWeight: '700', fontVariant: ['tabular-nums'] }}
                  />
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Txt v="label">Cuenta</Txt>
          <Chips options={usable.map((a) => ({ value: a.id, label: a.name, color: a.color }))} value={acc} onChange={setAcc} />
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Txt v="label">Fecha · {longDate(date)}</Txt>
        <Chips value={date} onChange={setDate} options={quick.map((d) => ({ value: d, label: shortLabel(d) }))} />
      </View>

      {paused && (
        <View style={{ gap: 10, padding: 14, borderRadius: Math.min(t.r, 16), backgroundColor: withAlpha(t.neg, 0.12), borderWidth: 1, borderColor: withAlpha(t.neg, 0.45) }}>
          <Txt v="body" style={{ fontWeight: '700' }}>Estás en pausa hasta el {longDate(prefs.pausedUntil!).toLowerCase()}</Txt>
          <Txt v="small" color={t.text}>Lo pactaste contigo en frío. Si de verdad has operado, apúntalo, pero escribe antes el motivo: quedará en la nota.</Txt>
          <Field label="¿Por qué has operado en pausa?" value={reason} onChangeText={setReason} placeholder="Sé sincero contigo" maxLength={80} />
        </View>
      )}
      {isTradeMove({ type }) && (
        <TradeDetails value={det} onChange={(d) => { setDet(d); setError(undefined); }} amount={parseAmount(amount)} isWin={type === 'ganancia'} currencySymbol={symOf(acc)} />
      )}
      <Field label="Nota (opcional)" value={note} onChangeText={setNote} placeholder="Ej.: XAUUSD breakout Londres" maxLength={80} returnKeyType="done" onSubmitEditing={save} />

      {error ? <Txt v="small" color={t.neg} style={{ textAlign: 'center' }}>{error}</Txt> : null}
      <Button
        title={existing ? 'Guardar cambios' : isMulti ? `Guardar en ${usable.filter((a) => picked[a.id]).length} cuentas` : `Guardar ${MOVE_TYPES[type].label.toLowerCase()}`}
        onPress={save}
      />
      {existing && <Button title="Eliminar movimiento" kind="danger" icon="trash" onPress={remove} />}
    </Sheet>
  );
}
