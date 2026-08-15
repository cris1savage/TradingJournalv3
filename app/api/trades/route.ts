import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';

export interface Trade {
  id: number; date: string; time: string; pair: string; tf: string;
  dir: string; res: string; plan: string | null;
  entry: number; sl: number; tp: number; risk: number; lot: number;
  rr: string; pnl: number; rreal: string; conf: string[]; emo: string; notes: string;
}

function key(accountId: string) { return `trades_${accountId}`; }

export async function GET(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const accountId = req.nextUrl.searchParams.get('account') || 'propia';
  const trades = await readData<Trade[]>(key(accountId), []);
  return NextResponse.json(trades);
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { account = 'propia', ...trade } = await req.json();
  const trades = await readData<Trade[]>(key(account), []);
  trades.push(trade as Trade);
  trades.sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime());
  await writeData(key(account), trades);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, account = 'propia' } = await req.json();
  const trades = await readData<Trade[]>(key(account), []);
  await writeData(key(account), trades.filter(t => t.id !== id));
  return NextResponse.json({ ok: true });
}
