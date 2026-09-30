import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { LiveTrade, VirtualAgent, MarketEvent } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    if (action === 'tick') {
      // Simulación de mercado - ejecutar cada segundo
      return NextResponse.json(await runMarketTick());
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

async function runMarketTick() {
  const [agents, trades, strategies] = await Promise.all([
    readData<VirtualAgent[]>('agents', []),
    readData<LiveTrade[]>('live_trades', []),
    readData<any[]>('strategies', []),
  ]);

  let updatedTrades = [...trades];
  let newTrades: LiveTrade[] = [];
  const eventsList: MarketEvent[] = [];

  // 1. Actualizar precios de trades existentes
  updatedTrades = updatedTrades.map(trade => {
    if (trade.status === 'closed') return trade;

    const priceChange = (Math.random() - 0.5) * 10; // ±5 variación
    const newPrice = Math.max(0.01, trade.currentPrice + priceChange);
    const pnl = (newPrice - trade.entryPrice) * trade.quantity;

    return {
      ...trade,
      currentPrice: newPrice,
      unrealizedPnL: pnl,
    };
  });

  // 2. Agentes ejecutan trades automáticamente (30% de probabilidad)
  agents.forEach(agent => {
    if (agent.status === 'active' && Math.random() < 0.3) {
      const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'BTC/USD', 'ETH/USD', 'AAPL', 'GOOGL', 'MSFT'];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const direction = Math.random() < 0.5 ? 'LONG' : 'SHORT';
      const quantity = Math.floor(Math.random() * 10) + 1;
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

  // 3. Cerrar trades automáticamente (10% de probabilidad si tienen ganancia)
  updatedTrades = updatedTrades.map(trade => {
    if (trade.status === 'open' && Math.random() < 0.1 && trade.unrealizedPnL > 0) {
      return {
        ...trade,
        status: 'closed',
      };
    }
    return trade;
  });

  // 4. Generar eventos de mercado aleatorios (5% de probabilidad)
  if (Math.random() < 0.05) {
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

  // 5. Actualizar métricas de agentes
  const updatedAgents = agents.map(agent => {
    const agentTrades = updatedTrades.filter(t => t.agentId === agent.id);
    const closedTrades = agentTrades.filter(t => t.status === 'closed');
    const totalPnL = agentTrades.reduce((sum, t) => sum + t.unrealizedPnL, 0);
    const wins = closedTrades.filter(t => t.unrealizedPnL > 0).length;
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;

    return {
      ...agent,
      performance: {
        ...agent.performance,
        totalPnL: (agent.performance.totalPnL || 0) + totalPnL * 0.1,
        winRate: Math.min(winRate, 100),
        totalTrades: (agent.performance.totalTrades || 0) + agentTrades.length,
        sharpeRatio: Math.random() * 2 + 0.5,
      },
      virtualCapital: Math.max(1000, (agent.virtualCapital || 10000) + totalPnL * 0.01),
      experience: (agent.experience || 0) + agentTrades.length,
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
