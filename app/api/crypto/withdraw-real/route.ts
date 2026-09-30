import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { sendWithdrawal, getTransactionStatus, NETWORKS_LIST } from '@/lib/web3';
import { VirtualAgent } from '@/lib/types';

interface RealWithdrawal {
  id: string;
  agentId: string;
  toAddress: string;
  amountEth: number;
  amountEUR: number;
  network: string;
  status: 'pending' | 'processing' | 'confirmed' | 'failed';
  txHash?: string;
  timestamp: string;
  gasCost?: number;
  explorerUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, toAddress, amountEth, network = 'polygon' } = await req.json();

    if (!agentId || !toAddress || !amountEth || !network) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!NETWORKS_LIST[network as keyof typeof NETWORKS_LIST]) {
      return NextResponse.json({ error: 'Invalid network' }, { status: 400 });
    }

    // Validar agente y capital
    const agents = await readData<VirtualAgent[]>('agents', []);
    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const PRICES: Record<string, number> = {
      'ETH': 2500,
      'MATIC': 0.5,
    };

    const netConfig = NETWORKS_LIST[network as keyof typeof NETWORKS_LIST];
    const pricePerUnit = PRICES[netConfig.symbol] || 1;
    const amountEUR = amountEth * pricePerUnit;

    if ((agent.virtualCapital || 10000) < amountEUR) {
      return NextResponse.json({
        error: 'Insufficient capital',
        available: agent.virtualCapital || 10000,
        required: amountEUR,
      }, { status: 400 });
    }

    // Ejecutar retiro en blockchain
    try {
      const result = await sendWithdrawal(toAddress, amountEth, '', network as any);

      // Crear registro de retiro
      const withdrawals = await readData<RealWithdrawal[]>('crypto_withdrawals_real', []);

      const withdrawal: RealWithdrawal = {
        id: `wd_${Date.now()}`,
        agentId,
        toAddress,
        amountEth,
        amountEUR,
        network,
        status: 'processing',
        txHash: result.txHash,
        timestamp: new Date().toISOString(),
        gasCost: parseFloat(result.gasCost),
        explorerUrl: result.explorerUrl,
      };

      withdrawals.push(withdrawal);

      // Debitar capital
      const updatedAgents = agents.map(a => {
        if (a.id === agentId) {
          return {
            ...a,
            virtualCapital: Math.max(100, (a.virtualCapital || 10000) - amountEUR),
          };
        }
        return a;
      });

      await Promise.all([
        writeData('crypto_withdrawals_real', withdrawals),
        writeData('agents', updatedAgents),
      ]);

      return NextResponse.json({
        success: true,
        withdrawal,
        message: `Retiro de ${amountEth} ${netConfig.symbol} procesado`,
        txHash: result.txHash,
        explorerUrl: result.explorerUrl,
      });
    } catch (blockchainError) {
      console.error('Blockchain error:', blockchainError);
      return NextResponse.json({
        error: 'Blockchain transaction failed',
        details: (blockchainError as any).message,
      }, { status: 400 });
    }
  } catch (e) {
    console.error('Withdrawal error:', e);
    return NextResponse.json({ error: 'Withdrawal failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const txHash = searchParams.get('txHash');

    if (txHash) {
      // Obtener estado de transacción
      const network = searchParams.get('network') || 'polygon';
      const status = await getTransactionStatus(txHash, network as any);

      return NextResponse.json(status);
    }

    // Obtener historial de retiros
    const withdrawals = await readData<RealWithdrawal[]>('crypto_withdrawals_real', []);
    const filtered = agentId
      ? withdrawals.filter(w => w.agentId === agentId)
      : withdrawals;

    return NextResponse.json({
      withdrawals: filtered.slice(-20),
      pending: filtered.filter(w => w.status === 'pending' || w.status === 'processing').length,
      totalWithdrawn: filtered
        .filter(w => w.status === 'confirmed')
        .reduce((sum, w) => sum + w.amountEUR, 0),
    });
  } catch (e) {
    console.error('Error fetching withdrawals:', e);
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
  }
}

// Actualizar estado de transacción
export async function PUT(req: NextRequest) {
  try {
    const { txHash, network = 'polygon' } = await req.json();

    // Obtener estado real de blockchain
    const status = await getTransactionStatus(txHash, network as any);

    // Actualizar registro
    const withdrawals = await readData<RealWithdrawal[]>('crypto_withdrawals_real', []);
    const withdrawal = withdrawals.find(w => w.txHash === txHash);

    if (withdrawal) {
      withdrawal.status = status.status as any;
      const updatedWithdrawals = withdrawals.map(w => w.txHash === txHash ? withdrawal : w);
      await writeData('crypto_withdrawals_real', updatedWithdrawals);
    }

    return NextResponse.json({
      success: true,
      status,
      withdrawal,
    });
  } catch (e) {
    console.error('Status update error:', e);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
