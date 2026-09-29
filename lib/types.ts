// ─── ACCOUNT TYPES ───────────────────────────────────────────────────────────
export type AccountType = 'forex' | 'crypto' | 'stocks';
export type AccountStatus = 'active' | 'closed' | 'paused';
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  broker: string;
  initialCapital: number;
  currentCapital: number;
  status: AccountStatus;
  accountManager: string; // Especialista responsable
  riskProfile: RiskProfile;
  monthlyAllocation: number; // Cantidad a reinvertir mensualmente
  maxDrawdownPercent: number; // Límite de drawdown
  createdAt: string;
  updatedAt: string;
  apiKey?: string; // Para conexiones automáticas
  apiSecret?: string;
}

// ─── TRADE TYPES ─────────────────────────────────────────────────────────────
export type TradeDirection = 'LONG' | 'SHORT';
export type TradeResult = 'WIN' | 'LOSS' | 'BREAKEVEN' | 'PENDING';

export interface Trade {
  id: number;
  accountId: string; // Vinculada a account
  date: string;
  time: string;
  pair: string;
  tf: string;
  dir: TradeDirection;
  res: TradeResult;
  plan: string | null;
  entry: number;
  sl: number;
  tp: number;
  risk: number;
  lot: number;
  rr: string;
  pnl: number;
  rreal: string;
  conf: string[];
  emo: string;
  notes: string;
  tvUrl?: string;
  tags: string[]; // Para categorizar operaciones
  attachments?: string[]; // URLs de screenshots/análisis
}

// ─── CAPITAL TYPES ───────────────────────────────────────────────────────────
export interface CapitalMovement {
  id: string;
  accountId: string;
  type: 'deposit' | 'withdrawal' | 'reinvestment' | 'transfer';
  amount: number;
  date: string;
  description: string;
  sourceAccount?: string; // Si es transfer
  targetAccount?: string;
}

export interface Capital {
  accountId: string;
  initial: number;
  current: number;
  movements: CapitalMovement[];
  lastUpdated: string;
}

// ─── PRICE TYPES ─────────────────────────────────────────────────────────────
export type AssetType = 'forex' | 'crypto' | 'stock' | 'commodity';

export interface PriceData {
  symbol: string;
  assetType: AssetType;
  currentPrice: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  timestamp: string;
  high24h?: number;
  low24h?: number;
  volume?: number;
}

export interface PriceHistory {
  symbol: string;
  prices: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
}

// ─── ALERT TYPES ─────────────────────────────────────────────────────────────
export type AlertLevel = 'info' | 'warning' | 'critical';
export type AlertTrigger = 'drawdown' | 'profit_target' | 'price_level' | 'account_change' | 'capital_allocation';

export interface Alert {
  id: string;
  accountId?: string;
  type: AlertTrigger;
  level: AlertLevel;
  title: string;
  message: string;
  condition: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    value: number;
  };
  triggered: boolean;
  createdAt: string;
  triggeredAt?: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

// ─── TEAM/SPECIALIST TYPES ───────────────────────────────────────────────────
export type SpecialistRole = 'operations_manager' | 'risk_advisor' | 'price_specialist' | 'performance_coach';

export interface TeamMember {
  id: string;
  role: SpecialistRole;
  name: string;
  title: string;
  description: string;
  icon: string;
  status: 'active' | 'monitoring' | 'alert';
  lastUpdate: string;
  alertCount: number;
  metrics: Record<string, any>;
}

// ─── REPORT TYPES ────────────────────────────────────────────────────────────
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface PerformanceMetrics {
  totalPnL: number;
  totalPnLPercent: number;
  winRate: number;
  profitFactor: number;
  drawdown: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortino: number;
  trades: number;
  winTrades: number;
  lossTrades: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface Report {
  id: string;
  period: ReportFrequency;
  startDate: string;
  endDate: string;
  generatedAt: string;

  // Consolidado
  consolidatedMetrics: PerformanceMetrics;

  // Por cuenta
  accountMetrics: Record<string, PerformanceMetrics>;

  // Análisis
  analysis: {
    highlights: string[];
    concerns: string[];
    recommendations: string[];
  };

  // Datos para gráficos
  equityCurve: Array<{ date: string; value: number }>;
  dailyPnL: Array<{ date: string; pnl: number }>;
  accountComparison: Record<string, number>;

  // Psicología/disciplina
  psychology: {
    avgEmotionalScore: number;
    impulsiveTrades: number;
    plannedVsImpulsive: number;
    bestSession: string;
    worstSession: string;
  };
}

// ─── PORTFOLIO TYPES ─────────────────────────────────────────────────────────
export interface Portfolio {
  accounts: Account[];
  totalCapital: number;
  totalPnL: number;
  totalPnLPercent: number;
  bestPerformingAccount: string;
  worstPerformingAccount: string;
  risk: {
    totalExposure: number;
    maxDrawdown: number;
    correlations: Record<string, number>;
  };
  lastUpdated: string;
}

// ─── RECOMMENDATIONS TYPES ───────────────────────────────────────────────────
export interface Recommendation {
  id: string;
  type: 'capital_allocation' | 'account_action' | 'risk_management' | 'strategy_adjustment';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionRequired: string;
  supportingData: Record<string, any>;
  createdAt: string;
  resolved: boolean;
}

// ─── SETTINGS TYPES ──────────────────────────────────────────────────────────
export interface UserSettings {
  theme: 'dark' | 'light';
  currency: 'EUR' | 'USD' | 'GBP';
  language: 'es' | 'en';
  timezone: string;

  // Alertas
  alerts: {
    enableDrawdownAlerts: boolean;
    drawdownThreshold: number;
    enablePriceAlerts: boolean;
    enableCapitalAlerts: boolean;
    emailDigest: boolean;
    emailFrequency: 'daily' | 'weekly';
  };

  // Reinversión automática
  autoReinvestment: {
    enabled: boolean;
    rules: Array<{
      accountId: string;
      condition: string;
      percentage: number;
    }>;
  };
}
