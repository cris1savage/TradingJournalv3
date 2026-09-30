import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { LiveTrade, VirtualAgent } from '@/lib/types';

interface DailyStat {
  date: string;
  pnl: number;
  trades: number;
  wins: number;
}

interface MonthlyStat {
  month: string;
  pnl: number;
  trades: number;
  wins: number;
}

export async function GET(req: NextRequest) {
  try {
    const [trades, agents, dailyStats, monthlyStats] = await Promise.all([
      readData<LiveTrade[]>('live_trades', []),
      readData<VirtualAgent[]>('agents', []),
      readData<DailyStat[]>('daily_stats', []),
      readData<MonthlyStat[]>('monthly_stats', []),
    ]);

    const closedTrades = trades.filter(t => t.status === 'closed');
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    // Calculate today's stats
    const todaysTrades = closedTrades.filter(t => {
      const tradeDate = (t.openedAt || '').split('T')[0];
      return tradeDate === today;
    });
    const todaysPnL = todaysTrades.reduce((sum, t) => sum + t.unrealizedPnL, 0);
    const todaysWins = todaysTrades.filter(t => t.unrealizedPnL > 0).length;

    // Calculate current month's stats
    const monthTrades = closedTrades.filter(t => {
      const tradeDate = (t.openedAt || '').substring(0, 7);
      return tradeDate === currentMonth;
    });
    const monthPnL = monthTrades.reduce((sum, t) => sum + t.unrealizedPnL, 0);
    const monthWins = monthTrades.filter(t => t.unrealizedPnL > 0).length;

    // Update or create today's stats
    const existingDayIndex = dailyStats.findIndex(s => s.date === today);
    let updatedDailyStats = [...dailyStats];
    if (existingDayIndex >= 0) {
      updatedDailyStats[existingDayIndex] = {
        date: today,
        pnl: todaysPnL,
        trades: todaysTrades.length,
        wins: todaysWins,
      };
    } else {
      updatedDailyStats.push({
        date: today,
        pnl: todaysPnL,
        trades: todaysTrades.length,
        wins: todaysWins,
      });
    }

    // Update or create current month's stats
    const existingMonthIndex = monthlyStats.findIndex(s => s.month === currentMonth);
    let updatedMonthlyStats = [...monthlyStats];
    if (existingMonthIndex >= 0) {
      updatedMonthlyStats[existingMonthIndex] = {
        month: currentMonth,
        pnl: monthPnL,
        trades: monthTrades.length,
        wins: monthWins,
      };
    } else {
      updatedMonthlyStats.push({
        month: currentMonth,
        pnl: monthPnL,
        trades: monthTrades.length,
        wins: monthWins,
      });
    }

    // Save updated stats
    await Promise.all([
      writeData('daily_stats', updatedDailyStats),
      writeData('monthly_stats', updatedMonthlyStats),
    ]);

    // Calculate YTD stats
    const ytdTrades = closedTrades.filter(t => {
      const tradeYear = (t.openedAt || '').substring(0, 4);
      return tradeYear === currentMonth.substring(0, 4);
    });
    const ytdPnL = ytdTrades.reduce((sum, t) => sum + t.unrealizedPnL, 0);
    const ytdWins = ytdTrades.filter(t => t.unrealizedPnL > 0).length;

    return NextResponse.json({
      today: {
        date: today,
        pnl: todaysPnL,
        trades: todaysTrades.length,
        wins: todaysWins,
        winRate: todaysTrades.length > 0 ? (todaysWins / todaysTrades.length) * 100 : 0,
      },
      currentMonth: {
        month: currentMonth,
        pnl: monthPnL,
        trades: monthTrades.length,
        wins: monthWins,
        winRate: monthTrades.length > 0 ? (monthWins / monthTrades.length) * 100 : 0,
      },
      ytd: {
        pnl: ytdPnL,
        trades: ytdTrades.length,
        wins: ytdWins,
        winRate: ytdTrades.length > 0 ? (ytdWins / ytdTrades.length) * 100 : 0,
      },
      dailyHistory: updatedDailyStats.slice(-30), // Last 30 days
      monthlyHistory: updatedMonthlyStats.slice(-12), // Last 12 months
    });
  } catch (e) {
    console.error('Error fetching historical stats:', e);
    return NextResponse.json({ error: 'Failed to fetch historical stats' }, { status: 500 });
  }
}
