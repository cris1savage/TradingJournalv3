'use client';
import React, { useState, useEffect } from 'react';
import { LiveTrade } from '@/lib/types';

const C = {
  bg: '#0a0e1a', bg2: '#0d1218', bg3: '#111d2e', card: '#0f1621',
  border: 'rgba(100,200,255,0.15)', blue: '#2563eb', green: '#10b981',
  red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#8899bb',
};

interface TradeWith3D extends LiveTrade {
  angle?: number;
  scale?: number;
  z?: number;
}

export default function TradingFloor3D() {
  const [trades, setTrades] = useState<TradeWith3D[]>([]);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const res = await fetch('/api/trading-floor');
        const data = await res.json();

        const tradesWithAnimations: TradeWith3D[] = (data.trades || []).map((trade: LiveTrade, idx: number) => ({
          ...trade,
          angle: (idx * 360 / Math.max(data.trades.length, 1)) * (Math.PI / 180),
          scale: 0.8 + Math.sin(idx) * 0.2,
          z: Math.cos(idx) * 50,
        }));

        setTrades(tradesWithAnimations);
      } catch (e) {
        console.error('Error fetching trades:', e);
      }
    };

    fetchTrades();
    const interval = setInterval(fetchTrades, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(t => t + 1), 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.bg} 0%, ${C.bg2} 100%)`,
      minHeight: '100vh',
      padding: '24px',
      perspective: '1000px',
    }}>
      <style>{`
        @keyframes orbitTrade {
          0% { transform: rotateZ(0deg) translateX(150px) rotateZ(0deg); }
          100% { transform: rotateZ(360deg) translateX(150px) rotateZ(-360deg); }
        }
        @keyframes floatTrade {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes glow3d {
          0%, 100% { box-shadow: 0 0 10px rgba(37, 99, 235, 0.3); }
          50% { box-shadow: 0 0 30px rgba(37, 99, 235, 0.8); }
        }
        .trade-card-3d {
          animation: floatTrade 3s ease-in-out infinite;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-style: preserve-3d;
        }
        .trade-card-3d:hover {
          transform: scale(1.15) translateZ(20px);
          animation: glow3d 1s ease-in-out infinite;
        }
        .center-circle {
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { r: 30; opacity: 0.3; }
          50% { r: 35; opacity: 0.6; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '32px', position: 'relative', zIndex: 10 }}>
        <h1 style={{
          fontSize: 42,
          fontWeight: 900,
          color: C.text,
          margin: 0,
          marginBottom: '8px',
          textShadow: `0 0 30px ${C.green}40`,
        }}>
          🎯 TRADING FLOOR 3D
        </h1>
        <p style={{ color: C.text2, fontSize: 13, margin: '8px 0 0 0' }}>
          Visualización en tiempo real de operaciones en órbita
        </p>
      </div>

      {/* SVG 3D Trading Visualization */}
      <div style={{
        background: C.bg3,
        border: `1px solid ${C.blue}30`,
        borderRadius: 16,
        padding: '24px',
        marginBottom: '24px',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <svg
          width="100%"
          height="500"
          viewBox="0 0 800 500"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${C.bg2}40 0%, transparent 70%)`,
          }}
        >
          {/* Grid de fondo */}
          <g opacity="0.1" stroke={C.blue}>
            {[...Array(10)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} />
            ))}
            {[...Array(16)].map((_, i) => (
              <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="500" />
            ))}
          </g>

          {/* Centro */}
          <circle cx="400" cy="250" r="8" fill={C.green} opacity="0.8" />
          <circle className="center-circle" cx="400" cy="250" r="30" fill={C.green} opacity="0.1" />

          {/* Anillos de órbita */}
          {[100, 150, 200].map((r, i) => (
            <circle
              key={`orbit${i}`}
              cx="400"
              cy="250"
              r={r}
              fill="none"
              stroke={C.blue}
              strokeWidth="1"
              opacity={0.2 - i * 0.05}
              strokeDasharray="5,5"
            />
          ))}

          {/* Trades en órbita */}
          {trades.slice(0, 12).map((trade, idx) => {
            const angle = ((time * 2 + idx * 30) % 360) * (Math.PI / 180);
            const radius = 100 + idx * 8;
            const x = 400 + Math.cos(angle) * radius;
            const y = 250 + Math.sin(angle) * radius;
            const isProfit = trade.unrealizedPnL >= 0;

            return (
              <g key={trade.id}>
                {/* Línea al centro */}
                <line
                  x1={x}
                  y1={y}
                  x2="400"
                  y2="250"
                  stroke={isProfit ? C.green : C.red}
                  strokeWidth="1"
                  opacity="0.2"
                />

                {/* Nodo de trade */}
                <circle
                  cx={x}
                  cy={y}
                  r="12"
                  fill={isProfit ? C.green : C.red}
                  opacity="0.3"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="8"
                  fill={isProfit ? C.green : C.red}
                  opacity="0.8"
                />

                {/* Datos */}
                <text
                  x={x}
                  y={y - 20}
                  textAnchor="middle"
                  fill={C.text}
                  fontSize="10"
                  fontWeight="600"
                >
                  {trade.symbol}
                </text>
                <text
                  x={x}
                  y={y + 25}
                  textAnchor="middle"
                  fill={isProfit ? C.green : C.red}
                  fontSize="9"
                  fontWeight="700"
                >
                  €{Math.abs(trade.unrealizedPnL).toFixed(0)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Grid de trades */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {trades.map((trade, idx) => {
          const isProfit = trade.unrealizedPnL >= 0;
          const delay = idx * 0.1;

          return (
            <div
              key={trade.id}
              className="trade-card-3d"
              style={{
                background: `linear-gradient(135deg, ${isProfit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'} 0%, ${C.card} 100%)`,
                border: `1px solid ${isProfit ? C.green : C.red}40`,
                borderRadius: 12,
                padding: '16px',
                position: 'relative',
                overflow: 'hidden',
                animationDelay: `${delay}s`,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = 'scale(1.08) translateY(-5px)';
                el.style.borderColor = isProfit ? C.green : C.red;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = '';
                el.style.borderColor = `${isProfit ? C.green : C.red}40`;
              }}
            >
              {/* Fondo animado */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(45deg, transparent, ${isProfit ? C.green : C.red}20, transparent)`,
                animation: 'pulse 2s ease-in-out infinite',
                pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                    {trade.symbol}
                  </div>
                  <div style={{
                    background: isProfit ? `${C.green}30` : `${C.red}30`,
                    color: isProfit ? C.green : C.red,
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 600,
                  }}>
                    {trade.direction}
                  </div>
                </div>

                {/* Entrada */}
                <div style={{
                  fontSize: 11,
                  color: C.text2,
                  marginBottom: '10px',
                }}>
                  Entrada: €{trade.entryPrice.toFixed(2)}
                </div>

                {/* P&L Grande */}
                <div style={{
                  background: `${isProfit ? C.green : C.red}15`,
                  border: `1px solid ${isProfit ? C.green : C.red}40`,
                  borderRadius: 8,
                  padding: '12px',
                  textAlign: 'center',
                  marginBottom: '10px',
                }}>
                  <div style={{
                    color: isProfit ? C.green : C.red,
                    fontSize: 18,
                    fontWeight: 900,
                  }}>
                    {isProfit ? '+' : '-'}€{Math.abs(trade.unrealizedPnL).toFixed(2)}
                  </div>
                  <div style={{
                    color: C.text2,
                    fontSize: 10,
                    marginTop: '4px',
                  }}>
                    {((trade.unrealizedPnL / (trade.entryPrice * trade.quantity)) * 100).toFixed(2)}%
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  fontSize: 9,
                  color: C.text2,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}>
                  <span>QTY: {trade.quantity}</span>
                  <span>{new Date(trade.openedAt).toLocaleTimeString('es-ES')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {trades.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: C.text2,
        }}>
          <div style={{ fontSize: 48, marginBottom: '16px' }}>📊</div>
          <p>No hay operaciones activas en este momento</p>
        </div>
      )}
    </div>
  );
}
