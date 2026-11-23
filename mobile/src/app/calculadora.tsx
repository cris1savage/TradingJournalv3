import { useState } from 'react';
import { View } from 'react-native';

import { Sheet } from '@/components/sheet';
import { Card, Chips, Field, Segmented, Txt } from '@/components/ui';
import { balanceOf } from '@/lib/calc';
import { convert } from '@/lib/fx';
import { group, money, parseNumber } from '@/lib/format';
import { propRules } from '@/lib/insights';
import { withAlpha } from '@/lib/theme';
import { isArchived } from '@/lib/types';
import { useStore } from '@/store/store';

type Instrument = 'forex' | 'oro' | 'indices' | 'otro';

/** Valor (en USD) de mover 1 unidad de stop con 1 lote. Son valores habituales: cada broker puede variar. */
const PRESETS: Record<Instrument, { label: string; unit: string; valuePerLot: number; help: string }> = {
  forex: { label: 'Forex', unit: 'pips', valuePerLot: 10, help: 'Pares con USD detrás (EURUSD, GBPUSD…): 10 $ por pip y lote.' },
  oro: { label: 'Oro', unit: '$ de precio', valuePerLot: 100, help: 'XAUUSD: 1 lote = 100 onzas, así que 1 $ de movimiento = 100 $ por lote.' },
  indices: { label: 'Índices', unit: 'puntos', valuePerLot: 1, help: 'CFD de índices (US30, NAS100…): suele ser 1 $ por punto y lote. Compruébalo en tu broker.' },
  otro: { label: 'Otro', unit: 'unidades', valuePerLot: 1, help: 'Pon cuánto vale en $ mover 1 unidad con 1 lote en tu broker.' },
};

const num = (s: string) => {
  const v = parseNumber(s);
  return isNaN(v) ? 0 : v;
};

export default function Calculadora() {
  const { accounts, moves, prefs, theme: t } = useStore();
  const active = accounts.filter((a) => !isArchived(a));
  const [accId, setAccId] = useState(prefs.lastAcc && active.some((a) => a.id === prefs.lastAcc) ? prefs.lastAcc : active[0]?.id ?? '');
  const acc = active.find((a) => a.id === accId);
  const [instrument, setInstrument] = useState<Instrument>('forex');
  const [mode, setMode] = useState<'pct' | 'amount'>('pct');
  const [risk, setRisk] = useState(acc?.riskPct ? String(acc.riskPct).replace('.', ',') : '0,5');
  const [stop, setStop] = useState('20');
  const [custom, setCustom] = useState('1');

  const cur = acc?.currency ?? 'USD';
  const p = { ...prefs, cur };

  const result = (() => {
    if (!acc) return null;
    const balance = balanceOf(acc, moves);
    const riskAmount = mode === 'pct' ? (balance * num(risk)) / 100 : num(risk);
    const usdPerLot = instrument === 'otro' || instrument === 'indices' ? num(custom) || PRESETS[instrument].valuePerLot : PRESETS[instrument].valuePerLot;
    const perLot = convert(usdPerLot, 'USD', cur, prefs.fx) * num(stop); // pérdida por lote si salta el stop
    const lots = perLot > 0 ? Math.floor((riskAmount / perLot) * 100) / 100 : 0;
    const daily = propRules(acc, moves).find((r) => r.label === 'Pérdida diaria');
    return { balance, riskAmount, lots, realRisk: lots * perLot, daily };
  })();

  if (!acc) {
    return (
      <Sheet title="Calculadora">
        <Txt v="body">Crea una cuenta activa para calcular el tamaño de tus posiciones.</Txt>
      </Sheet>
    );
  }

  const pre = PRESETS[instrument];
  const dailyUse = result?.daily && result.daily.remaining > 0 ? (result.realRisk / result.daily.remaining) * 100 : null;

  return (
    <Sheet title="Calculadora">
      <Chips options={active.map((a) => ({ value: a.id, label: a.name, color: a.color }))} value={accId} onChange={(id) => { setAccId(id); const a = active.find((x) => x.id === id); if (a?.riskPct) { setMode('pct'); setRisk(String(a.riskPct).replace('.', ',')); } }} />

      <View style={{ gap: 8 }}>
        <Txt v="label">Instrumento</Txt>
        <Segmented options={(Object.keys(PRESETS) as Instrument[]).map((k) => ({ value: k, label: PRESETS[k].label }))} value={instrument} onChange={setInstrument} />
        <Txt v="small" style={{ fontSize: 12 }}>{pre.help}</Txt>
      </View>

      {(instrument === 'indices' || instrument === 'otro') && (
        <Field label="Valor en $ por unidad y lote" value={custom} onChangeText={setCustom} keyboardType="decimal-pad" />
      )}

      <View style={{ gap: 8 }}>
        <Txt v="label">Riesgo</Txt>
        <Segmented options={[{ value: 'pct', label: '% de la cuenta' }, { value: 'amount', label: `Importe (${cur})` }]} value={mode} onChange={setMode} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Field label={mode === 'pct' ? 'Riesgo (%)' : `Riesgo (${cur})`} value={risk} onChangeText={setRisk} keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><Field label={`Stop (${pre.unit})`} value={stop} onChangeText={setStop} keyboardType="decimal-pad" /></View>
      </View>

      {result && (
        <Card lift style={{ alignItems: 'center', gap: 6, paddingVertical: 22 }}>
          <Txt v="label">Tamaño de posición</Txt>
          <Txt v="bigNum" style={{ fontSize: 46 }}>{group(result.lots, 2)} <Txt v="h2" color={t.muted}>lotes</Txt></Txt>
          <Txt v="small" style={{ textAlign: 'center' }}>
            Arriesgas {money(result.realRisk, p, { dec: 0 })} de {money(result.balance, p, { dec: 0 })}
          </Txt>
        </Card>
      )}

      {result?.daily && (
        <View style={{ padding: 14, borderRadius: Math.min(t.r, 16), backgroundColor: withAlpha(result.daily.remaining <= 0 || (dailyUse ?? 0) > 100 ? t.neg : t.warn, 0.12), borderWidth: 1, borderColor: withAlpha(result.daily.remaining <= 0 || (dailyUse ?? 0) > 100 ? t.neg : t.warn, 0.4) }}>
          <Txt v="small" color={t.text}>
            {result.daily.remaining <= 0
              ? `Ya has llegado a tu pérdida diaria en ${acc.name}. Hoy no deberías abrir más operaciones.`
              : `Te quedan ${money(result.daily.remaining, p, { dec: 0 })} de pérdida diaria en ${acc.name}. Este trade usaría el ${Math.round(dailyUse ?? 0)} %.`}
          </Txt>
        </View>
      )}
      <Txt v="small" style={{ fontSize: 12, textAlign: 'center' }}>Cálculo orientativo. Revisa el valor del pip o punto en tu plataforma antes de operar.</Txt>
    </Sheet>
  );
}
