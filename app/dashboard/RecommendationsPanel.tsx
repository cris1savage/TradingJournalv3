'use client';
import React, { useState, useEffect } from 'react';
import { Recommendation } from '@/lib/types';

const C = {
  bg: '#0a0f1e', card: '#0f1d35', border: 'rgba(255,255,255,0.07)',
  blue: '#3B82F6', green: '#22c55e', red: '#ef4444', yellow: '#f59e0b',
  text: '#ffffff', text2: '#94a3b8',
};

const PRIORITY_CONFIG = {
  low: { color: C.blue, bg: `${C.blue}15`, icon: '💡' },
  medium: { color: C.yellow, bg: `${C.yellow}15`, icon: '⚡' },
  high: { color: C.red, bg: `${C.red}15`, icon: '🔥' },
  critical: { color: '#ff0000', bg: '#ff000015', icon: '🚨' },
};

export default function RecommendationsPanel() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    fetchRecommendations();
    const interval = setInterval(fetchRecommendations, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch(`/api/recommendations?resolved=${showResolved}`);
      const data = await res.json();
      setRecommendations(data);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching recommendations:', e);
      setLoading(false);
    }
  };

  const resolveRecommendation = async (id: string) => {
    try {
      await fetch('/api/recommendations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchRecommendations();
    } catch (e) {
      console.error('Error resolving recommendation:', e);
    }
  };

  const generateRecommendations = async () => {
    try {
      await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      fetchRecommendations();
    } catch (e) {
      console.error('Error generating recommendations:', e);
    }
  };

  if (loading) return <div style={{ color: C.text2 }}>Cargando recomendaciones...</div>;

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
          💡 Recomendaciones Automáticas
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={generateRecommendations}
            style={{
              background: C.blue, color: '#fff', border: 'none', borderRadius: 6,
              padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Generar Nuevas
          </button>
          <button
            onClick={() => {
              setShowResolved(!showResolved);
            }}
            style={{
              background: 'transparent', color: C.text2, border: `1px solid ${C.border}`,
              borderRadius: 6, padding: '8px 14px', fontSize: 12, cursor: 'pointer',
            }}
          >
            {showResolved ? 'Mostrar Pendientes' : 'Ver Resueltas'}
          </button>
        </div>
      </div>

      {recommendations.length === 0 && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: '40px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: '12px' }}>✨</div>
          <p style={{ color: C.text2, fontSize: 14 }}>
            {showResolved ? 'No hay recomendaciones resueltas aún' : 'Todo está optimizado. ¡Excelente trabajo!'}
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gap: '12px' }}>
        {recommendations.map(rec => {
          const config = PRIORITY_CONFIG[rec.priority as keyof typeof PRIORITY_CONFIG];

          return (
            <div
              key={rec.id}
              style={{
                background: config.bg,
                border: `1px solid ${config.color}40`,
                borderRadius: 12, padding: '16px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 20, marginTop: '2px' }}>{config.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <h3 style={{ color: config.color, fontSize: 14, fontWeight: 600, margin: 0 }}>
                      {rec.title}
                    </h3>
                    <span style={{
                      background: config.color, color: '#fff', fontSize: 10, fontWeight: 600,
                      padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase',
                    }}>
                      {rec.priority}
                    </span>
                  </div>
                  <p style={{ color: C.text2, fontSize: 13, margin: '0 0 8px 0' }}>
                    {rec.description}
                  </p>
                  <div style={{
                    background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '8px 12px',
                    marginBottom: '12px', fontSize: 12, color: C.text,
                  }}>
                    <strong>Acción recomendada:</strong> {rec.actionRequired}
                  </div>
                  {rec.supportingData && (
                    <div style={{ fontSize: 11, color: C.text2, marginBottom: '12px' }}>
                      <details>
                        <summary style={{ cursor: 'pointer', marginBottom: '4px' }}>Ver datos</summary>
                        <pre style={{
                          background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: 4,
                          overflow: 'auto', fontSize: 11, margin: 0,
                        }}>
                          {JSON.stringify(rec.supportingData, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                  {!rec.resolved && (
                    <button
                      onClick={() => resolveRecommendation(rec.id)}
                      style={{
                        background: config.color, color: '#fff', border: 'none',
                        borderRadius: 6, padding: '6px 12px', fontSize: 11,
                        fontWeight: 600, cursor: 'pointer', marginTop: '8px',
                      }}
                    >
                      Marcar como Resuelta
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
