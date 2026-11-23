import { useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';

import { Icon } from '@/components/icon';
import { authenticate, canUseBiometrics } from '@/components/lock';
import { Card, Divider, Field, Row, Screen, Segmented, tap, Txt } from '@/components/ui';
import { setDailyReminder } from '@/lib/reminder';
import { ACCENTS, BACKGROUNDS } from '@/lib/theme';
import type { BgKey } from '@/lib/types';
import { useStore } from '@/store/store';

export default function Ajustes() {
  const { prefs, setPrefs, theme: t } = useStore();
  const [goal, setGoal] = useState(prefs.monthlyGoal ? String(prefs.monthlyGoal) : '');

  return (
    <Screen title="Estilo" subtitle="Colores, seguridad y hábitos">
      <Card style={{ gap: 14 }}>
        <Txt v="h2">Color de acento</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {ACCENTS.map((a) => {
            const on = a.color.toLowerCase() === prefs.accent.toLowerCase();
            return (
              <Pressable
                key={a.color}
                accessibilityRole="radio"
                accessibilityLabel={a.name}
                accessibilityState={{ selected: on }}
                onPress={() => { tap(); setPrefs({ accent: a.color }); }}
                style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: on ? t.text : 'transparent', padding: 3 }}>
                <View style={{ flex: 1, borderRadius: 20, backgroundColor: a.color, alignItems: 'center', justifyContent: 'center' }}>
                  {on && <Icon name="check" size={16} color={t.accentInk} stroke={3} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ gap: 14 }}>
        <Txt v="h2">Fondo</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(Object.keys(BACKGROUNDS) as BgKey[]).map((k) => {
            const b = BACKGROUNDS[k];
            const on = prefs.bg === k;
            return (
              <Pressable
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => { tap(); setPrefs({ bg: k }); }}
                style={{ flexBasis: '30%', flexGrow: 1, borderRadius: Math.min(t.r, 16), borderWidth: 2, borderColor: on ? t.accent : t.border, overflow: 'hidden' }}>
                <View style={{ height: 56, backgroundColor: b.bg, flexDirection: 'row', gap: 5, padding: 8 }}>
                  <View style={{ flex: 0.45, borderRadius: 6, backgroundColor: b.surface, borderWidth: 1, borderColor: b.border }} />
                  <View style={{ flex: 1, borderRadius: 6, backgroundColor: b.surface, borderWidth: 1, borderColor: b.border, justifyContent: 'flex-end', padding: 5 }}>
                    <View style={{ height: 4, width: '60%', borderRadius: 2, backgroundColor: prefs.accent }} />
                  </View>
                </View>
                <Txt v="small" style={{ paddingHorizontal: 9, paddingVertical: 7, fontWeight: '600', color: t.text, backgroundColor: t.surface2 }}>{b.name}</Txt>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ gap: 16 }}>
        <Txt v="h2">Estilo</Txt>
        <View style={{ gap: 8 }}>
          <Txt v="label">Esquinas</Txt>
          <Segmented options={[{ value: '6', label: 'Rectas' }, { value: '16', label: 'Suaves' }, { value: '26', label: 'Redondas' }]} value={String(prefs.radius)} onChange={(v) => setPrefs({ radius: Number(v) })} />
        </View>
        <View style={{ gap: 8 }}>
          <Txt v="label">Moneda de los totales</Txt>
          <Segmented options={[{ value: 'USD', label: 'Dólar $' }, { value: 'EUR', label: 'Euro €' }, { value: 'GBP', label: 'Libra £' }]} value={prefs.cur} onChange={(v) => setPrefs({ cur: v })} />
          <Txt v="small" style={{ fontSize: 12 }}>Es la moneda de tus totales. Cada cuenta guarda su propia moneda y se convierte con el cambio del día{prefs.fx ? ` (${prefs.fx.at})` : ''}.</Txt>
        </View>
        <Divider />
        <SwitchRow title="Efecto brillo" sub="Halo de color en tarjetas, estilo plataforma de fondeo" value={prefs.glow} onChange={(v) => setPrefs({ glow: v })} />
        <SwitchRow title="Modo privado" sub="Oculta los importes para hacer capturas" value={prefs.privacy} onChange={(v) => setPrefs({ privacy: v })} />
      </Card>

      <Card style={{ gap: 16 }}>
        <Txt v="h2">Seguridad y hábitos</Txt>
        <SwitchRow
          title="Bloqueo con Face ID"
          sub="Pide Face ID o el código del iPhone al abrir la app"
          value={prefs.faceId}
          onChange={async (v) => {
            if (!v) { setPrefs({ faceId: false }); return; }
            if (!(await canUseBiometrics())) { Alert.alert('Face ID no disponible', 'Activa Face ID o un código en los Ajustes del iPhone y vuelve a intentarlo.'); return; }
            if (await authenticate('Activa el bloqueo de TJ Pro')) setPrefs({ faceId: true });
          }}
        />
        <Divider />
        <SwitchRow
          title="Recordatorio diario"
          sub="Un aviso para que apuntes tus operaciones del día"
          value={prefs.reminderHour !== null}
          onChange={async (v) => {
            const hour = v ? 21 : null;
            if (await setDailyReminder(hour)) setPrefs({ reminderHour: hour });
            else Alert.alert('Notificaciones desactivadas', 'Permite las notificaciones de TJ Pro en los Ajustes del iPhone.');
          }}
        />
        {prefs.reminderHour !== null && (
          <Segmented
            options={[18, 20, 21, 22].map((h) => ({ value: String(h), label: `${h}:00` }))}
            value={String(prefs.reminderHour)}
            onChange={async (v) => { const h = Number(v); if (await setDailyReminder(h)) setPrefs({ reminderHour: h }); }}
          />
        )}
        <Divider />
        <View style={{ gap: 8 }}>
          <Txt v="body" style={{ fontWeight: '600' }}>Meta mensual de P&L</Txt>
          <Txt v="small">Aparece en el Dashboard con tu progreso del mes. Déjala vacía para ocultarla.</Txt>
          <Field
            label={`Meta (${prefs.cur === 'EUR' ? '€' : '$'})`}
            value={goal}
            onChangeText={setGoal}
            placeholder="Ej.: 2.000"
            keyboardType="decimal-pad"
            returnKeyType="done"
            onEndEditing={() => {
              const v = Number(goal.replace(/\./g, '').replace(',', '.'));
              setPrefs({ monthlyGoal: goal.trim() && !isNaN(v) && v > 0 ? Math.round(v) : null });
            }}
          />
        </View>
      </Card>

      <Txt v="small" style={{ textAlign: 'center', fontSize: 12 }}>Tu cuenta, tus datos y la privacidad están en la pestaña Perfil.</Txt>
    </Screen>
  );
}

function SwitchRow({ title, sub, value, onChange }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void | Promise<void> }) {
  const t = useStore().theme;
  return (
    <Row style={{ justifyContent: 'space-between', gap: 14 }}>
      <View style={{ flex: 1 }}>
        <Txt v="body" style={{ fontWeight: '600' }}>{title}</Txt>
        <Txt v="small">{sub}</Txt>
      </View>
      <Switch value={value} onValueChange={(v) => { tap(); onChange(v); }} trackColor={{ true: t.accent, false: t.surface2 }} accessibilityLabel={title} />
    </Row>
  );
}
