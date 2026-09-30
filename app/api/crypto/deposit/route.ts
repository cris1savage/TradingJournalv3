import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { VirtualAgent } from '@/lib/types';

interface CryptoDeposit {
  id: string;
  agentId: string;
  walletAddress: string;
  amount: number;
  currency: 'BTC' | 'ETH' | 'USDT' | 'USDC';
  equivalentEUR: number;
  status: 'pending' | 'confirmed' | 'completed';
  txHash?: string;
  timestamp: string;
  confirmations: number;
  requiredConfirmations: number;
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, currency } = await req.json();

    if (!agentId || !currency) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Predefined wallet addresses (en producción, generar dinámicamente)
    const CRYPTO_WALLETS: Record<string, Record<string, string>> = {
      'BTC': {
        mainnet: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        testnet: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx',
      },
      'ETH': {
        mainnet: '0x742d35Cc6634C0532925a3b844Bc9e7595f42bE1',
        testnet: '0x742d35Cc6634C0532925a3b844Bc9e7595f42bE1',
      },
      'USDT': {
        mainnet: '0x742d35Cc6634C0532925a3b844Bc9e7595f42bE1',
        testnet: '0x742d35Cc6634C0532925a3b844Bc9e7595f42bE1',
      },
      'USDC': {
        mainnet: '0x742d35Cc6634C0532925a3b844Bc9e7595f42bE1',
        testnet: '0x742d35Cc6634C0532925a3b844Bc9e7595f42bE1',
      },
    };

    // Tipos de confirmaciones requeridas
    const CONFIRMATIONS_REQUIRED: Record<string, number> = {
      'BTC': 3,
      'ETH': 12,
      'USDT': 12,
      'USDC': 12,
    };

    const agents = await readData<VirtualAgent[]>('agents', []);
    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Crear depósito con dirección de wallet
    const cryptoDeposits = await readData<CryptoDeposit[]>('crypto_deposits', []);
    const walletAddress = CRYPTO_WALLETS[currency]?.mainnet || '';

    const deposit: CryptoDeposit = {
      id: `crypto_${Date.now()}`,
      agentId,
      walletAddress,
      amount: 0,
      currency: currency as any,
      equivalentEUR: 0,
      status: 'pending',
      timestamp: new Date().toISOString(),
      confirmations: 0,
      requiredConfirmations: CONFIRMATIONS_REQUIRED[currency] || 3,
    };

    cryptoDeposits.push(deposit);
    await writeData('crypto_deposits', cryptoDeposits);

    return NextResponse.json({
      status: 'pending',
      deposit,
      instruction: `Envía ${currency} a esta dirección. Se confirmará automáticamente.`,
      walletAddress,
      requiredConfirmations: CONFIRMATIONS_REQUIRED[currency] || 3,
    });
  } catch (e) {
    console.error('Crypto deposit error:', e);
    return NextResponse.json({ error: 'Deposit failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');

    const cryptoDeposits = await readData<CryptoDeposit[]>('crypto_deposits', []);

    const filtered = agentId
      ? cryptoDeposits.filter(d => d.agentId === agentId)
      : cryptoDeposits;

    return NextResponse.json({
      deposits: filtered.slice(-20),
      pendingCount: filtered.filter(d => d.status === 'pending').length,
      completedTotal: filtered
        .filter(d => d.status === 'completed')
        .reduce((sum, d) => sum + d.equivalentEUR, 0),
    });
  } catch (e) {
    console.error('Error fetching crypto deposits:', e);
    return NextResponse.json({ error: 'Failed to fetch deposits' }, { status: 500 });
  }
}

// Webhook para recibir notificaciones de pagos confirmados
export async function PUT(req: NextRequest) {
  try {
    const { txHash, currency, amountReceived, status } = await req.json();

    const cryptoDeposits = await readData<CryptoDeposit[]>('crypto_deposits', []);
    const depositIndex = cryptoDeposits.findIndex(
      d => d.currency === currency && d.status === 'pending'
    );

    if (depositIndex === -1) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    }

    const deposit = cryptoDeposits[depositIndex];
    deposit.txHash = txHash;
    deposit.amount = amountReceived;
    deposit.status = status as any;
    deposit.confirmations = status === 'completed' ? deposit.requiredConfirmations : 0;

    // Convertir a EUR (precios aproximados para demo)
    const CRYPTO_PRICES: Record<string, number> = {
      'BTC': 45000,
      'ETH': 2500,
      'USDT': 1,
      'USDC': 1,
    };

    deposit.equivalentEUR = amountReceived * (CRYPTO_PRICES[currency] || 1);

    cryptoDeposits[depositIndex] = deposit;

    // Si completado, actualizar capital del agente
    if (status === 'completed') {
      const agents = await readData<VirtualAgent[]>('agents', []);
      const agent = agents.find(a => a.id === deposit.agentId);

      if (agent) {
        agent.virtualCapital = (agent.virtualCapital || 10000) + deposit.equivalentEUR;
        const updatedAgents = agents.map(a => a.id === agent.id ? agent : a);
        await writeData('agents', updatedAgents);
      }
    }

    await writeData('crypto_deposits', cryptoDeposits);

    return NextResponse.json({
      status: 'success',
      deposit,
      message: `Depósito de ${amountReceived} ${currency} confirmado`,
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
