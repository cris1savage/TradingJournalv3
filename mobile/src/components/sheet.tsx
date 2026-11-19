import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/store/store';

import { IconButton, Txt } from './ui';

/** Contenedor de las pantallas modales (formularios). */
export function Sheet({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 18 : insets.top + 12, paddingBottom: 8 }}>
        <Txt v="title" style={{ flex: 1, fontSize: 26 }}>{title}</Txt>
        <IconButton icon="close" label="Cerrar" onPress={() => router.back()} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: insets.bottom + 32 }}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
