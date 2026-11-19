import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { LockGate } from '@/components/lock';
import { StoreProvider, useStore } from '@/store/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { ready, authReady, session, cloudEnabled, theme: t } = useStore();
  const loaded = ready && authReady;
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  if (!loaded) return null;

  // Con la nube configurada la app exige cuenta; sin ella (solo en desarrollo) funciona en local.
  const signedIn = !cloudEnabled || !!session;
  const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: t.bg, card: t.surface, text: t.text, border: t.border, primary: t.accent } };

  return (
    <ThemeProvider value={navTheme}>
      <LockGate enabled={signedIn}>
        <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Protected guard={signedIn} redirectTo="/bienvenida">
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="cuenta" options={{ presentation: 'modal' }} />
            <Stack.Screen name="movimiento" options={{ presentation: 'modal' }} />
            <Stack.Screen name="password" options={{ presentation: 'modal' }} />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn} redirectTo="/">
            <Stack.Screen name="bienvenida" />
            <Stack.Screen name="login" options={{ presentation: 'modal' }} />
          </Stack.Protected>
        </Stack>
      </LockGate>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <StoreProvider>
      <Root />
    </StoreProvider>
  );
}
