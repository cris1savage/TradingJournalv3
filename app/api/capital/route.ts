import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';

export interface CapitalData {
  initial: number;
  aportaciones: { id: number; date: string; amount: number; desc: string }[];
}

const DEFAULT: CapitalData = { initial: 0, aportaciones: [] };

export async function GET() {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await readData<CapitalData>('capital', DEFAULT));
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const data = await readData<CapitalData>('capital', DEFAULT);

  if (body.action === 'setInitial') {
    data.initial = body.amount;
  } else if (body.action === 'addAport') {
    data.aportaciones.push({ id: Date.now(), date: body.date, amount: body.amount, desc: body.desc });
    data.aportaciones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } else if (body.action === 'deleteAport') {
    data.aportaciones = data.aportaciones.filter(a => a.id !== body.id);
  }

  await writeData('capital', data);
  return NextResponse.json({ ok: true });
}
