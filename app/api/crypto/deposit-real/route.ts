import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';
import { generateDepositAddress, monitorAddress, NETWORKS_LIST } from '@/lib/web3';
import { VirtualAgent } from '@/lib/types';

interface DepositAddress {
  id: string;
  agentId: string;
  address: string;
  network: string;
  createdAt: string;
  status: 'active' | 'completed' | 'expired';
  amountReceived?: number;
  txHash?: string;
  confirmations?: number;
  requiredConfirmations?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, network = 'polygon' } = await req.json();

    if (!agentId || !network) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!NETWORKS_LIST[network as keyof typeof NETWORKS_LIST]) {
      return NextResponse.json({ error: 'Invalid network' }, { status: 400 });
    }

    const agents = await readData<VirtualAgent[]>('agents', []);
    const agent = agents.find(a => a.id === agentId);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Generar nueva dirección de depósito
    const { address } = generateDepositAddress();

    const addresses = await readData<DepositAddress[]>('crypto_deposit_addresses', []);
    const netConfig = NETWORKS_LIST[network as keyof typeof NETWORKS_LIST];

    const depositAddress: DepositAddress = {
      id: `addr_${Date.now()}`,
      agentId,
      address,
      network,
      createdAt: new Date().toISOString(),
      status: 'active',
      requiredConfirmations: netConfig.confirmations,
    };

    addresses.push(depositAddress);
    await writeData('crypto_deposit_addresses', addresses);

    return NextResponse.json({
      success: true,
      depositAddress,
      instructions: `Envía ${netConfig.symbol} a esta dirección. Se confirmará automáticamente en ${netConfig.confirmations} confirmaciones.`,
      explorerUrl: `${netConfig.explorer}/address/${address}`,
      minDeposit: '0.001',
      network: netConfig.name,
    });
  } catch (e) {
    console.error('Deposit address generation error:', e);
    return NextResponse.json({ error: 'Failed to generate address' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const address = searchParams.get('address');

    if (address) {
      // Monitorear una dirección específica
      const network = searchParams.get('network') || 'polygon';
      const status = await monitorAddress(address, network as any);

      const addresses = await readData<DepositAddress[]>('crypto_deposit_addresses', []);
      const depositRecord = addresses.find(a => a.address === address);

      return NextResponse.json({
        address: status.address,
        balance: status.balance,
        network: status.network,
        chainId: status.chainId,
        hasReceived: status.hasBalance,
        blockNumber: status.lastBlock,
        txFound: !!depositRecord?.txHash,
        confirmations: depositRecord?.confirmations || 0,
        requiredConfirmations: depositRecord?.requiredConfirmations || 12,
        status: depositRecord?.status || 'unknown',
      });
    }

    // Obtener historial de depósitos
    const addresses = await readData<DepositAddress[]>('crypto_deposit_addresses', []);
    const filtered = agentId
      ? addresses.filter(a => a.agentId === agentId)
      : addresses;

    return NextResponse.json({
      deposits: filtered.slice(-20),
      active: filtered.filter(a => a.status === 'active').length,
      completed: filtered.filter(a => a.status === 'completed').length,
    });
  } catch (e) {
    console.error('Error fetching deposits:', e);
    return NextResponse.json({ error: 'Failed to fetch deposits' }, { status: 500 });
  }
}

// Webhook para confirmar depósitos detectados
export async function PUT(req: NextRequest) {
  try {
    const { address, network, txHash, amountReceived } = await req.json();

    const addresses = await readData<DepositAddress[]>('crypto_deposit_addresses', []);
    const addressRecord = addresses.find(a => a.address === address);

    if (!addressRecord) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // Actualizar registro
    addressRecord.status = 'completed';
    addressRecord.txHash = txHash;
    addressRecord.amountReceived = amountReceived;
    addressRecord.confirmations = 0; // Iniciará en 0, se actualizará

    // Actualizar capital del agente
    const agents = await readData<VirtualAgent[]>('agents', []);
    const agent = agents.find(a => a.id === addressRecord.agentId);

    if (agent && amountReceived) {
      // Convertir cripto a EUR (en producción usar price oracle real)
      const PRICES: Record<string, number> = {
        'ETH': 2500,
        'MATIC': 0.5,
      };

      const netConfig = NETWORKS_LIST[network as keyof typeof NETWORKS_LIST];
      const pricePerUnit = PRICES[netConfig.symbol] || 1;
      const amountEUR = amountReceived * pricePerUnit;

      agent.virtualCapital = (agent.virtualCapital || 10000) + amountEUR;

      const updatedAgents = agents.map(a => a.id === agent.id ? agent : a);
      await writeData('agents', updatedAgents);
    }

    const updatedAddresses = addresses.map(a => a.id === addressRecord.id ? addressRecord : a);
    await writeData('crypto_deposit_addresses', updatedAddresses);

    return NextResponse.json({
      success: true,
      message: 'Depósito confirmado y capital actualizado',
      deposit: addressRecord,
    });
  } catch (e) {
    console.error('Confirmation error:', e);
    return NextResponse.json({ error: 'Failed to confirm deposit' }, { status: 500 });
  }
}
