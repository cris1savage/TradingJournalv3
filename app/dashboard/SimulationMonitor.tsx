'use client';
import React, { useState, useEffect } from 'react';

const C = {
  bg: '#0a0f1e', bg2: '#0d1526', bg3: '#111d35', card: '#0f1d35',
  border: 'rgba(255,255,255,0.07)', blue: '#3B82F6', green: '#22c55e',
  red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#94a3b8',
};

interface SimulationEvent {
  id: string;
  type: 'trade_executed' | 'trade_closed' | 'event_generated' | 'agent_update';
  message: string;
  timestamp: string;
  color: string;
}

export default function SimulationMonitor() {
  const [events, setEvents] = useState<SimulationEvent[]>([]);

  useEffect(() => {
    const checkSimulation = async () => {
      try {
        const res = await fetch('/api/simulation', {
          method: 'POST',
          body: JSON.stringify({ action: 'tick' }),
        });
        const data = await res.json();

        const newEvent: SimulationEvent = {
          id: `event_${Date.now()}`,
          type: 'trade_executed',
          message: `🔄 Tick simulado: ${data.tradesExecuted || 0} operaciones ejecutadas, ${data.tradesClosed || 0} cerradas`,
          timestamp: new Date().toLocaleTimeString('es-ES'),
          color: C.blue,
        };

        setEvents(prev => [newEvent, ...prev].slice(0, 10));
      } catch (e) {
        console.error('Error monitoring simulation:', e);
      }
    };

    const interval = setInterval(checkSimulation, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      background: C.bg3,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: '12px 16px',
      marginTop: '16px',
      maxHeight: '200px',
      overflowY: 'auto',
    }}>
      <div style={{ color: C.text, fontSize: 12, fontWeight: 700, marginBottom: '8px' }}>
        🔴 Monitor de Simulación en Vivo
      </div>

      <div style={{ display: 'grid', gap: '4px' }}>
        {events.length === 0 ? (
          <div style={{ color: C.text2, fontSize: 11 }}>
            Esperando eventos de simulación...
          </div>
        ) : (
          events.map(event => (
            <div
              key={event.id}
              style={{
                background: C.bg,
                border: `1px solid ${event.color}30`,
                borderLeft: `2px solid ${event.color}`,
                borderRadius: 4,
                padding: '6px 8px',
                fontSize: 11,
                color: C.text2,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{event.message}</span>
                <span style={{ color: C.text2, fontSize: 9 }}>{event.timestamp}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
