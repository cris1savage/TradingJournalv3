import { NativeTabs } from 'expo-router/native-tabs';

import { useStore } from '@/store/store';

export default function TabsLayout() {
  const { theme: t } = useStore();
  return (
    <NativeTabs
      tintColor={t.accent}
      iconColor={t.muted}
      backgroundColor={t.surface}
      indicatorColor={t.surface2}
      labelStyle={{ color: t.muted, selected: { color: t.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.xyaxis.line', selected: 'chart.xyaxis.line' }} md="monitoring" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cuentas">
        <NativeTabs.Trigger.Label>Cuentas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'creditcard', selected: 'creditcard.fill' }} md="account_balance_wallet" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="movimientos">
        <NativeTabs.Trigger.Label>Movimientos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'arrow.up.arrow.down', selected: 'arrow.up.arrow.down' }} md="swap_vert" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ajustes">
        <NativeTabs.Trigger.Label>Estilo</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'paintpalette', selected: 'paintpalette.fill' }} md="palette" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
