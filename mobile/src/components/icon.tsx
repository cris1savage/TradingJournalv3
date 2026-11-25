import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Platform } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export type IconName =
  | 'plus' | 'eye' | 'eye-off' | 'up' | 'down' | 'coin' | 'in' | 'out' | 'trash' | 'chevron' | 'close' | 'cloud' | 'check' | 'refresh'
  | 'calc' | 'alert' | 'file' | 'note' | 'camera' | 'image' | 'star';

/** En iPhone se usan los símbolos nativos de Apple (SF Symbols); en el resto, los de trazo propios. */
const SF: Record<IconName, string> = {
  plus: 'plus', eye: 'eye', 'eye-off': 'eye.slash', up: 'chart.line.uptrend.xyaxis', down: 'chart.line.downtrend.xyaxis',
  coin: 'dollarsign', in: 'arrow.down.to.line', out: 'arrow.up.to.line', trash: 'trash', chevron: 'chevron.right', close: 'xmark',
  cloud: 'icloud', check: 'checkmark', refresh: 'arrow.clockwise', calc: 'plus.forwardslash.minus', alert: 'exclamationmark.circle',
  file: 'doc.text', note: 'note.text', camera: 'camera', image: 'photo', star: 'star',
};

/** Iconos de trazo propios: se ven igual en iOS y Android y heredan el color del tema. */
export function Icon({ name, size = 20, color, stroke = 2, filled }: { name: IconName; size?: number; color: string; stroke?: number; filled?: boolean }) {
  const drawn = <DrawnIcon name={name} size={size} color={color} stroke={stroke} filled={filled} />;
  if (Platform.OS !== 'ios') return drawn;
  const sf = (filled ? `${SF[name]}.fill` : SF[name]) as SymbolViewProps['name'];
  return (
    <SymbolView
      name={sf}
      size={Math.round(size * 0.92)}
      tintColor={color}
      weight={stroke >= 3 ? 'bold' : stroke <= 1.6 ? 'regular' : 'medium'}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
      fallback={drawn}
    />
  );
}

function DrawnIcon({ name, size, color, stroke, filled }: { name: IconName; size: number; color: string; stroke: number; filled?: boolean }) {
  const p = { stroke: color, strokeWidth: stroke, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...p} />}
      {name === 'eye' && (<><Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" {...p} /><Circle cx="12" cy="12" r="3" {...p} /></>)}
      {name === 'eye-off' && (<><Path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 005.4-1.6" {...p} /><Path d="M9.9 9.9a3 3 0 004.2 4.2" {...p} /></>)}
      {name === 'up' && <Path d="M4 16l5-5 4 4 7-7M14 8h6v6" {...p} />}
      {name === 'down' && <Path d="M4 8l5 5 4-4 7 7M14 16h6v-6" {...p} />}
      {name === 'coin' && <Path d="M12 3v18M17 7H9.5a2.5 2.5 0 000 5h5a2.5 2.5 0 010 5H6" {...p} />}
      {name === 'in' && <Path d="M12 4v12M7 11l5 5 5-5M5 20h14" {...p} />}
      {name === 'out' && <Path d="M12 20V8M7 13l5-5 5 5M5 4h14" {...p} />}
      {name === 'trash' && <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" {...p} />}
      {name === 'chevron' && <Path d="M9 6l6 6-6 6" {...p} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'cloud' && <Path d="M7 18a4.5 4.5 0 01-.6-9A6 6 0 0118 9.5 4.3 4.3 0 0117.5 18z" {...p} />}
      {name === 'check' && <Path d="M5 12l5 5 9-10" {...p} />}
      {name === 'calc' && (<><Path d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" {...p} /><Path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" {...p} /></>)}
      {name === 'alert' && (<><Circle cx="12" cy="12" r="9" {...p} /><Path d="M12 7.5v5.5M12 16.5h.01" {...p} /></>)}
      {name === 'file' && (<><Path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" {...p} /><Path d="M14 3v5h5M9 13h6M9 17h4" {...p} /></>)}
      {name === 'note' && (<><Path d="M5 4h14v16H5z" {...p} /><Path d="M9 9h6M9 13h6M9 17h3" {...p} /></>)}
      {name === 'camera' && (<><Path d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" {...p} /><Circle cx="12" cy="13" r="3.5" {...p} /></>)}
      {name === 'image' && (<><Path d="M4 5h16v14H4z" {...p} /><Path d="M4 16l5-5 4 4 3-3 4 4" {...p} /><Circle cx="15.5" cy="9" r="1.5" {...p} /></>)}
      {name === 'star' && <Path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" {...p} fill={filled ? color : 'none'} />}
      {name === 'refresh' && <Path d="M20 11a8 8 0 00-14.6-4.5M4 4v4h4M4 13a8 8 0 0014.6 4.5M20 20v-4h-4" {...p} />}
    </Svg>
  );
}
