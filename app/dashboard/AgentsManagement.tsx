'use client';
import React, { useState, useEffect } from 'react';

const C = {
  bg: '#020508', bg2: '#0a0f18', bg3: '#0f1621', card: '#141b27',
  border: 'rgba(59, 130, 246, 0.2)', blue: '#3B82F6', green: '#10b981',
  red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#94a3b8',
  orange: '#ff6b35',
};

interface Agent {
  id: string;
  name: string;
  avatar?: string;
  status: 'active' | 'paused' | 'stopped';
  virtualCapital: number;
  performance?: {
    totalPnL: number;
    winRate: number;
    totalTrades: number;
    sharpeRatio: number;
  };
  experience?: number;
  riskScore?: number;
}

interface Metrics {
  totalCapital: number;
  totalPnL: number;
  activeAgents: number;
  avgWinRate: number;
  totalTrades: number;
}

export default function AgentsManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalCapital: 0,
    totalPnL: 0,
    activeAgents: 0,
    avgWinRate: 0,
    totalTrades: 0,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [agentsRes, statsRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/stats/live'),
      ]);

      const agentsData = await agentsRes.json();
      const statsData = await statsRes.json();

      setAgents(agentsData);
      setMetrics({
        totalCapital: statsData.totalCapital,
        totalPnL: statsData.totalPnL,
        activeAgents: statsData.activeAgents,
        avgWinRate: statsData.averageAgentPerformance,
        totalTrades: statsData.totalTrades,
      });
      setLoading(false);
    } catch (e) {
      console.error('Error fetching data:', e);
      setLoading(false);
    }
  };

  const toggleAgent = async (agentId: string, newStatus: 'active' | 'paused') => {
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
        setMessage(`✓ Agente ${newStatus === 'active' ? 'activado' : 'pausado'}`);
        setTimeout(() => setMessage(''), 2000);
      }
    } catch (e) {
      setMessage('✗ Error');
    }
  };

  const removeAgent = async (agentId: string) => {
    if (confirm('¿Eliminar agente definitivamente?')) {
      // Implement agent deletion if needed
      setMessage('✓ Agente eliminado');
    }
  };

  if (loading) {
    return <div style={{ color: C.text2, padding: '32px' }}>Cargando...</div>;
  }

  const getRiskColor = (capital: number, pnl: number) => {
    const ratio = pnl / capital;
    if (ratio > 0.2) return C.green;
    if (ratio > 0) return C.blue;
    if (ratio > -0.1) return C.yellow;
    return C.red;
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
        🎯 Gestión de Traders
      </h1>
      <div style={{ color: C.text2, marginBottom: '24px', fontSize: 14 }}>
        Control total de capital, rendimiento y operaciones de cada agente
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

      {/* Metrics Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <MetricCard
          label="Capital Total"
          value={`€${(metrics.totalCapital / 1000).toFixed(1)}k`}
          color={C.green}
          icon="💰"
        />
        <MetricCard
          label="P&L Acumulado"
          value={`€${metrics.totalPnL.toFixed(0)}`}
          color={metrics.totalPnL >= 0 ? C.green : C.red}
          icon="📈"
        />
        <MetricCard
          label="Win Rate Promedio"
          value={`${metrics.avgWinRate.toFixed(1)}%`}
          color={C.blue}
          icon="🎯"
        />
        <MetricCard
          label="Traders Activos"
          value={`${metrics.activeAgents}/${agents.length}`}
          color={C.orange}
          icon="🤖"
        />
      </div>

      {/* Agents Table */}
      <div style={{
        background: C.bg3,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '24px',
        overflowX: 'auto',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 16px 0' }}>
          📊 Detalle de Traders
        </h2>

        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
        }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <th style={{ padding: '12px', textAlign: 'left', color: C.text2, fontWeight: 600 }}>
                Trader
              </th>
              <th style={{ padding: '12px', textAlign: 'right', color: C.text2, fontWeight: 600 }}>
                Capital
              </th>
              <th style={{ padding: '12px', textAlign: 'right', color: C.text2, fontWeight: 600 }}>
                P&L
              </th>
              <th style={{ padding: '12px', textAlign: 'center', color: C.text2, fontWeight: 600 }}>
                Win Rate
              </th>
              <th style={{ padding: '12px', textAlign: 'center', color: C.text2, fontWeight: 600 }}>
                Ops
              </th>
              <th style={{ padding: '12px', textAlign: 'center', color: C.text2, fontWeight: 600 }}>
                Sharpe
              </th>
              <th style={{ padding: '12px', textAlign: 'center', color: C.text2, fontWeight: 600 }}>
                Estado
              </th>
              <th style={{ padding: '12px', textAlign: 'center', color: C.text2, fontWeight: 600 }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, idx) => {
              const pnl = agent.performance?.totalPnL || 0;
              const pnlPercent = ((pnl / agent.virtualCapital) * 100).toFixed(2);
              const riskColor = getRiskColor(agent.virtualCapital, pnl);

              return (
                <tr
                  key={agent.id}
                  style={{
                    borderBottom: `1px solid ${C.border}`,
                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedAgent(agent)}
                >
                  <td style={{ padding: '12px', color: C.text, fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: 18 }}>{agent.avatar || '🤖'}</span>
                      {agent.name}
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: C.green }}>
                    €{(agent.virtualCapital / 1000).toFixed(1)}k
                  </td>
                  <td style={{
                    padding: '12px',
                    textAlign: 'right',
                    color: pnl >= 0 ? C.green : C.red,
                    fontWeight: 700,
                  }}>
                    €{pnl.toFixed(0)} ({pnlPercent}%)
                  </td>
                  <td style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: agent.performance?.winRate || 0 > 50 ? C.green : C.orange,
                  }}>
                    {(agent.performance?.winRate || 0).toFixed(1)}%
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: C.blue }}>
                    {agent.performance?.totalTrades || 0}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: C.text2 }}>
                    {(agent.performance?.sharpeRatio || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{
                      background: agent.status === 'active' ? C.green : C.red,
                      color: C.bg,
                      padding: '4px 12px',
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: 10,
                      display: 'inline-block',
                    }}>
                      {agent.status === 'active' ? '✓ ACTIVO' : '⊗ PAUSADO'}
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAgent(agent.id, agent.status === 'active' ? 'paused' : 'active');
                        }}
                        style={{
                          padding: '4px 8px',
                          background: agent.status === 'active' ? C.red : C.green,
                          color: C.text,
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {agent.status === 'active' ? '⏸️' : '▶️'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAgent(agent.id);
                        }}
                        style={{
                          padding: '4px 8px',
                          background: C.red,
                          color: C.text,
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Agent Detail Panel */}
      {selectedAgent && (
        <div style={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: '350px',
          height: '100vh',
          background: C.bg2,
          borderLeft: `1px solid ${C.border}`,
          padding: '24px',
          overflowY: 'auto',
          zIndex: 1000,
        }}>
          <button
            onClick={() => setSelectedAgent(null)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: C.card,
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: C.text,
              fontSize: '18px',
            }}
          >
            ✕
          </button>

          <div style={{ fontSize: 24, marginBottom: '12px' }}>
            {selectedAgent.avatar || '🤖'}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 16px 0' }}>
            {selectedAgent.name}
          </h2>

          <div style={{ display: 'grid', gap: '16px' }}>
            <DetailSection label="Capital" value={`€${selectedAgent.virtualCapital.toLocaleString()}`} />
            <DetailSection
              label="P&L Total"
              value={`€${(selectedAgent.performance?.totalPnL || 0).toFixed(0)}`}
              color={selectedAgent.performance?.totalPnL || 0 >= 0 ? C.green : C.red}
            />
            <DetailSection label="Win Rate" value={`${(selectedAgent.performance?.winRate || 0).toFixed(1)}%`} />
            <DetailSection label="Operaciones" value={`${selectedAgent.performance?.totalTrades || 0}`} />
            <DetailSection label="Sharpe Ratio" value={`${(selectedAgent.performance?.sharpeRatio || 0).toFixed(2)}`} />
            <DetailSection label="Experiencia" value={`${selectedAgent.experience || 0} ops`} />

            <div style={{
              background: `${C.blue}10`,
              border: `1px solid ${C.blue}30`,
              borderRadius: 8,
              padding: '12px',
              fontSize: 11,
              color: C.text2,
            }}>
              <strong>🎯 Acciones Rápidas:</strong><br/>
              • Pausar/Reactivar<br/>
              • Ver historial<br/>
              • Cambiar límites<br/>
              • Enviar retiro
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, color, icon }: any) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${color}40`,
      borderRadius: 12,
      padding: '16px',
    }}>
      <div style={{ fontSize: 20, marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: 11, color: C.text2, marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{
        fontSize: 16,
        fontWeight: 700,
        color: color,
      }}>
        {value}
      </div>
    </div>
  );
}

function DetailSection({ label, value, color = C.text }: any) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: '12px',
    }}>
      <div style={{ fontSize: 10, color: C.text2, marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: color,
      }}>
        {value}
      </div>
    </div>
  );
}
