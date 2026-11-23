export const MARKETS = ['Forex', 'Acciones', 'Cripto', 'Futuros', 'Índices', 'Materias primas', 'ETFs', 'Otro'] as const;
export type Market = (typeof MARKETS)[number];

export const KINDS = ['Real', 'Fondeo', 'Demo'] as const;
export type Kind = (typeof KINDS)[number];

export type MoveType = 'ganancia' | 'perdida' | 'comision' | 'deposito' | 'retiro' | 'payout' | 'coste';

/**
 * sign: cómo afecta al balance de la cuenta. pnl: si cuenta como resultado de trading.
 * payout: cobro de una cuenta de fondeo (sale del balance, es ingreso del negocio).
 * coste: challenge, reset o suscripción (no toca el balance de la cuenta, es gasto del negocio).
 */
export const MOVE_TYPES: Record<MoveType, { label: string; sign: 1 | -1 | 0; pnl: boolean }> = {
  ganancia: { label: 'Ganancia', sign: 1, pnl: true },
  perdida: { label: 'Pérdida', sign: -1, pnl: true },
  comision: { label: 'Comisión', sign: -1, pnl: true },
  deposito: { label: 'Depósito', sign: 1, pnl: false },
  retiro: { label: 'Retiro', sign: -1, pnl: false },
  payout: { label: 'Payout', sign: -1, pnl: false },
  coste: { label: 'Coste challenge', sign: 0, pnl: false },
};
/** Tipos que pueden apuntarse en varias cuentas a la vez (un mismo trade copiado). */
export const MULTI_TYPES: MoveType[] = ['ganancia', 'perdida', 'comision'];
export const MOVE_TYPE_KEYS = Object.keys(MOVE_TYPES) as MoveType[];

export const CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];
export const CURRENCY_SYMBOL: Record<Currency, string> = { USD: '$', EUR: '€', GBP: '£' };

export const STATUSES = ['challenge', 'activa', 'aprobada', 'quemada', 'retirada'] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  challenge: 'En challenge', activa: 'Activa', aprobada: 'Aprobada', quemada: 'Quemada', retirada: 'Retirada',
};
/** Las cuentas quemadas o retiradas se archivan: no cuentan en los totales. */
export const isArchived = (a: { status?: Status }) => a.status === 'quemada' || a.status === 'retirada';

export type Account = {
  id: string;
  name: string;
  broker: string;
  market: Market;
  kind: Kind;
  initial: number;
  color: string;
  created: string; // YYYY-MM-DD
  status?: Status;
  currency?: Currency;
  /** Reglas (opcionales, importes en la moneda de la cuenta) */
  dailyLossLimit?: number | null;
  maxDrawdown?: number | null;
  drawdownType?: 'static' | 'trailing';
  profitTarget?: number | null;
  riskPct?: number | null;
  maxTradesPerDay?: number | null;
  minTradingDays?: number | null;
  sample?: boolean;
};

export type DayNote = {
  date: string;
  plan: string;
  review: string;
  mood: 'tenso' | 'fomo' | 'normal' | 'centrado' | 'top' | null;
  followed: 'si' | 'medias' | 'no' | null;
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
  cur: Currency;
  privacy: boolean;
  faceId: boolean;
  reminderHour: number | null;
  monthlyGoal: number | null;
  onboarded: boolean;
  lastAcc: string | null;
  /** Cambios de divisa (1 USD = x) guardados para funcionar sin conexión */
  fx: { EUR: number; GBP: number; at: string } | null;
};

export const DEFAULT_PREFS: Prefs = {
  accent: '#3D7BFF',
  bg: 'medianoche',
  radius: 16,
  glow: true,
  cur: 'USD',
  privacy: false,
  faceId: false,
  reminderHour: null,
  monthlyGoal: null,
  onboarded: false,
  lastAcc: null,
  fx: null,
};

export type Period = '7' | '30' | '90' | '365' | 'all';
