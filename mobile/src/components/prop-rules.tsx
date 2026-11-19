import { View } from 'react-native';

import { money } from '@/lib/format';
import type { RuleState } from '@/lib/insights';
import { useStore } from '@/store/store';

import { Meter } from './charts';
import { Row, Txt } from './ui';

/** Barras de reglas de fondeo: verde/neutro, ámbar al 50 %, rojo al 80 %. */
export function PropRules({ rules }: { rules: RuleState[] }) {
  const { theme: t, prefs } = useStore();
  if (!rules.length) return null;
  return (
    <View style={{ gap: 10 }}>
      {rules.map((r) => {
        const color = r.kind === 'goal' ? (r.used >= 100 ? t.pos : t.accent) : r.used >= 80 ? t.neg : r.used >= 50 ? t.warn : t.pos;
        const tail = r.kind === 'goal'
          ? r.used >= 100 ? 'Objetivo conseguido' : `Faltan ${money(r.remaining, prefs, { dec: 0 })}`
          : r.remaining <= 0 ? 'Límite superado' : `Quedan ${money(r.remaining, prefs, { dec: 0 })}`;
        return (
          <View key={r.label} style={{ gap: 5 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt v="small" style={{ fontSize: 12, color: t.text, fontWeight: '600' }}>{r.label}</Txt>
              <Txt v="small" style={{ fontSize: 12, fontVariant: ['tabular-nums'] }} color={r.kind === 'risk' && r.used >= 80 ? t.neg : t.muted}>
                {Math.round(r.used)} % · {tail}
              </Txt>
            </Row>
            <Meter value={r.used} color={color} track={t.surface2} />
          </View>
        );
      })}
    </View>
  );
}
