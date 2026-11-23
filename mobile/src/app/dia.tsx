import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { MoveRow } from '@/components/move-row';
import { Sheet } from '@/components/sheet';
import { Button, Card, Divider, Field, success, tap, Txt } from '@/components/ui';
import { signed } from '@/lib/calc';
import { convert } from '@/lib/fx';
import { longDate, money, today } from '@/lib/format';
import { withAlpha } from '@/lib/theme';
import type { DayNote } from '@/lib/types';
import { useStore } from '@/store/store';

const MOODS: { value: NonNullable<DayNote['mood']>; label: string }[] = [
  { value: 'tenso', label: 'Tenso' }, { value: 'fomo', label: 'FOMO' }, { value: 'normal', label: 'Normal' },
  { value: 'centrado', label: 'Centrado' }, { value: 'top', label: 'Top' },
];
const FOLLOWED: { value: NonNullable<DayNote['followed']>; label: string }[] = [
  { value: 'si', label: 'Sí' }, { value: 'medias', label: 'A medias' }, { value: 'no', label: 'No' },
];

export default function Dia() {
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today();
  const { notes, moves, accounts, prefs, saveNote, theme: t } = useStore();
  const existing = notes.find((n) => n.date === date);
  const [plan, setPlan] = useState(existing?.plan ?? '');
  const [review, setReview] = useState(existing?.review ?? '');
  const [mood, setMood] = useState<DayNote['mood']>(existing?.mood ?? null);
  const [followed, setFollowed] = useState<DayNote['followed']>(existing?.followed ?? null);

  const dayMoves = useMemo(() => moves.filter((m) => m.date === date), [moves, date]);
  const summary = useMemo(() => {
    const curOf = new Map(accounts.map((a) => [a.id, a.currency ?? 'USD']));
    let pnl = 0, trades = 0, wins = 0;
    for (const m of dayMoves) {
      if (m.type === 'ganancia' || m.type === 'perdida' || m.type === 'comision') pnl += convert(signed(m), curOf.get(m.acc), prefs.cur, prefs.fx);
      if (m.type === 'ganancia') { trades++; wins++; }
      if (m.type === 'perdida') trades++;
    }
    return { pnl, trades, wins };
  }, [dayMoves, accounts, prefs.cur, prefs.fx]);

  const save = async () => {
    await saveNote({ date, plan: plan.trim(), review: review.trim(), mood, followed });
    success();
    router.back();
  };

  const pill = (on: boolean, color = t.accent) => ({
    flexGrow: 1, height: 40, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const,
    borderWidth: on ? 1.5 : 1, borderColor: on ? color : t.border, backgroundColor: on ? withAlpha(color, 0.16) : t.surface,
  });

  return (
    <Sheet title={longDate(date)}>
      <Txt v="num" color={summary.pnl > 0 ? t.pos : summary.pnl < 0 ? t.neg : t.muted} style={{ marginTop: -10 }}>
        {money(summary.pnl, prefs, { signed: true })} · {summary.trades} {summary.trades === 1 ? 'trade' : 'trades'} · {summary.wins} {summary.wins === 1 ? 'ganador' : 'ganadores'}
      </Txt>

      <Field label="Plan antes de abrir" value={plan} onChangeText={setPlan} multiline placeholder="Qué vas a operar, cuántos trades como máximo, cuándo paras…" maxLength={2000} style={{ height: 96, paddingTop: 12, textAlignVertical: 'top' }} />
      <Field label="Cómo fue la sesión" value={review} onChangeText={setReview} multiline placeholder="Qué hiciste bien, qué errores cometiste…" maxLength={2000} style={{ height: 96, paddingTop: 12, textAlignVertical: 'top' }} />

      <View style={{ gap: 8 }}>
        <Txt v="label">Cómo te sentiste</Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {MOODS.map((m) => (
            <Pressable key={m.value} accessibilityRole="radio" accessibilityState={{ selected: mood === m.value }} onPress={() => { tap(); setMood(mood === m.value ? null : m.value); }} style={pill(mood === m.value)}>
              <Txt v="small" color={mood === m.value ? t.text : t.muted} style={{ fontWeight: '600' }}>{m.label}</Txt>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Txt v="label">¿Seguiste tu plan?</Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {FOLLOWED.map((f) => {
            const c = f.value === 'si' ? t.pos : f.value === 'medias' ? t.warn : t.neg;
            return (
              <Pressable key={f.value} accessibilityRole="radio" accessibilityState={{ selected: followed === f.value }} onPress={() => { tap(); setFollowed(followed === f.value ? null : f.value); }} style={pill(followed === f.value, c)}>
                <Txt v="small" color={followed === f.value ? t.text : t.muted} style={{ fontWeight: '600' }}>{f.label}</Txt>
              </Pressable>
            );
          })}
        </View>
      </View>

      {dayMoves.length > 0 && (
        <View style={{ gap: 8 }}>
          <Txt v="label">Movimientos del día</Txt>
          <Card style={{ paddingVertical: 4 }}>
            {dayMoves.map((m, i) => (
              <View key={m.id}>
                {i > 0 && <Divider />}
                <MoveRow m={m} />
              </View>
            ))}
          </Card>
        </View>
      )}

      <Button title="Guardar nota" onPress={save} />
    </Sheet>
  );
}
