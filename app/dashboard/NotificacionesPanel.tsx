'use client';
import { useState, useEffect } from 'react';

type Trade = { date: string; res: string; plan: string|null; pnl: number; pair: string; };

type Notif = {
  id: string;
  tipo: 'success' | 'danger' | 'info' | 'warning';
  titulo: string;
  mensaje: string;
  hora: string;
  leida: boolean;
};

const TIPO = {
  success: { color: '#00ff88', icon: '✓', bg: 'rgba(0,230,118,0.08)', border: 'rgba(0,230,118,0.2)' },
  danger:  { color: '#ff4444', icon: '!', bg: 'rgba(255,51,102,0.08)', border: 'rgba(255,51,102,0.2)' },
  info:    { color: '#00ff88', icon: 'i', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.2)' },
  warning: { color: '#ffaa00', icon: '⚠', bg: 'rgba(245,166,35,0.08)', border: 'rgba(245,166,35,0.2)' },
};

const KEY = 'st_notifs_read';

function generateNotifs(trades: Trade[]): Notif[] {
  const notifs: Notif[] = [];
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const todayTrades = trades.filter(t => t.date === today);
  const todayPnl = todayTrades.reduce((s,t)=>s+t.pnl,0);

  // Recent streak check
  const recent = [...trades].reverse().slice(0, 5);
  let lossStreak = 0;
  for (const t of recent) { if (t.res === 'loss') lossStreak++; else break; }

  if (lossStreak >= 3) {
    notifs.push({ id: 'loss-streak', tipo: 'danger', titulo: 'Racha de pérdidas', mensaje: `Llevas ${lossStreak} pérdidas consecutivas. Considera parar hoy y revisar tu análisis.`, hora: now, leida: false });
  }
  if (todayPnl < -50) {
    notifs.push({ id: 'daily-loss', tipo: 'danger', titulo: 'Pérdida diaria elevada', mensaje: `Hoy llevas ${todayPnl.toFixed(2)}€. Revisa si debes seguir operando.`, hora: now, leida: false });
  }
  if (todayTrades.length > 0 && todayPnl > 0 && lossStreak === 0) {
    notifs.push({ id: 'good-day', tipo: 'success', titulo: 'Buen día de trading', mensaje: `${todayTrades.length} ops · +${todayPnl.toFixed(2)}€ hoy. Mantén la disciplina.`, hora: now, leida: false });
  }
  const sinPlanHoy = todayTrades.filter(t=>t.plan==='no');
  if (sinPlanHoy.length > 0) {
    notifs.push({ id: 'no-plan', tipo: 'warning', titulo: 'Trades sin plan detectados', mensaje: `${sinPlanHoy.length} operación(es) sin plan hoy. P&L: ${sinPlanHoy.reduce((s,t)=>s+t.pnl,0).toFixed(2)}€.`, hora: now, leida: false });
  }
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  const weekTrades = trades.filter(t=>new Date(t.date)>=weekAgo);
  if (weekTrades.length > 0) {
    const weekPnl = weekTrades.reduce((s,t)=>s+t.pnl,0);
    const weekWr = Math.round(weekTrades.filter(t=>t.res==='win').length/weekTrades.length*100);
    notifs.push({ id: 'week-summary', tipo: weekPnl>=0?'info':'warning', titulo: 'Resumen semanal', mensaje: `${weekTrades.length} trades · ${weekPnl>=0?'+':''}${weekPnl.toFixed(2)}€ · ${weekWr}% WR esta semana.`, hora: 'Esta semana', leida: false });
  }
  if (trades.length >= 10) {
    const wr = Math.round(trades.filter(t=>t.res==='win').length/trades.length*100);
    notifs.push({ id: 'wr-update', tipo: 'info', titulo: 'Win rate actualizado', mensaje: `Tu win rate histórico es ${wr}% en ${trades.length} operaciones.`, hora: 'Hoy', leida: false });
  }
  if (notifs.length === 0) {
    notifs.push({ id: 'welcome', tipo: 'info', titulo: 'Bienvenido a Savage Trading', mensaje: 'Registra trades para empezar a ver alertas inteligentes sobre tu rendimiento.', hora: now, leida: false });
  }
  return notifs;
}

export default function NotificacionesPanel({ trades, onClose }: { trades: Trade[]; onClose: () => void }) {
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) setReadIds(JSON.parse(saved));
  }, []);

  const notifs = generateNotifs(trades).map(n => ({ ...n, leida: readIds.includes(n.id) }));
  const unread = notifs.filter(n => !n.leida).length;

  function markAll() {
    const ids = notifs.map(n => n.id);
    setReadIds(ids);
    localStorage.setItem(KEY, JSON.stringify(ids));
  }

  function markOne(id: string) {
    const updated = [...readIds, id];
    setReadIds(updated);
    localStorage.setItem(KEY, JSON.stringify(updated));
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 360, height: '100vh', background: '#0f0f0f', borderLeft: '1px solid rgba(0,180,255,0.15)', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.2s ease' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,180,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', fontFamily: "'Inter',sans-serif" }}>Notificaciones</div>
            {unread > 0 && <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#00ff88', marginTop: 2 }}>{unread} sin leer</div>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {unread > 0 && <button onClick={markAll} style={{ fontSize: 11, color: '#aaaaaa', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Marcar todas como leídas</button>}
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: 'none', color: '#aaaaaa', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notifs.map(n => {
            const s = TIPO[n.tipo];
            return (
              <div key={n.id} onClick={() => markOne(n.id)} style={{ display: 'flex', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(0,180,255,0.08)', cursor: 'pointer', background: n.leida ? 'transparent' : 'rgba(255,255,255,0.02)', transition: 'background 0.1s', position: 'relative' }}>
                {/* Color bar */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: n.leida ? 'transparent' : s.color, borderRadius: '0 2px 2px 0' }} />
                {/* Icon */}
                <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: s.color, flexShrink: 0, fontFamily: "'JetBrains Mono',monospace" }}>{s.icon}</div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                    <div style={{ fontSize: 12, fontWeight: n.leida ? 400 : 600, color: n.leida ? '#aaaaaa' : '#ffffff', fontFamily: "'Inter',sans-serif" }}>{n.titulo}</div>
                    {!n.leida && <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0, marginLeft: 8, marginTop: 3 }} />}
                  </div>
                  <div style={{ fontSize: 11, color: '#666666', lineHeight: 1.5, fontFamily: "'Inter',sans-serif" }}>{n.mensaje}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#666666', marginTop: 5 }}>{n.hora}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
