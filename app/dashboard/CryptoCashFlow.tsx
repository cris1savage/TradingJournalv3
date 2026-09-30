'use client';
import React, { useState, useEffect } from 'react';

const C = {
  bg: '#020508', bg2: '#0a0f18', bg3: '#0f1621', card: '#141b27',
  border: 'rgba(59, 130, 246, 0.2)', blue: '#3B82F6', green: '#10b981',
  red: '#ef4444', orange: '#ff6b35', text: '#ffffff', text2: '#94a3b8',
};

const CRYPTO_ICONS: Record<string, string> = {
  'BTC': '₿',
  'ETH': 'Ξ',
  'USDT': '₮',
  'USDC': 'U',
};

const CRYPTO_PRICES: Record<string, number> = {
  'BTC': 45000,
  'ETH': 2500,
  'USDT': 1,
  'USDC': 1,
};

interface Agent {
  id: string;
  name: string;
  virtualCapital: number;
}

export default function CryptoCashFlow() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [currency, setCurrency] = useState<'BTC' | 'ETH' | 'USDT' | 'USDC'>('BTC');
  const [amount, setAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [depositData, setDepositData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => {
        setAgents(data);
        if (data.length > 0) setSelectedAgent(data[0].id);
      });
  }, []);

  const handleDeposit = async () => {
    if (!selectedAgent || !currency) {
      setMessage('Selecciona agente y moneda');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/crypto/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgent, currency }),
      });

      const data = await res.json();
      if (res.ok) {
        setDepositData(data);
        setMessage(`✓ Dirección de depósito generada`);
      } else {
        setMessage(`✗ Error: ${data.error}`);
      }
    } catch (e) {
      setMessage('Error procesando depósito');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedAgent || !amount || !withdrawAddress) {
      setMessage('Complete todos los campos');
      return;
    }

    if (parseFloat(amount) < 50) {
      setMessage('Mínimo 50€');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/crypto/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent,
          toAddress: withdrawAddress,
          amountEUR: parseFloat(amount),
          currency,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`✓ Retiro de ${data.withdrawal.amountCrypto.toFixed(6)} ${currency} procesado`);
        setAmount('');
        setWithdrawAddress('');
      } else {
        setMessage(`✗ ${data.error}`);
      }
    } catch (e) {
      setMessage('Error procesando retiro');
    } finally {
      setLoading(false);
    }
  };

  const selectedAgentData = agents.find(a => a.id === selectedAgent);
  const cryptoAmount = amount ? (parseFloat(amount) / CRYPTO_PRICES[currency]).toFixed(6) : '0';

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
        ₿ Flujo de Criptomonedas
      </h1>
      <div style={{ color: C.text2, marginBottom: '32px', fontSize: 14 }}>
        Deposita y retira capital usando Bitcoin, Ethereum, USDT o USDC
      </div>

      {message && (
        <div style={{
          background: message.includes('✓') ? `${C.green}20` : `${C.red}20`,
          border: `1px solid ${message.includes('✓') ? C.green : C.red}`,
          color: message.includes('✓') ? C.green : C.red,
          padding: '12px',
          borderRadius: 8,
          marginBottom: '20px',
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '1000px' }}>
        {/* Left Side - Mode Selection */}
        <div style={{
          background: C.bg3,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: '24px',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 16px 0' }}>
            {mode === 'deposit' ? '📥 Depositar Cripto' : '📤 Retirar Cripto'}
          </h2>

          {/* Mode Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {['deposit', 'withdraw'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m as any)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: mode === m ? `${C.blue}30` : C.card,
                  border: `1px solid ${mode === m ? C.blue : C.border}`,
                  borderRadius: 8,
                  color: mode === m ? C.blue : C.text2,
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                {m === 'deposit' ? '📥 Depositar' : '📤 Retirar'}
              </button>
            ))}
          </div>

          {/* Agent Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: C.text2, display: 'block', marginBottom: '8px', fontSize: 12 }}>
              Agente
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.text,
                fontSize: 14,
              }}
            >
              {agents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} - €{(a.virtualCapital || 10000).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Crypto Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: C.text2, display: 'block', marginBottom: '8px', fontSize: 12 }}>
              Criptomoneda
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {['BTC', 'ETH', 'USDT', 'USDC'].map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c as any)}
                  style={{
                    padding: '10px',
                    background: currency === c ? `${C.orange}30` : C.card,
                    border: `1px solid ${currency === c ? C.orange : C.border}`,
                    borderRadius: 8,
                    color: currency === c ? C.orange : C.text2,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {CRYPTO_ICONS[c]} {c}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: C.text2, display: 'block', marginBottom: '8px', fontSize: 12 }}>
              Monto (€)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                color: C.text,
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
            <div style={{
              fontSize: 11,
              color: C.text2,
              marginTop: '6px',
            }}>
              ≈ {cryptoAmount} {currency} @ €{CRYPTO_PRICES[currency].toLocaleString()}/{currency}
            </div>
          </div>

          {/* Withdraw Address (solo para retiros) */}
          {mode === 'withdraw' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: C.text2, display: 'block', marginBottom: '8px', fontSize: 12 }}>
                Dirección de Destino
              </label>
              <input
                type="text"
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                placeholder={mode === 'withdraw' ? '0x742d35Cc6634C0532925a3b844Bc9e7595f42bE1' : ''}
                style={{
                  width: '100%',
                  padding: '10px 12px',
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
          )}

          <button
            onClick={mode === 'deposit' ? handleDeposit : handleWithdraw}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: mode === 'deposit' ? C.green : C.orange,
              color: C.text,
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '⏳ Procesando...' : mode === 'deposit' ? '📥 Generar Dirección' : '📤 Solicitar Retiro'}
          </button>
        </div>

        {/* Right Side - Deposit Details */}
        {mode === 'deposit' && depositData && (
          <div style={{
            background: C.bg3,
            border: `2px solid ${C.green}40`,
            borderRadius: 16,
            padding: '24px',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.green, margin: '0 0 16px 0' }}>
              ✓ Envía {currency}
            </h2>

            {/* QR Placeholder */}
            <div style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '20px',
              textAlign: 'center',
              marginBottom: '16px',
            }}>
              <div style={{
                fontSize: 80,
                marginBottom: '12px',
              }}>
                📱
              </div>
              <div style={{
                fontSize: 12,
                color: C.text2,
                lineHeight: '1.6',
              }}>
                Código QR generado<br/>
                (En producción: código QR interactivo)
              </div>
            </div>

            {/* Wallet Address */}
            <div style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '12px',
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: 10, color: C.text2, marginBottom: '6px' }}>
                DIRECCIÓN
              </div>
              <div style={{
                fontSize: 11,
                color: C.text,
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                userSelect: 'all',
                cursor: 'copy',
              }}>
                {depositData.walletAddress}
              </div>
            </div>

            {/* Info Box */}
            <div style={{
              background: `${C.blue}10`,
              border: `1px solid ${C.blue}30`,
              borderRadius: 8,
              padding: '12px',
              fontSize: 11,
              color: C.text2,
              lineHeight: '1.5',
            }}>
              <strong>⏱️ Confirmaciones:</strong> {depositData.requiredConfirmations} requeridas<br/>
              <strong>✓ Auto-confirmación:</strong> Se acreditará automáticamente<br/>
              <strong>💡 Mínimo:</strong> 0.001 {currency}
            </div>
          </div>
        )}

        {/* Right Side - Withdraw Info */}
        {mode === 'withdraw' && (
          <div style={{
            background: C.bg3,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: '24px',
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 16px 0' }}>
              ℹ️ Información de Retiro
            </h2>

            <div style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '16px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: 11, color: C.text2 }}>Saldo Disponible</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>
                    €{(selectedAgentData?.virtualCapital || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.text2 }}>Retirando</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.orange }}>
                    {cryptoAmount} {currency} (€{amount || '0'})
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.text2 }}>Comisión de Red</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                    €{currency === 'BTC' ? '10' : currency === 'ETH' ? '5' : currency === 'USDT' ? '2' : '1'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: `${C.orange}10`,
              border: `1px solid ${C.orange}30`,
              borderRadius: 8,
              padding: '12px',
              fontSize: 11,
              color: C.text2,
              lineHeight: '1.6',
            }}>
              <strong>📋 Proceso:</strong><br/>
              1. Confirma tu dirección<br/>
              2. Se debitará inmediatamente<br/>
              3. Se envía a la blockchain en 1-5 min<br/>
              4. Recibirás {currency} en tu wallet
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
