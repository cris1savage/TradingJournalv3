'use client';
import React, { useState, useEffect } from 'react';
import { LiveTrade, MarketEvent } from '@/lib/types';

const C = {
  bg: '#0a0f1e', bg2: '#0d1526', bg3: '#111d35', card: '#0f1d35',
  border: 'rgba(255,255,255,0.07)', blue: '#3B82F6', green: '#22c55e',
  red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#94a3b8',
};

export default function TradingFloor() {
  const [trades, setTrades] = useState<LiveTrade[]>([]);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFloorData();
    const interval = setInterval(fetchFloorData, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchFloorData = async () => {
    try {
      const res = await fetch('/api/trading-floor');
      const data = await res.json();
      setTrades(data.trades || []);
      setEvents(data.events || []);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching floor data:', e);
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: C.text2 }}>Cargando piso de trading...</div>;

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
          🎯 Piso de Trading en Vivo
        </h2>
        <p style={{ color: C.text2, fontSize: 12, margin: '8px 0 0 0' }}>
          {trades.length} operaciones activas · {events.length} eventos de mercado
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Main Trades Grid */}
        <div>
          <div style={{
            background: C.bg3,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '20px',
            marginBottom: '20px',
          }}>
            <h3 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: '0 0 16px 0' }}>
              Operaciones Activas
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px',
            }}>
              {trades.map(trade => (
                <div key={trade.id} style={{
                  background: C.bg,
                  border: `2px solid ${trade.unrealizedPnL >= 0 ? C.green : C.red}`,
                  borderRadius: 8,
                  padding: '16px',
                  position: 'relative',
                  animation: 'pulse 2s infinite',
                }}>
                  {/* Animación */}
                  <style>{`
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.8; }
                    }
                  `}</style>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: C.text, fontWeight: 700 }}>
                      {trade.symbol}
                    </span>
                    <span style={{
                      background: trade.direction === 'LONG' ? `${C.green}30` : `${C.red}30`,
                      color: trade.direction === 'LONG' ? C.green : C.red,
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                    }}>
                      {trade.direction}
                    </span>
                  </div>

                  <div style={{ color: C.text2, fontSize: 11, marginBottom: '8px' }}>
                    Entrada: €{trade.entryPrice.toFixed(2)}
                  </div>

                  <div style={{
                    background: `${trade.unrealizedPnL >= 0 ? C.green : C.red}15`,
                    padding: '8px',
                    borderRadius: 6,
                    textAlign: 'center',
                  }}>
                    <div style={{
                      color: trade.unrealizedPnL >= 0 ? C.green : C.red,
                      fontWeight: 700,
                      fontSize: 14,
                    }}>
                      {trade.unrealizedPnL >= 0 ? '+' : '-'}€{Math.abs(trade.unrealizedPnL).toFixed(2)}
                    </div>
                    <div style={{
                      color: C.text2,
                      fontSize: 10,
                      marginTop: '2px',
                    }}>
                      {((trade.unrealizedPnL / (trade.entryPrice * trade.quantity)) * 100).toFixed(2)}%
                    </div>
                  </div>

                  <div style={{ color: C.text2, fontSize: 9, marginTop: '8px', textAlign: 'center' }}>
                    {new Date(trade.openedAt).toLocaleTimeString('es-ES')}
                  </div>
                </div>
              ))}
            </div>

            {trades.length === 0 && (
              <div style={{ color: C.text2, textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: '8px' }}>😴</div>
                <p>No hay operaciones activas en este momento</p>
              </div>
            )}
          </div>
        </div>

        {/* Market Events Sidebar */}
        <div>
          <div style={{
            background: C.bg3,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '20px',
            maxHeight: '600px',
            overflowY: 'auto',
          }}>
            <h3 style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: '0 0 16px 0' }}>
              📰 Eventos de Mercado
            </h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              {events.map(event => (
                <div key={event.id} style={{
                  background: C.bg,
                  border: `1px solid ${event.impact === 'critical' ? C.red : event.impact === 'high' ? C.yellow : C.blue}40`,
                  borderLeft: `3px solid ${event.impact === 'critical' ? C.red : event.impact === 'high' ? C.yellow : C.blue}`,
                  borderRadius: 6,
                  padding: '12px',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '6px',
                  }}>
                    <span style={{ color: C.text, fontWeight: 600, fontSize: 12 }}>
                      {event.title}
                    </span>
                    <span style={{
                      background: event.impact === 'critical' ? `${C.red}30` : `${C.yellow}30`,
                      color: event.impact === 'critical' ? C.red : C.yellow,
                      padding: '2px 6px',
                      borderRadius: 3,
                      fontSize: 9,
                      fontWeight: 600,
                    }}>
                      {event.impact.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ color: C.text2, fontSize: 11, marginBottom: '6px' }}>
                    {event.description}
                  </div>

                  <div style{{ color: C.text2, fontSize: 9 }}>
                    Símbolos: {event.symbols.join(', ')}
                  </div>
                </div>
              ))}
            </div>

            {events.length === 0 && (
              <div style={{ color: C.text2, textAlign: 'center', padding: '20px' }}>
                Sin eventos activos
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
