import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';

export interface CapitalData {
  initial: number;
  aportaciones: { id: number; date: string; amount: number; desc: string }[];
}

const DEFAULT: CapitalData = { initial: 0, aportaciones: [] };
function key(accountId: string) { return `capital_${accountId}`; }

export async function GET(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const accountId = req.nextUrl.searchParams.get('account') || 'propia';
  return NextResponse.json(await readData<CapitalData>(key(accountId), DEFAULT));
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const accountId = body.account || 'propia';
  const data = await readData<CapitalData>(key(accountId), DEFAULT);
  if (body.action === 'setInitial') data.initial = body.amount;
  else if (body.action === 'addAport') {
    data.aportaciones.push({ id: Date.now(), date: body.date, amount: body.amount, desc: body.desc });
    data.aportaciones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } else if (body.action === 'deleteAport') {
    data.aportaciones = data.aportaciones.filter(a => a.id !== body.id);
  }
  await writeData(key(accountId), data);
  return NextResponse.json({ ok: true });
}
