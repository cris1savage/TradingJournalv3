import { View } from 'react-native';

import { group } from '@/lib/format';
import type { Edge, EdgeRow } from '@/lib/insights';
import { withAlpha } from '@/lib/theme';
import { BAD_EMOTIONS, EMOTION_LABEL, type Emotion } from '@/lib/types';
import { useStore } from '@/store/store';

import { Card, Divider, Row, Txt } from './ui';

/** «Tu edge»: qué te da dinero y qué te lo quita, según los detalles de tus trades. */
export function EdgeCard({ edge, fmt }: { edge: Edge; fmt: (n: number, o?: { dec?: number; signed?: boolean }) => string }) {
  const { theme: t } = useStore();
  if (!edge.trades) {
    return (
      <Card style={{ gap: 6 }}>
        <Txt v="h2">Tu edge</Txt>
        <Txt v="small">Añade símbolo, setup, emoción o riesgo a tus trades y aquí verás qué te da dinero y qué te lo quita.</Txt>
      </Card>
    );
  }

  const r = (x: number | null) => (x === null ? '—' : `${x >= 0 ? '+' : ''}${group(x, 2)} R`);
  const lines: string[] = [];
  const { yes, no } = edge.plan;
  if (no && no.pnl < 0) lines.push(`Saltarte el plan te ha costado ${fmt(-no.pnl, { dec: 0 })}.`);
  if (yes && no && yes.winRate > no.winRate + 5) lines.push(`Con plan aciertas el ${Math.round(yes.winRate)} %; sin plan, el ${Math.round(no.winRate)} %.`);
  const badEmo = edge.byEmotion.filter((e) => BAD_EMOTIONS.includes(e.key as Emotion) && e.pnl < 0).sort((a, b) => a.pnl - b.pnl)[0];
  if (badEmo) lines.push(`Operar con ${badEmo.key === 'fomo' ? 'FOMO' : EMOTION_LABEL[badEmo.key as Emotion].toLowerCase()} te ha costado ${fmt(-badEmo.pnl, { dec: 0 })}.`);
  const best = edge.bySymbol[0];
  if (best && best.pnl > 0 && edge.bySymbol.length > 1) lines.push(`${best.key} es tu mejor símbolo: ${fmt(best.pnl, { dec: 0, signed: true })}.`);

  const kpi = (label: string, value: string, color = t.text) => (
    <View style={{ flex: 1, padding: 11, borderRadius: Math.min(t.r, 12), backgroundColor: t.surface2, gap: 2 }}>
      <Txt v="label" style={{ fontSize: 9.5 }}>{label}</Txt>
      <Txt v="num" color={color} style={{ fontSize: 15, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>{value}</Txt>
    </View>
  );

  const table = (title: string, rows: EdgeRow[], label: (k: string) => string = (k) => k, bad?: (k: string) => boolean, max = 5) => rows.length ? (
    <View style={{ gap: 8 }}>
      <Txt v="label">{title}</Txt>
      {(rows.length > max ? [...rows.slice(0, max - 1), rows[rows.length - 1]] : rows).map((x) => (
        <Row key={x.key} style={{ gap: 8 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: bad?.(x.key) ? t.neg : x.pnl >= 0 ? t.pos : t.neg }} />
          <Txt v="body" numberOfLines={1} style={{ flex: 1, fontWeight: '600', fontSize: 13.5 }}>{label(x.key)}</Txt>
          <Txt v="small" style={{ fontSize: 11.5, fontVariant: ['tabular-nums'] }}>{x.trades} · {Math.round(x.winRate)} %</Txt>
          <Txt v="num" color={x.pnl >= 0 ? t.pos : t.neg} style={{ fontSize: 13.5, minWidth: 74, textAlign: 'right' }}>{fmt(x.pnl, { dec: 0, signed: true })}</Txt>
        </Row>
      ))}
    </View>
  ) : null;

  return (
    <Card style={{ gap: 14 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="h2">Tu edge</Txt>
        <Txt v="small">{edge.trades} trades con detalles</Txt>
      </Row>
      <Row style={{ gap: 8 }}>
        {kpi('R medio', r(edge.avgR), edge.avgR === null ? t.muted : edge.avgR >= 0 ? t.pos : t.neg)}
        {kpi('Con plan', yes ? `${Math.round(yes.winRate)} %` : '—', yes ? t.pos : t.muted)}
        {kpi('Sin plan', no ? `${Math.round(no.winRate)} %` : '—', no ? t.neg : t.muted)}
      </Row>
      {lines.length > 0 && (
        <View style={{ gap: 4, padding: 12, borderRadius: Math.min(t.r, 12), backgroundColor: withAlpha(t.accent, 0.1), borderWidth: 1, borderColor: withAlpha(t.accent, 0.25) }}>
          {lines.slice(0, 3).map((l) => <Txt key={l} v="small" color={t.text}>• {l}</Txt>)}
        </View>
      )}
      {table('Símbolos', edge.bySymbol)}
      {edge.bySetup.length > 0 && <Divider />}
      {table('Setups', edge.bySetup)}
      {edge.byEmotion.length > 0 && <Divider />}
      {table('Emociones', edge.byEmotion, (k) => EMOTION_LABEL[k as Emotion] ?? k, (k) => BAD_EMOTIONS.includes(k as Emotion), 6)}
      <Txt v="small" style={{ fontSize: 11 }}>Trades · % de acierto · resultado</Txt>
    </Card>
  );
}
