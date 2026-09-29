import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readData, writeData, getAllAccounts } from '@/lib/db';
import { TeamMember, SpecialistRole, Alert, Account, Trade } from '@/lib/types';

const DEFAULT_TEAM: TeamMember[] = [
  {
    id: 'operations_manager',
    role: 'operations_manager',
    name: 'Carlos',
    title: 'Operations Manager',
    description: 'Oversees all trading operations and capital allocation decisions',
    icon: '👨‍💼',
    status: 'active',
    lastUpdate: new Date().toISOString(),
    alertCount: 0,
    metrics: {
      accountsManaged: 3,
      totalCapital: 0,
      portfolio_health: 'good',
    },
  },
  {
    id: 'risk_advisor',
    role: 'risk_advisor',
    name: 'Ana',
    title: 'Risk Advisor',
    description: 'Monitors drawdowns and manages risk parameters',
    icon: '👩‍⚖️',
    status: 'active',
    lastUpdate: new Date().toISOString(),
    alertCount: 0,
    metrics: {
      drawdowns_monitored: 3,
      active_alerts: 0,
      risk_score: 0,
    },
  },
  {
    id: 'price_specialist',
    role: 'price_specialist',
    name: 'Miguel',
    title: 'Price Specialist',
    description: 'Tracks real-time market prices and identifies opportunities',
    icon: '📊',
    status: 'active',
    lastUpdate: new Date().toISOString(),
    alertCount: 0,
    metrics: {
      symbols_tracked: 20,
      price_alerts: 0,
      market_updates: 0,
    },
  },
  {
    id: 'performance_coach',
    role: 'performance_coach',
    name: 'Sofia',
    title: 'Performance Coach',
    description: 'Analyzes trading psychology and provides improvement recommendations',
    icon: '🧠',
    status: 'active',
    lastUpdate: new Date().toISOString(),
    alertCount: 0,
    metrics: {
      emotional_score: 0,
      discipline_rating: 0,
      sessions_analyzed: 0,
    },
  },
];

export async function GET(req: NextRequest) {

  try {
    const mode = req.nextUrl.searchParams.get('mode') || 'all'; // 'all', 'active', 'status'

    let team = await readData<TeamMember[]>('team', DEFAULT_TEAM);

    if (mode === 'status') {
      // Actualizar estado basado en alertas y actividad
      const alerts = await readData<Alert[]>('alerts', []);
      const accounts = await getAllAccounts() as Account[];

      for (const member of team) {
        if (member.role === 'risk_advisor') {
          const activeAlerts = alerts.filter(a => a.triggered && !a.acknowledged);
          member.alertCount = activeAlerts.length;
          member.status = activeAlerts.length > 0 ? 'alert' : 'active';
          member.metrics.active_alerts = activeAlerts.length;
        }

        if (member.role === 'operations_manager') {
          member.metrics.accountsManaged = accounts.length;
          member.metrics.totalCapital = accounts.reduce((sum, a) => sum + a.currentCapital, 0);
          member.alertCount = alerts.filter(a => a.level === 'critical' && !a.acknowledged).length;
        }

        member.lastUpdate = new Date().toISOString();
      }

      await writeData('team', team);
    }

    return NextResponse.json(team);
  } catch (e) {
    console.error('Error fetching team:', e);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {

  try {
    const body = await req.json();
    const { memberId, action } = body;

    let team = await readData<TeamMember[]>('team', DEFAULT_TEAM);
    const member = team.find(m => m.id === memberId);

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    if (action === 'acknowledge_alerts') {
      const alerts = await readData<Alert[]>('alerts', []);
      alerts.forEach(a => {
        if (a.level === 'critical' || a.type === 'drawdown') {
          a.acknowledged = true;
          a.acknowledgedAt = new Date().toISOString();
        }
      });
      await writeData('alerts', alerts);
      member.alertCount = 0;
      member.status = 'active';
    }

    member.lastUpdate = new Date().toISOString();
    await writeData('team', team);

    return NextResponse.json({ ok: true, member });
  } catch (e) {
    console.error('Error updating team member:', e);
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
  }
}

// Generar reporte de equipo
export async function PATCH(req: NextRequest) {

  try {
    const team = await readData<TeamMember[]>('team', DEFAULT_TEAM);
    const accounts = await getAllAccounts() as Account[];
    const alerts = await readData<Alert[]>('alerts', []);

    const teamReport = {
      generatedAt: new Date().toISOString(),
      members: team.map(m => ({
        ...m,
        status: m.status,
        alertCount: m.alertCount,
      })),
      summary: {
        totalAlerts: alerts.filter(a => a.triggered && !a.acknowledged).length,
        criticalAlerts: alerts.filter(a => a.level === 'critical' && !a.acknowledged).length,
        accountsUnderMonitoring: accounts.length,
        healthStatus: alerts.some(a => a.level === 'critical' && !a.acknowledged) ? 'warning' : 'healthy',
      },
    };

    return NextResponse.json(teamReport);
  } catch (e) {
    console.error('Error generating team report:', e);
    return NextResponse.json({ error: 'Failed to generate team report' }, { status: 500 });
  }
}
