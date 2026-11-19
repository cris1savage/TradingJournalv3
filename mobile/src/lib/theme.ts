import type { BgKey, Prefs } from './types';

type Bg = { name: string; bg: string; surface: string; surface2: string; border: string; text: string; muted: string; scheme: 'dark' | 'light' };

export const BACKGROUNDS: Record<BgKey, Bg> = {
  medianoche: { name: 'Medianoche', bg: '#07090E', surface: '#0E121A', surface2: '#151B27', border: '#1F2737', text: '#E9EDF5', muted: '#8E98AD', scheme: 'dark' },
  oled: { name: 'Negro puro', bg: '#000000', surface: '#0B0B0D', surface2: '#141417', border: '#222227', text: '#EEEEF0', muted: '#90909A', scheme: 'dark' },
  grafito: { name: 'Grafito', bg: '#111214', surface: '#18191C', surface2: '#212327', border: '#2C2E34', text: '#ECECEE', muted: '#999CA5', scheme: 'dark' },
  abismo: { name: 'Azul abismo', bg: '#040A18', surface: '#0A1429', surface2: '#101D39', border: '#1C2B4E', text: '#E6ECFA', muted: '#8D9DC2', scheme: 'dark' },
  bosque: { name: 'Verde noche', bg: '#050D0B', surface: '#0B1714', surface2: '#12221E', border: '#1C332C', text: '#E5F0EC', muted: '#8BA59D', scheme: 'dark' },
  claro: { name: 'Claro', bg: '#F3F4F7', surface: '#FFFFFF', surface2: '#F0F2F6', border: '#E0E3EA', text: '#12151C', muted: '#5B6475', scheme: 'light' },
};

export const ACCENTS: { name: string; color: string }[] = [
  { name: 'Cobalto', color: '#3D7BFF' },
  { name: 'Violeta', color: '#8B5CF6' },
  { name: 'Esmeralda', color: '#10B981' },
  { name: 'Ámbar', color: '#F5A524' },
  { name: 'Cian', color: '#22D3EE' },
  { name: 'Rosa', color: '#F472B6' },
  { name: 'Naranja', color: '#FF7A45' },
  { name: 'Rojo', color: '#EF4444' },
  { name: 'Lima', color: '#A3E635' },
  { name: 'Plata', color: '#CBD5E1' },
];

export const ACCOUNT_COLORS = ['#3D7BFF', '#22C97A', '#F5A524', '#A78BFA', '#22D3EE', '#F472B6', '#FF7A45', '#94A3B8'];

export const CHART_PALETTE = ['#22C97A', '#F5A524', '#A78BFA', '#22D3EE', '#F472B6', '#FF7A45', '#94A3B8'];

function luminance(hex: string) {
  const h = hex.replace('#', '');
  const v = [0, 2, 4].map((i) => {
    const c = parseInt(h.substring(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

export function withAlpha(hex: string, a: number) {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

export type Theme = Omit<Bg, 'name'> & {
  accent: string;
  accentInk: string;
  pos: string;
  neg: string;
  warn: string;
  r: number;
  glow: boolean;
};

export function buildTheme(p: Prefs): Theme {
  const b = BACKGROUNDS[p.bg] ?? BACKGROUNDS.medianoche;
  const light = b.scheme === 'light';
  return {
    bg: b.bg, surface: b.surface, surface2: b.surface2, border: b.border, text: b.text, muted: b.muted, scheme: b.scheme,
    accent: p.accent,
    accentInk: luminance(p.accent) > 0.42 ? '#0A0C10' : '#FFFFFF',
    pos: light ? '#0E9F5E' : '#22C97A',
    neg: light ? '#E0364A' : '#FF5D6E',
    warn: light ? '#C77700' : '#F5A524',
    r: p.radius,
    glow: p.glow,
  };
}
