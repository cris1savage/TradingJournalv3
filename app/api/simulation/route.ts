import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { LiveTrade, VirtualAgent, MarketEvent } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    if (action === 'tick') {
      // Simulación de mercado - ejecutar cada segundo
      const tickResult = await runMarketTick();

      // Aplicar controles de riesgo automáticamente
      await applyRiskControls();

      return NextResponse.json(tickResult);
    }

    if (action === 'start') {
      // Iniciar simulación automática
      return NextResponse.json({ status: 'Simulation started' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    console.error('Simulation error:', e);
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
  }
}

async function applyRiskControls() {
  const [agents, trades] = await Promise.all([
    readData<VirtualAgent[]>('agents', []),
    readData<LiveTrade[]>('live_trades', []),
  ]);

  let updatedTrades = [...trades];

  // Aplicar stop loss y take profit
  updatedTrades = updatedTrades.map(trade => {
    if (trade.status !== 'open') return trade;

    // Stop Loss: -2% y Take Profit: +3%
    const stopLoss = trade.direction === 'LONG'
      ? trade.entryPrice * 0.98
      : trade.entryPrice * 1.02;

    const takeProfit = trade.direction === 'LONG'
      ? trade.entryPrice * 1.03
      : trade.entryPrice * 0.97;

    // Stop Loss hit
    if (trade.direction === 'LONG' && trade.currentPrice <= stopLoss) {
      return {
        ...trade,
        status: 'closed',
        currentPrice: stopLoss,
        unrealizedPnL: (stopLoss - trade.entryPrice) * trade.quantity,
      };
    }

    if (trade.direction === 'SHORT' && trade.currentPrice >= stopLoss) {
      return {
        ...trade,
        status: 'closed',
        currentPrice: stopLoss,
        unrealizedPnL: (trade.entryPrice - stopLoss) * trade.quantity,
      };
    }

    // Take Profit hit
    if (trade.direction === 'LONG' && trade.currentPrice >= takeProfit) {
      return {
        ...trade,
        status: 'closed',
        currentPrice: takeProfit,
        unrealizedPnL: (takeProfit - trade.entryPrice) * trade.quantity,
      };
    }

    if (trade.direction === 'SHORT' && trade.currentPrice <= takeProfit) {
      return {
        ...trade,
        status: 'closed',
        currentPrice: takeProfit,
        unrealizedPnL: (trade.entryPrice - takeProfit) * trade.quantity,
      };
    }

    return trade;
  });

  // Actualizar capital
  const updatedAgents = agents.map(agent => {
    const closedTrades = updatedTrades.filter(t => t.agentId === agent.id && t.status === 'closed');
    const totalPnL = closedTrades.reduce((sum, t) => sum + t.unrealizedPnL, 0);

    return {
      ...agent,
      virtualCapital: Math.max(100, (agent.virtualCapital || 10000) + totalPnL),
    };
  });

  await Promise.all([
    writeData('live_trades', updatedTrades),
    writeData('agents', updatedAgents),
  ]);
}

async function runMarketTick() {
  const [agents, trades, strategies] = await Promise.all([
    readData<VirtualAgent[]>('agents', []),
    readData<LiveTrade[]>('live_trades', []),
    readData<any[]>('strategies', []),
  ]);

  let updatedTrades = [...trades];
  let newTrades: LiveTrade[] = [];
  const eventsList: MarketEvent[] = [];

  // 1. Actualizar precios de trades existentes con volatilidad realista
  updatedTrades = updatedTrades.map(trade => {
    if (trade.status === 'closed') return trade;

    // Cambio porcentual realista (±2%)
    const changePercent = (Math.random() - 0.5) * 0.04;
    const newPrice = trade.currentPrice * (1 + changePercent);

    // Calcular P&L diferente para LONG vs SHORT
    const pnlPerUnit = trade.direction === 'LONG'
      ? (newPrice - trade.entryPrice)
      : (trade.entryPrice - newPrice);

    const unrealizedPnL = pnlPerUnit * trade.quantity;

    return {
      ...trade,
      currentPrice: Math.max(0.01, newPrice),
      unrealizedPnL,
    };
  });

  // 2. Agentes ejecutan trades automáticamente (15% de probabilidad = más realista)
  agents.forEach(agent => {
    if (agent.status === 'active' && Math.random() < 0.15) {
      const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'BTC/USD', 'ETH/USD', 'AAPL', 'GOOGL', 'MSFT'];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const direction = Math.random() < 0.5 ? 'LONG' : 'SHORT';
      const quantity = Math.floor(Math.random() * 5) + 1;
      const entryPrice = Math.random() * 1000 + 100;

      const newTrade: LiveTrade = {
        id: `trade_${Date.now()}_${Math.random()}`,
        agentId: agent.id,
        strategyId: 'auto_strategy',
        symbol,
        direction,
        entryPrice,
        currentPrice: entryPrice,
        quantity,
        unrealizedPnL: 0,
        openedAt: new Date().toISOString(),
        status: 'open',
      };

      newTrades.push(newTrade);
    }
  });

  // 3. Cerrar trades con lógica realista (60% ganan, 40% pierden)
  updatedTrades = updatedTrades.map(trade => {
    if (trade.status === 'open' && Math.random() < 0.08) { // 8% de probabilidad de cerrar
      // Forzar resultado: 60% ganancia, 40% pérdida
      const isWin = Math.random() < 0.6;

      if (!isWin && trade.unrealizedPnL > 0) {
        // Convertir ganancia en pérdida
        const newPrice = trade.direction === 'LONG'
          ? trade.entryPrice * 0.98
          : trade.entryPrice * 1.02;

        const pnlPerUnit = trade.direction === 'LONG'
          ? (newPrice - trade.entryPrice)
          : (trade.entryPrice - newPrice);

        return {
          ...trade,
          currentPrice: newPrice,
          unrealizedPnL: pnlPerUnit * trade.quantity,
          status: 'closed',
        };
      } else if (isWin && trade.unrealizedPnL <= 0) {
        // Convertir pérdida en ganancia
        const newPrice = trade.direction === 'LONG'
          ? trade.entryPrice * 1.02
          : trade.entryPrice * 0.98;

        const pnlPerUnit = trade.direction === 'LONG'
          ? (newPrice - trade.entryPrice)
          : (trade.entryPrice - newPrice);

        return {
          ...trade,
          currentPrice: newPrice,
          unrealizedPnL: pnlPerUnit * trade.quantity,
          status: 'closed',
        };
      }

      return {
        ...trade,
        status: 'closed',
      };
    }
    return trade;
  });

  // 4. Generar eventos de mercado aleatorios (3% de probabilidad)
  if (Math.random() < 0.03) {
    const events = [
      { title: 'Fed Decision', description: 'Interest rate decision announced', impact: 'critical' },
      { title: 'GDP Report', description: 'Quarterly GDP released', impact: 'high' },
      { title: 'Earnings Call', description: 'Company earnings announcement', impact: 'high' },
      { title: 'Market Volatility', description: 'Increased market turbulence', impact: 'medium' },
      { title: 'Tech Selloff', description: 'Tech sector under pressure', impact: 'high' },
    ];
    const event = events[Math.floor(Math.random() * events.length)];
    eventsList.push({
      id: `event_${Date.now()}`,
      title: event.title,
      description: event.description,
      impact: event.impact as any,
      symbols: ['EUR/USD', 'BTC/USD', 'AAPL'],
      timestamp: new Date().toISOString(),
      expectedDuration: Math.random() * 120 + 30,
    });
  }

  // 5. Actualizar métricas de agentes CON LÓGICA CORRECTA
  const updatedAgents = agents.map(agent => {
    const agentTrades = updatedTrades.filter(t => t.agentId === agent.id);
    const closedTrades = agentTrades.filter(t => t.status === 'closed');

    // P&L total: solo contar trades cerrados
    const closedPnL = closedTrades.reduce((sum, t) => sum + t.unrealizedPnL, 0);

    // Win rate: basado SOLO en trades cerrados
    const wins = closedTrades.filter(t => t.unrealizedPnL > 0).length;
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

    // Capital se reduce con pérdidas, aumenta con ganancias
    const newCapital = (agent.virtualCapital || 10000) + closedPnL;

    return {
      ...agent,
      performance: {
        ...agent.performance,
        totalPnL: closedPnL,
        winRate: Math.round(winRate * 100) / 100, // Redondear a 2 decimales
        totalTrades: closedTrades.length,
        sharpeRatio: closedTrades.length > 0 ? Math.random() * 2 + 0.3 : 0,
      },
      virtualCapital: Math.max(100, newCapital), // Mínimo 100€
      experience: (agent.experience || 0) + closedTrades.length,
    };
  });

  // Guardar todo
  await Promise.all([
    writeData('live_trades', [...updatedTrades, ...newTrades]),
    writeData('agents', updatedAgents),
    readData<MarketEvent[]>('market_events', []).then(existing =>
      writeData('market_events', [...existing.slice(-50), ...eventsList])
    ),
  ]);

  return {
    tradesExecuted: newTrades.length,
    tradesClosed: updatedTrades.filter((t, idx) => trades[idx]?.status === 'open' && t.status === 'closed').length,
    eventsGenerated: eventsList.length,
    totalActiveTrades: updatedTrades.filter(t => t.status === 'open').length,
    agentsUpdated: updatedAgents.length,
  };
}
