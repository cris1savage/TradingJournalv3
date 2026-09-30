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

// ─── VIRTUAL AGENT SYSTEM TYPES ──────────────────────────────────────────────
export type AgentRole = 'trader' | 'analyst' | 'risk_manager' | 'strategist' | 'portfolio_manager' | 'bot_engineer' | 'compliance' | 'operations';
export type AgentLevel = 'junior' | 'mid' | 'senior' | 'lead' | 'director';
export type TradingStyle = 'scalper' | 'day_trader' | 'swing_trader' | 'position_trader' | 'algo_trader';

export interface VirtualAgent {
  id: string;
  name: string;
  role: AgentRole;
  level: AgentLevel;
  avatar: string; // emoji o URL
  style?: TradingStyle; // Para traders
  department: string;
  experience: number; // Años
  status: 'active' | 'paused' | 'training' | 'on_vacation';

  // Desempeño
  performance: {
    totalTrades: number;
    winRate: number;
    totalPnL: number;
    sharpeRatio: number;
    maxDrawdown: number;
    consistency: number; // 0-100
  };

  // Experiencia y niveles
  level_exp: number;
  badges: Badge[];
  certifications: string[];

  // Estrategias
  assignedStrategies: string[]; // Strategy IDs
  specializations: string[];

  // Capital asignado
  allocatedCapital: number;
  virtualCapital: number;
  commission: number; // Porcentaje de ganancias

  // Métricas de IA
  learning_rate: number; // Mejora mes a mes
  adaptability: number; // Cómo se adapta a mercados
  riskTolerance: 'low' | 'medium' | 'high';

  createdAt: string;
  lastActiveAt: string;
  hiredBy: string; // Usuario ID
}

export type DepartmentType = 'trading' | 'analysis' | 'risk' | 'strategy' | 'portfolio' | 'engineering' | 'compliance' | 'operations';

export interface Department {
  id: string;
  name: string;
  type: DepartmentType;
  manager: string; // Agent ID del manager
  members: string[]; // Agent IDs
  budget: number; // Capital asignado
  performance: PerformanceMetrics;
  location: { x: number; y: number; z: number }; // Posición isométrica
  activeOperations: number;
  createdAt: string;
}

export type StrategyType = 'momentum' | 'mean_reversion' | 'breakout' | 'scalping' | 'arbitrage' | 'ml_based' | 'custom';

export interface Strategy {
  id: string;
  name: string;
  type: StrategyType;
  description: string;
  creator: string; // Agent ID

  // Configuración
  timeframe: string;
  symbols: string[];
  entryConditions: string[];
  exitConditions: string[];
  riskPerTrade: number;
  maxPositions: number;

  // Desempeño histórico
  backtest: {
    period: string;
    trades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };

  // En vivo
  livePerformance: PerformanceMetrics;
  activeAgents: string[]; // Agents usando esta estrategia

  status: 'active' | 'paused' | 'testing' | 'archived';
  confidence: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

export type MarketEventType = 'news' | 'economic' | 'earnings' | 'crypto_alert' | 'technical' | 'sentiment' | 'correlation_shift';
export type EventImpact = 'low' | 'medium' | 'high' | 'critical';

export interface MarketEvent {
  id: string;
  type: MarketEventType;
  impact: EventImpact;
  title: string;
  description: string;
  symbols: string[];
  timestamp: string;
  expectedDuration: number; // minutos

  // Impacto
  affectedAgents: string[]; // Agent IDs afectados
  affectedStrategies: string[]; // Strategy IDs
  volatilityIncrease: number; // Porcentaje

  // Respuesta automática
  autoResponse: {
    shouldPause: boolean;
    reducePositions: boolean;
    hedgeRatio: number;
  };
}

export interface LiveTrade {
  id: string;
  agentId: string;
  strategyId: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  unrealizedPnL: number;
  openedAt: string;
  status: 'open' | 'closing' | 'closed';
}

export type TournamentType = 'monthly' | 'quarterly' | 'yearly' | 'special';

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  startDate: string;
  endDate: string;
  participants: string[]; // Agent IDs
  rules: {
    initialCapital: number;
    timeframe: string;
    restrictions: string[];
  };
  leaderboard: Array<{
    rank: number;
    agentId: string;
    agentName: string;
    totalReturn: number;
    winRate: number;
    sharpeRatio: number;
    maxDrawdown: number;
  }>;
  prizes: {
    first: number | string;
    second: number | string;
    third: number | string;
  };
  status: 'upcoming' | 'active' | 'finished';
}

export type BadgeType = 'profit_master' | 'consistent_winner' | 'risk_master' | 'speed_trader' | 'adaptable' | 'perfect_month' | 'legend' | 'milestone';

export interface Badge {
  id: string;
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  criteria: string;
  earnedAt: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface Briefing {
  id: string;
  date: string;
  generatedAt: string;
  summary: string;

  // Resumen de eventos
  marketEvents: MarketEvent[];

  // Top performers
  topAgents: Array<{
    agentId: string;
    agentName: string;
    dayPnL: number;
    bestTrade: number;
  }>;

  // Alertas
  alerts: Alert[];

  // Recomendaciones
  recommendations: string[];

  // Estadísticas del día
  totalTradesExecuted: number;
  successRate: number;
  totalVolume: number;
  largestWin: number;
  largestLoss: number;
}

export interface BrokerMetrics {
  totalAssets: number;
  totalPnL: number;
  totalPnLPercent: number;
  activeDepartments: number;
  activeAgents: number;
  activeStrategies: number;
  livetrades: number;
  averageAgentPerformance: number;
  systemHealth: number; // 0-100
  operationalCost: number;
  profitMargin: number;
}

export interface ExecutiveBoard {
  id: string;
  ceo: string; // Agent ID - el usuario o un agente especial
  cto: string; // Chief Technology Officer
  cfo: string; // Chief Financial Officer
  cro: string; // Chief Risk Officer

  boardMembers: string[]; // Agent IDs

  decisions: Array<{
    date: string;
    decision: string;
    impact: string;
    authorizedBy: string;
  }>;

  metrics: BrokerMetrics;
  reports: Report[];
}
