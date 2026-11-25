import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { group, parseNumber } from '@/lib/format';
import { useShotUrl } from '@/lib/shots';
import { withAlpha } from '@/lib/theme';
import { BAD_EMOTIONS, EMOTION_LABEL, EMOTIONS, type Emotion, type Movement, type Side } from '@/lib/types';
import { useStore } from '@/store/store';

import { Icon } from './icon';
import { Field, tap, Txt } from './ui';

/** Lo que se escribe en el formulario (los números como texto, tal cual los teclea el usuario). */
export type Details = {
  symbol: string; side: Side | null; lots: string; entry: string; exit: string; sl: string; tp: string; risk: string;
  setup: string; emotion: Emotion | null; followedPlan: boolean | null; rating: number | null;
  shot: string | null; shotLocal: string | null;
};

const fmt = (n?: number | null, dec = 2) => (n == null ? '' : group(n, dec).replace(/,?0+$/, '') || '0');
const fmtPrice = (n?: number | null) => (n == null ? '' : String(n).replace('.', ','));

export function detailsOf(m?: Movement): Details {
  return {
    symbol: m?.symbol ?? '', side: m?.side ?? null, lots: fmt(m?.lots), entry: fmtPrice(m?.entry), exit: fmtPrice(m?.exit),
    sl: fmtPrice(m?.sl), tp: fmtPrice(m?.tp), risk: fmt(m?.risk), setup: m?.setup ?? '', emotion: m?.emotion ?? null,
    followedPlan: m?.followedPlan ?? null, rating: m?.rating ?? null, shot: m?.shot ?? null, shotLocal: m?.shotLocal ?? null,
  };
}

export const hasDetails = (d: Details) =>
  !!(d.symbol || d.side || d.lots || d.entry || d.exit || d.sl || d.tp || d.risk || d.setup || d.emotion || d.followedPlan !== null || d.rating || d.shot || d.shotLocal);

const opt = (s: string) => {
  if (!s.trim()) return null;
  const v = parseNumber(s);
  return isNaN(v) || v <= 0 ? NaN : v;
};

/** Convierte el formulario en campos del movimiento. Devuelve un error si algún número no es válido. */
export function parseDetails(d: Details): { fields?: Partial<Movement>; error?: string } {
  const nums = { lots: opt(d.lots), entry: opt(d.entry), exit: opt(d.exit), sl: opt(d.sl), tp: opt(d.tp), risk: opt(d.risk) };
  if (Object.values(nums).some((v) => typeof v === 'number' && isNaN(v))) return { error: 'Los lotes, precios y riesgo deben ser números mayores que 0 (o déjalos vacíos).' };
  return {
    fields: {
      symbol: d.symbol.trim().toUpperCase().slice(0, 20) || null,
      side: d.side,
      lots: nums.lots != null ? Math.round(nums.lots * 100) / 100 : null,
      entry: nums.entry, exit: nums.exit, sl: nums.sl, tp: nums.tp,
      risk: nums.risk != null ? Math.round(nums.risk * 100) / 100 : null,
      setup: d.setup.trim().slice(0, 40) || null,
      emotion: d.emotion, followedPlan: d.followedPlan, rating: d.rating,
      shot: d.shotLocal ? null : d.shot,
      shotLocal: d.shotLocal,
    },
  };
}

/** Los valores más usados de un campo, para elegirlos con un toque. */
function recent(moves: Movement[], key: 'symbol' | 'setup', n = 6) {
  const count = new Map<string, number>();
  for (const m of moves) { const v = m[key]; if (v) count.set(v, (count.get(v) ?? 0) + 1); }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([v]) => v);
}

export function TradeDetails({ value: d, onChange, amount, isWin, currencySymbol }: {
  value: Details; onChange: (d: Details) => void; amount: number | null; isWin: boolean; currencySymbol: string;
}) {
  const { moves, theme: t } = useStore();
  const [open, setOpen] = useState(hasDetails(d));
  const set = (p: Partial<Details>) => onChange({ ...d, ...p });
  const shotUrl = useShotUrl(d);
  const symbols = recent(moves, 'symbol');
  const setups = recent(moves, 'setup');
  const risk = opt(d.risk);
  const r = amount && risk && !isNaN(risk) ? (isWin ? amount : -amount) / risk : null;

  const pick = async (camera: boolean) => {
    tap();
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Sin permiso', camera ? 'Permite el acceso a la cámara en Ajustes del iPhone → TJ Pro.' : 'Permite el acceso a tus fotos en Ajustes del iPhone → TJ Pro.');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.55, allowsEditing: false, exif: false };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.[0]) return;
    set({ shotLocal: res.assets[0].uri });
  };

  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => { tap(); setOpen(true); }}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Math.min(t.r, 16), borderWidth: 1, borderStyle: 'dashed', borderColor: withAlpha(t.accent, 0.5), opacity: pressed ? 0.7 : 1 })}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: withAlpha(t.accent, 0.15), alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={17} color={t.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="body" style={{ fontWeight: '600' }}>Añadir detalles del trade</Txt>
          <Txt v="small">Símbolo, entrada, stop, R, setup, emoción y foto</Txt>
        </View>
      </Pressable>
    );
  }

  const pill = (label: string, on: boolean, onPress: () => void, color = t.accent) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => { tap(); onPress(); }}
      style={{ paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center', borderWidth: 1, borderColor: on ? color : t.border, backgroundColor: on ? withAlpha(color, 0.16) : t.surface }}>
      <Txt v="small" color={on ? t.text : t.muted} style={{ fontWeight: '600' }}>{label}</Txt>
    </Pressable>
  );
  const pills = (children: React.ReactNode) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}>{children}</ScrollView>
  );

  return (
    <View style={{ gap: 14, padding: 14, borderRadius: Math.min(t.r, 18), backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Txt v="h2" style={{ flex: 1 }}>Detalles del trade</Txt>
        <Txt v="small">Todo opcional</Txt>
      </View>

      {/* Foto del gráfico */}
      {shotUrl || d.shot ? (
        <View>
          {shotUrl ? (
            <Image source={{ uri: shotUrl }} contentFit="cover" transition={150} style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: Math.min(t.r, 14), backgroundColor: t.surface2 }} accessibilityLabel="Foto del gráfico" />
          ) : (
            <View style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: Math.min(t.r, 14), backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
              <Txt v="small">Cargando foto…</Txt>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quitar foto"
            hitSlop={8}
            onPress={() => { tap(); set({ shot: null, shotLocal: null }); }}
            style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={15} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[{ cam: false, label: 'Foto de la galería' }, { cam: true, label: 'Hacer foto' }].map((b) => (
            <Pressable
              key={b.label}
              accessibilityRole="button"
              onPress={() => pick(b.cam)}
              style={({ pressed }) => ({ flex: 1, height: 64, borderRadius: Math.min(t.r, 14), backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: pressed ? 0.7 : 1 })}>
              <Icon name={b.cam ? 'camera' : 'image'} size={19} color={t.accent} />
              <Txt v="small" color={t.text} style={{ fontWeight: '600', fontSize: 12 }}>{b.label}</Txt>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Field label="Símbolo" value={d.symbol} onChangeText={(s) => set({ symbol: s })} placeholder="XAUUSD" autoCapitalize="characters" autoCorrect={false} maxLength={20} />
        {symbols.length > 0 && pills(symbols.map((s) => pill(s, d.symbol.toUpperCase() === s, () => set({ symbol: d.symbol.toUpperCase() === s ? '' : s }))))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['long', 'short'] as Side[]).map((s) => {
          const on = d.side === s;
          const c = s === 'long' ? t.pos : t.neg;
          return (
            <Pressable
              key={s}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => { tap(); set({ side: on ? null : s }); }}
              style={{ flex: 1, height: 40, borderRadius: Math.min(t.r, 12), alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: on ? c : t.border, backgroundColor: on ? withAlpha(c, 0.14) : t.surface2 }}>
              <Txt v="body" color={on ? t.text : t.muted} style={{ fontWeight: '700', fontSize: 14 }}>{s === 'long' ? 'Compra' : 'Venta'}</Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Field label="Lotes" value={d.lots} onChangeText={(s) => set({ lots: s })} placeholder="0,10" keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label={`Riesgo (${currencySymbol})`} value={d.risk} onChangeText={(s) => set({ risk: s })} placeholder="10" keyboardType="decimal-pad" /></View>
      </View>
      {r !== null && (
        <Txt v="small" color={r >= 0 ? t.pos : t.neg} style={{ marginTop: -6, fontWeight: '600' }}>
          {r >= 0 ? '+' : ''}{group(r, 2)} R · {r >= 2 ? 'gran trade' : r >= 1 ? 'buen ratio' : r >= 0 ? 'ganancia pequeña para el riesgo' : r <= -1.1 ? 'perdiste más de lo que arriesgabas' : 'pérdida controlada'}
        </Txt>
      )}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Field label="Entrada" value={d.entry} onChangeText={(s) => set({ entry: s })} placeholder="2650,5" keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Salida" value={d.exit} onChangeText={(s) => set({ exit: s })} placeholder="2662" keyboardType="decimal-pad" /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Field label="Stop loss" value={d.sl} onChangeText={(s) => set({ sl: s })} placeholder="2645" keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label="Take profit" value={d.tp} onChangeText={(s) => set({ tp: s })} placeholder="2670" keyboardType="decimal-pad" /></View>
      </View>

      <View style={{ gap: 8 }}>
        <Field label="Setup" value={d.setup} onChangeText={(s) => set({ setup: s })} placeholder="Breakout Londres" maxLength={40} />
        {setups.length > 0 && pills(setups.map((s) => pill(s, d.setup === s, () => set({ setup: d.setup === s ? '' : s }))))}
      </View>

      <View style={{ gap: 8 }}>
        <Txt v="label">¿Cómo estabas?</Txt>
        {pills(EMOTIONS.map((e) => pill(EMOTION_LABEL[e], d.emotion === e, () => set({ emotion: d.emotion === e ? null : e }), BAD_EMOTIONS.includes(e) ? t.neg : t.accent)))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Txt v="label" style={{ flex: 1 }}>¿Seguiste tu plan?</Txt>
        {pill('Sí', d.followedPlan === true, () => set({ followedPlan: d.followedPlan === true ? null : true }), t.pos)}
        {pill('No', d.followedPlan === false, () => set({ followedPlan: d.followedPlan === false ? null : false }), t.neg)}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Txt v="label" style={{ flex: 1 }}>Valoración</Txt>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} de 5`} hitSlop={4} onPress={() => { tap(); set({ rating: d.rating === n ? null : n }); }}>
              <Icon name="star" size={24} color={d.rating && n <= d.rating ? t.warn : t.border} filled={!!d.rating && n <= d.rating} />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
