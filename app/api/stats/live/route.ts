import { NextRequest, NextResponse } from 'next/server';
import { readData } from '@/lib/db';
import { LiveTrade, VirtualAgent } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const [trades, agents] = await Promise.all([
      readData<LiveTrade[]>('live_trades', []),
      readData<VirtualAgent[]>('agents', []),
    ]);

    const activeTrades = trades.filter(t => t.status === 'open');
    const closedTrades = trades.filter(t => t.status === 'closed');

    // P&L solo de trades cerrados (no contar unrealized)
    const totalPnL = closedTrades.reduce((sum, t) => sum + t.unrealizedPnL, 0);
    const winningTrades = closedTrades.filter(t => t.unrealizedPnL > 0).length;
    const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;

    const topAgent = agents.reduce((best, current) =>
      (current.performance?.totalPnL || 0) > (best.performance?.totalPnL || 0) ? current : best,
      agents[0]
    );

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      activeTrades: activeTrades.length,
      closedTrades: closedTrades.length,
      totalTrades: trades.length,
      totalPnL,
      winRate: Math.round(winRate * 100) / 100,
      totalCapital: agents.reduce((sum, a) => sum + (a.virtualCapital || 0), 0),
      averageAgentPerformance: agents.length > 0
        ? agents.reduce((sum, a) => sum + (a.performance?.winRate || 0), 0) / agents.length
        : 0,
      topPerformer: topAgent ? {
        id: topAgent.id,
        name: topAgent.name,
        avatar: topAgent.avatar,
        pnl: topAgent.performance?.totalPnL || 0,
      } : null,
      activeAgents: agents.filter(a => a.status === 'active').length,
      totalAgents: agents.length,
    });
  } catch (e) {
    console.error('Error fetching stats:', e);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
