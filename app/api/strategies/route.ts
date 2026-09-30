import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { Strategy } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status');
    const strategies = await readData<Strategy[]>('strategies', []);

    if (status) {
      return NextResponse.json(strategies.filter(s => s.status === status));
    }
    return NextResponse.json(strategies);
  } catch (e) {
    console.error('Error fetching strategies:', e);
    return NextResponse.json({ error: 'Failed to fetch strategies' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const strategies = await readData<Strategy[]>('strategies', []);

    const newStrategy: Strategy = {
      id: `strat_${Date.now()}`,
      name: body.name,
      type: body.type,
      description: body.description,
      creator: body.creator,
      timeframe: body.timeframe || '1H',
      symbols: body.symbols || [],
      entryConditions: body.entryConditions || [],
      exitConditions: body.exitConditions || [],
      riskPerTrade: body.riskPerTrade || 2,
      maxPositions: body.maxPositions || 5,
      backtest: body.backtest || {
        period: 'N/A',
        trades: 0,
        winRate: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
      },
      livePerformance: {
        totalPnL: 0,
        totalPnLPercent: 0,
        winRate: 0,
        profitFactor: 0,
        drawdown: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        sortino: 0,
        trades: 0,
        winTrades: 0,
        lossTrades: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
      },
      activeAgents: [],
      status: 'testing',
      confidence: body.confidence || 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    strategies.push(newStrategy);
    await writeData('strategies', strategies);

    return NextResponse.json(newStrategy, { status: 201 });
  } catch (e) {
    console.error('Error creating strategy:', e);
    return NextResponse.json({ error: 'Failed to create strategy' }, { status: 500 });
  }
}
