import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Image, Platform, StyleSheet, View } from 'react-native';

import { useStore } from '@/store/store';

import { Button, Txt } from './ui';

export async function canUseBiometrics() {
  if (Platform.OS === 'web') return false;
  const [hw, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
  return hw && enrolled;
}

export async function authenticate(reason = 'Desbloquea TJ Pro') {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: 'Cancelar', fallbackLabel: 'Usar código' });
  return r.success;
}

/** Tapa la app con una pantalla de bloqueo cuando el Face ID está activado. */
export function LockGate({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const { prefs: rawPrefs, theme: t } = useStore();
  const prefs = { ...rawPrefs, faceId: rawPrefs.faceId && enabled };
  const [locked, setLocked] = useState(prefs.faceId && Platform.OS !== 'web');
  const busy = useRef(false);
  const backgroundAt = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (await authenticate()) setLocked(false);
    } finally {
      busy.current = false;
    }
  }, []);

  // Pide Face ID al abrir
  useEffect(() => {
    if (locked) unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vuelve a bloquear si la app pasa más de 30 s en segundo plano
  useEffect(() => {
    if (!prefs.faceId || Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') backgroundAt.current = Date.now();
      if (s === 'active' && backgroundAt.current && Date.now() - backgroundAt.current > 30_000) {
        backgroundAt.current = null;
        setLocked(true);
        unlock();
      }
    });
    return () => sub.remove();
  }, [prefs.faceId, unlock]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked && prefs.faceId && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32 }]}>
          <Image source={require('@/assets/images/icon.png')} style={{ width: 84, height: 84, borderRadius: 20 }} />
          <Txt v="h2">TJ Pro está bloqueada</Txt>
          <Txt v="small" style={{ textAlign: 'center' }}>Usa Face ID o el código del iPhone para ver tus datos.</Txt>
          <Button title="Desbloquear" onPress={unlock} style={{ alignSelf: 'stretch' }} />
        </View>
      )}
    </View>
  );
}
