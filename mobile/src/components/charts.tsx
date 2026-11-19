import { useState } from 'react';
import { View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { withAlpha } from '@/lib/theme';
import { useTheme } from '@/store/store';

import { Txt } from './ui';

function linePath(values: number[], w: number, h: number, pad = 6) {
  const min = Math.min(...values), max = Math.max(...values);
  const rng = max - min || 1;
  const y = (v: number) => pad + (h - pad * 2) * (1 - (v - min) / rng);
  const x = (i: number) => (values.length < 2 ? w / 2 : pad + (i * (w - pad * 2)) / (values.length - 1));
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return { d, area: `${d} L${x(values.length - 1).toFixed(1)} ${h} L${x(0).toFixed(1)} ${h} Z`, x, y, min, max };
}

/** Gráfica de línea con área degradada; arrastra el dedo para ver cada punto. */
export function AreaChart({ values: input, color, height = 200, onScrub }: { values: number[]; color: string; height?: number; onScrub?: (i: number | null) => void }) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const [idx, setIdx] = useState<number | null>(null);
  const values = input.length < 2 ? [input[0] ?? 0, input[0] ?? 0] : input;
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const pick = (e: GestureResponderEvent) => {
    if (!w || values.length < 2) return;
    const i = Math.max(0, Math.min(values.length - 1, Math.round((e.nativeEvent.locationX / w) * (values.length - 1))));
    if (i !== idx) { setIdx(i); onScrub?.(i); }
  };
  const end = () => { setIdx(null); onScrub?.(null); };
  const g = w ? linePath(values, w, height, 9) : null;
  const zeroY = g && g.min < 0 && g.max > 0 ? g.y(0) : null;
  const last = values.length - 1;
  const pi = idx ?? last;
  return (
    <View
      onLayout={onLayout}
      style={{ height }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={pick}
      onResponderMove={pick}
      onResponderRelease={end}
      onResponderTerminate={end}
      accessibilityRole="image"
      accessibilityLabel="Gráfica de evolución">
      {g && (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.32} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line key={f} x1={0} x2={w} y1={height * f} y2={height * f} stroke={t.border} strokeWidth={1} strokeDasharray="2 6" />
          ))}
          {zeroY !== null && <Line x1={0} x2={w} y1={zeroY} y2={zeroY} stroke={t.muted} strokeOpacity={0.5} strokeWidth={1} strokeDasharray="4 4" />}
          <Path d={g.area} fill="url(#fill)" />
          <Path d={g.d} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {idx !== null && <Line x1={g.x(idx)} x2={g.x(idx)} y1={0} y2={height} stroke={t.muted} strokeWidth={1} />}
          <Circle cx={g.x(pi)} cy={g.y(values[pi])} r={8} fill={withAlpha(color, 0.25)} />
          <Circle cx={g.x(pi)} cy={g.y(values[pi])} r={4} fill={color} stroke={t.surface} strokeWidth={2} />
        </Svg>
      )}
    </View>
  );
}

export function Sparkline({ values, color, height = 44 }: { values: number[]; color: string; height?: number }) {
  const [w, setW] = useState(0);
  const g = w && values.length > 1 ? linePath(values, w, height, 3) : null;
  return (
    <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {g && (
        <Svg width={w} height={height}>
          <Path d={g.area} fill={color} fillOpacity={0.12} />
          <Path d={g.d} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  );
}

/** Donut de reparto (p. ej. capital por mercado). */
export function Donut({ items, size = 150, thickness = 18 }: { items: { label: string; value: number; color: string }[]; size?: number; thickness?: number }) {
  const t = useTheme();
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const r = (size - thickness) / 2, c = size / 2;
  const gap = items.length > 1 ? 0.03 : 0;
  const arcs: { it: (typeof items)[number]; d: string; full: boolean }[] = [];
  for (let i = 0, a0 = -Math.PI / 2; i < items.length; i++) {
    const it = items[i];
    const sweep = (it.value / total) * Math.PI * 2;
    const s = a0 + gap / 2, e = a0 + sweep - gap / 2;
    a0 += sweep;
    if (sweep >= Math.PI * 2 - 0.001) { arcs.push({ it, d: '', full: true }); continue; }
    if (sweep <= gap) continue;
    const large = e - s > Math.PI ? 1 : 0;
    arcs.push({ it, full: false, d: `M${c + r * Math.cos(s)} ${c + r * Math.sin(s)} A${r} ${r} 0 ${large} 1 ${c + r * Math.cos(e)} ${c + r * Math.sin(e)}` });
  }
  return (
    <Svg width={size} height={size} accessibilityLabel="Reparto por mercado">
      <Circle cx={c} cy={c} r={r} stroke={t.surface2} strokeWidth={thickness} fill="none" />
      {arcs.map((a, i) =>
        a.full ? (
          <Circle key={i} cx={c} cy={c} r={r} stroke={a.it.color} strokeWidth={thickness} fill="none" />
        ) : (
          <Path key={i} d={a.d} stroke={a.it.color} strokeWidth={thickness} fill="none" strokeLinecap="butt" />
        ),
      )}
    </Svg>
  );
}

/** Barras verticales con signo (P&L mensual). */
export function SignedBars({ items, height = 150 }: { items: { label: string; value: number }[]; height?: number }) {
  const t = useTheme();
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  const hasNeg = items.some((i) => i.value < 0);
  const hasPos = items.some((i) => i.value > 0);
  const posH = hasNeg && hasPos ? height * 0.6 : hasNeg ? 0 : height;
  const negH = height - posH;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', height, gap: 10 }}>
        {items.map((it, i) => {
          const h = (Math.abs(it.value) / max) * (it.value >= 0 ? posH : negH || posH);
          return (
            <View key={i} style={{ flex: 1 }}>
              <View style={{ height: posH, justifyContent: 'flex-end' }}>
                {it.value > 0 && <View style={{ height: Math.max(h, 3), backgroundColor: t.pos, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />}
              </View>
              <View style={{ height: negH }}>
                {it.value < 0 && <View style={{ height: Math.max(h, 3), backgroundColor: t.neg, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} />}
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {items.map((it, i) => (
          <Txt key={i} v="small" style={{ flex: 1, textAlign: 'center', fontSize: 12 }}>{it.label}</Txt>
        ))}
      </View>
    </View>
  );
}

/** Barra de progreso simple con color. */
export function Meter({ value, color, track }: { value: number; color: string; track: string }) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(2, Math.min(100, value))}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}
