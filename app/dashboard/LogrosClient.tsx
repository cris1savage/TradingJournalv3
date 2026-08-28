'use client';
import { useState } from 'react';

type Trade = { date: string; res: string; plan: string|null; pnl: number; };

type Logro = {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
  tipo: 'oro' | 'plata' | 'cyan';
  condicion: (trades: Trade[], totalPnl: number) => boolean;
  progreso?: (trades: Trade[], totalPnl: number) => { actual: number; meta: number; label: string };
};

const LOGROS: Logro[] = [
  {
    id: 'primer-trade',
    titulo: 'Primer Disparo',
    descripcion: 'Registraste tu primera operación',
    icono: '🎯',
    tipo: 'cyan',
    condicion: (t) => t.length >= 1,
  },
  {
    id: 'racha-3',
    titulo: 'En Racha',
    descripcion: '3 operaciones ganadoras consecutivas',
    icono: '🔥',
    tipo: 'plata',
    condicion: (t) => {
      let max = 0, cur = 0;
      t.forEach(tr => { if (tr.res === 'win') { cur++; max = Math.max(max, cur); } else cur = 0; });
      return max >= 3;
    },
    progreso: (t) => {
      let max = 0, cur = 0;
      t.forEach(tr => { if (tr.res === 'win') { cur++; max = Math.max(max, cur); } else cur = 0; });
      return { actual: Math.min(max, 3), meta: 3, label: 'wins consecutivos' };
    },
  },
  {
    id: 'disciplina-10',
    titulo: 'Disciplina Total',
    descripcion: '10 operaciones seguidas con plan',
    icono: '📋',
    tipo: 'plata',
    condicion: (t) => {
      let max = 0, cur = 0;
      t.forEach(tr => { if (tr.plan === 'yes') { cur++; max = Math.max(max, cur); } else cur = 0; });
      return max >= 10;
    },
    progreso: (t) => {
      let max = 0, cur = 0;
      t.forEach(tr => { if (tr.plan === 'yes') { cur++; max = Math.max(max, cur); } else cur = 0; });
      return { actual: Math.min(max, 10), meta: 10, label: 'con plan seguidos' };
    },
  },
  {
    id: 'primer-mes-positivo',
    titulo: 'Mes Ganador',
    descripcion: 'Primer mes con P&L positivo',
    icono: '📈',
    tipo: 'plata',
    condicion: (t) => {
      const byMonth: Record<string, number> = {};
      t.forEach(tr => { const m = tr.date.slice(0,7); byMonth[m] = (byMonth[m]||0) + tr.pnl; });
      return Object.values(byMonth).some(v => v > 0);
    },
  },
  {
    id: 'wr50',
    titulo: 'Win Rate 50%',
    descripcion: 'Mantén un win rate ≥ 50% con 20+ trades',
    icono: '🏆',
    tipo: 'plata',
    condicion: (t) => t.length >= 20 && t.filter(tr=>tr.res==='win').length / t.length >= 0.5,
    progreso: (t) => ({
      actual: t.length,
      meta: 20,
      label: `trades · WR actual: ${t.length ? Math.round(t.filter(tr=>tr.res==='win').length/t.length*100) : 0}%`
    }),
  },
  {
    id: 'beneficio-100',
    titulo: '+100€ Generados',
    descripcion: 'P&L acumulado superior a 100€',
    icono: '💰',
    tipo: 'plata',
    condicion: (_, pnl) => pnl >= 100,
    progreso: (_, pnl) => ({ actual: Math.max(0, pnl), meta: 100, label: '€ de beneficio' }),
  },
  {
    id: 'consistencia-30',
    titulo: 'Consistente',
    descripcion: '30 operaciones registradas',
    icono: '📊',
    tipo: 'plata',
    condicion: (t) => t.length >= 30,
    progreso: (t) => ({ actual: t.length, meta: 30, label: 'operaciones' }),
  },
  {
    id: 'beneficio-500',
    titulo: '+500€ Elite',
    descripcion: 'P&L acumulado superior a 500€',
    icono: '💎',
    tipo: 'oro',
    condicion: (_, pnl) => pnl >= 500,
    progreso: (_, pnl) => ({ actual: Math.max(0, pnl), meta: 500, label: '€ de beneficio' }),
  },
  {
    id: 'wr60-50trades',
    titulo: 'Élite Win Rate',
    descripcion: 'Win rate ≥ 60% con 50+ trades',
    icono: '⭐',
    tipo: 'oro',
    condicion: (t) => t.length >= 50 && t.filter(tr=>tr.res==='win').length / t.length >= 0.6,
    progreso: (t) => ({ actual: t.length, meta: 50, label: 'trades necesarios' }),
  },
  {
    id: 'racha-5',
    titulo: 'Máquina de Wins',
    descripcion: '5 operaciones ganadoras consecutivas',
    icono: '🚀',
    tipo: 'oro',
    condicion: (t) => {
      let max = 0, cur = 0;
      t.forEach(tr => { if (tr.res === 'win') { cur++; max = Math.max(max, cur); } else cur = 0; });
      return max >= 5;
    },
    progreso: (t) => {
      let max = 0, cur = 0;
      t.forEach(tr => { if (tr.res === 'win') { cur++; max = Math.max(max, cur); } else cur = 0; });
      return { actual: Math.min(max, 5), meta: 5, label: 'wins consecutivos' };
    },
  },
];

const TIPO_STYLES = {
  oro:   { border: 'rgba(245,166,35,0.4)',  bg: 'rgba(245,166,35,0.06)',  accent: '#f5a623', glow: 'rgba(245,166,35,0.3)', label: 'ORO' },
  plata: { border: 'rgba(160,174,192,0.4)', bg: 'rgba(160,174,192,0.06)', accent: '#a0aec0', glow: 'rgba(160,174,192,0.2)', label: 'PLATA' },
  cyan:  { border: 'rgba(0,212,255,0.4)',   bg: 'rgba(0,212,255,0.06)',   accent: '#00d4ff', glow: 'rgba(0,212,255,0.3)', label: 'BRONCE' },
};

export default function LogrosClient({ trades, totalPnl }: { trades: Trade[]; totalPnl: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<'todos' | 'obtenidos' | 'pendientes'>('todos');

  const logrosConEstado = LOGROS.map(l => ({
    ...l,
    conseguido: l.condicion(trades, totalPnl),
    prog: l.progreso ? l.progreso(trades, totalPnl) : null,
  }));

  const filtered = logrosConEstado.filter(l =>
    tab === 'todos' ? true : tab === 'obtenidos' ? l.conseguido : !l.conseguido
  );

  const conseguidos = logrosConEstado.filter(l => l.conseguido).length;
  const selectedLogro = selected ? logrosConEstado.find(l => l.id === selected) : null;

  return (
    <div>
      {/* Header stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { l: 'Logros obtenidos', v: `${conseguidos}/${LOGROS.length}`, c: '#00d4ff' },
          { l: 'Completado', v: `${Math.round(conseguidos/LOGROS.length*100)}%`, c: '#00e676' },
          { l: 'Pendientes', v: String(LOGROS.length - conseguidos), c: '#f5a623' },
        ].map(s => (
          <div key={s.l} style={{ background: '#0c1628', border: '1px solid rgba(0,180,255,0.1)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: '#4a6a8a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>{s.l}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Progress bar total */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${conseguidos/LOGROS.length*100}%`, background: 'linear-gradient(90deg,#0066dd,#00d4ff)', borderRadius: 2, transition: 'width 1s ease' }} />
        </div>
        <div style={{ fontSize: 10, color: '#4a6a8a', fontFamily: "'JetBrains Mono',monospace", marginTop: 5 }}>{conseguidos} de {LOGROS.length} logros desbloqueados</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(0,180,255,0.1)', marginBottom: 16 }}>
        {([['todos','Todos'],['obtenidos','Obtenidos ✓'],['pendientes','Pendientes']] as const).map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${tab===t?'#00d4ff':'transparent'}`, color: tab===t?'#00d4ff':'#4a6a8a', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'Inter',sans-serif", whiteSpace: 'nowrap', marginBottom: -1, transition: 'all 0.15s' }}>{l}</button>
        ))}
      </div>

      {/* Logros grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
        {filtered.map(l => {
          const s = TIPO_STYLES[l.tipo];
          const pct = l.prog ? Math.min(l.prog.actual / l.prog.meta * 100, 100) : l.conseguido ? 100 : 0;
          return (
            <div key={l.id} onClick={() => setSelected(l.id === selected ? null : l.id)}
              style={{ background: l.conseguido ? s.bg : 'rgba(255,255,255,0.02)', border: `1px solid ${l.conseguido ? s.border : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.2s', opacity: l.conseguido ? 1 : 0.55, position: 'relative', overflow: 'hidden', boxShadow: l.conseguido ? `0 0 20px ${s.glow}` : 'none' }}>
              {l.conseguido && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${s.accent},transparent)` }} />}
              <div style={{ fontSize: 28, marginBottom: 8 }}>{l.icono}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: l.conseguido ? '#e8f0fe' : '#4a6a8a', fontFamily: "'Inter',sans-serif" }}>{l.titulo}</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: s.accent, letterSpacing: '0.1em', marginLeft: 8, flexShrink: 0 }}>{s.label}</div>
              </div>
              <div style={{ fontSize: 11, color: '#4a6a8a', lineHeight: 1.5, marginBottom: 10, fontFamily: "'Inter',sans-serif" }}>{l.descripcion}</div>
              {/* Progress */}
              {l.prog && !l.conseguido && (
                <div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: s.accent, borderRadius: 2, transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#4a6a8a' }}>{l.prog.actual.toFixed(l.prog.meta > 10 ? 0 : 0)}/{l.prog.meta} {l.prog.label}</div>
                </div>
              )}
              {l.conseguido && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${s.accent}20`, border: `1px solid ${s.accent}40`, borderRadius: 4, padding: '3px 8px', fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: s.accent, fontWeight: 700 }}>✓ DESBLOQUEADO</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Diploma modal */}
      {selectedLogro && selectedLogro.conseguido && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(6px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: 'linear-gradient(135deg,#0c1628,#0f2040)', border: `1px solid ${TIPO_STYLES[selectedLogro.tipo].border}`, borderRadius: 16, padding: 32, textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: `0 0 60px ${TIPO_STYLES[selectedLogro.tipo].glow}` }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${TIPO_STYLES[selectedLogro.tipo].accent},transparent)` }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse at top, rgba(0,100,200,0.08), transparent 60%)', pointerEvents: 'none' }} />
            {/* Logo */}
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.3em', color: '#4a6a8a', textTransform: 'uppercase', marginBottom: 20 }}>SAVAGE TRADING JOURNAL</div>
            <div style={{ fontSize: 52, marginBottom: 12 }}>{selectedLogro.icono}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.2em', color: TIPO_STYLES[selectedLogro.tipo].accent, textTransform: 'uppercase', marginBottom: 8 }}>LOGRO DESBLOQUEADO · {TIPO_STYLES[selectedLogro.tipo].label}</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 26, fontWeight: 800, color: '#e8f0fe', marginBottom: 8 }}>{selectedLogro.titulo}</div>
            <div style={{ fontSize: 14, color: '#8ba0bf', marginBottom: 24, fontFamily: "'Inter',sans-serif" }}>{selectedLogro.descripcion}</div>
            <div style={{ borderTop: `1px solid rgba(255,255,255,0.08)`, paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#4a6a8a' }}>Cristian Fandos</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#4a6a8a' }}>{new Date().toLocaleDateString('es-ES')}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ marginTop: 16, padding: '8px 20px', background: 'transparent', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 6, color: '#4a6a8a', fontSize: 11, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
