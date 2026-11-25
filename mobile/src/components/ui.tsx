import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import {
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View,
  type PressableProps, type RefreshControlProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { withAlpha } from '@/lib/theme';
import { useTheme } from '@/store/store';

import { Icon, type IconName } from './icon';

/** Cristal líquido de iOS 26 en los botones redondos (en versiones anteriores, el estilo normal). */
const GLASS = Platform.OS === 'ios' && (() => { try { return isLiquidGlassAvailable(); } catch { return false; } })();

export const tap = () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); };
export const success = () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); };

/**
 * Tope al tamaño de texto del iPhone (Ajustes → Pantalla → Tamaño del texto):
 * respeta la preferencia, pero sin que la interfaz se desborde.
 */
export const MAX_SCALE = 1.15;

type TxtVariant = 'title' | 'h2' | 'body' | 'small' | 'label' | 'num' | 'bigNum';
export function Txt({ v = 'body', color, style, ...rest }: TextProps & { v?: TxtVariant; color?: string }) {
  const t = useTheme();
  const base: Record<TxtVariant, TextStyle> = {
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.7, color: t.text },
    h2: { fontSize: 16, fontWeight: '700', letterSpacing: -0.25, color: t.text },
    body: { fontSize: 14, color: t.text },
    small: { fontSize: 12.5, color: t.muted },
    label: { fontSize: 10.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: t.muted },
    num: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'], color: t.text },
    bigNum: { fontSize: 31, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'], color: t.text },
  };
  return <Text maxFontSizeMultiplier={MAX_SCALE} {...rest} style={[base[v], color ? { color } : null, style]} />;
}

export function Screen({ children, title, subtitle, right, refresh }: { children: ReactNode; title: string; subtitle?: string; right?: ReactNode; refresh?: React.ReactElement<RefreshControlProps> }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        refreshControl={refresh}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110, paddingHorizontal: 16, gap: 14 }}>
        {t.glow && (
          <View pointerEvents="none" style={styles.glow}>
            <Svg width={width} height={460}>
              <Defs>
                <RadialGradient id="halo" cx={width * 0.85} cy={0} rx={width * 0.9} ry={420} gradientUnits="userSpaceOnUse">
                  <Stop offset="0" stopColor={t.accent} stopOpacity={t.scheme === 'light' ? 0.14 : 0.26} />
                  <Stop offset="1" stopColor={t.accent} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x={0} y={0} width={width} height={460} fill="url(#halo)" />
            </Svg>
          </View>
        )}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Txt v="title">{title}</Txt>
            {subtitle ? <Txt v="small" style={{ marginTop: 2 }}>{subtitle}</Txt> : null}
          </View>
          {right ? <View style={{ flexDirection: 'row', gap: 8 }}>{right}</View> : null}
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

export function Card({ children, style, lift }: { children: ReactNode; style?: StyleProp<ViewStyle>; lift?: boolean }) {
  const t = useTheme();
  const glow = lift && t.glow;
  return (
    <View
      style={[
        { backgroundColor: t.surface, borderColor: glow ? withAlpha(t.accent, 0.35) : t.border, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: t.r, padding: 15 },
        glow && { shadowColor: t.accent, shadowOpacity: t.scheme === 'light' ? 0.18 : 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
        style,
      ]}>
      {t.scheme === 'dark' && <View pointerEvents="none" style={[styles.sheen, { left: t.r * 0.6, right: t.r * 0.6 }]} />}
      {children}
    </View>
  );
}

export function IconButton({ icon, onPress, label, filled }: { icon: IconName; onPress: () => void; label: string; filled?: boolean }) {
  const t = useTheme();
  if (GLASS) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={() => { tap(); onPress(); }}>
        <GlassView
          glassEffectStyle="regular"
          isInteractive
          tintColor={filled ? t.accent : undefined}
          style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={18} color={filled ? t.accentInk : t.text} />
        </GlassView>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => ({
        width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
        backgroundColor: filled ? t.accent : t.surface, borderWidth: filled ? 0 : StyleSheet.hairlineWidth * 2, borderColor: t.border,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={18} color={filled ? t.accentInk : t.text} />
    </Pressable>
  );
}

export function Button({ title, onPress, kind = 'primary', icon, style, disabled }: { title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; icon?: IconName; style?: StyleProp<ViewStyle>; disabled?: boolean } & Pick<PressableProps, 'accessibilityHint'>) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.accent : kind === 'danger' ? withAlpha(t.neg, 0.14) : t.surface2;
  const fg = kind === 'primary' ? t.accentInk : kind === 'danger' ? t.neg : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [{
        height: 46, borderRadius: Math.min(t.r, 23), paddingHorizontal: 18, flexDirection: 'row', gap: 8,
        alignItems: 'center', justifyContent: 'center', backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      }, style]}>
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <Text maxFontSizeMultiplier={MAX_SCALE} style={{ color: fg, fontSize: 14.5, fontWeight: '600', letterSpacing: -0.1 }}>{title}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange, style }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View accessibilityRole="tablist" style={[{ flexDirection: 'row', backgroundColor: t.surface, borderRadius: Math.min(t.r, 14), padding: 3, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.border }, style]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => { tap(); onChange(o.value); }}
            style={{ flex: 1, paddingVertical: 7, borderRadius: Math.min(t.r, 14) - 3, alignItems: 'center', backgroundColor: on ? t.surface2 : 'transparent' }}>
            <Text maxFontSizeMultiplier={MAX_SCALE} style={{ color: on ? t.text : t.muted, fontWeight: on ? '600' : '500', fontSize: 12.5 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string; color?: string }[]; value: T; onChange: (v: T) => void }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => { tap(); onChange(o.value); }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, height: 32, borderRadius: 16,
              borderWidth: 1, borderColor: on ? t.accent : t.border, backgroundColor: on ? withAlpha(t.accent, 0.15) : t.surface,
            }}>
            {o.color ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: o.color }} /> : null}
            <Text maxFontSizeMultiplier={MAX_SCALE} style={{ color: on ? t.text : t.muted, fontWeight: '600', fontSize: 12.5 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: withAlpha(color, 0.14), borderWidth: 1, borderColor: withAlpha(color, 0.35) }}>
      <Text maxFontSizeMultiplier={MAX_SCALE} style={{ color, fontSize: 10.5, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Field({ label, error, ...rest }: TextInputProps & { label: string; error?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 5 }}>
      <Txt v="label">{label}</Txt>
      <TextInput
        placeholderTextColor={withAlpha(t.muted.length === 7 ? t.muted : '#888888', 0.7)}
        keyboardAppearance={t.scheme}
        maxFontSizeMultiplier={MAX_SCALE}
        {...rest}
        style={[{
          height: 46, borderRadius: Math.min(t.r, 14), backgroundColor: t.surface2, borderWidth: 1, borderColor: error ? t.neg : t.border,
          paddingHorizontal: 13, color: t.text, fontSize: 15,
        }, rest.style]}
      />
      {error?.trim() ? <Txt v="small" color={t.neg}>{error}</Txt> : null}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>{children}</View>;
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border }} />;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 460 },
  sheen: { position: 'absolute', top: 0, height: StyleSheet.hairlineWidth * 2, backgroundColor: 'rgba(255,255,255,0.09)' },
});
