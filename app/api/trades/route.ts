import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';

export interface Trade {
  id: number; date: string; time: string; pair: string; tf: string;
  dir: string; res: string; plan: string | null;
  entry: number; sl: number; tp: number; risk: number; lot: number;
  rr: string; pnl: number; rreal: string; conf: string[]; emo: string; notes: string;
}

export async function GET() {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const trades = await readData<Trade[]>('trades', []);
  return NextResponse.json(trades);
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const trade: Trade = await req.json();
  const trades = await readData<Trade[]>('trades', []);
  trades.push(trade);
  trades.sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime());
  await writeData('trades', trades);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  const trades = await readData<Trade[]>('trades', []);
  await writeData('trades', trades.filter(t => t.id !== id));
  return NextResponse.json({ ok: true });
}
