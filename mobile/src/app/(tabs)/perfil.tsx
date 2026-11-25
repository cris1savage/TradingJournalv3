import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, RefreshControl, Text, View } from 'react-native';

import { Button, Card, Divider, Field, Row, Screen, success, Txt } from '@/components/ui';
import { shareCsv } from '@/lib/export';
import { longDate } from '@/lib/format';
import { LEGAL_URL } from '@/lib/links';
import { withAlpha } from '@/lib/theme';
import { useStore } from '@/store/store';

export default function Perfil() {
  const { session, accounts, moves, prefs, theme: t, syncing, refresh, signOut, deleteCloudAccount, deleteCloudData, updateProfileName } = useStore();
  const user = session?.user;
  const savedName = (user?.user_metadata?.name as string | undefined) ?? '';
  const [name, setName] = useState(savedName);
  const [saving, setSaving] = useState(false);
  const email = user?.email ?? '';
  const initials = (savedName || email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'TJ';
  const since = user?.created_at ? longDate(user.created_at.slice(0, 10)) : null;

  const saveName = async () => {
    if (!name.trim() || name.trim() === savedName) return;
    setSaving(true);
    if (await updateProfileName(name)) success();
    setSaving(false);
  };

  return (
    <Screen
      title="Perfil"
      subtitle="Tu cuenta y tus datos"
      refresh={<RefreshControl refreshing={syncing} onRefresh={refresh} tintColor={t.accent} />}>
      <Card lift style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
        <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: withAlpha(t.accent, 0.18), borderWidth: 2, borderColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text maxFontSizeMultiplier={1.15} style={{ color: t.text, fontSize: 26, fontWeight: '800' }}>{initials}</Text>
        </View>
        <Txt v="h2" style={{ fontSize: 20 }}>{savedName || 'Trader'}</Txt>
        <Txt v="small">{email}</Txt>
        {since && <Txt v="small" style={{ fontSize: 12 }}>Miembro desde {since.replace(/^\w+, /, '')}</Txt>}
        <Row style={{ gap: 24, marginTop: 6 }}>
          <View style={{ alignItems: 'center' }}>
            <Txt v="num" style={{ fontSize: 20, fontWeight: '700' }}>{accounts.length}</Txt>
            <Txt v="small" style={{ fontSize: 12 }}>cuentas</Txt>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Txt v="num" style={{ fontSize: 20, fontWeight: '700' }}>{moves.length}</Txt>
            <Txt v="small" style={{ fontSize: 12 }}>movimientos</Txt>
          </View>
        </Row>
      </Card>

      <Card style={{ gap: 12 }}>
        <Txt v="h2">Datos personales</Txt>
        <Field label="Nombre" value={name} onChangeText={setName} autoCapitalize="words" maxLength={40} returnKeyType="done" onSubmitEditing={saveName} />
        {name.trim() !== savedName && name.trim() !== '' && (
          <Button title={saving ? 'Guardando…' : 'Guardar nombre'} onPress={saveName} disabled={saving} />
        )}
        <Field label="Email" value={email} editable={false} style={{ color: t.muted }} />
        <Button title="Cambiar contraseña" kind="secondary" onPress={() => router.push('/password')} />
      </Card>

      <Card style={{ gap: 12 }}>
        <Row>
          <Txt v="h2" style={{ flex: 1 }}>Tus datos</Txt>
          {syncing && <ActivityIndicator color={t.accent} />}
        </Row>
        <Txt v="small">Se guardan en la nube (UE) y se sincronizan en todos tus dispositivos. Desliza hacia abajo para actualizar.</Txt>
        <Button title="Importar historial de MT5" kind="secondary" icon="file" onPress={() => router.push('/importar')} />
        <Button title="Exportar movimientos (CSV)" kind="secondary" onPress={() => shareCsv(accounts, moves, prefs.cur)} />
        <Button title="Privacidad y soporte" kind="secondary" onPress={() => Linking.openURL(LEGAL_URL)} />
      </Card>

      <Card style={{ gap: 12 }}>
        <Button
          title="Cerrar sesión"
          kind="secondary"
          onPress={() =>
            Alert.alert('Cerrar sesión', 'Tus datos siguen guardados en tu cuenta. Podrás volver a entrar cuando quieras.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Cerrar sesión', onPress: signOut },
            ])
          }
        />
        <Divider />
        <Txt v="label" color={t.neg}>Zona peligrosa</Txt>
        <Button
          title="Borrar todos mis datos"
          kind="danger"
          onPress={() =>
            Alert.alert('Borrar tus datos', 'Se borrarán para siempre todas tus cuentas y movimientos. Tu usuario se mantiene para que puedas empezar de cero.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Borrar datos', style: 'destructive', onPress: async () => { if (await deleteCloudData()) Alert.alert('Datos borrados', 'Tus cuentas y movimientos se han eliminado.'); } },
            ])
          }
        />
        <Button
          title="Eliminar mi cuenta"
          kind="danger"
          icon="trash"
          onPress={() =>
            Alert.alert('Eliminar tu cuenta', 'Se borrarán para siempre tu usuario, tus cuentas y todos tus movimientos. Esta acción no se puede deshacer.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Eliminar cuenta', style: 'destructive', onPress: deleteCloudAccount },
            ])
          }
        />
      </Card>

      <Txt v="small" style={{ textAlign: 'center', fontSize: 12 }}>TJ Pro · versión {Constants.expoConfig?.version ?? '1.0.0'}</Txt>
    </Screen>
  );
}
