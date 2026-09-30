'use client';
import React, { useState, useEffect } from 'react';

const C = {
  bg: '#020508', bg2: '#0a0f18', bg3: '#0f1621', card: '#141b27',
  border: 'rgba(59, 130, 246, 0.2)', blue: '#3B82F6', green: '#10b981',
  red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#94a3b8',
  orange: '#ff6b35',
};

interface StatData {
  today: { date: string; pnl: number; trades: number; wins: number; winRate: number };
  currentMonth: { month: string; pnl: number; trades: number; wins: number; winRate: number };
  ytd: { pnl: number; trades: number; wins: number; winRate: number };
  dailyHistory: Array<{ date: string; pnl: number; trades: number; wins: number }>;
  monthlyHistory: Array<{ month: string; pnl: number; trades: number; wins: number }>;
}

export default function PerformanceHistory() {
  const [stats, setStats] = useState<StatData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats/historical');
        const data = await res.json();
        setStats(data);
        setLoading(false);
      } catch (e) {
        console.error('Error fetching stats:', e);
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) {
    return <div style={{ color: C.text2 }}>Cargando historial...</div>;
  }

  const dailyData = stats.dailyHistory;
  const monthlyData = stats.monthlyHistory;

  const maxDaily = Math.max(...dailyData.map(d => Math.abs(d.pnl)), 1);
  const maxMonthly = Math.max(...monthlyData.map(d => Math.abs(d.pnl)), 1);

  const chartHeight = 200;
  const chartPadding = 40;
  const barWidth = Math.max(15, (500 - 2 * chartPadding) / (dailyData.length || 1));

  return (
    <div style={{
      background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bg2} 100%)`,
      minHeight: '100vh',
      padding: '32px',
    }}>
      {/* Period Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <StatCard label="P&L Hoy" value={`€${stats.today.pnl.toFixed(0)}`}
          subtext={`${stats.today.trades} ops | ${stats.today.winRate.toFixed(0)}% win`}
          color={stats.today.pnl >= 0 ? C.green : C.red} />
        <StatCard label="P&L Mes Actual" value={`€${stats.currentMonth.pnl.toFixed(0)}`}
          subtext={`${stats.currentMonth.trades} ops | ${stats.currentMonth.winRate.toFixed(0)}% win`}
          color={stats.currentMonth.pnl >= 0 ? C.green : C.red} />
        <StatCard label="P&L Año" value={`€${stats.ytd.pnl.toFixed(0)}`}
          subtext={`${stats.ytd.trades} ops | ${stats.ytd.winRate.toFixed(0)}% win`}
          color={stats.ytd.pnl >= 0 ? C.green : C.red} />
      </div>

      {/* Daily P&L Chart */}
      <div style={{
        background: C.bg3,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '24px',
        marginBottom: '32px',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 20px 0' }}>
          📈 P&L Diario (Últimos 30 días)
        </h2>
        <svg style={{ width: '100%', height: 300 }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <line
              key={`grid-${i}`}
              x1={chartPadding}
              y1={chartHeight - (pct * (chartHeight - 2 * chartPadding))}
              x2="100%"
              y2={chartHeight - (pct * (chartHeight - 2 * chartPadding))}
              stroke={C.border}
              strokeWidth="1"
            />
          ))}

          {/* Bars */}
          {dailyData.map((day, idx) => {
            const barHeight = (Math.abs(day.pnl) / maxDaily) * (chartHeight - 2 * chartPadding);
            const x = chartPadding + idx * barWidth + barWidth * 0.2;
            const y = chartHeight - chartPadding - barHeight;
            return (
              <g key={`bar-${idx}`}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth * 0.6}
                  height={barHeight}
                  fill={day.pnl >= 0 ? C.green : C.red}
                  opacity="0.8"
                  rx="4"
                />
              </g>
            );
          })}

          {/* X-axis labels (every 5 days) */}
          {dailyData.map((day, idx) => {
            if (idx % 5 === 0) {
              const dayNum = day.date.split('-')[2];
              return (
                <text
                  key={`label-${idx}`}
                  x={chartPadding + idx * barWidth + barWidth * 0.5}
                  y={chartHeight + 15}
                  fontSize="10"
                  fill={C.text2}
                  textAnchor="middle"
                >
                  {dayNum}
                </text>
              );
            }
            return null;
          })}

          {/* Y-axis label */}
          <text x={10} y={20} fontSize="10" fill={C.text2}>
            {`€${(maxDaily / 2).toFixed(0)}`}
          </text>
        </svg>
      </div>

      {/* Monthly P&L Chart */}
      <div style={{
        background: C.bg3,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '24px',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 20px 0' }}>
          📊 P&L Mensual (Últimos 12 meses)
        </h2>
        <svg style={{ width: '100%', height: 300 }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <line
              key={`grid-m-${i}`}
              x1={chartPadding}
              y1={chartHeight - (pct * (chartHeight - 2 * chartPadding))}
              x2="100%"
              y2={chartHeight - (pct * (chartHeight - 2 * chartPadding))}
              stroke={C.border}
              strokeWidth="1"
            />
          ))}

          {/* Bars */}
          {monthlyData.map((month, idx) => {
            const barHeight = (Math.abs(month.pnl) / maxMonthly) * (chartHeight - 2 * chartPadding);
            const x = chartPadding + idx * (550 / (monthlyData.length || 1)) + 20;
            const y = chartHeight - chartPadding - barHeight;
            return (
              <g key={`bar-m-${idx}`}>
                <rect
                  x={x}
                  y={y}
                  width={35}
                  height={barHeight}
                  fill={month.pnl >= 0 ? C.green : C.red}
                  opacity="0.8"
                  rx="4"
                />
              </g>
            );
          })}

          {/* X-axis labels */}
          {monthlyData.map((month, idx) => {
            const [year, monthNum] = month.month.split('-');
            return (
              <text
                key={`label-m-${idx}`}
                x={chartPadding + idx * (550 / (monthlyData.length || 1)) + 55}
                y={chartHeight + 15}
                fontSize="10"
                fill={C.text2}
                textAnchor="middle"
              >
                {`${monthNum}/${year.slice(-2)}`}
              </text>
            );
          })}

          {/* Y-axis label */}
          <text x={10} y={20} fontSize="10" fill={C.text2}>
            {`€${(maxMonthly / 2).toFixed(0)}`}
          </text>
        </svg>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext, color }: any) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${color}40`,
      borderRadius: 12,
      padding: '16px',
    }}>
      <div style={{ fontSize: 12, color: C.text2, marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{
        fontSize: 24,
        fontWeight: 800,
        color: color,
        marginBottom: '8px',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: C.text2 }}>
        {subtext}
      </div>
    </div>
  );
}
