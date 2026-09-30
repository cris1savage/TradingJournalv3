import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { VirtualAgent } from '@/lib/types';

interface CryptoWithdrawal {
  id: string;
  agentId: string;
  toAddress: string;
  amountEUR: number;
  amountCrypto: number;
  currency: 'BTC' | 'ETH' | 'USDT' | 'USDC';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  timestamp: string;
  fee: number;
  feeCurrency: 'EUR' | string;
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, toAddress, amountEUR, currency } = await req.json();

    if (!agentId || !toAddress || !amountEUR || !currency) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Validar dirección
    if (toAddress.length < 20) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    // Precios de cripto (en producción, usar API de precio en vivo)
    const CRYPTO_PRICES: Record<string, number> = {
      'BTC': 45000,
      'ETH': 2500,
      'USDT': 1,
      'USDC': 1,
    };

    // Comisiones de red (en EUR)
    const NETWORK_FEES: Record<string, number> = {
      'BTC': 10,
      'ETH': 5,
      'USDT': 2,
      'USDC': 1,
    };

    const agents = await readData<VirtualAgent[]>('agents', []);
    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const capitalAvailable = agent.virtualCapital || 10000;
    const fee = NETWORK_FEES[currency] || 5;
    const totalDebit = amountEUR + fee;

    if (capitalAvailable < totalDebit) {
      return NextResponse.json({
        error: 'Insufficient capital',
        available: capitalAvailable,
        required: totalDebit,
      }, { status: 400 });
    }

    // Crear registro de retiro
    const withdrawals = await readData<CryptoWithdrawal[]>('crypto_withdrawals', []);
    const amountCrypto = amountEUR / CRYPTO_PRICES[currency];

    const withdrawal: CryptoWithdrawal = {
      id: `withdraw_${Date.now()}`,
      agentId,
      toAddress,
      amountEUR,
      amountCrypto,
      currency: currency as any,
      status: 'pending',
      timestamp: new Date().toISOString(),
      fee,
      feeCurrency: 'EUR',
    };

    withdrawals.push(withdrawal);

    // Debitar capital inmediatamente (pending approval)
    const updatedAgents = agents.map(a => {
      if (a.id === agentId) {
        return {
          ...a,
          virtualCapital: Math.max(100, (a.virtualCapital || 10000) - totalDebit),
        };
      }
      return a;
    });

    await Promise.all([
      writeData('crypto_withdrawals', withdrawals),
      writeData('agents', updatedAgents),
    ]);

    return NextResponse.json({
      status: 'pending_approval',
      withdrawal,
      message: `Retiro pendiente de confirmación. Se enviarán ${amountCrypto.toFixed(6)} ${currency}`,
      details: {
        amountCrypto: amountCrypto.toFixed(6),
        networkFee: fee,
        toAddress: `${toAddress.substring(0, 10)}...${toAddress.substring(toAddress.length - 8)}`,
        currency,
      },
    });
  } catch (e) {
    console.error('Withdrawal error:', e);
    return NextResponse.json({ error: 'Withdrawal failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    const withdrawals = await readData<CryptoWithdrawal[]>('crypto_withdrawals', []);

    const filtered = agentId
      ? withdrawals.filter(w => w.agentId === agentId)
      : withdrawals;

    return NextResponse.json({
      withdrawals: filtered.slice(-20),
      pendingCount: filtered.filter(w => w.status === 'pending').length,
      totalWithdrawn: filtered
        .filter(w => w.status === 'completed')
        .reduce((sum, w) => sum + w.amountEUR, 0),
    });
  } catch (e) {
    console.error('Error fetching withdrawals:', e);
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
  }
}

// Webhook para confirmar retiro procesado
export async function PUT(req: NextRequest) {
  try {
    const { withdrawalId, txHash, status } = await req.json();

    const withdrawals = await readData<CryptoWithdrawal[]>('crypto_withdrawals', []);
    const withdrawal = withdrawals.find(w => w.id === withdrawalId);

    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    }

    withdrawal.status = status as any;
    withdrawal.txHash = txHash;

    const updatedWithdrawals = withdrawals.map(w => w.id === withdrawalId ? withdrawal : w);
    await writeData('crypto_withdrawals', updatedWithdrawals);

    return NextResponse.json({
      status: 'success',
      withdrawal,
      message: `Retiro ${status}`,
    });
  } catch (e) {
    console.error('Withdrawal update error:', e);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
