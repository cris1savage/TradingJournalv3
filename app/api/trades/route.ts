import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { Trade } from '@/lib/types';

function key(accountId: string) { return `trades_${accountId}`; }

export async function GET(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get('account') || 'propia';
  const mode = req.nextUrl.searchParams.get('mode') || 'single'; // 'single' o 'all'

  try {
    if (mode === 'all') {
      // Obtener trades de todas las cuentas
      const allTrades = await readData<Trade[]>('all_trades', []);
      return NextResponse.json(allTrades);
    } else {
      // Obtener trades de una cuenta específica
      const trades = await readData<Trade[]>(key(accountId), []);
      return NextResponse.json(trades);
    }
  } catch (e) {
    console.error('Error fetching trades:', e);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const accountId = body.accountId || body.account || 'propia';

    const trades = await readData<Trade[]>(key(accountId), []);

    const newTrade: Trade = {
      id: trades.length > 0 ? Math.max(...trades.map(t => t.id)) + 1 : 1,
      accountId,
      date: body.date,
      time: body.time,
      pair: body.pair,
      tf: body.tf,
      dir: body.dir,
      res: body.res || 'PENDING',
      plan: body.plan || null,
      entry: body.entry,
      sl: body.sl,
      tp: body.tp,
      risk: body.risk,
      lot: body.lot,
      rr: body.rr,
      pnl: body.pnl || 0,
      rreal: body.rreal || '',
      conf: body.conf || [],
      emo: body.emo || '',
      notes: body.notes || '',
      tvUrl: body.tvUrl,
      tags: body.tags || [],
      attachments: body.attachments || [],
    };

    trades.push(newTrade);
    trades.sort((a, b) => new Date(a.date + ' ' + a.time).getTime() - new Date(b.date + ' ' + b.time).getTime());

    await writeData(key(accountId), trades);

    return NextResponse.json({ ok: true, trade: newTrade }, { status: 201 });
  } catch (e) {
    console.error('Error creating trade:', e);
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const accountId = body.accountId || body.account || 'propia';

    const trades = await readData<Trade[]>(key(accountId), []);
    const idx = trades.findIndex(t => t.id === body.id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    trades[idx] = { ...trades[idx], ...body.data };
    await writeData(key(accountId), trades);

    return NextResponse.json({ ok: true, trade: trades[idx] });
  } catch (e) {
    console.error('Error updating trade:', e);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const accountId = body.accountId || body.account || 'propia';
    const tradeId = body.id;

    const trades = await readData<Trade[]>(key(accountId), []);
    const filtered = trades.filter(t => t.id !== tradeId);

    await writeData(key(accountId), filtered);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Error deleting trade:', e);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  }
}
