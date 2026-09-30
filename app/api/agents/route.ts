import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { VirtualAgent } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const department = req.nextUrl.searchParams.get('department');
    const agents = await readData<VirtualAgent[]>('agents', []);

    if (department) {
      return NextResponse.json(agents.filter(a => a.department === department));
    }
    return NextResponse.json(agents);
  } catch (e) {
    console.error('Error fetching agents:', e);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const agents = await readData<VirtualAgent[]>('agents', []);

    const newAgent: VirtualAgent = {
      id: `agent_${Date.now()}`,
      name: body.name,
      role: body.role,
      level: body.level || 'junior',
      avatar: body.avatar || '👤',
      style: body.style,
      department: body.department,
      experience: body.experience || 0,
      status: 'active',
      performance: {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        consistency: 0,
      },
      level_exp: 0,
      badges: [],
      certifications: [],
      assignedStrategies: [],
      specializations: body.specializations || [],
      allocatedCapital: body.allocatedCapital || 0,
      virtualCapital: body.allocatedCapital || 0,
      commission: body.commission || 0.2,
      learning_rate: 1,
      adaptability: 50,
      riskTolerance: body.riskTolerance || 'medium',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      hiredBy: body.hiredBy || 'system',
    };

    agents.push(newAgent);
    await writeData('virtual_agents', agents);

    return NextResponse.json(newAgent, { status: 201 });
  } catch (e) {
    console.error('Error creating agent:', e);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const agents = await readData<VirtualAgent[]>('agents', []);

    const idx = agents.findIndex(a => a.id === body.agentId);
    if (idx === -1) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    agents[idx] = { ...agents[idx], ...body.updates, lastActiveAt: new Date().toISOString() };
    await writeData('virtual_agents', agents);

    return NextResponse.json(agents[idx]);
  } catch (e) {
    console.error('Error updating agent:', e);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}
