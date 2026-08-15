import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';

export type Account = {
  id: string; name: string; icon: string; color: string; createdAt: string;
};

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'propia', name: 'Cuenta Propia', icon: '💼', color: '#00e5ff', createdAt: new Date().toISOString() },
  { id: 'inversiones', name: 'Inversiones', icon: '📈', color: '#00e676', createdAt: new Date().toISOString() },
  { id: 'cripto', name: 'Cripto', icon: '₿', color: '#ffb300', createdAt: new Date().toISOString() },
];

export async function GET() {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const accounts = await readData<Account[]>('accounts', DEFAULT_ACCOUNTS);
  if (!accounts.length) { await writeData('accounts', DEFAULT_ACCOUNTS); return NextResponse.json(DEFAULT_ACCOUNTS); }
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const accounts = await readData<Account[]>('accounts', DEFAULT_ACCOUNTS);
  if (body.action === 'add') {
    const a: Account = { id: Date.now().toString(), name: body.name, icon: body.icon || '💼', color: body.color || '#4d9fff', createdAt: new Date().toISOString() };
    accounts.push(a);
    await writeData('accounts', accounts);
    return NextResponse.json({ ok: true, account: a });
  }
  if (body.action === 'delete') {
    await writeData('accounts', accounts.filter(a => a.id !== body.id));
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
