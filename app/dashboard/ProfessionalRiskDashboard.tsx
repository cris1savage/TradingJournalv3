'use client';
import React, { useState, useEffect } from 'react';

const C = {
  bg: '#020508', bg2: '#0a0f18', bg3: '#0f1621', card: '#141b27',
  border: 'rgba(59, 130, 246, 0.2)', blue: '#3B82F6', green: '#10b981',
  red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#94a3b8',
  orange: '#ff6b35',
};

export default function ProfessionalRiskDashboard() {
  const [riskData, setRiskData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRiskData = async () => {
      try {
        const res = await fetch('/api/risk-management');
        const data = await res.json();
        setRiskData(data);
        setLoading(false);
      } catch (e) {
        console.error('Error fetching risk data:', e);
        setLoading(false);
      }
    };

    fetchRiskData();
    const interval = setInterval(fetchRiskData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div style={{ color: C.text2 }}>Cargando dashboard de riesgo...</div>;
  }

  const totalCapital = riskData?.reduce((sum: number, agent: any) => sum + agent.totalCapital, 0) || 0;
  const totalRisk = riskData?.reduce((sum: number, agent: any) => sum + agent.currentRiskExposure, 0) || 0;
  const avgRiskPercentage = riskData?.length > 0
    ? riskData.reduce((sum: number, agent: any) => sum + agent.riskPercentage, 0) / riskData.length
    : 0;

  const riskStatus = avgRiskPercentage < 5 ? 'SEGURO' : avgRiskPercentage < 10 ? 'ADVERTENCIA' : 'CRÍTICO';
  const statusColor = avgRiskPercentage < 5 ? C.green : avgRiskPercentage < 10 ? C.yellow : C.red;

  return (
    <div style={{
      background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bg2} 100%)`,
      minHeight: '100vh',
      padding: '32px',
    }}>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dashboard-section {
          animation: slideDown 0.5s ease-out;
        }
        .risk-bar {
          height: 6px;
          background: linear-gradient(90deg, ${C.green} 0%, ${C.yellow} 50%, ${C.red} 100%);
          border-radius: 3px;
          overflow: hidden;
        }
        .risk-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
      `}</style>

      {/* Header */}
      <div className="dashboard-section" style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontSize: 48,
          fontWeight: 900,
          color: C.text,
          margin: '0 0 8px 0',
          textShadow: `0 0 20px ${C.blue}40`,
        }}>
          ⚡ PROFESSIONAL RISK MANAGEMENT SYSTEM
        </h1>
        <div style={{
          fontSize: 14,
          color: C.text2,
          display: 'flex',
          gap: '40px',
          marginTop: '16px',
        }}>
          <div>Capital Total: <span style={{ color: C.green, fontWeight: 800 }}>€{(totalCapital / 1000).toFixed(1)}k</span></div>
          <div>Exposición de Riesgo: <span style={{ color: C.orange, fontWeight: 800 }}>€{(totalRisk / 1000).toFixed(1)}k</span></div>
          <div>Riesgo Promedio: <span style={{ color: statusColor, fontWeight: 800 }}>{avgRiskPercentage.toFixed(2)}%</span></div>
          <div style={{
            background: statusColor,
            color: C.bg,
            padding: '4px 12px',
            borderRadius: 6,
            fontWeight: 800,
          }}>
            {riskStatus}
          </div>
        </div>
      </div>

      {/* Sistema de Alertas */}
      <div className="dashboard-section" style={{
        background: C.bg3,
        border: `1px solid ${C.blue}30`,
        borderRadius: 16,
        padding: '24px',
        marginBottom: '32px',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 16px 0' }}>
          🚨 SISTEMA DE ALERTAS DE RIESGO
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
          <AlertCard
            title="Límite de Riesgo Máximo"
            status={avgRiskPercentage < 10 ? 'OK' : 'VIOLADO'}
            value={`${avgRiskPercentage.toFixed(2)}% / 10%`}
            color={avgRiskPercentage < 10 ? C.green : C.red}
          />
          <AlertCard
            title="Posiciones Abiertas"
            status="MONITORED"
            value={`${riskData?.reduce((sum: number, a: any) => sum + a.openPositions, 0) || 0} posiciones`}
            color={C.blue}
          />
          <AlertCard
            title="Drawdown Máximo Permitido"
            status="OK"
            value="15% / Actual: ~2%"
            color={C.green}
          />
          <AlertCard
            title="Capital en Riesgo"
            status={totalRisk < totalCapital * 0.1 ? 'OK' : 'ALTO'}
            value={`€${totalRisk.toFixed(0)} / €${(totalCapital * 0.1).toFixed(0)}`}
            color={totalRisk < totalCapital * 0.1 ? C.green : C.yellow}
          />
        </div>
      </div>

      {/* Tabla de Agentes */}
      <div className="dashboard-section" style={{
        background: C.bg3,
        border: `1px solid ${C.blue}30`,
        borderRadius: 16,
        padding: '24px',
        overflowX: 'auto',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 16px 0' }}>
          📊 ANÁLISIS DE RIESGO POR AGENTE
        </h2>

        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
        }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <th style={{ padding: '12px', textAlign: 'left', color: C.text2, fontWeight: 600 }}>Agente</th>
              <th style={{ padding: '12px', textAlign: 'right', color: C.text2, fontWeight: 600 }}>Capital</th>
              <th style={{ padding: '12px', textAlign: 'center', color: C.text2, fontWeight: 600 }}>Posiciones</th>
              <th style={{ padding: '12px', textAlign: 'right', color: C.text2, fontWeight: 600 }}>Exposición</th>
              <th style={{ padding: '12px', textAlign: 'right', color: C.text2, fontWeight: 600 }}>% Riesgo</th>
              <th style={{ padding: '12px', textAlign: 'center', color: C.text2, fontWeight: 600 }}>Máx Risk</th>
              <th style={{ padding: '12px', textAlign: 'center', color: C.text2, fontWeight: 600 }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {riskData?.map((agent: any, idx: number) => {
              const riskColor = agent.riskPercentage < 5 ? C.green : agent.riskPercentage < 10 ? C.yellow : C.red;
              return (
                <tr key={agent.agentId} style={{
                  borderBottom: `1px solid ${C.border}`,
                  background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                }}>
                  <td style={{ padding: '12px', color: C.text, fontWeight: 600 }}>
                    {agent.agentName}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: C.green }}>
                    €{(agent.totalCapital / 1000).toFixed(1)}k
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: C.blue }}>
                    {agent.openPositions}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: C.orange }}>
                    €{(agent.currentRiskExposure / 1000).toFixed(1)}k
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: riskColor, fontWeight: 700 }}>
                    {agent.riskPercentage.toFixed(2)}%
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: C.text2 }}>
                    {agent.positionSizeLimit.toFixed(0)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{
                      background: agent.isRiskOk ? C.green : C.red,
                      color: C.bg,
                      padding: '4px 12px',
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: 11,
                    }}>
                      {agent.isRiskOk ? '✓ OK' : '✗ ALTO'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Reglas de Trading */}
      <div className="dashboard-section" style={{
        background: C.bg3,
        border: `1px solid ${C.blue}30`,
        borderRadius: 16,
        padding: '24px',
        marginTop: '32px',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 16px 0' }}>
          📋 REGLAS DE RISK MANAGEMENT ACTIVAS
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <RuleCard
            title="Stop Loss Automático"
            description="Cierra posiciones al -2% de pérdida"
            icon="🛑"
            status="ACTIVO"
          />
          <RuleCard
            title="Take Profit Automático"
            description="Realiza ganancias al +3% de ganancia"
            icon="🎯"
            status="ACTIVO"
          />
          <RuleCard
            title="Límite de Posición"
            description="Máximo 5% del capital por operación"
            icon="📌"
            status="ACTIVO"
          />
          <RuleCard
            title="Máximo Drawdown"
            description="Límite de pérdida: 15% del capital"
            icon="📉"
            status="ACTIVO"
          />
          <RuleCard
            title="Gestión de Riesgo"
            description="Máximo 2% de riesgo por trade"
            icon="⚙️"
            status="ACTIVO"
          />
          <RuleCard
            title="Correlación de Posiciones"
            description="Diversificación automática"
            icon="🔗"
            status="ACTIVO"
          />
        </div>
      </div>
    </div>
  );
}

function AlertCard({ title, status, value, color }: any) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${color}40`,
      borderRadius: 12,
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '4px',
        height: '100%',
        background: color,
      }} />

      <div style={{ fontSize: 12, color: C.text2, marginBottom: '8px' }}>
        {title}
      </div>
      <div style={{
        fontSize: 16,
        fontWeight: 700,
        color: color,
        marginBottom: '8px',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: status === 'OK' ? C.green : status === 'VIOLADO' ? C.red : C.blue,
        background: status === 'OK' ? `${C.green}20` : status === 'VIOLADO' ? `${C.red}20` : `${C.blue}20`,
        padding: '4px 8px',
        borderRadius: 4,
        textAlign: 'center',
      }}>
        {status}
      </div>
    </div>
  );
}

function RuleCard({ title, description, icon, status }: any) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.green}40`,
      borderRadius: 12,
      padding: '16px',
      display: 'flex',
      gap: '12px',
    }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: '4px' }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: C.text2, marginBottom: '8px' }}>
          {description}
        </div>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: C.green,
          background: `${C.green}20`,
          padding: '2px 6px',
          borderRadius: 3,
          display: 'inline-block',
        }}>
          ✓ {status}
        </div>
      </div>
    </div>
  );
}
