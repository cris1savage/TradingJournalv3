import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { LiveTrade, MarketEvent } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const liveTrades = await readData<LiveTrade[]>('live_trades', []);
    const events = await readData<MarketEvent[]>('market_events', []);

    return NextResponse.json({
      trades: liveTrades.filter(t => t.status !== 'closed'),
      events: events.filter(e => {
        const eventTime = new Date(e.timestamp).getTime();
        const now = Date.now();
        return (now - eventTime) < (e.expectedDuration * 60 * 1000);
      }),
      activeTradesCount: liveTrades.filter(t => t.status === 'open').length,
      totalPnL: liveTrades.reduce((acc, t) => acc + t.unrealizedPnL, 0),
    });
  } catch (e) {
    console.error('Error fetching trading floor data:', e);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'execute_trade') {
      const liveTrades = await readData<LiveTrade[]>('live_trades', []);
      const newTrade: LiveTrade = {
        id: `trade_${Date.now()}`,
        agentId: body.agentId,
        strategyId: body.strategyId,
        symbol: body.symbol,
        direction: body.direction,
        entryPrice: body.entryPrice,
        currentPrice: body.entryPrice,
        quantity: body.quantity,
        unrealizedPnL: 0,
        openedAt: new Date().toISOString(),
        status: 'open',
      };

      liveTrades.push(newTrade);
      await writeData('live_trades', liveTrades);

      return NextResponse.json(newTrade, { status: 201 });
    }

    if (body.action === 'close_trade') {
      const liveTrades = await readData<LiveTrade[]>('live_trades', []);
      const idx = liveTrades.findIndex(t => t.id === body.tradeId);

      if (idx !== -1) {
        liveTrades[idx].status = 'closed';
        liveTrades[idx].currentPrice = body.closePrice;
        liveTrades[idx].unrealizedPnL = (body.closePrice - liveTrades[idx].entryPrice) * liveTrades[idx].quantity;

        await writeData('live_trades', liveTrades);
        return NextResponse.json(liveTrades[idx]);
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    console.error('Error processing trade:', e);
    return NextResponse.json({ error: 'Failed to process trade' }, { status: 500 });
  }
}
