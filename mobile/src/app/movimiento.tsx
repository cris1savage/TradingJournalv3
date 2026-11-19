import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Button, Chips, Field, success, tap, Txt } from '@/components/ui';
import { addDays, group, longDate, today } from '@/lib/format';
import { withAlpha } from '@/lib/theme';
import { MOVE_TYPE_KEYS, MOVE_TYPES, type MoveType } from '@/lib/types';
import { useStore } from '@/store/store';

export default function MovimientoForm() {
  const params = useLocalSearchParams<{ acc?: string; id?: string }>();
  const { accounts, moves, addMove, updateMove, deleteMove, prefs, theme: t } = useStore();
  const existing = params.id ? moves.find((m) => m.id === params.id) : undefined;

  const [type, setType] = useState<MoveType>(existing?.type ?? 'ganancia');
  const [acc, setAcc] = useState(existing?.acc ?? (params.acc && accounts.some((a) => a.id === params.acc) ? params.acc : accounts[0]?.id ?? ''));
  const [amount, setAmount] = useState(existing ? group(existing.amount, 2) : '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(existing?.date ?? today());
  const [error, setError] = useState<string>();

  const typeColor = (k: MoveType) => (k === 'ganancia' ? t.pos : k === 'perdida' ? t.neg : k === 'comision' ? t.warn : k === 'deposito' ? t.accent : t.muted);

  const save = async () => {
    const v = Number(amount.replace(/\./g, '').replace(',', '.'));
    if (!amount.trim() || isNaN(v) || v <= 0) { setError('Escribe un importe mayor que 0. Va siempre en positivo: el tipo decide si suma o resta.'); return; }
    if (!acc) { setError('Elige una cuenta.'); return; }
    const data = { acc, type, amount: Math.round(v * 100) / 100, note: note.trim(), date };
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

  // Fechas rápidas (últimos 14 días) más la del movimiento si es anterior
  const t0 = today();
  const quick = Array.from({ length: 14 }, (_, i) => addDays(t0, -i));
  if (!quick.includes(date)) quick.push(date);
  const shortLabel = (d: string) => {
    if (d === t0) return 'Hoy';
    if (d === addDays(t0, -1)) return 'Ayer';
    return longDate(d).split(',')[1]?.trim().split(' ').slice(0, 2).join(' ') ?? d;
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
              onPress={() => { tap(); setType(k); }}
              style={{ flexGrow: 1, flexBasis: '30%', height: 44, borderRadius: Math.min(t.r, 14), alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: on ? c : t.border, backgroundColor: on ? withAlpha(c, 0.16) : t.surface }}>
              <Txt v="body" color={on ? t.text : t.muted} style={{ fontWeight: '700', fontSize: 14 }}>{MOVE_TYPES[k].label}</Txt>
            </Pressable>
          );
        })}
      </View>

      <Field
        label={`Importe (${prefs.cur === 'EUR' ? '€' : '$'})`}
        value={amount}
        onChangeText={(s) => { setAmount(s); setError(undefined); }}
        placeholder="250,00"
        keyboardType="decimal-pad"
        autoFocus={!existing}
        error={error}
        style={{ height: 64, fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'], color: typeColor(type) }}
      />

      <View style={{ gap: 8 }}>
        <Txt v="label">Cuenta</Txt>
        <Chips options={accounts.map((a) => ({ value: a.id, label: a.name, color: a.color }))} value={acc} onChange={setAcc} />
      </View>

      <View style={{ gap: 8 }}>
        <Txt v="label">Fecha · {longDate(date)}</Txt>
        <Chips value={date} onChange={setDate} options={quick.map((d) => ({ value: d, label: shortLabel(d) }))} />
      </View>

      <Field label="Nota (opcional)" value={note} onChangeText={setNote} placeholder="Ej.: XAUUSD breakout Londres" maxLength={80} returnKeyType="done" onSubmitEditing={save} />

      <Button title={existing ? 'Guardar cambios' : `Guardar ${MOVE_TYPES[type].label.toLowerCase()}`} onPress={save} />
      {existing && <Button title="Eliminar movimiento" kind="danger" icon="trash" onPress={remove} />}
    </Sheet>
  );
}
