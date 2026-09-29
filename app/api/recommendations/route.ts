import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readData, writeData, getAllAccounts } from '@/lib/db';
import { Recommendation, Account, Trade } from '@/lib/types';

export async function GET(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const recommendations = await readData<Recommendation[]>('recommendations', []);
    const resolved = req.nextUrl.searchParams.get('resolved') === 'true';

    const filtered = resolved
      ? recommendations.filter(r => r.resolved)
      : recommendations.filter(r => !r.resolved);

    return NextResponse.json(filtered);
  } catch (e) {
    console.error('Error fetching recommendations:', e);
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'generate') {
      // Generar recomendaciones automáticas
      const accounts = await getAllAccounts() as Account[];
      const recommendations: Recommendation[] = [];

      for (const account of accounts) {
        const profitAmount = account.currentCapital - account.initialCapital;
        const profitPercent = (profitAmount / account.initialCapital) * 100;
        const drawdownPercent = ((account.initialCapital - account.currentCapital) / account.initialCapital) * 100;

        // Recomendación de reinversión
        if (profitPercent > 5) {
          recommendations.push({
            id: `rec_${Date.now()}_1`,
            type: 'capital_allocation',
            priority: 'high',
            title: `Reinvestment Opportunity - ${account.name}`,
            description: `Account "${account.name}" has ${profitPercent.toFixed(2)}% profit. Consider reinvesting a portion of gains.`,
            actionRequired: `Reinvest 20-50% of profits (€${(profitAmount * 0.3).toFixed(2)}) back into trading`,
            supportingData: {
              profitAmount,
              profitPercent,
              recommendedReinvestAmount: profitAmount * 0.3,
            },
            createdAt: new Date().toISOString(),
            resolved: false,
          });
        }

        // Recomendación de pausa por drawdown
        if (drawdownPercent > account.maxDrawdownPercent * 0.7) {
          recommendations.push({
            id: `rec_${Date.now()}_2`,
            type: 'risk_management',
            priority: 'critical',
            title: `Risk Alert - ${account.name}`,
            description: `Account "${account.name}" has ${drawdownPercent.toFixed(2)}% drawdown, approaching the limit of ${account.maxDrawdownPercent}%.`,
            actionRequired: 'Consider pausing trading or reducing position sizes until recovery',
            supportingData: {
              currentDrawdown: drawdownPercent,
              maxAllowedDrawdown: account.maxDrawdownPercent,
              recoveryNeeded: account.currentCapital - (account.initialCapital * (1 - account.maxDrawdownPercent / 100)),
            },
            createdAt: new Date().toISOString(),
            resolved: false,
          });
        }

        // Recomendación de diversificación
        if (accounts.length < 3 && account.type === 'forex') {
          recommendations.push({
            id: `rec_${Date.now()}_3`,
            type: 'strategy_adjustment',
            priority: 'medium',
            title: 'Portfolio Diversification',
            description: 'Consider adding crypto or stock trading accounts to diversify risk.',
            actionRequired: 'Create a new Crypto or Stocks account with 10-20% of total capital',
            supportingData: {
              currentAccountTypes: accounts.map(a => a.type),
              suggestedAllocation: {
                crypto: account.initialCapital * 0.15,
                stocks: account.initialCapital * 0.15,
              },
            },
            createdAt: new Date().toISOString(),
            resolved: false,
          });
        }
      }

      const existing = await readData<Recommendation[]>('recommendations', []);
      const allRecs = [...existing, ...recommendations];

      // Remover duplicados
      const unique = allRecs.filter(
        (rec, index, self) =>
          index === self.findIndex(r => r.type === rec.type && r.priority === rec.priority)
      );

      await writeData('recommendations', unique);
      return NextResponse.json(recommendations);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('Error processing recommendation:', e);
    return NextResponse.json({ error: 'Failed to process recommendation' }, { status: 500 });
  }
}

// Marcar como resuelto
export async function PUT(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { id } = body;

    const recommendations = await readData<Recommendation[]>('recommendations', []);
    const idx = recommendations.findIndex(r => r.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 });
    }

    recommendations[idx].resolved = true;
    await writeData('recommendations', recommendations);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Error updating recommendation:', e);
    return NextResponse.json({ error: 'Failed to update recommendation' }, { status: 500 });
  }
}
