import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Button, Chips, Field, success, tap, Txt } from '@/components/ui';
import { addDays, longDate, today } from '@/lib/format';
import { withAlpha } from '@/lib/theme';
import { MOVE_TYPE_KEYS, MOVE_TYPES, type MoveType } from '@/lib/types';
import { useStore } from '@/store/store';

export default function MovimientoForm() {
  const params = useLocalSearchParams<{ acc?: string }>();
  const { accounts, addMove, prefs, theme: t } = useStore();
  const [type, setType] = useState<MoveType>('ganancia');
  const [acc, setAcc] = useState(params.acc && accounts.some((a) => a.id === params.acc) ? params.acc : accounts[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [error, setError] = useState<string>();

  const typeColor = (k: MoveType) => (k === 'ganancia' ? t.pos : k === 'perdida' ? t.neg : k === 'comision' ? t.warn : k === 'deposito' ? t.accent : t.muted);

  const save = async () => {
    const v = Number(amount.replace(/\./g, '').replace(',', '.'));
    if (!amount.trim() || isNaN(v) || v <= 0) { setError('Escribe un importe mayor que 0. Va siempre en positivo: el tipo decide si suma o resta.'); return; }
    if (!acc) { setError('Elige una cuenta.'); return; }
    await addMove({ acc, type, amount: Math.round(v * 100) / 100, note: note.trim(), date });
    success();
    router.back();
  };

  const t0 = today();
  return (
    <Sheet title="Nuevo movimiento">
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
        autoFocus
        error={error}
        style={{ height: 64, fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'], color: typeColor(type) }}
      />

      <View style={{ gap: 8 }}>
        <Txt v="label">Cuenta</Txt>
        <Chips options={accounts.map((a) => ({ value: a.id, label: a.name, color: a.color }))} value={acc} onChange={setAcc} />
      </View>

      <View style={{ gap: 8 }}>
        <Txt v="label">Fecha · {longDate(date)}</Txt>
        <Chips
          value={date}
          onChange={setDate}
          options={Array.from({ length: 14 }, (_, i) => {
            const d = addDays(t0, -i);
            return { value: d, label: i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : longDate(d).split(',')[1]?.trim().split(' ').slice(0, 2).join(' ') ?? d };
          })}
        />
      </View>

      <Field label="Nota (opcional)" value={note} onChangeText={setNote} placeholder="Ej.: XAUUSD breakout Londres" maxLength={80} returnKeyType="done" onSubmitEditing={save} />

      <Button title={`Guardar ${MOVE_TYPES[type].label.toLowerCase()}`} onPress={save} />
    </Sheet>
  );
}
