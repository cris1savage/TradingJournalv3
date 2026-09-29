'use client';
import React, { useState, useEffect } from 'react';
import { TeamMember, Alert } from '@/lib/types';

const C = {
  bg: '#0a0f1e', bg2: '#0d1526', bg3: '#111d35', card: '#0f1d35',
  border: 'rgba(255,255,255,0.07)', blue: '#3B82F6', green: '#22c55e',
  red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#94a3b8',
};

const SPECIALIST_INFO = {
  operations_manager: {
    title: 'Operations Manager',
    desc: 'Gestiona todas las operaciones y capital',
  },
  risk_advisor: {
    title: 'Risk Advisor',
    desc: 'Monitorea drawdowns y riesgos',
  },
  price_specialist: {
    title: 'Price Specialist',
    desc: 'Rastrea precios y oportunidades',
  },
  performance_coach: {
    title: 'Performance Coach',
    desc: 'Analiza psicología del trader',
  },
};

export default function TeamVisualization() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamData();
    const interval = setInterval(fetchTeamData, 20000);
    return () => clearInterval(interval);
  }, []);

  const fetchTeamData = async () => {
    try {
      const [teamRes, alertsRes] = await Promise.all([
        fetch('/api/team?mode=status'),
        fetch('/api/alerts?mode=active'),
      ]);

      const teamData = await teamRes.json();
      const alertsData = await alertsRes.json();

      setTeam(teamData);
      setAlerts(alertsData);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching team data:', e);
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: C.text2 }}>Cargando equipo...</div>;

  // Isometric grid positions
  const positions = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ];

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
          Mi Equipo de Especialistas
        </h2>
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%', background: C.green,
          }} />
          <span style={{ color: C.text2, fontSize: 12 }}>
            {team.filter(m => m.status === 'active').length}/{team.length} activos
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px',
      }}>
        {team.map((member, idx) => {
          const isSelected = selectedMember?.id === member.id;
          const alertCount = member.alertCount;
          const statusColor = member.status === 'active' ? C.green : member.status === 'monitoring' ? C.yellow : C.red;

          return (
            <div
              key={member.id}
              onClick={() => setSelectedMember(isSelected ? null : member)}
              style={{
                background: isSelected ? C.card : C.bg3,
                border: `2px solid ${isSelected ? C.blue : statusColor}`,
                borderRadius: 12, padding: '20px', cursor: 'pointer',
                transition: 'all 0.3s', transform: isSelected ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {/* Avatar */}
              <div style={{
                fontSize: 48, marginBottom: '12px', textAlign: 'center',
              }}>
                {member.icon}
              </div>

              {/* Status Indicator */}
              {alertCount > 0 && (
                <div style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: C.red, color: '#fff', borderRadius: '50%',
                  width: 28, height: 28, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 'bold', fontSize: 12,
                }}>
                  {alertCount}
                </div>
              )}

              {/* Name & Role */}
              <h3 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: '0 0 4px 0', textAlign: 'center' }}>
                {member.name}
              </h3>
              <p style={{
                color: C.text2, fontSize: 12, margin: '0 0 12px 0', textAlign: 'center',
              }}>
                {SPECIALIST_INFO[member.role as keyof typeof SPECIALIST_INFO]?.title || 'Specialist'}
              </p>

              {/* Status Badge */}
              <div style={{
                display: 'flex', justifyContent: 'center', marginBottom: '12px',
              }}>
                <span style={{
                  background: `${statusColor}20`, color: statusColor,
                  padding: '4px 12px', borderRadius: 20, fontSize: 11,
                  fontWeight: 600, textTransform: 'uppercase',
                }}>
                  {member.status}
                </span>
              </div>

              {/* Metrics */}
              <div style={{
                background: C.bg, borderRadius: 8, padding: '12px', marginBottom: '12px',
              }}>
                {Object.entries(member.metrics).slice(0, 2).map(([key, value]) => (
                  <div key={key} style={{
                    display: 'flex', justifyContent: 'space-between', fontSize: 12,
                    color: C.text2, marginBottom: '4px',
                  }}>
                    <span style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</span>
                    <span style={{ color: C.text, fontWeight: 500 }}>
                      {typeof value === 'number' ? value : String(value)}
                    </span>
                  </span>
                ))}
              </div>

              {/* Last Update */}
              <div style={{
                fontSize: 10, color: C.text3, textAlign: 'center',
              }}>
                Última actualización: hace unos momentos
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail View */}
      {selectedMember && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
            <div>
              <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 4px 0' }}>
                {selectedMember.name} - {SPECIALIST_INFO[selectedMember.role as keyof typeof SPECIALIST_INFO]?.title}
              </h3>
              <p style={{ color: C.text2, fontSize: 13, margin: 0 }}>
                {SPECIALIST_INFO[selectedMember.role as keyof typeof SPECIALIST_INFO]?.desc}
              </p>
            </div>
            <span style={{
              fontSize: 32,
            }}>
              {selectedMember.icon}
            </span>
          </div>

          {/* All Metrics */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px',
          }}>
            {Object.entries(selectedMember.metrics).map(([key, value]) => (
              <div key={key} style={{
                background: C.bg3, borderRadius: 8, padding: '12px',
              }}>
                <div style={{ color: C.text2, fontSize: 11, textTransform: 'uppercase', marginBottom: '4px' }}>
                  {key.replace(/_/g, ' ')}
                </div>
                <div style={{ color: C.text, fontSize: 16, fontWeight: 600 }}>
                  {typeof value === 'number' ? value : String(value)}
                </div>
              </div>
            ))}
          </div>

          {/* Related Alerts */}
          {selectedMember.role === 'risk_advisor' && alerts.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ color: C.text, fontSize: 13, fontWeight: 600, margin: '0 0 12px 0' }}>
                Alertas Activas
              </h4>
              <div style={{
                background: C.bg3, borderRadius: 8, padding: '12px', maxHeight: '200px', overflowY: 'auto',
              }}>
                {alerts.slice(0, 3).map(alert => (
                  <div key={alert.id} style={{
                    padding: '8px', borderBottom: `1px solid ${C.border}`, fontSize: 12,
                  }}>
                    <div style={{
                      color: alert.level === 'critical' ? C.red : C.yellow, fontWeight: 500,
                    }}>
                      {alert.title}
                    </div>
                    <div style={{ color: C.text2, marginTop: '4px' }}>{alert.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
