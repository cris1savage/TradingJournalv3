import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface WalletState {
  address: string | null;
  connected: boolean;
  balance: string;
  chainId: number | null;
  chainName: string;
  isConnecting: boolean;
  error: string | null;
}

export function useWeb3Wallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    connected: false,
    balance: '0',
    chainId: null,
    chainName: 'Desconectado',
    isConnecting: false,
    error: null,
  });

  // Detectar MetaMask
  const hasMetaMask = () => {
    return typeof window !== 'undefined' && !!(window as any).ethereum;
  };

  // Conectar wallet
  const connectWallet = async () => {
    if (!hasMetaMask()) {
      setWallet(prev => ({
        ...prev,
        error: 'MetaMask no está instalado. Instálalo en: https://metamask.io',
      }));
      return;
    }

    setWallet(prev => ({ ...prev, isConnecting: true }));

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);

      // Solicitar acceso a cuentas
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      const network = await provider.getNetwork();

      const chainNames: Record<number, string> = {
        1: 'Ethereum Mainnet',
        137: 'Polygon',
        11155111: 'Sepolia Testnet',
      };

      setWallet({
        address,
        connected: true,
        balance: ethers.formatEther(balance),
        chainId: Number(network.chainId),
        chainName: chainNames[Number(network.chainId)] || `Chain ${network.chainId}`,
        isConnecting: false,
        error: null,
      });
    } catch (e: any) {
      setWallet(prev => ({
        ...prev,
        isConnecting: false,
        error: e.message || 'Error conectando wallet',
      }));
    }
  };

  // Desconectar wallet
  const disconnectWallet = () => {
    setWallet({
      address: null,
      connected: false,
      balance: '0',
      chainId: null,
      chainName: 'Desconectado',
      isConnecting: false,
      error: null,
    });
  };

  // Cambiar red
  const switchNetwork = async (chainId: number) => {
    if (!hasMetaMask()) return;

    try {
      const chainHex = '0x' + chainId.toString(16);
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainHex }],
      });

      // Recargar estado
      await connectWallet();
    } catch (e: any) {
      setWallet(prev => ({
        ...prev,
        error: e.message,
      }));
    }
  };

  // Enviar transacción
  const sendTransaction = async (to: string, amount: string) => {
    if (!wallet.connected) {
      throw new Error('Wallet no conectada');
    }

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to,
        value: ethers.parseEther(amount),
      });

      const receipt = await tx.wait();
      return {
        hash: receipt?.hash,
        success: receipt?.status === 1,
      };
    } catch (e: any) {
      throw new Error(e.message);
    }
  };

  // Escuchar cambios de cuenta/red
  useEffect(() => {
    if (!hasMetaMask()) return;

    const ethereum = (window as any).ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        connectWallet();
      }
    };

    const handleChainChanged = () => {
      connectWallet();
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  return {
    wallet,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    sendTransaction,
    hasMetaMask: hasMetaMask(),
  };
}
