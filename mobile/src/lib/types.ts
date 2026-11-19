export const MARKETS = ['Forex', 'Acciones', 'Cripto', 'Futuros', 'Índices', 'Materias primas', 'ETFs', 'Otro'] as const;
export type Market = (typeof MARKETS)[number];

export const KINDS = ['Real', 'Fondeo', 'Demo'] as const;
export type Kind = (typeof KINDS)[number];

export type MoveType = 'ganancia' | 'perdida' | 'comision' | 'deposito' | 'retiro';

/** sign: cómo afecta al balance. pnl: si cuenta como resultado de trading (los depósitos/retiros no). */
export const MOVE_TYPES: Record<MoveType, { label: string; sign: 1 | -1; pnl: boolean }> = {
  ganancia: { label: 'Ganancia', sign: 1, pnl: true },
  perdida: { label: 'Pérdida', sign: -1, pnl: true },
  comision: { label: 'Comisión', sign: -1, pnl: true },
  deposito: { label: 'Depósito', sign: 1, pnl: false },
  retiro: { label: 'Retiro', sign: -1, pnl: false },
};
export const MOVE_TYPE_KEYS = Object.keys(MOVE_TYPES) as MoveType[];

export type Account = {
  id: string;
  name: string;
  broker: string;
  market: Market;
  kind: Kind;
  initial: number;
  color: string;
  created: string; // YYYY-MM-DD
  sample?: boolean;
};

export type Movement = {
  id: string;
  acc: string;
  date: string; // YYYY-MM-DD
  type: MoveType;
  amount: number; // siempre positivo; el tipo decide el signo
  note: string;
  sample?: boolean;
};

export type BgKey = 'medianoche' | 'oled' | 'grafito' | 'abismo' | 'bosque' | 'claro';

export type Prefs = {
  accent: string;
  bg: BgKey;
  radius: number;
  glow: boolean;
  cur: 'USD' | 'EUR';
  privacy: boolean;
};

export const DEFAULT_PREFS: Prefs = {
  accent: '#3D7BFF',
  bg: 'medianoche',
  radius: 16,
  glow: true,
  cur: 'USD',
  privacy: false,
};

export type Period = '7' | '30' | '90' | '365' | 'all';
