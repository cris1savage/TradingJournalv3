import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readData, writeData, getAllAccounts } from '@/lib/db';
import { Report, ReportFrequency, PerformanceMetrics, Account, Trade } from '@/lib/types';

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
    totalPnLPercent: 0,
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

  try {
    const period = (req.nextUrl.searchParams.get('period') || 'weekly') as ReportFrequency;
    const reports = await readData<Report[]>('reports', []);

    const filtered = reports.filter(r => r.period === period);
    return NextResponse.json(filtered.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()));
  } catch (e) {
    console.error('Error fetching reports:', e);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {

  try {
    const body = await req.json();
    const { action, period = 'weekly' } = body;

    if (action === 'generate') {
      const accounts = await getAllAccounts() as Account[];

      // Calcular fechas
      const endDate = new Date();
      let startDate = new Date();

      if (period === 'weekly') {
        startDate.setDate(endDate.getDate() - 7);
      } else if (period === 'monthly') {
        startDate.setMonth(endDate.getMonth() - 1);
      } else if (period === 'quarterly') {
        startDate.setMonth(endDate.getMonth() - 3);
      }

      // Generar reporte
      const report: Report = {
        id: `report_${Date.now()}`,
        period: period as ReportFrequency,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        generatedAt: new Date().toISOString(),
        consolidatedMetrics: { totalPnL: 0, totalPnLPercent: 0, winRate: 0, profitFactor: 0, drawdown: 0, maxDrawdown: 0, sharpeRatio: 0, sortino: 0, trades: 0, winTrades: 0, lossTrades: 0, consecutiveWins: 0, consecutiveLosses: 0 },
        accountMetrics: {},
        analysis: {
          highlights: [],
          concerns: [],
          recommendations: [],
        },
        equityCurve: [],
        dailyPnL: [],
        accountComparison: {},
        psychology: {
          avgEmotionalScore: 0,
          impulsiveTrades: 0,
          plannedVsImpulsive: 0,
          bestSession: '',
          worstSession: '',
        },
      };

      // Calcular métricas por cuenta
      let totalPnL = 0;
      for (const account of accounts) {
        const trades = await readData<Trade[]>(`trades_${account.id}`, []);
        const periodTrades = trades.filter(t => new Date(t.date) >= startDate && new Date(t.date) <= endDate);

        const metrics = calculateMetrics(periodTrades);
        report.accountMetrics[account.id] = metrics;
        totalPnL += metrics.totalPnL;
        report.accountComparison[account.id] = metrics.totalPnL;
      }

      report.consolidatedMetrics = calculateMetrics(
        Object.values(report.accountMetrics).reduce((acc, m) => acc + m.trades, 0) > 0
          ? (await Promise.all(
              accounts.map(a => readData<Trade[]>(`trades_${a.id}`, []))
            )).flat()
          : []
      );

      // Análisis
      const bestAccount = Object.entries(report.accountMetrics).sort(([, a], [, b]) => b.totalPnL - a.totalPnL)[0];
      const worstAccount = Object.entries(report.accountMetrics).sort(([, a], [, b]) => a.totalPnL - b.totalPnL)[0];

      if (bestAccount) {
        report.analysis.highlights.push(`${accounts.find(a => a.id === bestAccount[0])?.name} outperformed with €${bestAccount[1].totalPnL.toFixed(2)}`);
      }
      if (report.consolidatedMetrics.profitFactor > 1.5) {
        report.analysis.highlights.push('Excellent profit factor indicating strong risk/reward');
      }
      if (report.consolidatedMetrics.drawdown > 15) {
        report.analysis.concerns.push('Significant drawdown detected - review risk management');
      }

      // Guardar
      const reports = await readData<Report[]>('reports', []);
      reports.push(report);
      await writeData('reports', reports);

      return NextResponse.json(report, { status: 201 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('Error generating report:', e);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
