'use client';
import React, { useState, useEffect } from 'react';
import { VirtualAgent, Department } from '@/lib/types';

const C = {
  bg: '#0a0e1a', bg2: '#0d1218', bg3: '#111d2e', card: '#0f1621',
  border: 'rgba(100,200,255,0.15)', blue: '#2563eb', green: '#10b981',
  red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#8899bb',
  purple: '#a855f7', cyan: '#06b6d4',
};

interface AgentStatus {
  agent: VirtualAgent;
  allocatedCapital: number;
  riskPercentage: number;
  currentRisk: number;
  status: 'safe' | 'warning' | 'critical';
}

export default function BrokerCommand3D() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<VirtualAgent | null>(null);
  const [totalCapital, setTotalCapital] = useState(0);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        const data: VirtualAgent[] = await res.json();

        const agentStatuses: AgentStatus[] = data.map(agent => ({
          agent,
          allocatedCapital: Math.random() * 50000 + 10000,
          riskPercentage: Math.random() * 2 + 1,
          currentRisk: Math.random() * 100,
          status: Math.random() > 0.7 ? 'warning' : 'safe',
        }));

        setAgents(agentStatuses);
        setTotalCapital(agentStatuses.reduce((sum, a) => sum + a.allocatedCapital, 0));
      } catch (e) {
        console.error('Error fetching agents:', e);
      }
    };

    fetchAgents();
    const interval = setInterval(fetchAgents, 3000);
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (status: string) => {
    if (status === 'critical') return C.red;
    if (status === 'warning') return C.yellow;
    return C.green;
  };

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.bg} 0%, ${C.bg2} 100%)`,
      minHeight: '100vh',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Fondo animado */}
      <style>{`
        @keyframes glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        @keyframes pulse3d {
          0%, 100% { transform: scale(1) translateZ(0); }
          50% { transform: scale(1.02) translateZ(10px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        .glow-element {
          animation: glow 3s ease-in-out infinite;
        }
        .pulse-3d {
          animation: pulse3d 2s ease-in-out infinite;
        }
        .float-element {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div style={{
        marginBottom: '32px',
        position: 'relative',
        zIndex: 10,
      }}>
        <h1 style={{
          fontSize: 42,
          fontWeight: 900,
          color: C.text,
          margin: 0,
          marginBottom: '8px',
          textShadow: `0 0 30px ${C.blue}40`,
        }}>
          🎯 BROKER COMMAND CENTER 3D
        </h1>
        <div style={{
          fontSize: 13,
          color: C.text2,
          display: 'flex',
          gap: '32px',
        }}>
          <div>Capital Total: <span style={{ color: C.green, fontWeight: 700 }}>€{(totalCapital / 1000).toFixed(1)}k</span></div>
          <div>Agentes: <span style={{ color: C.blue, fontWeight: 700 }}>{agents.length}</span></div>
          <div>Estado: <span style={{ color: C.green, fontWeight: 700 }}>🟢 OPERATIVO</span></div>
        </div>
      </div>

      {/* Grid principal 3D */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '24px',
      }}>

        {/* Panel izquierdo - Agentes */}
        <div>
          <div style={{
            background: C.bg3,
            border: `1px solid ${C.blue}30`,
            borderRadius: 12,
            padding: '20px',
            backdropFilter: 'blur(10px)',
          }}>
            <h2 style={{
              fontSize: 16,
              fontWeight: 700,
              color: C.text,
              margin: '0 0 16px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: 20 }}>📊</span> EQUIPO DE OPERADORES
            </h2>

            <div style={{ display: 'grid', gap: '12px' }}>
              {agents.map((as, idx) => (
                <div
                  key={as.agent.id}
                  onClick={() => setSelectedAgent(as.agent)}
                  className="pulse-3d"
                  style={{
                    background: selectedAgent?.id === as.agent.id ? `${C.blue}20` : C.card,
                    border: `1px solid ${selectedAgent?.id === as.agent.id ? C.blue : C.border}`,
                    borderRadius: 8,
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = C.blue;
                    (e.currentTarget as HTMLElement).style.background = `${C.blue}15`;
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAgent?.id !== as.agent.id) {
                      (e.currentTarget as HTMLElement).style.borderColor = C.border;
                      (e.currentTarget as HTMLElement).style.background = C.card;
                    }
                  }}
                >
                  {/* Barra de riesgo */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${as.currentRisk}%`,
                    background: `${getRiskColor(as.status)}20`,
                    pointerEvents: 'none',
                  }} />

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                        {as.agent.avatar} {as.agent.name}
                      </div>
                      <div style={{
                        fontSize: 11,
                        background: getRiskColor(as.status),
                        color: C.bg,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontWeight: 600,
                      }}>
                        {as.status.toUpperCase()}
                      </div>
                    </div>

                    <div style={{
                      fontSize: 11,
                      color: C.text2,
                      marginBottom: '6px',
                    }}>
                      {as.agent.role.replace(/_/g, ' ')} • Nivel {as.agent.level}
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      fontSize: 10,
                    }}>
                      <div>
                        Capital: <span style={{ color: C.green, fontWeight: 700 }}>€{(as.allocatedCapital / 1000).toFixed(1)}k</span>
                      </div>
                      <div>
                        Riesgo: <span style={{ color: getRiskColor(as.status), fontWeight: 700 }}>{as.riskPercentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho - Detalles 3D */}
        <div>
          {selectedAgent ? (
            <Agent3DPanel agent={selectedAgent} />
          ) : (
            <div style={{
              background: C.bg3,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '40px',
              textAlign: 'center',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div>
                <div style={{ fontSize: 32, marginBottom: '16px' }}>👈</div>
                <div style={{ color: C.text2, fontSize: 14 }}>
                  Selecciona un agente para ver su panel de control 3D
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Agent3DPanel({ agent }: { agent: VirtualAgent }) {
  const [riskMetrics, setRiskMetrics] = useState({
    drawdown: Math.random() * 15,
    volatility: Math.random() * 20 + 10,
    sharpe: agent.performance?.sharpeRatio || 1.5,
    vrp: Math.random() * 30,
  });

  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Limpiar
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, width, height);

    // Dibujar cubo isométrico 3D
    const drawCube = () => {
      const s = 80;
      const cx = width / 2;
      const cy = height / 2;

      // Ángulo de rotación
      const angle = Date.now() / 2000;

      // Puntos del cubo
      const points = [
        [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
        [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s],
      ];

      // Rotar
      const rotated = points.map(p => {
        const x = p[0] * Math.cos(angle) - p[2] * Math.sin(angle);
        const z = p[0] * Math.sin(angle) + p[2] * Math.cos(angle);
        return [x, p[1], z];
      });

      // Proyectar isométrico
      const projected = rotated.map(p => [
        cx + (p[0] - p[2]) * 0.866,
        cy + (p[1] - (p[0] + p[2]) * 0.5),
      ]);

      // Dibujar aristas
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.5)';
      ctx.lineWidth = 2;

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];

      edges.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(projected[a][0], projected[a][1]);
        ctx.lineTo(projected[b][0], projected[b][1]);
        ctx.stroke();
      });

      // Nodos
      projected.forEach((p, i) => {
        ctx.fillStyle = 'rgba(37, 99, 235, 0.8)';
        ctx.beginPath();
        ctx.arc(p[0], p[1], 6, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    drawCube();
  }, []);

  const C = {
    bg: '#0a0e1a', bg2: '#0d1218', bg3: '#111d2e', card: '#0f1621',
    border: 'rgba(100,200,255,0.15)', blue: '#2563eb', green: '#10b981',
    red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#8899bb',
    purple: '#a855f7', cyan: '#06b6d4',
  };

  return (
    <div style={{
      display: 'grid',
      gap: '16px',
    }}>
      {/* Visualización 3D */}
      <div style={{
        background: C.bg3,
        border: `1px solid ${C.blue}30`,
        borderRadius: 12,
        padding: '16px',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: C.text,
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>🎮</span> VISUALIZACIÓN 3D EN TIEMPO REAL
        </div>
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: 8,
            border: `1px solid ${C.border}`,
          }}
        />
      </div>

      {/* Métricas de Riesgo */}
      <div style={{
        background: C.bg3,
        border: `1px solid ${C.red}30`,
        borderRadius: 12,
        padding: '16px',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: C.text,
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>⚠️</span> GESTIÓN DE RIESGO
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <RiskMetric label="Drawdown" value={riskMetrics.drawdown} unit="%" color={riskMetrics.drawdown > 10 ? C.red : C.yellow} />
          <RiskMetric label="Volatilidad" value={riskMetrics.volatility} unit="%" color={C.yellow} />
          <RiskMetric label="Sharpe Ratio" value={riskMetrics.sharpe} unit="" color={C.green} />
          <RiskMetric label="VRP" value={riskMetrics.vrp} unit="%" color={C.cyan} />
        </div>
      </div>

      {/* Performance */}
      <div style={{
        background: C.bg3,
        border: `1px solid ${C.green}30`,
        borderRadius: 12,
        padding: '16px',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: C.text,
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>📈</span> PERFORMANCE
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Stat label="P&L" value={agent.performance?.totalPnL || 0} color={C.green} />
          <Stat label="Win Rate" value={agent.performance?.winRate || 0} unit="%" color={C.blue} />
          <Stat label="Operaciones" value={agent.performance?.totalTrades || 0} color={C.cyan} />
          <Stat label="Nivel" value={agent.level} color={C.purple} />
        </div>
      </div>
    </div>
  );
}

function RiskMetric({ label, value, unit, color }: any) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      border: `1px solid ${color}40`,
      borderRadius: 6,
      padding: '10px',
    }}>
      <div style={{ fontSize: 11, color: '#8899bb', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>
        {value.toFixed(1)}{unit}
      </div>
    </div>
  );
}

function Stat({ label, value, unit = '', color }: any) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      border: `1px solid ${color}40`,
      borderRadius: 6,
      padding: '10px',
    }}>
      <div style={{ fontSize: 11, color: '#8899bb', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>
        {typeof value === 'number' ? value.toFixed(value > 100 ? 0 : 1) : value}{unit}
      </div>
    </div>
  );
}
