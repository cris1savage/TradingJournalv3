import { NextRequest, NextResponse } from 'next/server';
import { writeData } from '@/lib/db';
import { VirtualAgent, Department } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    // Crear agentes iniciales
    const agents: VirtualAgent[] = [
      {
        id: 'agent_alex',
        name: 'Alex Rivera',
        avatar: '🐉',
        role: 'senior_trader',
        level: 5,
        status: 'active',
        virtualCapital: 50000,
        experience: 1200,
        learningRate: 0.08,
        performance: {
          totalPnL: 5200,
          winRate: 62,
          sharpeRatio: 1.8,
          totalTrades: 156,
        },
        specializations: ['forex', 'risk_management'],
        lastTrade: new Date().toISOString(),
      },
      {
        id: 'agent_luna',
        name: 'Luna Chen',
        avatar: '🌙',
        role: 'algo_trader',
        level: 4,
        status: 'active',
        virtualCapital: 35000,
        experience: 890,
        learningRate: 0.1,
        performance: {
          totalPnL: 3100,
          winRate: 58,
          sharpeRatio: 1.5,
          totalTrades: 243,
        },
        specializations: ['algorithmic', 'crypto'],
        lastTrade: new Date().toISOString(),
      },
      {
        id: 'agent_marcus',
        name: 'Marcus Johnson',
        avatar: '💪',
        role: 'portfolio_manager',
        level: 4,
        status: 'active',
        virtualCapital: 75000,
        experience: 950,
        learningRate: 0.07,
        performance: {
          totalPnL: 8900,
          winRate: 68,
          sharpeRatio: 2.1,
          totalTrades: 89,
        },
        specializations: ['stocks', 'diversification'],
        lastTrade: new Date().toISOString(),
      },
      {
        id: 'agent_sophia',
        name: 'Sophia Müller',
        avatar: '🎯',
        role: 'risk_manager',
        level: 5,
        status: 'active',
        virtualCapital: 60000,
        experience: 1450,
        learningRate: 0.06,
        performance: {
          totalPnL: 4500,
          winRate: 71,
          sharpeRatio: 2.3,
          totalTrades: 167,
        },
        specializations: ['risk_analysis', 'hedging'],
        lastTrade: new Date().toISOString(),
      },
      {
        id: 'agent_james',
        name: 'James Wilson',
        avatar: '⚡',
        role: 'trader',
        level: 3,
        status: 'active',
        virtualCapital: 25000,
        experience: 450,
        learningRate: 0.12,
        performance: {
          totalPnL: 1200,
          winRate: 54,
          sharpeRatio: 1.2,
          totalTrades: 312,
        },
        specializations: ['crypto', 'intraday'],
        lastTrade: new Date().toISOString(),
      },
    ];

    // Crear departamentos
    const departments = [
      {
        id: 'dept_trading',
        name: 'Trading Floor',
        type: 'trading',
        manager: 'Alex Rivera',
        members: ['agent_alex', 'agent_luna', 'agent_james'],
        budget: 150000,
        activeOperations: 12,
        location: { x: 0, y: 0, z: 0 },
        performance: {
          totalPnL: 12300,
          winRate: 60,
        },
      },
      {
        id: 'dept_portfolio',
        name: 'Portfolio Management',
        type: 'portfolio',
        manager: 'Marcus Johnson',
        members: ['agent_marcus', 'agent_sophia'],
        budget: 200000,
        activeOperations: 8,
        location: { x: 2, y: 0, z: 0 },
        performance: {
          totalPnL: 13400,
          winRate: 69,
        },
      },
      {
        id: 'dept_risk',
        name: 'Risk Management',
        type: 'risk',
        manager: 'Sophia Müller',
        members: ['agent_sophia'],
        budget: 100000,
        activeOperations: 5,
        location: { x: 4, y: 0, z: 0 },
        performance: {
          totalPnL: 4500,
          winRate: 71,
        },
      },
    ];

    // Crear estrategias
    const strategies = [
      {
        id: 'strat_momentum',
        name: 'Momentum Trading',
        description: 'Follow market momentum with automated stops',
        type: 'momentum',
        status: 'active',
        agents: ['agent_alex', 'agent_luna'],
        backtest: {
          returns: 28.5,
          winRate: 62,
          sharpeRatio: 1.8,
          maxDrawdown: -12.3,
        },
        livePerformance: {
          totalPnL: 5600,
          totalTrades: 156,
          winRate: 61,
        },
      },
      {
        id: 'strat_mean_reversion',
        name: 'Mean Reversion',
        description: 'Exploit price extremes for reversion trades',
        type: 'mean_reversion',
        status: 'active',
        agents: ['agent_marcus'],
        backtest: {
          returns: 35.2,
          winRate: 68,
          sharpeRatio: 2.1,
          maxDrawdown: -8.5,
        },
        livePerformance: {
          totalPnL: 8900,
          totalTrades: 89,
          winRate: 68,
        },
      },
      {
        id: 'strat_grid_trading',
        name: 'Grid Trading Bot',
        description: 'Automated grid buying and selling',
        type: 'grid',
        status: 'testing',
        agents: ['agent_james'],
        backtest: {
          returns: 22.1,
          winRate: 54,
          sharpeRatio: 1.2,
          maxDrawdown: -18.0,
        },
        livePerformance: {
          totalPnL: 1200,
          totalTrades: 312,
          winRate: 54,
        },
      },
    ];

    await Promise.all([
      writeData('agents', agents),
      writeData('departments', departments),
      writeData('strategies', strategies),
    ]);

    return NextResponse.json({
      status: 'Initialized',
      agents: agents.length,
      departments: departments.length,
      strategies: strategies.length,
    });
  } catch (e) {
    console.error('Init error:', e);
    return NextResponse.json({ error: 'Init failed' }, { status: 500 });
  }
}
