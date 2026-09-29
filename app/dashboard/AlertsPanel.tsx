'use client';
import React, { useState, useEffect } from 'react';
import { Alert } from '@/lib/types';

const C = {
  bg: '#0a0f1e', card: '#0f1d35', border: 'rgba(255,255,255,0.07)',
  red: '#ef4444', yellow: '#f59e0b', blue: '#3B82F6', green: '#22c55e',
  text: '#ffffff', text2: '#94a3b8',
};

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts?mode=active');
      const data = await res.json();
      setAlerts(data);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching alerts:', e);
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alertId, acknowledged: true }),
      });
      fetchAlerts();
    } catch (e) {
      console.error('Error acknowledging alert:', e);
    }
  };

  const criticalAlerts = alerts.filter(a => a.level === 'critical');
  const warningAlerts = alerts.filter(a => a.level === 'warning');

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
          Alertas del Sistema
        </h2>
        <div style={{ color: C.text2, fontSize: 12 }}>
          {criticalAlerts.length} críticas · {warningAlerts.length} advertencias
        </div>
      </div>

      {alerts.length === 0 && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: '40px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: '12px' }}>✅</div>
          <p style={{ color: C.text2, fontSize: 14 }}>
            Todo está bajo control. No hay alertas activas.
          </p>
        </div>
      )}

      {criticalAlerts.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: C.red, fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', textTransform: 'uppercase' }}>
            ⚠️ Alertas Críticas ({criticalAlerts.length})
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {criticalAlerts.map(alert => (
              <div key={alert.id} style={{
                background: `${C.red}10`, border: `1px solid ${C.red}40`, borderRadius: 8, padding: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <h4 style={{ color: C.red, fontSize: 13, fontWeight: 600, margin: 0 }}>
                    {alert.title}
                  </h4>
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    style={{
                      background: C.red, color: '#fff', border: 'none', borderRadius: 4,
                      padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 500,
                    }}
                  >
                    Reconocer
                  </button>
                </div>
                <p style={{ color: C.text2, fontSize: 12, margin: '0 0 8px 0' }}>
                  {alert.message}
                </p>
                <div style={{ fontSize: 11, color: `${C.red}80` }}>
                  {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleString('es-ES') : 'Pendiente'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {warningAlerts.length > 0 && (
        <div>
          <h3 style={{ color: C.yellow, fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', textTransform: 'uppercase' }}>
            ⚡ Advertencias ({warningAlerts.length})
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {warningAlerts.map(alert => (
              <div key={alert.id} style={{
                background: `${C.yellow}10`, border: `1px solid ${C.yellow}40`, borderRadius: 8, padding: '16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <h4 style={{ color: C.yellow, fontSize: 13, fontWeight: 600, margin: 0 }}>
                    {alert.title}
                  </h4>
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    style={{
                      background: C.yellow, color: '#000', border: 'none', borderRadius: 4,
                      padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 500,
                    }}
                  >
                    OK
                  </button>
                </div>
                <p style={{ color: C.text2, fontSize: 12, margin: 0 }}>
                  {alert.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
