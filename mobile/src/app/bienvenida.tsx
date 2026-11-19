import { router } from 'expo-router';
import { Image, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Button, success, Txt } from '@/components/ui';
import { withAlpha } from '@/lib/theme';
import { useStore } from '@/store/store';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'up', title: 'Todas tus cuentas', text: 'Reales, de fondeo y demo, con su broker y su mercado.' },
  { icon: 'coin', title: 'Tu P&L real', text: 'Win rate, profit factor y rentabilidad sin que los depósitos inflen tus números.' },
  { icon: 'check', title: 'Reglas de fondeo', text: 'Avisos de pérdida diaria, drawdown y objetivo para no quemar cuentas.' },
  { icon: 'cloud', title: 'Tus datos, bajo tu control', text: 'Úsala sin cuenta o sincroniza en la nube. Bórralo todo cuando quieras.' },
];

export default function Bienvenida() {
  const { theme: t, setPrefs, clearSample, cloudEnabled } = useStore();
  const insets = useSafeAreaInsets();

  const finish = (mode: 'sample' | 'empty' | 'login') => {
    if (mode !== 'sample') clearSample();
    setPrefs({ onboarded: true });
    success();
    router.replace('/');
    if (mode === 'login') setTimeout(() => router.push('/login'), 250);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24, paddingHorizontal: 22, gap: 26 }}>
        <View style={{ alignItems: 'center', gap: 14 }}>
          <Image source={require('@/assets/images/icon.png')} style={{ width: 92, height: 92, borderRadius: 22 }} accessibilityIgnoresInvertColors />
          <Txt v="title" style={{ textAlign: 'center', fontSize: 30 }}>Bienvenido a TJ Pro</Txt>
          <Txt v="small" style={{ textAlign: 'center', fontSize: 15, maxWidth: 320 }}>Tu diario de trading: capital, resultados y disciplina, en un solo sitio.</Txt>
        </View>

        <View style={{ gap: 16 }}>
          {FEATURES.map((f) => (
            <View key={f.title} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: withAlpha(t.accent, 0.15), alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={f.icon} size={20} color={t.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="body" style={{ fontWeight: '700' }}>{f.title}</Txt>
                <Txt v="small">{f.text}</Txt>
              </View>
            </View>
          ))}
        </View>

        <View style={{ gap: 10, marginTop: 6 }}>
          <Button title="Empezar desde cero" onPress={() => finish('empty')} />
          <Button title="Ver con datos de ejemplo" kind="secondary" onPress={() => finish('sample')} />
          {cloudEnabled && <Button title="Ya tengo cuenta" kind="secondary" onPress={() => finish('login')} />}
        </View>
        <Txt v="small" style={{ textAlign: 'center', fontSize: 12 }}>TJ Pro no se conecta a brokers ni es asesoramiento financiero.</Txt>
      </ScrollView>
    </View>
  );
}
