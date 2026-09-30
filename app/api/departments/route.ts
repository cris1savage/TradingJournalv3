import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { Department } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const departments = await readData<Department[]>('departments', []);
    return NextResponse.json(departments);
  } catch (e) {
    console.error('Error fetching departments:', e);
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const departments = await readData<Department[]>('departments', []);

    const newDept: Department = {
      id: `dept_${Date.now()}`,
      name: body.name,
      type: body.type,
      manager: body.manager,
      members: body.members || [],
      budget: body.budget || 0,
      performance: {
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
      location: body.location || { x: Math.random() * 400, y: Math.random() * 400, z: 0 },
      activeOperations: 0,
      createdAt: new Date().toISOString(),
    };

    departments.push(newDept);
    await writeData('departments', departments);

    return NextResponse.json(newDept, { status: 201 });
  } catch (e) {
    console.error('Error creating department:', e);
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  }
}
