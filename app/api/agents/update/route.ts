import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { VirtualAgent } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { agentId, status } = await req.json();

    if (!agentId || !status) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const agents = await readData<VirtualAgent[]>('agents', []);
    const updatedAgents = agents.map(agent =>
      agent.id === agentId
        ? { ...agent, status: status as 'active' | 'paused' | 'stopped' }
        : agent
    );

    await writeData('agents', updatedAgents);

    return NextResponse.json({
      status: 'success',
      message: `Agent ${status}`,
      agent: updatedAgents.find(a => a.id === agentId),
    });
  } catch (e) {
    console.error('Error updating agent:', e);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}
