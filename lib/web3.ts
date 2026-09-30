import { ethers } from 'ethers';

// Configuración de redes
const NETWORKS = {
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    confirmations: 12,
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    symbol: 'MATIC',
    explorer: 'https://polygonscan.com',
    confirmations: 30,
  },
  sepolia: {
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    symbol: 'ETH',
    explorer: 'https://sepolia.etherscan.io',
    confirmations: 12,
    testnet: true,
  },
};

type NetworkKey = keyof typeof NETWORKS;

export function getProvider(network: NetworkKey = 'polygon') {
  const config = NETWORKS[network];
  return new ethers.JsonRpcProvider(config.rpcUrl);
}

export async function generateDepositAddress() {
  // Generar dirección de wallet nueva para depósito
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey, // ⚠️ Guardar seguro en env/db
  };
}

export async function monitorAddress(
  address: string,
  network: NetworkKey = 'polygon',
  minAmount: number = 0.01
) {
  const provider = getProvider(network);
  const config = NETWORKS[network];

  try {
    // Obtener balance
    const balance = await provider.getBalance(address);
    const balanceEth = ethers.formatEther(balance);

    // Obtener transacciones recientes
    const blockNumber = await provider.getBlockNumber();

    return {
      address,
      balance: balanceEth,
      balanceWei: balance.toString(),
      network: config.name,
      chainId: config.chainId,
      lastBlock: blockNumber,
      hasBalance: parseFloat(balanceEth) >= minAmount,
    };
  } catch (e) {
    console.error('Monitor error:', e);
    throw e;
  }
}

export async function sendWithdrawal(
  toAddress: string,
  amountEth: number,
  privateKey: string,
  network: NetworkKey = 'polygon'
) {
  if (!process.env.WITHDRAWAL_PRIVATE_KEY) {
    throw new Error('WITHDRAWAL_PRIVATE_KEY not set');
  }

  const provider = getProvider(network);
  const config = NETWORKS[network];
  const wallet = new ethers.Wallet(process.env.WITHDRAWAL_PRIVATE_KEY, provider);

  try {
    // Validar dirección
    if (!ethers.isAddress(toAddress)) {
      throw new Error('Invalid recipient address');
    }

    // Validar monto
    if (amountEth <= 0) {
      throw new Error('Invalid amount');
    }

    // Obtener balance del sender
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);

    if (parseFloat(balanceEth) < amountEth) {
      throw new Error(`Insufficient balance. Have: ${balanceEth}, Need: ${amountEth}`);
    }

    // Estimar gas
    const tx = {
      to: toAddress,
      value: ethers.parseEther(amountEth.toString()),
    };

    const gasEstimate = await provider.estimateGas(tx);
    const gasPrice = await provider.getGasPrice();
    const gasCost = ethers.formatEther(gasEstimate * gasPrice);

    console.log(`Gas estimate: ${gasEstimate.toString()}, Gas price: ${ethers.formatEther(gasPrice)} ${config.symbol}`);

    // Enviar transacción
    const transaction = await wallet.sendTransaction(tx);
    console.log(`Transaction sent: ${transaction.hash}`);

    // Esperar confirmación
    const receipt = await transaction.wait(config.confirmations);

    return {
      success: true,
      txHash: receipt?.hash,
      from: wallet.address,
      to: toAddress,
      amount: amountEth,
      gasCost,
      network: config.name,
      explorerUrl: `${config.explorer}/tx/${receipt?.hash}`,
    };
  } catch (e) {
    console.error('Withdrawal error:', e);
    throw e;
  }
}

export async function getTransactionStatus(
  txHash: string,
  network: NetworkKey = 'polygon'
) {
  const provider = getProvider(network);
  const config = NETWORKS[network];

  try {
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return { status: 'not_found' };
    }

    const receipt = await provider.getTransactionReceipt(txHash);

    return {
      txHash,
      from: tx.from,
      to: tx.to,
      value: ethers.formatEther(tx.value),
      status: receipt?.status === 1 ? 'confirmed' : receipt?.status === 0 ? 'failed' : 'pending',
      confirmations: receipt ? (await provider.getBlockNumber()) - receipt.blockNumber : 0,
      network: config.name,
      explorerUrl: `${config.explorer}/tx/${txHash}`,
    };
  } catch (e) {
    console.error('Transaction status error:', e);
    throw e;
  }
}

export const NETWORKS_LIST = NETWORKS;
