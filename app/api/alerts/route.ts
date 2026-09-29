import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readData, writeData, getAllAccounts } from '@/lib/db';
import { Alert, Account, Trade } from '@/lib/types';

export async function GET(req: NextRequest) {

  try {
    const mode = req.nextUrl.searchParams.get('mode') || 'active'; // 'active', 'all', 'acknowledged'
    const alerts = await readData<Alert[]>('alerts', []);

    let filtered = alerts;
    if (mode === 'active') {
      filtered = alerts.filter(a => a.triggered && !a.acknowledged);
    } else if (mode === 'acknowledged') {
      filtered = alerts.filter(a => a.acknowledged);
    }

    return NextResponse.json(filtered);
  } catch (e) {
    console.error('Error fetching alerts:', e);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {

  try {
    const body = await req.json();
    const alerts = await readData<Alert[]>('alerts', []);

    const newAlert: Alert = {
      id: `alert_${Date.now()}`,
      accountId: body.accountId,
      type: body.type,
      level: body.level || 'warning',
      title: body.title,
      message: body.message,
      condition: body.condition,
      triggered: false,
      createdAt: new Date().toISOString(),
      acknowledged: false,
    };

    alerts.push(newAlert);
    await writeData('alerts', alerts);

    return NextResponse.json(newAlert, { status: 201 });
  } catch (e) {
    console.error('Error creating alert:', e);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

// Reconocer alerta
export async function PUT(req: NextRequest) {

  try {
    const body = await req.json();
    const { id, acknowledged } = body;

    const alerts = await readData<Alert[]>('alerts', []);
    const idx = alerts.findIndex(a => a.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    alerts[idx].acknowledged = acknowledged ?? true;
    alerts[idx].acknowledgedAt = new Date().toISOString();

    await writeData('alerts', alerts);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Error updating alert:', e);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}

// Trigger automático de alertas basadas en condiciones
export async function PATCH(req: NextRequest) {

  try {
    const accounts = await getAllAccounts() as Account[];
    const alerts = await readData<Alert[]>('alerts', []);

    for (const account of accounts) {
      // Verificar drawdown
      const initialCapital = account.initialCapital;
      const currentCapital = account.currentCapital;
      const drawdownPercent = ((initialCapital - currentCapital) / initialCapital) * 100;

      if (drawdownPercent > account.maxDrawdownPercent) {
        const drawdownAlert = alerts.find(
          a => a.accountId === account.id && a.type === 'drawdown'
        );

        if (drawdownAlert) {
          drawdownAlert.triggered = true;
          drawdownAlert.triggeredAt = new Date().toISOString();
        } else {
          alerts.push({
            id: `alert_${Date.now()}`,
            accountId: account.id,
            type: 'drawdown',
            level: drawdownPercent > account.maxDrawdownPercent * 1.5 ? 'critical' : 'warning',
            title: `High Drawdown Alert - ${account.name}`,
            message: `Account "${account.name}" has ${drawdownPercent.toFixed(2)}% drawdown, exceeding the ${account.maxDrawdownPercent}% limit.`,
            condition: { metric: 'drawdown', operator: '>', value: account.maxDrawdownPercent },
            triggered: true,
            createdAt: new Date().toISOString(),
            triggeredAt: new Date().toISOString(),
            acknowledged: false,
          });
        }
      }
    }

    await writeData('alerts', alerts);
    return NextResponse.json({ ok: true, alerts });
  } catch (e) {
    console.error('Error triggering alerts:', e);
    return NextResponse.json({ error: 'Failed to trigger alerts' }, { status: 500 });
  }
}
