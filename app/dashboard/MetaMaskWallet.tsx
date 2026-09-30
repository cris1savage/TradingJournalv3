'use client';
import React, { useState } from 'react';
import { useWeb3Wallet } from '@/lib/hooks/useWeb3Wallet';

const C = {
  bg: '#020508', bg2: '#0a0f18', bg3: '#0f1621', card: '#141b27',
  border: 'rgba(59, 130, 246, 0.2)', blue: '#3B82F6', green: '#10b981',
  red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#94a3b8',
  orange: '#ff6b35',
};

const NETWORKS = {
  1: { name: 'Ethereum', icon: 'Ξ', color: '#627EEA' },
  137: { name: 'Polygon', icon: '◆', color: '#8247E5' },
  11155111: { name: 'Sepolia', icon: '🧪', color: '#FFB300' },
};

export default function MetaMaskWallet() {
  const { wallet, connectWallet, disconnectWallet, switchNetwork, sendTransaction, hasMetaMask } = useWeb3Wallet();
  const [depositAmount, setDepositAmount] = useState('0.1');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('0.1');
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [message, setMessage] = useState('');

  const handleDeposit = async () => {
    if (!wallet.address) {
      setMessage('Conecta MetaMask primero');
      return;
    }

    setSending(true);
    setMessage('Confirmando transacción en MetaMask...');

    try {
      // Obtener dirección de depósito del servidor
      const res = await fetch('/api/crypto/deposit-real', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'current_user', // En producción: user actual
          network: wallet.chainId === 137 ? 'polygon' : 'ethereum',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      // Enviar transacción a la dirección de depósito
      const result = await sendTransaction(data.depositAddress.address, depositAmount);

      if (result.success) {
        setTxHash(result.hash || '');
        setMessage(`✓ Depósito enviado! TX: ${result.hash?.substring(0, 10)}...`);
        setDepositAmount('0.1');

        // Notificar al servidor
        await fetch('/api/crypto/deposit-real', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: data.depositAddress.address,
            network: wallet.chainId === 137 ? 'polygon' : 'ethereum',
            txHash: result.hash,
            amountReceived: parseFloat(depositAmount),
          }),
        });
      }
    } catch (e: any) {
      setMessage(`✗ Error: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleWithdraw = async () => {
    if (!wallet.address) {
      setMessage('Conecta MetaMask primero');
      return;
    }

    if (!recipientAddress) {
      setMessage('Ingresa dirección de destino');
      return;
    }

    setSending(true);
    setMessage('Preparando retiro...');

    try {
      // Enviar directamente a la dirección
      const result = await sendTransaction(recipientAddress, withdrawAmount);

      if (result.success) {
        setTxHash(result.hash || '');
        setMessage(`✓ Retiro enviado! TX: ${result.hash?.substring(0, 10)}...`);
        setWithdrawAmount('0.1');
        setRecipientAddress('');

        // Notificar al servidor
        await fetch('/api/crypto/withdraw-real', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: 'current_user',
            toAddress: recipientAddress,
            amountEth: parseFloat(withdrawAmount),
            network: wallet.chainId === 137 ? 'polygon' : 'ethereum',
            txHash: result.hash,
          }),
        });
      }
    } catch (e: any) {
      setMessage(`✗ Error: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  if (!hasMetaMask) {
    return (
      <div style={{
        background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bg2} 100%)`,
        minHeight: '100vh',
        padding: '32px',
      }}>
        <div style={{
          background: `${C.red}20`,
          border: `1px solid ${C.red}`,
          borderRadius: 16,
          padding: '32px',
          textAlign: 'center',
          maxWidth: '500px',
          margin: '0 auto',
        }}>
          <div style={{ fontSize: 48, marginBottom: '16px' }}>🦊</div>
          <h1 style={{ color: C.text, marginBottom: '16px' }}>MetaMask Requerido</h1>
          <p style={{ color: C.text2, marginBottom: '24px' }}>
            Necesitas MetaMask para usar transacciones reales con Web3.
          </p>
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: C.blue,
              color: C.text,
              textDecoration: 'none',
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            Descargar MetaMask
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bg2} 100%)`,
      minHeight: '100vh',
      padding: '32px',
    }}>
      <h1 style={{
        fontSize: 32,
        fontWeight: 800,
        color: C.text,
        margin: '0 0 8px 0',
      }}>
        🦊 MetaMask Web3 Wallet
      </h1>
      <div style={{ color: C.text2, marginBottom: '32px', fontSize: 14 }}>
        Conecta tu wallet y realiza transacciones blockchain reales
      </div>

      {/* Wallet Status */}
      <div style={{
        background: C.bg3,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '24px',
        marginBottom: '24px',
        maxWidth: '600px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>
            Wallet Status
          </h2>
          <button
            onClick={wallet.connected ? disconnectWallet : connectWallet}
            style={{
              padding: '8px 16px',
              background: wallet.connected ? C.red : C.green,
              color: C.text,
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {wallet.connected ? 'Desconectar' : 'Conectar'}
          </button>
        </div>

        {wallet.error && (
          <div style={{
            background: `${C.red}20`,
            border: `1px solid ${C.red}`,
            color: C.red,
            padding: '12px',
            borderRadius: 8,
            marginBottom: '16px',
            fontSize: 12,
          }}>
            {wallet.error}
          </div>
        )}

        {wallet.connected ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            <StatusItem
              label="Dirección"
              value={`${wallet.address?.substring(0, 6)}...${wallet.address?.substring(-4)}`}
              copyable={wallet.address}
            />
            <StatusItem
              label="Balance"
              value={`${parseFloat(wallet.balance).toFixed(4)} ${NETWORKS[wallet.chainId as keyof typeof NETWORKS]?.name.split(' ')[0] || 'ETH'}`}
              color={C.green}
            />
            <StatusItem
              label="Red"
              value={wallet.chainName}
              color={NETWORKS[wallet.chainId as keyof typeof NETWORKS]?.color || C.blue}
            />
          </div>
        ) : (
          <div style={{ color: C.text2, textAlign: 'center', padding: '20px' }}>
            Haz click en "Conectar" para usar tu wallet
          </div>
        )}
      </div>

      {message && (
        <div style={{
          background: message.includes('✓') ? `${C.green}20` : message.includes('Confirmando') ? `${C.blue}20` : `${C.red}20`,
          border: `1px solid ${message.includes('✓') ? C.green : message.includes('Confirmando') ? C.blue : C.red}`,
          color: message.includes('✓') ? C.green : message.includes('Confirmando') ? C.blue : C.red,
          padding: '12px',
          borderRadius: 8,
          marginBottom: '20px',
        }}>
          {message}
        </div>
      )}

      {wallet.connected && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          maxWidth: '1000px',
        }}>
          {/* Depositar */}
          <div style={{
            background: C.bg3,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: '24px',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: '16px', margin: 0 }}>
              📥 Depositar a Broker
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ color: C.text2, fontSize: 12, display: 'block', marginBottom: '6px' }}>
                  Monto ({NETWORKS[wallet.chainId as keyof typeof NETWORKS]?.name.split(' ')[0] || 'ETH'})
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  step="0.01"
                  min="0.001"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    color: C.text,
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: 10, color: C.text2, marginTop: '4px' }}>
                  Balance: {parseFloat(wallet.balance).toFixed(4)}
                </div>
              </div>

              <button
                onClick={handleDeposit}
                disabled={sending || !wallet.connected}
                style={{
                  padding: '12px',
                  background: C.green,
                  color: C.text,
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  opacity: sending ? 0.6 : 1,
                }}
              >
                {sending ? '⏳ Enviando...' : '📥 Depositar'}
              </button>
            </div>
          </div>

          {/* Retirar */}
          <div style={{
            background: C.bg3,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: '24px',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: '16px', margin: 0 }}>
              📤 Retirar de Broker
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ color: C.text2, fontSize: 12, display: 'block', marginBottom: '6px' }}>
                  Dirección Destino
                </label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    color: C.text,
                    fontSize: 12,
                    boxSizing: 'border-box',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div>
                <label style={{ color: C.text2, fontSize: 12, display: 'block', marginBottom: '6px' }}>
                  Monto ({NETWORKS[wallet.chainId as keyof typeof NETWORKS]?.name.split(' ')[0] || 'ETH'})
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  step="0.01"
                  min="0.001"
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    color: C.text,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                onClick={handleWithdraw}
                disabled={sending || !wallet.connected || !recipientAddress}
                style={{
                  padding: '12px',
                  background: C.orange,
                  color: C.text,
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: sending || !recipientAddress ? 'not-allowed' : 'pointer',
                  opacity: sending || !recipientAddress ? 0.6 : 1,
                }}
              >
                {sending ? '⏳ Enviando...' : '📤 Retirar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {txHash && (
        <div style={{
          background: `${C.green}20`,
          border: `1px solid ${C.green}`,
          borderRadius: 16,
          padding: '16px',
          marginTop: '24px',
          maxWidth: '600px',
        }}>
          <div style={{ color: C.green, fontWeight: 600, marginBottom: '8px' }}>
            ✓ Transacción Completada
          </div>
          <div style={{ color: C.text2, fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {txHash}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusItem({ label, value, color, copyable }: any) {
  const [copied, setCopied] = useState(false);

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div>
        <div style={{ fontSize: 10, color: C.text2, marginBottom: '4px' }}>
          {label}
        </div>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: color || C.text,
          fontFamily: label === 'Dirección' ? 'monospace' : 'inherit',
        }}>
          {value}
        </div>
      </div>
      {copyable && (
        <button
          onClick={() => {
            navigator.clipboard.writeText(copyable);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: C.text2,
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          {copied ? '✓' : '📋'}
        </button>
      )}
    </div>
  );
}
