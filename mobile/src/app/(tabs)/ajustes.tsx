import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, Switch, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Button, Card, Divider, Row, Screen, Segmented, tap, Txt } from '@/components/ui';
import { ACCENTS, BACKGROUNDS, withAlpha } from '@/lib/theme';
import type { BgKey } from '@/lib/types';
import { useStore } from '@/store/store';

export default function Ajustes() {
  const { prefs, setPrefs, theme: t, cloudEnabled, session, syncing, refresh, signOut, deleteCloudAccount, hasSample, clearSample, wipeLocal } = useStore();

  return (
    <Screen title="Personalizar" subtitle="Colores, fondo y tu cuenta">
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
          <Txt v="label">Moneda</Txt>
          <Segmented options={[{ value: 'USD', label: 'Dólar $' }, { value: 'EUR', label: 'Euro €' }]} value={prefs.cur} onChange={(v) => setPrefs({ cur: v })} />
        </View>
        <Divider />
        <SwitchRow title="Efecto brillo" sub="Halo de color en tarjetas, estilo plataforma de fondeo" value={prefs.glow} onChange={(v) => setPrefs({ glow: v })} />
        <SwitchRow title="Modo privado" sub="Oculta los importes para hacer capturas" value={prefs.privacy} onChange={(v) => setPrefs({ privacy: v })} />
      </Card>

      <Card style={{ gap: 12 }}>
        <Row>
          <Icon name="cloud" size={20} color={session ? t.pos : t.muted} />
          <Txt v="h2" style={{ flex: 1 }}>Cuenta y sincronización</Txt>
          {syncing && <ActivityIndicator color={t.accent} />}
        </Row>
        {!cloudEnabled ? (
          <Txt v="small">Modo local: tus datos se guardan solo en este iPhone. La sincronización en la nube se activa en cuanto conectemos la base de datos.</Txt>
        ) : session ? (
          <>
            <Txt v="small">Conectado como <Txt v="small" color={t.text} style={{ fontWeight: '600' }}>{session.user.email}</Txt>. Tus cuentas y movimientos se guardan en la nube.</Txt>
            <Row>
              <Button title="Sincronizar" kind="secondary" icon="refresh" onPress={refresh} style={{ flex: 1 }} />
              <Button title="Cerrar sesión" kind="secondary" onPress={signOut} style={{ flex: 1 }} />
            </Row>
            <Button
              title="Eliminar mi cuenta"
              kind="danger"
              onPress={() =>
                Alert.alert('Eliminar tu cuenta', 'Se borrarán para siempre tu usuario, tus cuentas y todos tus movimientos de la nube.', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Eliminar', style: 'destructive', onPress: deleteCloudAccount },
                ])
              }
            />
          </>
        ) : (
          <>
            <Txt v="small">Inicia sesión para guardar tus datos en la nube y tenerlos en todos tus dispositivos. Lo que ya has creado en el iPhone se sube automáticamente.</Txt>
            <Button title="Iniciar sesión o crear cuenta" onPress={() => router.push('/login')} />
          </>
        )}
      </Card>

      <Card style={{ gap: 12 }}>
        <Txt v="h2">Datos</Txt>
        {hasSample && <Button title="Borrar datos de ejemplo" kind="secondary" onPress={clearSample} />}
        {!session && (
          <Button
            title="Borrar todo del iPhone"
            kind="danger"
            onPress={() =>
              Alert.alert('Borrar todo', 'Se eliminarán todas las cuentas y movimientos guardados en este iPhone.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Borrar', style: 'destructive', onPress: wipeLocal },
              ])
            }
          />
        )}
        <Txt v="small" style={{ textAlign: 'center', marginTop: 4, color: withAlpha(t.muted.length === 7 ? t.muted : '#888888', 0.8) }}>
          Versión {Constants.expoConfig?.version ?? '1.0.0'}
        </Txt>
      </Card>
    </Screen>
  );
}

function SwitchRow({ title, sub, value, onChange }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
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
