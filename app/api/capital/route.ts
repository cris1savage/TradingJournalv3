import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readData, writeData, getAllAccounts, saveAccounts } from '@/lib/db';
import { CapitalMovement, Capital, Account } from '@/lib/types';

function key(accountId: string) { return `capital_${accountId}`; }

export async function GET(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const accountId = req.nextUrl.searchParams.get('account') || 'propia';
    const accounts = await getAllAccounts() as Account[];
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const capital = await readData<Capital>(key(accountId), {
      accountId,
      initial: account.initialCapital,
      current: account.currentCapital,
      movements: [],
      lastUpdated: new Date().toISOString(),
    });

    return NextResponse.json(capital);
  } catch (e) {
    console.error('Error fetching capital:', e);
    return NextResponse.json({ error: 'Failed to fetch capital' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const accountId = body.account || body.accountId || 'propia';
    const accounts = await getAllAccounts() as Account[];
    const idx = accounts.findIndex(a => a.id === accountId);

    if (idx === -1) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const capital = await readData<Capital>(key(accountId), {
      accountId,
      initial: accounts[idx].initialCapital,
      current: accounts[idx].currentCapital,
      movements: [],
      lastUpdated: new Date().toISOString(),
    });

    if (body.action === 'setInitial') {
      capital.initial = body.amount;
      accounts[idx].initialCapital = body.amount;
      accounts[idx].currentCapital = body.amount;
    } else if (body.action === 'addAport' || body.action === 'add') {
      const movement: CapitalMovement = {
        id: `mov_${Date.now()}`,
        accountId,
        type: body.type || 'deposit',
        amount: body.amount,
        date: body.date || new Date().toISOString(),
        description: body.desc || body.description || '',
      };

      capital.movements.push(movement);
      capital.current += body.amount;
      accounts[idx].currentCapital = capital.current;

      capital.movements.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (body.action === 'deleteAport' || body.action === 'delete') {
      const movement = capital.movements.find(m => m.id === body.id);
      if (movement) {
        capital.current -= movement.amount;
        accounts[idx].currentCapital = capital.current;
        capital.movements = capital.movements.filter(m => m.id !== body.id);
      }
    }

    capital.lastUpdated = new Date().toISOString();
    await writeData(key(accountId), capital);
    await saveAccounts(accounts);

    return NextResponse.json({ ok: true, capital });
  } catch (e) {
    console.error('Error processing capital:', e);
    return NextResponse.json({ error: 'Failed to process capital' }, { status: 500 });
  }
}

// Reinvertir automáticamente basado en performance
export async function PATCH(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { account: accountId = 'propia', percentage = 50 } = body;

    const accounts = await getAllAccounts() as Account[];
    const idx = accounts.findIndex(a => a.id === accountId);

    if (idx === -1) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const account = accounts[idx];
    const profitAmount = account.currentCapital - account.initialCapital;
    const reinvestAmount = (Math.max(0, profitAmount) * percentage) / 100;

    if (reinvestAmount > 0) {
      const capital = await readData<Capital>(key(accountId), {
        accountId,
        initial: account.initialCapital,
        current: account.currentCapital,
        movements: [],
        lastUpdated: new Date().toISOString(),
      });

      const movement: CapitalMovement = {
        id: `mov_${Date.now()}`,
        accountId,
        type: 'reinvestment',
        amount: reinvestAmount,
        date: new Date().toISOString(),
        description: `Auto-reinvestment of ${percentage}% of profits`,
      };

      capital.movements.push(movement);
      capital.current += reinvestAmount;
      capital.lastUpdated = new Date().toISOString();

      await writeData(key(accountId), capital);

      account.currentCapital += reinvestAmount;
      await saveAccounts(accounts);

      return NextResponse.json({ ok: true, reinvestedAmount: reinvestAmount });
    }

    return NextResponse.json({ ok: true, reinvestedAmount: 0 });
  } catch (e) {
    console.error('Error reinvesting capital:', e);
    return NextResponse.json({ error: 'Failed to reinvest' }, { status: 500 });
  }
}
