import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { VirtualAgent } from '@/lib/types';

interface Deposit {
  id: string;
  agentId: string;
  amount: number;
  type: 'virtual' | 'real';
  timestamp: string;
  status: 'pending' | 'completed' | 'rejected';
  paymentMethod?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, amount, type = 'real' } = await req.json();

    if (!agentId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Get agent
    const agents = await readData<VirtualAgent[]>('agents', []);
    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Create deposit record
    const deposits = await readData<Deposit[]>('deposits', []);
    const deposit: Deposit = {
      id: `deposit_${Date.now()}`,
      agentId,
      amount,
      type,
      timestamp: new Date().toISOString(),
      status: type === 'virtual' ? 'completed' : 'pending',
    };

    deposits.push(deposit);

    // Update agent capital if virtual deposit
    if (type === 'virtual') {
      const updatedAgents = agents.map(a =>
        a.id === agentId
          ? { ...a, virtualCapital: (a.virtualCapital || 10000) + amount }
          : a
      );
      await Promise.all([
        writeData('agents', updatedAgents),
        writeData('deposits', deposits),
      ]);

      return NextResponse.json({
        status: 'success',
        deposit,
        newCapital: (agent.virtualCapital || 10000) + amount,
        message: type === 'virtual' ? 'Depósito virtual procesado' : 'Depósito real pendiente de confirmación',
      });
    }

    // For real money, save and return pending status
    await writeData('deposits', deposits);
    return NextResponse.json({
      status: 'pending',
      deposit,
      message: 'Depósito real pendiente. Se requiere verificación bancaria.',
    });
  } catch (e) {
    console.error('Deposit error:', e);
    return NextResponse.json({ error: 'Deposit failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    const deposits = await readData<Deposit[]>('deposits', []);

    const filtered = agentId
      ? deposits.filter(d => d.agentId === agentId)
      : deposits;

    return NextResponse.json({
      deposits: filtered.slice(-20),
      total: filtered.reduce((sum, d) => d.status === 'completed' ? sum + d.amount : sum, 0),
    });
  } catch (e) {
    console.error('Error fetching deposits:', e);
    return NextResponse.json({ error: 'Failed to fetch deposits' }, { status: 500 });
  }
}
