import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, monospacedDigit, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type BalanceWidgetProps = {
  balance: string;
  today: string;
  todayPositive: boolean;
  month: string;
  monthPositive: boolean;
  monthLabel: string;
  accounts: string;
  updated: string;
  accent: string;
};

// Todo lo que usa el widget va dentro de la función: corre en un entorno aislado.
const BalanceWidget = (props: BalanceWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const bg = '#07090E';
  const muted = '#8E98AD';
  const pos = '#22C97A';
  const neg = '#FF5D6E';
  const small = environment.widgetFamily === 'systemSmall';

  if (small) {
    return (
      <VStack alignment="leading" spacing={4} modifiers={[containerBackground(bg, 'widget'), widgetURL('tradingjournal://')]}>
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(props.accent)]}>TJ PRO</Text>
        <Spacer />
        <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(muted)]}>Balance</Text>
        <Text modifiers={[font({ size: 20, weight: 'bold', design: 'rounded' }), monospacedDigit(), foregroundStyle('#FFFFFF')]}>{props.balance}</Text>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), monospacedDigit(), foregroundStyle(props.todayPositive ? pos : neg)]}>{props.today} hoy</Text>
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={6} modifiers={[containerBackground(bg, 'widget'), widgetURL('tradingjournal://')]}>
      <HStack>
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(props.accent)]}>TJ PRO</Text>
        <Spacer />
        <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{props.accounts}</Text>
      </HStack>
      <Spacer />
      <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(muted)]}>Balance total</Text>
      <Text modifiers={[font({ size: 26, weight: 'bold', design: 'rounded' }), monospacedDigit(), foregroundStyle('#FFFFFF')]}>{props.balance}</Text>
      <HStack spacing={18}>
        <VStack alignment="leading" spacing={1}>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>Hoy</Text>
          <Text modifiers={[font({ size: 15, weight: 'semibold' }), monospacedDigit(), foregroundStyle(props.todayPositive ? pos : neg)]}>{props.today}</Text>
        </VStack>
        <VStack alignment="leading" spacing={1}>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{props.monthLabel}</Text>
          <Text modifiers={[font({ size: 15, weight: 'semibold' }), monospacedDigit(), foregroundStyle(props.monthPositive ? pos : neg)]}>{props.month}</Text>
        </VStack>
        <Spacer />
      </HStack>
      <Text modifiers={[font({ size: 10 }), foregroundStyle(muted), padding({ top: 2 })]}>Actualizado {props.updated}</Text>
    </VStack>
  );
};

export default createWidget('TJBalance', BalanceWidget, {
  balance: '—',
  today: '—',
  todayPositive: true,
  month: '—',
  monthPositive: true,
  monthLabel: 'Este mes',
  accounts: '',
  updated: '',
  accent: '#3D7BFF',
});
