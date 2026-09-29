import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getAllAccounts, getAllTrades, readData } from '@/lib/db';
import { Account, Trade, Portfolio, PerformanceMetrics } from '@/lib/types';

function calculateMetrics(trades: Trade[]): PerformanceMetrics {
  if (!trades.length) {
    return {
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
    };
  }

  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winTrades = trades.filter(t => (t.pnl || 0) > 0).length;
  const lossTrades = trades.filter(t => (t.pnl || 0) < 0).length;

  const wins = trades.filter(t => (t.pnl || 0) > 0).reduce((sum, t) => sum + (t.pnl || 0), 0);
  const losses = Math.abs(trades.filter(t => (t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl || 0), 0));

  return {
    totalPnL,
    totalPnLPercent: 0, // Calcula basado en capital inicial
    winRate: trades.length > 0 ? (winTrades / trades.length) * 100 : 0,
    profitFactor: losses > 0 ? wins / losses : 0,
    drawdown: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    sortino: 0,
    trades: trades.length,
    winTrades,
    lossTrades,
    consecutiveWins: 0,
    consecutiveLosses: 0,
  };
}

export async function GET(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const accounts = await getAllAccounts() as Account[];

    const portfolio: Portfolio = {
      accounts,
      totalCapital: accounts.reduce((sum, a) => sum + a.currentCapital, 0),
      totalPnL: 0,
      totalPnLPercent: 0,
      bestPerformingAccount: '',
      worstPerformingAccount: '',
      risk: {
        totalExposure: 0,
        maxDrawdown: 0,
        correlations: {},
      },
      lastUpdated: new Date().toISOString(),
    };

    // Calcular PnL consolidado
    let totalInitial = 0;
    let totalCurrent = 0;

    for (const account of accounts) {
      totalInitial += account.initialCapital;
      totalCurrent += account.currentCapital;

      // Obtener trades de esta cuenta
      const accountTrades = await readData<Trade[]>(`trades_${account.id}`, []);
      const metrics = calculateMetrics(accountTrades);

      if (portfolio.totalPnL === 0 || metrics.totalPnL > portfolio.totalPnL) {
        portfolio.bestPerformingAccount = account.id;
      }
      if (portfolio.totalPnL === 0 || metrics.totalPnL < portfolio.totalPnL) {
        portfolio.worstPerformingAccount = account.id;
      }

      portfolio.totalPnL += metrics.totalPnL;
    }

    portfolio.totalPnLPercent = totalInitial > 0 ? ((totalCurrent - totalInitial) / totalInitial) * 100 : 0;

    return NextResponse.json(portfolio);
  } catch (e) {
    console.error('Error calculating portfolio:', e);
    return NextResponse.json({ error: 'Failed to calculate portfolio' }, { status: 500 });
  }
}
