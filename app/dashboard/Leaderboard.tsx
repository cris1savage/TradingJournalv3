'use client';
import React, { useState, useEffect } from 'react';
import { VirtualAgent } from '@/lib/types';

const C = {
  bg: '#0a0f1e', bg2: '#0d1526', bg3: '#111d35', card: '#0f1d35',
  border: 'rgba(255,255,255,0.07)', blue: '#3B82F6', green: '#22c55e',
  red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#94a3b8',
  gold: '#fbbf24', silver: '#c0c0c0', bronze: '#cd7f32',
};

export default function Leaderboard() {
  const [agents, setAgents] = useState<VirtualAgent[]>([]);
  const [sortBy, setSortBy] = useState<'pnl' | 'winrate' | 'sharpe'>('pnl');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching agents:', e);
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: C.text2 }}>Cargando ranking...</div>;

  const sortedAgents = [...agents].sort((a, b) => {
    switch (sortBy) {
      case 'winrate':
        return b.performance.winRate - a.performance.winRate;
      case 'sharpe':
        return b.performance.sharpeRatio - a.performance.sharpeRatio;
      default:
        return b.performance.totalPnL - a.performance.totalPnL;
    }
  });

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getMedalColor = (rank: number) => {
    if (rank === 1) return C.gold;
    if (rank === 2) return C.silver;
    if (rank === 3) return C.bronze;
    return C.blue;
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
          🏆 Ranking de Especialistas
        </h2>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['pnl', 'winrate', 'sharpe'].map(option => (
            <button
              key={option}
              onClick={() => setSortBy(option as any)}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: `1px solid ${sortBy === option ? C.blue : C.border}`,
                background: sortBy === option ? `${C.blue}20` : 'transparent',
                color: sortBy === option ? C.blue : C.text2,
                fontWeight: sortBy === option ? 600 : 400,
                fontSize: 12,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {option === 'pnl' ? 'P&L' : option === 'winrate' ? 'Win Rate' : 'Sharpe'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {sortedAgents.map((agent, idx) => {
          const rank = idx + 1;
          const medalColor = getMedalColor(rank);

          return (
            <div
              key={agent.id}
              style={{
                background: C.card,
                border: `1px solid ${medalColor}40`,
                borderLeft: `4px solid ${medalColor}`,
                borderRadius: 12,
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr repeat(4, 1fr)',
                gap: '16px',
                alignItems: 'center',
              }}
            >
              {/* Rank */}
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                color: medalColor,
                textAlign: 'center',
                width: '40px',
              }}>
                {getMedalEmoji(rank)}
              </div>

              {/* Agent Info */}
              <div>
                <div style={{ color: C.text, fontWeight: 600, marginBottom: '2px' }}>
                  {agent.avatar} {agent.name}
                </div>
                <div style={{ color: C.text2, fontSize: 11 }}>
                  {agent.role.replace(/_/g, ' ').toUpperCase()} • Nivel {agent.level}
                </div>
              </div>

              {/* P&L */}
              <div>
                <div style={{ color: C.text2, fontSize: 10, marginBottom: '2px', textTransform: 'uppercase' }}>
                  P&L
                </div>
                <div style={{
                  color: agent.performance.totalPnL >= 0 ? C.green : C.red,
                  fontWeight: 700,
                  fontSize: 16,
                }}>
                  {agent.performance.totalPnL >= 0 ? '+' : '-'}€{Math.abs(agent.performance.totalPnL).toFixed(0)}
                </div>
              </div>

              {/* Win Rate */}
              <div>
                <div style={{ color: C.text2, fontSize: 10, marginBottom: '2px', textTransform: 'uppercase' }}>
                  Win Rate
                </div>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>
                  {agent.performance.winRate.toFixed(1)}%
                </div>
              </div>

              {/* Sharpe */}
              <div>
                <div style={{ color: C.text2, fontSize: 10, marginBottom: '2px', textTransform: 'uppercase' }}>
                  Sharpe
                </div>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>
                  {agent.performance.sharpeRatio.toFixed(2)}
                </div>
              </div>

              {/* Trades */}
              <div>
                <div style={{ color: C.text2, fontSize: 10, marginBottom: '2px', textTransform: 'uppercase' }}>
                  Trades
                </div>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 16 }}>
                  {agent.performance.totalTrades}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedAgents.length === 0 && (
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: '40px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: '12px' }}>📊</div>
          <p style={{ color: C.text2, fontSize: 14 }}>
            No hay especialistas contratados aún. ¡Comienza reclutando!
          </p>
        </div>
      )}
    </div>
  );
}
