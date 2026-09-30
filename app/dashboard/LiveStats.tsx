'use client';
import React, { useState, useEffect } from 'react';

const C = {
  bg: '#0a0f1e', bg2: '#0d1526', bg3: '#111d35', card: '#0f1d35',
  border: 'rgba(255,255,255,0.07)', blue: '#3B82F6', green: '#22c55e',
  red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#94a3b8',
};

interface LiveStatsData {
  activeTrades: number;
  closedTrades: number;
  totalTrades: number;
  totalPnL: number;
  winRate: number;
  totalCapital: number;
  averageAgentPerformance: number;
  topPerformer: { id: string; name: string; avatar: string; pnl: number } | null;
  activeAgents: number;
  totalAgents: number;
}

export default function LiveStats() {
  const [stats, setStats] = useState<LiveStatsData | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats/live');
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error('Error fetching stats:', e);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return <div style={{ color: C.text2 }}>Cargando estadísticas...</div>;
  }

  const StatCard = ({ label, value, unit, color }: any) => (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: '12px 16px',
      flex: 1,
      minWidth: '120px',
    }}>
      <div style={{ color: C.text2, fontSize: 10, textTransform: 'uppercase', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ color: color || C.text, fontSize: 18, fontWeight: 700 }}>
        {typeof value === 'number' ? value.toFixed(value < 100 ? 2 : 0) : value}
        <span style={{ fontSize: 12, marginLeft: '4px' }}>{unit}</span>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '12px 0', marginBottom: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
        <StatCard label="Operaciones Activas" value={stats.activeTrades} unit="" color={C.yellow} />
        <StatCard label="P&L Total" value={stats.totalPnL} unit="€" color={stats.totalPnL >= 0 ? C.green : C.red} />
        <StatCard label="Win Rate" value={stats.winRate} unit="%" color={C.blue} />
        <StatCard label="Capital Total" value={stats.totalCapital} unit="€" color={C.green} />
        <StatCard label="Agentes Activos" value={stats.activeAgents} unit={`/${stats.totalAgents}`} color={C.blue} />
        <StatCard label="Rendimiento Promedio" value={stats.averageAgentPerformance} unit="%" color={C.blue} />
      </div>

      {stats.topPerformer && (
        <div style={{
          background: C.bg3,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '12px 16px',
          marginTop: '8px',
        }}>
          <div style={{ color: C.text2, fontSize: 10, textTransform: 'uppercase', marginBottom: '8px' }}>
            🏆 Top Performer
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: C.text, fontWeight: 600 }}>
                {stats.topPerformer.avatar} {stats.topPerformer.name}
              </div>
            </div>
            <div style={{
              color: stats.topPerformer.pnl >= 0 ? C.green : C.red,
              fontWeight: 700,
              fontSize: 16,
            }}>
              {stats.topPerformer.pnl >= 0 ? '+' : ''}€{stats.topPerformer.pnl.toFixed(0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
