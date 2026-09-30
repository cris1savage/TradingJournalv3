import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { VirtualAgent, LiveTrade } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const [agents, trades] = await Promise.all([
      readData<VirtualAgent[]>('agents', []),
      readData<LiveTrade[]>('live_trades', []),
    ]);

    const riskAnalysis = agents.map(agent => {
      const agentTrades = trades.filter(t => t.agentId === agent.id && t.status === 'open');
      const totalRisk = agentTrades.reduce((sum, t) => sum + Math.abs(t.entryPrice * t.quantity * 0.02), 0); // 2% por defecto
      const capitalAtRisk = (agent.virtualCapital || 10000) * 0.1; // Max 10% del capital

      return {
        agentId: agent.id,
        agentName: agent.name,
        totalCapital: agent.virtualCapital || 10000,
        openPositions: agentTrades.length,
        currentRiskExposure: totalRisk,
        maxRiskAllowed: capitalAtRisk,
        riskPercentage: (totalRisk / (agent.virtualCapital || 10000)) * 100,
        isRiskOk: totalRisk <= capitalAtRisk,
        maxDrawdown: 0.15, // 15% máximo
        positionSizeLimit: (agent.virtualCapital || 10000) * 0.05, // 5% máximo por posición
      };
    });

    return NextResponse.json(riskAnalysis);
  } catch (e) {
    console.error('Risk management error:', e);
    return NextResponse.json({ error: 'Risk management failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, agentId, tradeId } = await req.json();

    if (action === 'check_and_apply_risk_controls') {
      const [agents, trades] = await Promise.all([
        readData<VirtualAgent[]>('agents', []),
        readData<LiveTrade[]>('live_trades', []),
      ]);

      let updatedTrades = [...trades];

      // Aplicar controles de riesgo
      updatedTrades = updatedTrades.map(trade => {
        if (trade.status !== 'open') return trade;

        const agent = agents.find(a => a.id === trade.agentId);
        if (!agent) return trade;

        const maxRiskAmount = (agent.virtualCapital || 10000) * 0.02; // 2% máximo de riesgo por operación
        const riskAmount = Math.abs(trade.entryPrice * trade.quantity * 0.02);

        // Stop Loss: -2% desde entrada
        const stopLoss = trade.direction === 'LONG'
          ? trade.entryPrice * 0.98
          : trade.entryPrice * 1.02;

        // Take Profit: +2% desde entrada (simétrico y realista)
        const takeProfit = trade.direction === 'LONG'
          ? trade.entryPrice * 1.02
          : trade.entryPrice * 0.98;

        // Si riesgo es muy alto, cerrar posición
        if (riskAmount > maxRiskAmount) {
          return {
            ...trade,
            status: 'closed',
            unrealizedPnL: -Math.abs(trade.entryPrice * trade.quantity * 0.02), // Pérdida del 2%
          };
        }

        // Stop Loss hit
        if (trade.direction === 'LONG' && trade.currentPrice <= stopLoss) {
          return {
            ...trade,
            status: 'closed',
            currentPrice: stopLoss,
            unrealizedPnL: -Math.abs(trade.entryPrice * trade.quantity * 0.02),
          };
        }

        if (trade.direction === 'SHORT' && trade.currentPrice >= stopLoss) {
          return {
            ...trade,
            status: 'closed',
            currentPrice: stopLoss,
            unrealizedPnL: -Math.abs(trade.entryPrice * trade.quantity * 0.02),
          };
        }

        // Take Profit hit
        if (trade.direction === 'LONG' && trade.currentPrice >= takeProfit) {
          return {
            ...trade,
            status: 'closed',
            currentPrice: takeProfit,
            unrealizedPnL: Math.abs(trade.entryPrice * trade.quantity * 0.02),
          };
        }

        if (trade.direction === 'SHORT' && trade.currentPrice <= takeProfit) {
          return {
            ...trade,
            status: 'closed',
            currentPrice: takeProfit,
            unrealizedPnL: Math.abs(trade.entryPrice * trade.quantity * 0.02),
          };
        }

        return trade;
      });

      // Actualizar capital de agentes
      const updatedAgents = agents.map(agent => {
        const agentTrades = updatedTrades.filter(t => t.agentId === agent.id && t.status === 'closed');
        const totalPnL = agentTrades.reduce((sum, t) => sum + t.unrealizedPnL, 0);
        const wins = agentTrades.filter(t => t.unrealizedPnL > 0).length;
        const winRate = agentTrades.length > 0 ? (wins / agentTrades.length) * 100 : 0;

        return {
          ...agent,
          performance: {
            ...agent.performance,
            totalPnL: totalPnL,
            winRate: Math.min(winRate, 100),
            totalTrades: agentTrades.length,
          },
          virtualCapital: Math.max(100, (agent.virtualCapital || 10000) + totalPnL),
        };
      });

      await Promise.all([
        writeData('live_trades', updatedTrades),
        writeData('agents', updatedAgents),
      ]);

      return NextResponse.json({
        status: 'risk controls applied',
        tradesModified: updatedTrades.length,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    console.error('Risk control error:', e);
    return NextResponse.json({ error: 'Risk control failed' }, { status: 500 });
  }
}
