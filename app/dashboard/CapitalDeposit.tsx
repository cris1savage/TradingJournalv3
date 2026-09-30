'use client';
import React, { useState } from 'react';

const C = {
  bg: '#020508', bg2: '#0a0f18', bg3: '#0f1621', card: '#141b27',
  border: 'rgba(59, 130, 246, 0.2)', blue: '#3B82F6', green: '#10b981',
  red: '#ef4444', text: '#ffffff', text2: '#94a3b8',
};

interface Agent {
  id: string;
  name: string;
  virtualCapital: number;
}

export default function CapitalDeposit() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [amount, setAmount] = useState('1000');
  const [type, setType] = useState<'virtual' | 'real'>('virtual');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  React.useEffect(() => {
    fetch('/api/agents')
      .then(r => r.json())
      .then(data => {
        setAgents(data);
        if (data.length > 0) setSelectedAgent(data[0].id);
      });
  }, []);

  const handleDeposit = async () => {
    if (!selectedAgent || !amount) {
      setMessage('Selecciona agente y monto');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/capital/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent,
          amount: parseFloat(amount),
          type,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`✓ ${data.message}`);
        setAmount('1000');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`✗ Error: ${data.error}`);
      }
    } catch (e) {
      setMessage('Error procesando depósito');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bg2} 100%)`,
      minHeight: '100vh',
      padding: '32px',
    }}>
      <div style={{
        background: C.bg3,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '32px',
        maxWidth: '600px',
      }}>
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          color: C.text,
          margin: '0 0 24px 0',
        }}>
          💰 Depositar Capital
        </h1>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: C.text2, display: 'block', marginBottom: '8px', fontSize: 13 }}>
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
                {a.name} (€{(a.virtualCapital || 10000).toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: C.text2, display: 'block', marginBottom: '8px', fontSize: 13 }}>
            Monto (€)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ color: C.text2, display: 'block', marginBottom: '8px', fontSize: 13 }}>
            Tipo de Depósito
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { id: 'virtual', label: '💻 Virtual (Instant)', desc: 'Para testing' },
              { id: 'real', label: '🏦 Real Money', desc: 'Requiere verificación' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => setType(opt.id as any)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: type === opt.id ? `${C.blue}30` : C.card,
                  border: `1px solid ${type === opt.id ? C.blue : C.border}`,
                  borderRadius: 8,
                  color: C.text,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: C.text2, marginTop: '4px' }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div style={{
            background: message.includes('✓') ? `${C.green}20` : `${C.red}20`,
            border: `1px solid ${message.includes('✓') ? C.green : C.red}`,
            color: message.includes('✓') ? C.green : C.red,
            padding: '12px',
            borderRadius: 8,
            marginBottom: '16px',
            fontSize: 13,
          }}>
            {message}
          </div>
        )}

        <button
          onClick={handleDeposit}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: C.blue,
            color: C.text,
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '⏳ Procesando...' : '💸 Depositar'}
        </button>

        <div style={{
          marginTop: '32px',
          padding: '16px',
          background: `${C.blue}10`,
          border: `1px solid ${C.blue}30`,
          borderRadius: 8,
          fontSize: 12,
          color: C.text2,
          lineHeight: '1.5',
        }}>
          <strong>💡 Nota:</strong> Los depósitos virtuales se procesan inmediatamente. Los depósitos reales requieren verificación bancaria y cumplen con regulaciones financieras.
        </div>
      </div>
    </div>
  );
}
