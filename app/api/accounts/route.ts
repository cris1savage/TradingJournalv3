import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getAllAccounts, saveAccounts } from '@/lib/db';
import { Account, AccountType } from '@/lib/types';

// Legacy account type for backward compatibility
export type LegacyAccount = {
  id: string; name: string; icon: string; color: string; createdAt: string;
};

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'propia',
    name: 'Cuenta Propia',
    type: 'forex',
    broker: 'Personal',
    initialCapital: 5000,
    currentCapital: 5000,
    status: 'active',
    accountManager: 'operations_manager',
    riskProfile: 'moderate',
    monthlyAllocation: 500,
    maxDrawdownPercent: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inversiones',
    name: 'Inversiones',
    type: 'stocks',
    broker: 'Broker',
    initialCapital: 10000,
    currentCapital: 10000,
    status: 'active',
    accountManager: 'price_specialist',
    riskProfile: 'conservative',
    monthlyAllocation: 1000,
    maxDrawdownPercent: 15,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cripto',
    name: 'Cripto',
    type: 'crypto',
    broker: 'Binance',
    initialCapital: 3000,
    currentCapital: 3000,
    status: 'active',
    accountManager: 'price_specialist',
    riskProfile: 'aggressive',
    monthlyAllocation: 300,
    maxDrawdownPercent: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function GET() {

  try {
    let accounts = await getAllAccounts();
    if (!accounts || !accounts.length) {
      await saveAccounts(DEFAULT_ACCOUNTS);
      return NextResponse.json(DEFAULT_ACCOUNTS);
    }
    return NextResponse.json(accounts);
  } catch (e) {
    console.error('Error fetching accounts:', e);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {

  try {
    const body = await req.json();
    const accounts = await getAllAccounts();

    if (body.action === 'add') {
      const newAccount: Account = {
        id: `acc_${Date.now()}`,
        name: body.name,
        type: body.type as AccountType || 'forex',
        broker: body.broker || 'Unknown',
        initialCapital: body.initialCapital || 5000,
        currentCapital: body.initialCapital || 5000,
        status: 'active',
        accountManager: body.accountManager || 'system',
        riskProfile: body.riskProfile || 'moderate',
        monthlyAllocation: body.monthlyAllocation || 0,
        maxDrawdownPercent: body.maxDrawdownPercent || 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      accounts.push(newAccount);
      await saveAccounts(accounts);
      return NextResponse.json({ ok: true, account: newAccount });
    }

    if (body.action === 'delete') {
      const filtered = accounts.filter((a: Account) => a.id !== body.id);
      await saveAccounts(filtered);
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'update') {
      const idx = accounts.findIndex((a: Account) => a.id === body.id);
      if (idx === -1) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

      accounts[idx] = { ...accounts[idx], ...body.data, updatedAt: new Date().toISOString() };
      await saveAccounts(accounts);
      return NextResponse.json({ ok: true, account: accounts[idx] });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('Error processing account:', e);
    return NextResponse.json({ error: 'Failed to process account' }, { status: 500 });
  }
}
