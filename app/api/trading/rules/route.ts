import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';

interface TradingRule {
  maxDrawdown: number;
  maxLossPerDay: number;
  tradingHoursStart: number;
  tradingHoursEnd: number;
  maxOpenTrades: number;
  stopIfNegativeDays: number;
  autoRestartTime?: string;
  lastUpdated?: string;
}

export async function POST(req: NextRequest) {
  try {
    const rules: TradingRule = await req.json();

    const updatedRules: TradingRule = {
      ...rules,
      lastUpdated: new Date().toISOString(),
    };

    await writeData('trading_rules', updatedRules);

    return NextResponse.json({
      status: 'success',
      message: 'Trading rules saved',
      rules: updatedRules,
    });
  } catch (e) {
    console.error('Error saving trading rules:', e);
    return NextResponse.json({ error: 'Failed to save rules' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const rules = await readData<TradingRule>('trading_rules', {
      maxDrawdown: 15,
      maxLossPerDay: 10,
      tradingHoursStart: 8,
      tradingHoursEnd: 22,
      maxOpenTrades: 10,
      stopIfNegativeDays: 3,
    });

    return NextResponse.json(rules);
  } catch (e) {
    console.error('Error fetching trading rules:', e);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}
