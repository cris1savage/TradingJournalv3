'use client';
import React, { useState, useEffect } from 'react';
import { TeamMember, Alert } from '@/lib/types';

const C = {
  bg: '#0a0f1e', bg2: '#0d1526', bg3: '#111d35', card: '#0f1d35',
  border: 'rgba(255,255,255,0.07)', blue: '#3B82F6', green: '#22c55e',
  red: '#ef4444', yellow: '#f59e0b', text: '#ffffff', text2: '#94a3b8',
  purple: '#a78bfa', cyan: '#06b6d4',
};

const SPECIALIST_INFO = {
  operations_manager: {
    title: 'Operations Manager',
    desc: 'Gestiona todas las operaciones y capital',
    icon: '👔', color: C.blue,
  },
  risk_advisor: {
    title: 'Risk Advisor',
    desc: 'Monitorea drawdowns y riesgos',
    icon: '⚠️', color: C.red,
  },
  price_specialist: {
    title: 'Price Specialist',
    desc: 'Rastrea precios y oportunidades',
    icon: '📊', color: C.cyan,
  },
  performance_coach: {
    title: 'Performance Coach',
    desc: 'Analiza psicología del trader',
    icon: '🧠', color: C.purple,
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

  const roomWidth = 160;
  const roomHeight = 140;
  const isoOffsetX = roomWidth / 2;
  const isoOffsetY = roomHeight / 2;

  const getRoomPosition = (idx: number) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = col * isoOffsetX * 1.2 + 60;
    const y = row * isoOffsetY * 1.2 + 40;
    return { x, y };
  };

  const IsometricRoom = ({ member, idx }: { member: TeamMember; idx: number }) => {
    const pos = getRoomPosition(idx);
    const isSelected = selectedMember?.id === member.id;
    const spec = SPECIALIST_INFO[member.role as keyof typeof SPECIALIST_INFO];
    const statusColor = member.status === 'active' ? C.green : member.status === 'monitoring' ? C.yellow : C.red;

    return (
      <g key={member.id} onClick={() => setSelectedMember(isSelected ? null : member)} style={{ cursor: 'pointer' }}>
        {/* Room Box (Isometric) */}
        <polygon points={`${pos.x},${pos.y + 60} ${pos.x + 80},${pos.y + 100} ${pos.x + 160},${pos.y + 60} ${pos.x + 80},${pos.y + 20}`}
          fill={isSelected ? spec?.color + '30' : spec?.color + '15'} stroke={isSelected ? spec?.color : statusColor} strokeWidth="2" />

        {/* Top face */}
        <polygon points={`${pos.x},${pos.y + 60} ${pos.x + 40},${pos.y + 40} ${pos.x + 120},${pos.y + 40} ${pos.x + 80},${pos.y + 60}`}
          fill={spec?.color + '20'} stroke={spec?.color} strokeWidth="1" opacity="0.6" />

        {/* Status dot */}
        <circle cx={pos.x + 130} cy={pos.y + 25} r="6" fill={statusColor} stroke={C.text} strokeWidth="1" />

        {/* Specialist emoji */}
        <text x={pos.x + 80} y={pos.y + 70} textAnchor="middle" fontSize="32" dominantBaseline="middle">
          {spec?.icon}
        </text>

        {/* Name */}
        <text x={pos.x + 80} y={pos.y + 95} textAnchor="middle" fontSize="11" fill={C.text} fontWeight="600">
          {member.name}
        </text>

        {/* Role (smaller) */}
        <text x={pos.x + 80} y={pos.y + 108} textAnchor="middle" fontSize="8" fill={C.text2}>
          {spec?.title.split(' ')[0]}
        </text>
      </g>
    );
  };

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
          🏢 Centro de Operaciones - Equipo de Especialistas
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.green }} />
          <span style={{ color: C.text2, fontSize: 12 }}>
            {team.filter(m => m.status === 'active').length}/{team.length} activos
          </span>
        </div>
      </div>

      {/* Isometric View */}
      <div style={{
        background: C.bg3,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: '20px',
        marginBottom: '24px',
        overflow: 'auto',
      }}>
        <svg width="100%" height="380" viewBox="0 0 800 380" style={{ minWidth: '600px' }}>
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {team.map((member, idx) => (
            <IsometricRoom key={member.id} member={member} idx={idx} />
          ))}
        </svg>
      </div>

      {/* Detail Panel */}
      {selectedMember && (
        <div style={{
          background: C.card, border: `2px solid ${SPECIALIST_INFO[selectedMember.role as keyof typeof SPECIALIST_INFO]?.color}`,
          borderRadius: 12, padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: 28, marginBottom: '8px' }}>
                {SPECIALIST_INFO[selectedMember.role as keyof typeof SPECIALIST_INFO]?.icon}
              </div>
              <h3 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: '0 0 4px 0' }}>
                {selectedMember.name}
              </h3>
              <p style={{ color: C.text2, fontSize: 13, margin: 0 }}>
                {SPECIALIST_INFO[selectedMember.role as keyof typeof SPECIALIST_INFO]?.title}
              </p>
              <p style={{ color: C.text2, fontSize: 12, margin: '8px 0 0 0' }}>
                {SPECIALIST_INFO[selectedMember.role as keyof typeof SPECIALIST_INFO]?.desc}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                display: 'inline-block',
                background: `${selectedMember.status === 'active' ? C.green : C.yellow}20`,
                color: selectedMember.status === 'active' ? C.green : C.yellow,
                padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              }}>
                ● {selectedMember.status.toUpperCase()}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px',
          }}>
            {Object.entries(selectedMember.metrics).map(([key, value]) => (
              <div key={key} style={{
                background: C.bg3, borderRadius: 8, padding: '16px', border: `1px solid ${C.border}`,
              }}>
                <div style={{ color: C.text2, fontSize: 10, textTransform: 'uppercase', marginBottom: '6px', fontWeight: 500 }}>
                  {key.replace(/_/g, ' ')}
                </div>
                <div style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>
                  {typeof value === 'number' ? value : String(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
