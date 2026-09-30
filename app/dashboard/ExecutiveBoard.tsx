'use client';
import React, { useState, useEffect } from 'react';
import { BrokerMetrics, VirtualAgent, Department, LiveTrade } from '@/lib/types';

const C = {
  bg: '#0a0f1e', bg2: '#0d1526', bg3: '#111d35', card: '#0f1d35',
  border: 'rgba(255,255,255,0.07)', blue: '#3B82F6', green: '#22c55e',
  red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#94a3b8',
  purple: '#a78bfa', cyan: '#06b6d4',
};

export default function ExecutiveBoard() {
  const [metrics, setMetrics] = useState<BrokerMetrics | null>(null);
  const [agents, setAgents] = useState<VirtualAgent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [liveTrades, setLiveTrades] = useState<LiveTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBoardData();
    const interval = setInterval(fetchBoardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchBoardData = async () => {
    try {
      const [agentsRes, deptsRes, tradingRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/departments'),
        fetch('/api/trading-floor'),
      ]);

      const agentsData = await agentsRes.json();
      const deptsData = await deptsRes.json();
      const tradingData = await tradingRes.json();

      setAgents(agentsData);
      setDepartments(deptsData);
      setLiveTrades(tradingData.trades || []);

      const totalAssets = agentsData.reduce((sum: number, a: VirtualAgent) => sum + a.virtualCapital, 0);
      const totalPnL = liveTrades.reduce((sum: number, t: LiveTrade) => sum + t.unrealizedPnL, 0);

      setMetrics({
        totalAssets,
        totalPnL,
        totalPnLPercent: totalAssets > 0 ? (totalPnL / totalAssets) * 100 : 0,
        activeDepartments: deptsData.length,
        activeAgents: agentsData.filter((a: VirtualAgent) => a.status === 'active').length,
        activeStrategies: 0,
        livetrades: tradingData.activeTradesCount || 0,
        averageAgentPerformance: agentsData.reduce((sum: number, a: VirtualAgent) => sum + a.performance.winRate, 0) / Math.max(agentsData.length, 1),
        systemHealth: 95,
        operationalCost: 0,
        profitMargin: 0,
      });

      setLoading(false);
    } catch (e) {
      console.error('Error fetching board data:', e);
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return <div style={{ color: C.text2 }}>Cargando Centro de Control...</div>;
  }

  const KPICard = ({ label, value, unit, color, trend }: any) => (
    <div style={{
      background: C.card,
      border: `1px solid ${color}40`,
      borderRadius: 12,
      padding: '20px',
      flex: 1,
      minWidth: '150px',
    }}>
      <div style={{ color: C.text2, fontSize: 11, textTransform: 'uppercase', marginBottom: '8px', fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 28, fontWeight: 700, marginBottom: '4px' }}>
        {typeof value === 'number' ? value.toFixed(value < 100 ? 2 : 0) : value}
        <span style={{ fontSize: 14, marginLeft: '4px' }}>{unit}</span>
      </div>
      {trend && (
        <div style={{ color: trend > 0 ? C.green : C.red, fontSize: 12, fontWeight: 600 }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '20px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ color: C.text, fontSize: 28, fontWeight: 800, margin: '0 0 8px 0' }}>
          🏛️ Centro de Control Ejecutivo
        </h1>
        <p style={{ color: C.text2, fontSize: 13, margin: 0 }}>
          Sistema de Agentes Virtuales - Broker Automático
        </p>
      </div>

      {/* KPI Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <KPICard label="Capital Total" value={metrics.totalAssets} unit="€" color={C.blue} trend={5.2} />
        <KPICard label="P&L Realizado" value={metrics.totalPnL} unit="€" color={metrics.totalPnL >= 0 ? C.green : C.red} trend={metrics.totalPnLPercent} />
        <KPICard label="Agentes Activos" value={metrics.activeAgents} unit="" color={C.cyan} />
        <KPICard label="Departamentos" value={metrics.activeDepartments} unit="" color={C.purple} />
        <KPICard label="Operaciones Vivas" value={metrics.livetrades} unit="" color={C.yellow} />
        <KPICard label="Salud Sistema" value={metrics.systemHealth} unit="%" color={C.green} />
      </div>

      {/* Trading Floor Overview */}
      <div style={{
        background: C.bg3,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '20px',
        marginBottom: '24px',
      }}>
        <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 16px 0' }}>
          📊 Piso de Trading en Vivo
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}>
          {liveTrades.slice(0, 6).map(trade => (
            <div key={trade.id} style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '12px',
              fontSize: 12,
            }}>
              <div style={{ color: C.text, fontWeight: 600, marginBottom: '4px' }}>
                {trade.symbol} {trade.direction}
              </div>
              <div style={{ color: C.text2, marginBottom: '4px' }}>
                Entrada: {trade.entryPrice.toFixed(2)}
              </div>
              <div style={{
                color: trade.unrealizedPnL >= 0 ? C.green : C.red,
                fontWeight: 600,
              }}>
                {trade.unrealizedPnL >= 0 ? '+' : '-'}€{Math.abs(trade.unrealizedPnL).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {liveTrades.length === 0 && (
          <div style={{ color: C.text2, textAlign: 'center', padding: '20px' }}>
            Sin operaciones activas en este momento
          </div>
        )}
      </div>

      {/* Department Performance */}
      <div style={{
        background: C.bg3,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '20px',
      }}>
        <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 16px 0' }}>
          🏢 Desempeño por Departamento
        </h3>

        <div style={{ display: 'grid', gap: '12px' }}>
          {departments.slice(0, 4).map(dept => (
            <div key={dept.id} style={{
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ color: C.text, fontWeight: 600, marginBottom: '4px' }}>
                  {dept.name}
                </div>
                <div style={{ color: C.text2, fontSize: 11 }}>
                  {dept.members.length} miembros · {dept.activeOperations} operaciones
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  color: dept.performance.totalPnL >= 0 ? C.green : C.red,
                  fontWeight: 700,
                  fontSize: 14,
                }}>
                  {dept.performance.totalPnL >= 0 ? '+' : '-'}€{Math.abs(dept.performance.totalPnL).toFixed(0)}
                </div>
                <div style={{ color: C.text2, fontSize: 10 }}>
                  {dept.performance.winRate.toFixed(1)}% win rate
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
