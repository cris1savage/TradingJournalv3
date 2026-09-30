'use client';
import React, { useState, useEffect } from 'react';

const C = {
  bg: '#020508', bg2: '#0a0f18', bg3: '#0f1621', card: '#141b27',
  border: 'rgba(59, 130, 246, 0.2)', blue: '#3B82F6', green: '#10b981',
  red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#94a3b8',
};

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped';
  virtualCapital: number;
}

interface Rule {
  maxDrawdown: number;
  maxLossPerDay: number;
  tradingHoursStart: number;
  tradingHoursEnd: number;
  maxOpenTrades: number;
  stopIfNegativeDays: number;
  autoRestartTime?: string;
}

export default function TradingControlPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [rules, setRules] = useState<Rule>({
    maxDrawdown: 15,
    maxLossPerDay: 10,
    tradingHoursStart: 8,
    tradingHoursEnd: 22,
    maxOpenTrades: 10,
    stopIfNegativeDays: 3,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data);
    } catch (e) {
      console.error('Error fetching agents:', e);
    }
  };

  const toggleAgent = async (agentId: string, newStatus: 'active' | 'paused') => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, status: newStatus }),
      });

      if (res.ok) {
        setAgents(agents.map(a =>
          a.id === agentId ? { ...a, status: newStatus } : a
        ));
        setMessage(`✓ Agent ${newStatus === 'active' ? 'activado' : 'pausado'}`);
      }
    } catch (e) {
      setMessage('✗ Error actualizando agent');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const saveRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trading/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
      });

      if (res.ok) {
        setMessage('✓ Reglas guardadas exitosamente');
      } else {
        setMessage('✗ Error guardando reglas');
      }
    } catch (e) {
      setMessage('✗ Error');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

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
        ⚙️ Centro de Control de Trading
      </h1>
      <div style={{ color: C.text2, marginBottom: '32px', fontSize: 14 }}>
        Gestiona automatización, límites de riesgo y horarios de trading
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

      {/* Agent Control */}
      <div style={{
        background: C.bg3,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '24px',
        marginBottom: '32px',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 16px 0' }}>
          🤖 Control de Agentes
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {agents.map(agent => (
            <div key={agent.id} style={{
              background: C.card,
              border: `1px solid ${agent.status === 'active' ? C.green : C.red}40`,
              borderRadius: 12,
              padding: '16px',
            }}>
              <div style={{ fontSize: 12, color: C.text2, marginBottom: '8px' }}>
                {agent.name}
              </div>
              <div style={{
                fontSize: 11,
                color: C.text2,
                marginBottom: '12px',
              }}>
                €{(agent.virtualCapital || 10000).toLocaleString()}
              </div>
              <div style={{
                background: agent.status === 'active' ? `${C.green}20` : `${C.red}20`,
                color: agent.status === 'active' ? C.green : C.red,
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                marginBottom: '12px',
                textAlign: 'center',
              }}>
                {agent.status === 'active' ? '✓ ACTIVO' : '⊗ PAUSADO'}
              </div>
              <button
                onClick={() => toggleAgent(agent.id, agent.status === 'active' ? 'paused' : 'active')}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: agent.status === 'active' ? C.red : C.green,
                  color: C.text,
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {agent.status === 'active' ? 'Pausar' : 'Reactivar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Control Rules */}
      <div style={{
        background: C.bg3,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '24px',
        marginBottom: '32px',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 16px 0' }}>
          🛑 Reglas de Control Automático
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
        }}>
          <RuleInput
            label="Drawdown Máximo (%)"
            value={rules.maxDrawdown}
            onChange={(v) => setRules({ ...rules, maxDrawdown: v })}
            description="Sistema se detiene si pérdida > X%"
            icon="📉"
          />
          <RuleInput
            label="Pérdida Máxima Diaria (%)"
            value={rules.maxLossPerDay}
            onChange={(v) => setRules({ ...rules, maxLossPerDay: v })}
            description="Detiene trading después de X% pérdida"
            icon="⛔"
          />
          <RuleInput
            label="Máximo Operaciones Abiertas"
            value={rules.maxOpenTrades}
            onChange={(v) => setRules({ ...rules, maxOpenTrades: v })}
            description="Límite de posiciones simultáneas"
            icon="📊"
            isInt={true}
          />
          <RuleInput
            label="Detener tras N días negativos"
            value={rules.stopIfNegativeDays}
            onChange={(v) => setRules({ ...rules, stopIfNegativeDays: v })}
            description="Pausa automática después de X días perdedores"
            icon="📅"
            isInt={true}
          />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginTop: '20px',
        }}>
          <RuleInput
            label="Hora de Inicio Trading"
            value={rules.tradingHoursStart}
            onChange={(v) => setRules({ ...rules, tradingHoursStart: v })}
            description="Horario en que inicia trading (24h)"
            icon="🕐"
            isInt={true}
          />
          <RuleInput
            label="Hora de Fin Trading"
            value={rules.tradingHoursEnd}
            onChange={(v) => setRules({ ...rules, tradingHoursEnd: v })}
            description="Horario en que termina trading (24h)"
            icon="🕙"
            isInt={true}
          />
        </div>

        <button
          onClick={saveRules}
          disabled={loading}
          style={{
            marginTop: '24px',
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
          {loading ? '⏳ Guardando...' : '💾 Guardar Reglas'}
        </button>
      </div>

      {/* Real Money Integration */}
      <div style={{
        background: C.bg3,
        border: `2px solid ${C.green}40`,
        borderRadius: 16,
        padding: '24px',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.green, margin: '0 0 16px 0' }}>
          🏦 Integración de Dinero Real
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}>
          {[
            { name: 'Stripe', icon: '💳', status: 'Disponible' },
            { name: 'Wise/TransferWise', icon: '💰', status: 'Pendiente' },
            { name: 'Conexión Bancaria', icon: '🏪', status: 'Pendiente' },
            { name: 'Criptomonedas', icon: '₿', status: 'Pendiente' },
          ].map((method, i) => (
            <div key={i} style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, marginBottom: '8px' }}>{method.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: '4px' }}>
                {method.name}
              </div>
              <div style={{
                fontSize: 10,
                color: method.status === 'Disponible' ? C.green : C.yellow,
                fontWeight: 600,
              }}>
                {method.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RuleInput({ label, value, onChange, description, icon, isInt }: any) {
  return (
    <div>
      <label style={{
        color: C.text,
        display: 'block',
        marginBottom: '8px',
        fontSize: 13,
        fontWeight: 600,
      }}>
        {icon} {label}
      </label>
      <input
        type={isInt ? 'number' : 'text'}
        value={value}
        onChange={(e) => onChange(isInt ? parseInt(e.target.value) : parseFloat(e.target.value))}
        style={{
          width: '100%',
          padding: '10px',
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          color: C.text,
          marginBottom: '6px',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ fontSize: 11, color: C.text2 }}>
        {description}
      </div>
    </div>
  );
}
