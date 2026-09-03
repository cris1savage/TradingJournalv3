'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);
import AlertasClient from './AlertasClient';
import PatrimonioClient from './PatrimonioClient';
import DiarioClient from './DiarioClient';
import CalculadoraClient from './CalculadoraClient';
import LogrosClient from './LogrosClient';
import ObjetivosRiesgo from './ObjetivosRiesgo';

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Trade = {
  id: number; date: string; time: string; pair: string; tf: string; dir: string;
  res: string; plan: string | null; entry: number; sl: number; tp: number;
  risk: number; lot: number; rr: string; pnl: number; rreal: string;
  conf: string[]; emo: string; notes: string; tvUrl?: string;
};
type Capital = { initial: number; aportaciones: { id: number; date: string; amount: number; desc: string }[]; };
type Account = { id: string; name: string; type: string; color: string; };
type Page = 'dashboard' | 'historial' | 'nuevo' | 'capital' | 'riesgo' | 'psicologia' | 'diario' | 'seguimiento' | 'logros' | 'calculadora' | 'objetivos' | 'alertas' | 'patrimonio' | 'configuracion' | 'calendario' | 'rendimiento';

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  bg:      '#080c14',
  bg2:     '#0d1117',
  bg3:     '#111827',
  card:    '#0f1623',
  card2:   '#131d2e',
  border:  '#1e2d45',
  border2: '#1e3a5f',
  blue:    '#3B82F6',
  blue2:   '#1d4ed8',
  blue3:   '#60a5fa',
  green:   '#22c55e',
  red:     '#ef4444',
  amber:   '#f59e0b',
  text:    '#ffffff',
  muted:   '#64748b',
  muted2:  '#94a3b8',
  fontUi:  "'Inter', system-ui, sans-serif",
  fontMono:"'JetBrains Mono', monospace",
};

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'propia', name: 'Cuenta Propia', type: 'Propia', color: C.blue },
  { id: 'ftmo', name: 'FTMO Challenge', type: 'Fondeo', color: '#a855f7' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmtUSD = (n: number, sym = '€') => {
  const abs = Math.abs(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n >= 0 ? '+' : '-') + sym + abs;
};
const fmtAbs = (n: number, sym = '€') => sym + Math.abs(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function useCounter(target: number, dur = 900) {
  const [v, sv] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const s = prev.current, diff = target - s, t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      sv(s + diff * e);
      if (p < 1) requestAnimationFrame(tick);
      else prev.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, dur]);
  return v;
}

// ─── METRIC CARD ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color, accent = false }: {
  label: string; value: string; sub?: string; color?: string; accent?: boolean;
}) {
  return (
    <div style={{
      background: accent ? '#0a1628' : C.card, border: `1px solid ${accent ? C.border2 : C.border}`,
      borderRadius: 12, padding: '18px 20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, fontFamily: C.fontMono }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || C.text, letterSpacing: '-0.5px', lineHeight: 1, fontFamily: C.fontMono }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted2, marginTop: 6 }}>{sub}</div>}
      {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.blue}, transparent)` }} />}
    </div>
  );
}

// ─── STAT ROW ─────────────────────────────────────────────────────────────────
function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || C.text, fontFamily: C.fontMono }}>{value}</span>
    </div>
  );
}

// ─── BADGE ───────────────────────────────────────────────────────────────────
function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{ background: bg, color, borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 700, fontFamily: C.fontMono }}>{text}</span>
  );
}

// ─── MODULE CARD ──────────────────────────────────────────────────────────────
function ModuleCard({ icon, name, desc, onClick }: { icon: string; name: string; desc: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.card2 : C.card, border: `1px solid ${hov ? C.border2 : C.border}`,
        borderRadius: 12, padding: '18px 16px', cursor: 'pointer', transition: 'all 0.15s',
      }}>
      <div style={{ fontSize: 22, color: C.blue, marginBottom: 10, fontFamily: 'inherit' }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 11, color: C.muted }}>{desc}</div>
    </div>
  );
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── FORM ELEMENTS ───────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  background: '#0d1117', border: `1px solid ${C.border}`, borderRadius: 8,
  padding: '8px 12px', color: C.text, fontSize: 13, width: '100%',
  fontFamily: 'inherit', outline: 'none',
};
const LBL: React.CSSProperties = {
  fontSize: 10, color: C.muted, textTransform: 'uppercase' as const,
  letterSpacing: '0.8px', display: 'block', marginBottom: 5, fontFamily: C.fontMono,
};
const SEC: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: C.blue, textTransform: 'uppercase' as const,
  letterSpacing: '1px', marginBottom: 14, paddingBottom: 8,
  borderBottom: `1px solid ${C.border}`, fontFamily: C.fontMono,
};

function Tog({ label, active, color, bg, onClick }: { label: string; active: boolean; color: string; bg: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '9px 8px', borderRadius: 8, border: `1px solid ${active ? color : C.border}`,
      background: active ? bg : C.card2, color: active ? color : C.muted,
      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
    }}>{label}</button>
  );
}

// ─── CALENDAR ────────────────────────────────────────────────────────────────
function CalendarView({ trades, calMonth, setCalMonth }: {
  trades: Trade[]; calMonth: Date; setCalMonth: (d: Date) => void;
}) {
  const byDay: Record<string, number> = {};
  trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const cells: (null | { day: number; pnl: number | null })[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) {
    const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, pnl: byDay[k] ?? null });
  }
  const today = new Date().toISOString().split('T')[0];
  const totalMonth = Object.entries(byDay).filter(([k]) => k.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).reduce((a, [, v]) => a + v, 0);
  const dayTraded = cells.filter(c => c?.pnl !== null).length;
  const winDays = cells.filter(c => c?.pnl !== null && (c?.pnl ?? 0) >= 0).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Calendario P&L</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setCalMonth(new Date(y, m - 1))} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.blue, width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>‹</button>
          <span style={{ fontFamily: C.fontMono, fontSize: 12, color: C.blue, minWidth: 130, textAlign: 'center' }}>
            {calMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
          </span>
          <button onClick={() => setCalMonth(new Date(y, m + 1))} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.blue, width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>›</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 6 }}>
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontFamily: C.fontMono, fontSize: 10, color: C.muted, padding: '4px 0', fontWeight: 700 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 20 }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} style={{ aspectRatio: '1', minHeight: 56 }} />;
          const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
          const isToday = k === today;
          const hasData = cell.pnl !== null;
          const isWin = (cell.pnl ?? 0) >= 0;
          return (
            <div key={i} style={{
              aspectRatio: '1', minHeight: 56, borderRadius: 8,
              background: hasData ? (isWin ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)') : C.card,
              border: `1px solid ${isToday ? C.blue : hasData ? (isWin ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)') : C.border}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: isToday ? C.blue : C.text, lineHeight: 1 }}>{cell.day}</div>
              {hasData && (
                <div style={{ fontSize: 10, fontWeight: 700, color: isWin ? C.green : C.red, marginTop: 3, fontFamily: C.fontMono }}>
                  {isWin ? '+' : '-'}${Math.abs(cell.pnl!).toFixed(0)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'P&L mensual', val: fmtUSD(totalMonth), color: totalMonth >= 0 ? C.green : C.red },
          { label: 'Días operados', val: String(dayTraded), color: C.blue },
          { label: 'Win rate', val: dayTraded > 0 ? Math.round(winDays / dayTraded * 100) + '%' : '0%', color: C.text },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, fontFamily: C.fontMono, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: C.fontMono }}>{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RENDIMIENTO ─────────────────────────────────────────────────────────────
function RendimientoView({ trades, capital }: { trades: Trade[]; capital: Capital }) {
  const weeklyMap: Record<string, number> = {};
  trades.forEach(t => {
    const d = new Date(t.date), day = d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const k = mon.toISOString().split('T')[0];
    weeklyMap[k] = (weeklyMap[k] || 0) + t.pnl;
  });
  const weeks = Object.keys(weeklyMap).sort().slice(-8);
  const maxV = Math.max(...weeks.map(w => Math.abs(weeklyMap[w])), 1);

  const instMap: Record<string, { count: number; pnl: number; wins: number }> = {};
  trades.forEach(t => {
    if (!instMap[t.pair]) instMap[t.pair] = { count: 0, pnl: 0, wins: 0 };
    instMap[t.pair].count++;
    instMap[t.pair].pnl += t.pnl;
    if (t.res === 'win') instMap[t.pair].wins++;
  });

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const wins = trades.filter(t => t.res === 'win').length;

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Rendimiento</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { l: 'Mejor semana', v: weeks.length ? fmtUSD(Math.max(...weeks.map(w => weeklyMap[w]))) : '—', c: C.green },
          { l: 'Peor semana', v: weeks.length ? fmtUSD(Math.min(...weeks.map(w => weeklyMap[w]))) : '—', c: C.red },
          { l: 'P&L total', v: fmtUSD(totalPnl), c: totalPnl >= 0 ? C.green : C.red },
          { l: 'Semanas +', v: String(weeks.filter(w => weeklyMap[w] > 0).length), c: C.blue },
        ].map(s => (
          <div key={s.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 8, fontFamily: C.fontMono, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{s.l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.c, fontFamily: C.fontMono }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: C.text }}>P&L por semana</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130 }}>
          {weeks.length === 0 && <div style={{ color: C.muted, fontSize: 12 }}>Sin datos</div>}
          {weeks.map(w => {
            const v = weeklyMap[w];
            const h = Math.max(6, Math.abs(v) / maxV * 120);
            return (
              <div key={w} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <div style={{ fontSize: 10, color: v >= 0 ? C.green : C.red, fontWeight: 700, fontFamily: C.fontMono }}>
                  {v >= 0 ? '+' : ''}{Math.abs(v).toFixed(0)}
                </div>
                <div style={{ width: '100%', height: h, borderRadius: '4px 4px 0 0', background: v >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)' }} />
                <div style={{ fontSize: 9, color: C.muted, fontFamily: C.fontMono }}>{w.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Por instrumento</div>
        {Object.keys(instMap).length === 0 && <div style={{ color: C.muted, fontSize: 12 }}>Sin datos</div>}
        {Object.keys(instMap).sort((a, b) => instMap[b].pnl - instMap[a].pnl).map(pair => (
          <div key={pair} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{pair}</span>
              <span style={{ fontSize: 10, color: C.muted, marginLeft: 8 }}>{instMap[pair].count} ops · {Math.round(instMap[pair].wins / instMap[pair].count * 100)}% WR</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: instMap[pair].pnl >= 0 ? C.green : C.red, fontFamily: C.fontMono }}>{fmtUSD(instMap[pair].pnl)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PSICOLOGÍA ───────────────────────────────────────────────────────────────
type PsychEntry = { date: string; score: number; state: string; notes: string };

function PsicologiaView() {
  const [entries, setEntries] = useState<PsychEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [score, setScore] = useState('85');
  const [state, setState] = useState('Bueno');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const s = localStorage.getItem('st_psych_v2');
    if (s) setEntries(JSON.parse(s));
  }, []);

  const save = () => {
    const entry: PsychEntry = { date, score: parseInt(score) || 80, state, notes };
    const updated = [...entries.filter(e => e.date !== date), entry].sort((a, b) => b.date.localeCompare(a.date));
    setEntries(updated);
    localStorage.setItem('st_psych_v2', JSON.stringify(updated));
    setNotes('');
  };

  const avg = entries.length ? Math.round(entries.reduce((a, e) => a + e.score, 0) / entries.length) : 96;
  const peak = entries.filter(e => e.state === 'Peak').length;
  const good = entries.filter(e => e.state === 'Bueno').length;
  const hard = entries.filter(e => e.state === 'Difícil').length;

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Psicología de trading</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 16, fontFamily: C.fontMono, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Score mental</div>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: C.blue, lineHeight: 1, fontFamily: C.fontMono }}>{avg}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Puntuación promedio</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 14 }}>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < Math.round(avg / 10) ? C.blue : C.border }} />
              ))}
            </div>
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 14, fontFamily: C.fontMono, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Estado mental</div>
          <StatRow label="Días peak 🔥" value={String(peak)} color={C.green} />
          <StatRow label="Días buenos ✅" value={String(good)} color={C.blue} />
          <StatRow label="Días difíciles ⚠️" value={String(hard)} color={C.red} />
          <StatRow label="Sin registro" value={String(Math.max(0, 30 - entries.length))} />
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 16, fontFamily: C.fontMono, textTransform: 'uppercase', letterSpacing: '0.8px', color: C.muted }}>Registro diario</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div><label style={LBL}>Fecha</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={INP} /></div>
          <div><label style={LBL}>Score (0–100)</label><input type="number" value={score} onChange={e => setScore(e.target.value)} min="0" max="100" style={INP} /></div>
          <div>
            <label style={LBL}>Estado</label>
            <select value={state} onChange={e => setState(e.target.value)} style={{ ...INP, background: C.bg2 }}>
              <option>Peak</option><option>Bueno</option><option>Difícil</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LBL}>Notas</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Cómo me siento hoy..." style={INP} />
          </div>
        </div>
        <button onClick={save} style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '9px 20px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Guardar estado
        </button>
      </div>

      {entries.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700, fontFamily: C.fontMono, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Historial</div>
          {entries.slice(0, 10).map(e => (
            <div key={e.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <span style={{ fontSize: 12, color: C.muted, fontFamily: C.fontMono }}>{e.date}</span>
                {e.notes && <span style={{ fontSize: 11, color: C.muted2, marginLeft: 12 }}>{e.notes}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge text={e.state} color={e.state === 'Peak' ? C.green : e.state === 'Bueno' ? C.blue : C.red} bg={e.state === 'Peak' ? 'rgba(34,197,94,0.15)' : e.state === 'Bueno' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)'} />
                <span style={{ fontSize: 16, fontWeight: 800, color: C.blue, fontFamily: C.fontMono }}>{e.score}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function DashboardClient() {
  const [page, setPage] = useState<Page>('dashboard');
  const [mobile, setMobile] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [capital, setCapital] = useState<Capital>({ initial: 0, aportaciones: [] });
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS);
  const [activeAccount, setActiveAccount] = useState<Account>(DEFAULT_ACCOUNTS[0]);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [modalTrade, setModalTrade] = useState<Trade | null>(null);
  const [calMonth, setCalMonth] = useState(new Date());
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  // Trade form
  const [fDate, setFDate] = useState('');
  const [fTime, setFTime] = useState('');
  const [fPair, setFPair] = useState('XAUUSD');
  const [fTf, setFTf] = useState('1H');
  const [fDir, setFDir] = useState<string | null>(null);
  const [fEntry, setFEntry] = useState('');
  const [fSl, setFSl] = useState('');
  const [fTp, setFTp] = useState('');
  const [fRisk, setFRisk] = useState('');
  const [fLot, setFLot] = useState('');
  const [fRR, setFRR] = useState('—');
  const [fRes, setFRes] = useState<string | null>(null);
  const [fPnl, setFPnl] = useState('');
  const [fRreal, setFRreal] = useState('');
  const [fConf, setFConf] = useState<string[]>([]);
  const [fEmo, setFEmo] = useState('');
  const [fPlan, setFPlan] = useState<string | null>(null);
  const [fNotes, setFNotes] = useState('');
  const [fTvUrl, setFTvUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Capital form
  const [capInitial, setCapInitial] = useState('');
  const [apDate, setApDate] = useState('');
  const [apAmount, setApAmount] = useState('');
  const [apDesc, setApDesc] = useState('');

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const activeAccountRef = useRef(activeAccount.id);
  useEffect(() => { activeAccountRef.current = activeAccount.id; }, [activeAccount.id]);

  const loadData = useCallback(async (accountId?: string) => {
    setLoading(true);
    const aid = accountId || activeAccountRef.current;
    const [tR, cR, aR] = await Promise.all([
      fetch(`/api/trades?account=${aid}`),
      fetch(`/api/capital?account=${aid}`),
      fetch('/api/accounts'),
    ]);
    if (tR.ok) setTrades(await tR.json());
    if (cR.ok) { const c = await cR.json(); setCapital(c); setCapInitial(c.initial?.toString() || ''); }
    if (aR.ok) { const accs = await aR.json(); if (accs.length) setAccounts(accs); }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const n = new Date();
    setFDate(n.toISOString().split('T')[0]);
    setFTime(n.toTimeString().slice(0, 5));
    setApDate(n.toISOString().split('T')[0]);
  }, [loadData]);

  useEffect(() => {
    const e = parseFloat(fEntry), sl = parseFloat(fSl), tp = parseFloat(fTp);
    if (e && sl && tp) {
      const r = Math.abs(e - sl), p = Math.abs(tp - e);
      if (r > 0) { setFRR('1:' + (p / r).toFixed(1)); return; }
    }
    setFRR('—');
  }, [fEntry, fSl, fTp]);

  // ── Metrics ──
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalAport = capital.aportaciones.reduce((s, a) => s + a.amount, 0);
  const balance = capital.initial + totalAport + totalPnl;
  const wins = trades.filter(t => t.res === 'win').length;
  const losses = trades.filter(t => t.res === 'loss').length;
  const wr = trades.length ? Math.round(wins / trades.length * 100) : 0;
  const grossWin = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0;
  const avgWin = wins > 0 ? grossWin / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;
  const ret = capital.initial > 0 ? totalPnl / capital.initial * 100 : 0;

  // Streak
  let streak = 0, streakType = '—';
  if (trades.length > 0) {
    const rev = [...trades].reverse();
    const firstWin = rev[0].pnl >= 0;
    for (const t of rev) {
      if ((t.pnl >= 0) === firstWin) streak++;
      else break;
    }
    streakType = firstWin ? 'ganadora' : 'perdedora';
  }

  const animBalance = useCounter(balance);
  const animPnl = useCounter(totalPnl);

  // Capital curve
  const capCurve = (() => {
    let run = capital.initial;
    const evs: { date: string; val: number }[] = [];
    capital.aportaciones.forEach(a => evs.push({ date: a.date, val: a.amount }));
    trades.forEach(t => evs.push({ date: t.date, val: t.pnl }));
    evs.sort((a, b) => a.date.localeCompare(b.date));
    const labels = ['Inicio'], data = [capital.initial];
    evs.forEach(e => { run += e.val; labels.push(e.date); data.push(parseFloat(run.toFixed(2))); });
    return { labels, data };
  })();

  // ── Actions ──
  async function switchAccount(acc: Account) {
    setActiveAccount(acc); setShowAccountPicker(false); setPage('dashboard');
    await loadData(acc.id);
  }
  async function logout() { await fetch('/api/auth', { method: 'DELETE' }); window.location.href = '/login'; }

  function openTradeModal(trade?: Trade) {
    if (trade) {
      setEditingTrade(trade);
      setFDate(trade.date); setFTime(trade.time); setFPair(trade.pair); setFTf(trade.tf);
      setFDir(trade.dir); setFEntry(String(trade.entry)); setFSl(String(trade.sl)); setFTp(String(trade.tp));
      setFRisk(String(trade.risk)); setFLot(String(trade.lot)); setFRR(trade.rr);
      setFRes(trade.res); setFPnl(String(trade.pnl)); setFRreal(trade.rreal);
      setFConf(trade.conf); setFEmo(trade.emo); setFPlan(trade.plan); setFNotes(trade.notes);
      setFTvUrl(trade.tvUrl || '');
    } else {
      setEditingTrade(null);
      const n = new Date();
      setFDate(n.toISOString().split('T')[0]); setFTime(n.toTimeString().slice(0, 5));
      setFPair('XAUUSD'); setFTf('1H'); setFDir(null); setFEntry(''); setFSl(''); setFTp('');
      setFRisk(''); setFLot(''); setFRR('—'); setFRes(null); setFPnl(''); setFRreal('');
      setFConf([]); setFEmo(''); setFPlan(null); setFNotes(''); setFTvUrl('');
    }
    setShowTradeModal(true);
  }

  async function saveTrade() {
    if (!fDate || !fPair || !fDir || !fRes) { alert('Rellena fecha, activo, dirección y resultado.'); return; }
    const pnl = parseFloat(fPnl);
    if (isNaN(pnl)) { alert('Introduce el P&L.'); return; }
    setSaving(true);
    const aid = activeAccountRef.current;
    const t: Trade = {
      id: editingTrade?.id || Date.now(), date: fDate, time: fTime, pair: fPair, tf: fTf,
      dir: fDir, res: fRes, plan: fPlan, entry: parseFloat(fEntry) || 0, sl: parseFloat(fSl) || 0,
      tp: parseFloat(fTp) || 0, risk: parseFloat(fRisk) || 0, lot: parseFloat(fLot) || 0,
      rr: fRR, pnl, rreal: fRreal, conf: fConf, emo: fEmo, notes: fNotes, tvUrl: fTvUrl,
    };
    if (editingTrade) {
      await fetch('/api/trades', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingTrade.id, account: aid }) });
    }
    await fetch('/api/trades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...t, account: aid }) });
    await loadData(aid); setShowTradeModal(false); setSaving(false); setModalTrade(null);
  }

  async function deleteTrade(id: number) {
    if (!confirm('¿Eliminar este trade?')) return;
    await fetch('/api/trades', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, account: activeAccount.id }) });
    setModalTrade(null); await loadData();
  }

  async function setIC() {
    const v = parseFloat(capInitial); if (isNaN(v) || v <= 0) { alert('Capital inválido.'); return; }
    await fetch('/api/capital', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'setInitial', amount: v, account: activeAccount.id }) });
    await loadData();
  }
  async function addAp() {
    const a = parseFloat(apAmount); if (!apDate || isNaN(a) || a <= 0) { alert('Rellena fecha e importe.'); return; }
    await fetch('/api/capital', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addAport', date: apDate, amount: a, desc: apDesc || 'Aportación', account: activeAccount.id }) });
    setApAmount(''); setApDesc(''); await loadData();
  }
  async function delAp(id: number) {
    await fetch('/api/capital', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteAport', id, account: activeAccount.id }) });
    await loadData();
  }

  function toggleConf(c: string) { setFConf(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]); }

  // ── Nav items (sidebar) ──
  const navSections = [
    { label: 'Principal', items: [
      { p: 'dashboard' as Page, icon: 'ti-layout-dashboard', label: 'Dashboard' },
      { p: 'historial' as Page, icon: 'ti-list-details', label: 'Historial' },
      { p: 'calendario' as Page, icon: 'ti-calendar-stats', label: 'Calendario P&L' },
      { p: 'rendimiento' as Page, icon: 'ti-trending-up', label: 'Rendimiento' },
    ]},
    { label: 'Análisis', items: [
      { p: 'riesgo' as Page, icon: 'ti-shield-check', label: 'Riesgo' },
      { p: 'psicologia' as Page, icon: 'ti-brain', label: 'Psicología' },
      { p: 'diario' as Page, icon: 'ti-traffic-cone', label: 'Diario' },
      { p: 'capital' as Page, icon: 'ti-coin', label: 'Capital' },
    ]},
    { label: 'Herramientas', items: [
      { p: 'calculadora' as Page, icon: 'ti-calculator', label: 'Calculadora' },
      { p: 'alertas' as Page, icon: 'ti-bell', label: 'Alertas' },
      { p: 'patrimonio' as Page, icon: 'ti-diamond', label: 'Patrimonio' },
    ]},
    { label: 'Cuenta', items: [
      { p: 'objetivos' as Page, icon: 'ti-target', label: 'Objetivos' },
      { p: 'logros' as Page, icon: 'ti-trophy', label: 'Logros' },
      { p: 'configuracion' as Page, icon: 'ti-settings', label: 'Configuración' },
    ]},
  ];

  // ── LOADING ──
  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
      <div style={{ fontFamily: C.fontMono, fontSize: 11, color: C.muted, letterSpacing: '0.2em' }}>CARGANDO...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const sidebarW = mobile ? 0 : 220;
  const todayStr = new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();

  // ── TRADE DETAIL MODAL ──
  const TradeDetailModal = modalTrade && (
    <Modal title={`${modalTrade.pair} · ${modalTrade.date}`} onClose={() => setModalTrade(null)}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          ['Dirección', modalTrade.dir === 'buy' ? '▲ LONG' : '▼ SHORT', modalTrade.dir === 'buy' ? C.green : C.red],
          ['Resultado', modalTrade.res.toUpperCase(), modalTrade.res === 'win' ? C.green : modalTrade.res === 'loss' ? C.red : C.muted2],
          ['P&L', fmtUSD(modalTrade.pnl), modalTrade.pnl >= 0 ? C.green : C.red],
          ['R:R', modalTrade.rr, C.text],
          ['Entrada', String(modalTrade.entry), C.text],
          ['SL', String(modalTrade.sl), C.red],
          ['TP', String(modalTrade.tp), C.green],
          ['Lote', String(modalTrade.lot), C.text],
        ].map(([k, v, col]) => (
          <div key={k as string} style={{ background: C.bg2, borderRadius: 8, padding: '10px 14px', border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.muted, fontFamily: C.fontMono, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>{k}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: col as string || C.text, fontFamily: C.fontMono }}>{v}</div>
          </div>
        ))}
      </div>
      {modalTrade.tvUrl && (
        <div style={{ marginBottom: 12 }}>
          <a href={modalTrade.tvUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.blue, fontSize: 12, textDecoration: 'none', background: 'rgba(59,130,246,0.1)', border: `1px solid ${C.border2}`, borderRadius: 8, padding: '8px 14px' }}>
            <i className="ti ti-external-link" aria-hidden="true" />
            Ver en TradingView
          </a>
        </div>
      )}
      {modalTrade.notes && <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, fontSize: 12, color: C.muted2, marginBottom: 16 }}>{modalTrade.notes}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { setModalTrade(null); openTradeModal(modalTrade); }}
          style={{ background: 'rgba(59,130,246,0.15)', border: `1px solid ${C.border2}`, borderRadius: 8, padding: '8px 16px', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: 1 }}>
          Editar
        </button>
        <button onClick={() => deleteTrade(modalTrade.id)}
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 16px', color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer', flex: 1 }}>
          Eliminar
        </button>
      </div>
    </Modal>
  );

  // ── TRADE FORM MODAL ──
  const TradeFormModal = showTradeModal && (
    <Modal title={editingTrade ? 'Editar trade' : 'Nuevo trade'} onClose={() => setShowTradeModal(false)}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div><label style={LBL}>Fecha</label><input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={INP} /></div>
        <div><label style={LBL}>Hora</label><input type="time" value={fTime} onChange={e => setFTime(e.target.value)} style={INP} /></div>
        <div><label style={LBL}>Par</label>
          <select value={fPair} onChange={e => setFPair(e.target.value)} style={{ ...INP, background: C.bg }}>
            <option>XAUUSD</option><option>NAS100</option><option>EURUSD</option><option>BTCUSD</option><option>US30</option><option>Otro</option>
          </select>
        </div>
        <div><label style={LBL}>Timeframe</label>
          <select value={fTf} onChange={e => setFTf(e.target.value)} style={{ ...INP, background: C.bg }}>
            <option>1M</option><option>5M</option><option>15M</option><option>1H</option><option>4H</option><option>1D</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={LBL}>Dirección</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Tog label="▲ LONG" active={fDir === 'buy'} color={C.green} bg="rgba(34,197,94,0.12)" onClick={() => setFDir('buy')} />
          <Tog label="▼ SHORT" active={fDir === 'sell'} color={C.red} bg="rgba(239,68,68,0.12)" onClick={() => setFDir('sell')} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div><label style={LBL}>Entrada</label><input type="number" value={fEntry} onChange={e => setFEntry(e.target.value)} style={INP} /></div>
        <div><label style={LBL}>Stop Loss</label><input type="number" value={fSl} onChange={e => setFSl(e.target.value)} style={INP} /></div>
        <div><label style={LBL}>Take Profit</label><input type="number" value={fTp} onChange={e => setFTp(e.target.value)} style={INP} /></div>
        <div><label style={LBL}>Riesgo €</label><input type="number" value={fRisk} onChange={e => setFRisk(e.target.value)} style={INP} /></div>
        <div><label style={LBL}>Lote</label><input type="number" value={fLot} onChange={e => setFLot(e.target.value)} step="0.01" style={INP} /></div>
        <div><label style={LBL}>R:R auto</label>
          <div style={{ ...INP, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: C.blue, fontFamily: C.fontMono }}>{fRR}</div>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={LBL}>Resultado</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <Tog label="✓ WIN" active={fRes === 'win'} color={C.green} bg="rgba(34,197,94,0.12)" onClick={() => setFRes('win')} />
          <Tog label="✕ LOSS" active={fRes === 'loss'} color={C.red} bg="rgba(239,68,68,0.12)" onClick={() => setFRes('loss')} />
          <Tog label="— BE" active={fRes === 'be'} color={C.muted2} bg="rgba(148,163,184,0.1)" onClick={() => setFRes('be')} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div><label style={LBL}>P&L €</label><input type="number" value={fPnl} onChange={e => setFPnl(e.target.value)} style={INP} /></div>
        <div><label style={LBL}>R obtenido</label><input type="text" value={fRreal} onChange={e => setFRreal(e.target.value)} placeholder="+2R" style={INP} /></div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={LBL}>Link foto TradingView</label>
        <input type="url" value={fTvUrl} onChange={e => setFTvUrl(e.target.value)} placeholder="https://www.tradingview.com/..." style={INP} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={LBL}>Notas</label>
        <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Setup, confluencias, aprendizajes..." style={{ ...INP, minHeight: 60, resize: 'vertical' } as React.CSSProperties} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={() => setShowTradeModal(false)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 18px', color: C.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={saveTrade} disabled={saving} style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '9px 22px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'Guardando...' : 'Guardar trade'}
        </button>
      </div>
    </Modal>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: C.fontUi, color: C.text, overflowX: 'hidden' }}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1e2d45;border-radius:2px}
        input,select,textarea{font-family:inherit;}
        select option{background:${C.bg2};}
        input:focus,select:focus,textarea:focus{outline:none;border-color:${C.blue}!important;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .pe{animation:fadeUp 0.25s ease;}
        .nav-item:hover{background:rgba(59,130,246,0.08)!important;color:${C.text}!important;}
        .trade-row:hover{background:${C.card}!important;}
        .mod-btn:hover{border-color:${C.border2}!important;background:${C.card2}!important;}
      `}</style>

      {/* ─── SIDEBAR ─────────────────────────────────────────────────────── */}
      {!mobile && (
        <div style={{
          width: sidebarW, minWidth: sidebarW, background: C.bg2, borderRight: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, overflowY: 'auto',
        }}>
          {/* Logo */}
          <div style={{ padding: '20px 16px 16px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: C.blue, letterSpacing: '0.5px', marginBottom: 2 }}>SAVAGE TRADING</div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: '1.5px', fontFamily: C.fontMono }}>JOURNAL PRO</div>
          </div>

          {/* Account badge */}
          <div style={{ margin: '12px 12px 0', position: 'relative' }}>
            <button onClick={() => setShowAccountPicker(!showAccountPicker)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
              background: '#0a1628', border: `1px solid ${C.border2}`, borderRadius: 8,
              cursor: 'pointer', color: C.text, fontFamily: C.fontUi, fontSize: 12, fontWeight: 600,
            }}>
              <i className="ti ti-wallet" style={{ color: activeAccount.color, fontSize: 15 }} aria-hidden="true" />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ color: activeAccount.color, fontSize: 11, fontWeight: 700 }}>{activeAccount.name}</div>
                <div style={{ color: C.muted, fontSize: 9, fontFamily: C.fontMono }}>{activeAccount.type}</div>
              </div>
              <i className="ti ti-chevron-down" style={{ color: C.muted, fontSize: 12 }} aria-hidden="true" />
            </button>
            {showAccountPicker && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 10, zIndex: 200, marginTop: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
                {accounts.map(acc => (
                  <div key={acc.id} onClick={() => switchAccount(acc)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer', background: activeAccount.id === acc.id ? 'rgba(59,130,246,0.1)' : 'transparent', borderBottom: `1px solid ${C.border}` }}>
                    <i className="ti ti-wallet" style={{ color: acc.color, fontSize: 14 }} aria-hidden="true" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: acc.color }}>{acc.name}</span>
                    {activeAccount.id === acc.id && <i className="ti ti-check" style={{ marginLeft: 'auto', color: acc.color, fontSize: 12 }} aria-hidden="true" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Balance quick view */}
          <div style={{ margin: '10px 12px', background: '#0a1628', border: `1px solid ${C.border2}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 9, color: C.muted, fontFamily: C.fontMono, letterSpacing: '1px', marginBottom: 4 }}>BALANCE</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.blue, fontFamily: C.fontMono }}>{fmtAbs(animBalance)}</div>
            <div style={{ fontSize: 10, color: totalPnl >= 0 ? C.green : C.red, marginTop: 2, fontFamily: C.fontMono }}>
              {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}€ P&L
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '8px 8px' }}>
            {navSections.map(section => (
              <div key={section.label}>
                <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '1px', padding: '10px 10px 4px', fontFamily: C.fontMono }}>{section.label}</div>
                {section.items.map(item => (
                  <div key={item.p} className="nav-item" onClick={() => setPage(item.p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer',
                      color: page === item.p ? C.blue : C.muted, background: page === item.p ? 'rgba(59,130,246,0.12)' : 'transparent',
                      borderLeft: `2px solid ${page === item.p ? C.blue : 'transparent'}`, marginBottom: 1,
                      fontSize: 13, fontWeight: page === item.p ? 600 : 400, transition: 'all 0.12s',
                    }}>
                    <i className={`ti ${item.icon}`} style={{ fontSize: 15, width: 16 }} aria-hidden="true" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div style={{ padding: '12px', borderTop: `1px solid ${C.border}` }}>
            <button onClick={logout} style={{ width: '100%', padding: '8px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, color: C.muted, fontSize: 11, cursor: 'pointer', fontFamily: C.fontMono, letterSpacing: '0.08em' }}>
              CERRAR SESIÓN
            </button>
          </div>
        </div>
      )}

      {/* ─── MAIN ────────────────────────────────────────────────────────── */}
      <div style={{ marginLeft: mobile ? 0 : sidebarW, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Topbar */}
        <div style={{
          background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: '0 24px',
          height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            {navSections.flatMap(s => s.items).find(i => i.p === page)?.label || 'Dashboard'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 10, color: C.muted, fontFamily: C.fontMono }}>{todayStr}</div>
            <button onClick={() => openTradeModal()} style={{
              background: C.blue, border: 'none', borderRadius: 7, padding: '7px 14px',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <i className="ti ti-plus" aria-hidden="true" /> Nuevo trade
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto', background: C.bg }}>

          {/* ─── DASHBOARD ────────────────────────────────────────────── */}
          {page === 'dashboard' && (
            <div className="pe">
              {/* Main metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                <MetricCard label="Balance" value={fmtAbs(animBalance)} sub={`Capital inicial: ${fmtAbs(capital.initial)}`} color={C.blue} accent />
                <MetricCard label="Net P&L" value={fmtUSD(animPnl)} sub={`${trades.length} operaciones`} color={totalPnl >= 0 ? C.green : C.red} />
                <MetricCard label="Return" value={(ret >= 0 ? '+' : '') + ret.toFixed(2) + '%'} sub={`Win rate: ${wr}%`} color={ret >= 0 ? C.green : C.red} />
                <MetricCard label="Profit Factor" value={pf === 999 ? '∞' : pf.toFixed(2)} sub={`${trades.length} ops totales`} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                <MetricCard label="Win Rate" value={wr + '%'} sub={`${wins}W / ${losses}L`} color={wr >= 50 ? C.green : C.red} />
                <MetricCard label="Avg. Win / Loss" value={`+${avgWin.toFixed(0)}€ / -${avgLoss.toFixed(0)}€`} sub={`R:R promedio: ${avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '—'}`} />
                <MetricCard label="Racha actual" value={String(streak)} sub={`Racha ${streakType}`} color={streakType === 'ganadora' ? C.green : C.red} />
              </div>

              {/* Quick access modules */}
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12, fontFamily: C.fontMono }}>Acceso rápido</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                <ModuleCard icon="📋" name="Historial" desc="Ver y gestionar operaciones" onClick={() => setPage('historial')} />
                <ModuleCard icon="📅" name="Calendario P&L" desc="Resultados por día" onClick={() => setPage('calendario')} />
                <ModuleCard icon="📈" name="Rendimiento" desc="Análisis semanal" onClick={() => setPage('rendimiento')} />
                <ModuleCard icon="🛡️" name="Gestión de Riesgo" desc="Drawdown y exposición" onClick={() => setPage('riesgo')} />
                <ModuleCard icon="🧠" name="Psicología" desc="Estado mental y score" onClick={() => setPage('psicologia')} />
                <ModuleCard icon="💰" name="Curva de capital" desc="Evolución del balance" onClick={() => setPage('capital')} />
              </div>

              {/* Capital curve */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>Curva de capital</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Evolución histórica</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: totalPnl >= 0 ? C.green : C.red, fontFamily: C.fontMono }}>
                    {fmtUSD(totalPnl)}
                  </span>
                </div>
                <div style={{ height: 160 }}>
                  {capCurve.data.length > 1
                    ? <Line
                        data={{ labels: capCurve.labels, datasets: [{ data: capCurve.data, borderColor: totalPnl >= 0 ? C.blue : C.red, backgroundColor: totalPnl >= 0 ? 'rgba(59,130,246,0.08)' : 'rgba(239,68,68,0.06)', borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, fill: true, tension: 0.08 }] }}
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: C.card2, titleColor: C.blue, bodyColor: C.text } }, scales: { x: { ticks: { color: C.muted, font: { family: 'monospace', size: 9 }, maxTicksLimit: 6 }, grid: { color: 'rgba(255,255,255,0.03)' } }, y: { ticks: { color: C.muted, font: { family: 'monospace', size: 9 }, callback: (v: unknown) => String(v) + '€' }, grid: { color: 'rgba(255,255,255,0.03)' } } } }}
                      />
                    : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 12 }}>Añade tu primer trade</div>
                  }
                </div>
              </div>

              {/* Recent trades */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Trades recientes</div>
                  <button onClick={() => setPage('historial')} style={{ fontSize: 10, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', fontFamily: C.fontMono }}>VER TODOS →</button>
                </div>
                {trades.length === 0
                  ? <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted, fontSize: 12 }}>Sin trades aún</div>
                  : [...trades].reverse().slice(0, 5).map(t => (
                    <div key={t.id} className="trade-row" onClick={() => setModalTrade(t)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 18px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', transition: 'background 0.1s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.res === 'win' ? C.green : t.res === 'loss' ? C.red : C.muted2 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{t.pair} <span style={{ fontSize: 11, color: t.dir === 'buy' ? C.green : C.red }}>{t.dir === 'buy' ? '▲' : '▼'}</span></div>
                          <div style={{ fontSize: 10, color: C.muted }}>{t.date} · {t.tf}</div>
                        </div>
                      </div>
                      <div style={{ fontFamily: C.fontMono, fontSize: 14, fontWeight: 700, color: t.pnl > 0 ? C.green : t.pnl < 0 ? C.red : C.muted2 }}>{fmtUSD(t.pnl)}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* ─── HISTORIAL ────────────────────────────────────────────── */}
          {page === 'historial' && (
            <div className="pe">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Historial de trades</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{trades.length} operaciones registradas</div>
                </div>
                <button onClick={() => openTradeModal()} style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '9px 16px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-plus" aria-hidden="true" /> Añadir trade
                </button>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead>
                    <tr>
                      {['Fecha', 'Par', 'Dir.', 'Resultado', 'Entrada', 'SL', 'TP', 'P&L', '% Bal', 'TV', 'Acciones'].map(h => (
                        <th key={h} style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '1px', padding: '10px 14px', textAlign: 'left', borderBottom: `1px solid ${C.border}`, fontFamily: C.fontMono, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.length === 0 && (
                      <tr><td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: 12 }}>Sin trades. Añade tu primera operación.</td></tr>
                    )}
                    {[...trades].reverse().map(t => {
                      const pct = capital.initial > 0 ? (t.pnl / capital.initial * 100).toFixed(2) : '0.00';
                      return (
                        <tr key={t.id} className="trade-row" style={{ transition: 'background 0.1s', cursor: 'pointer' }}>
                          <td style={{ padding: '11px 14px', fontSize: 12, color: C.muted, fontFamily: C.fontMono, whiteSpace: 'nowrap' }}>{t.date}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ background: 'rgba(59,130,246,0.15)', color: C.blue, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700, fontFamily: C.fontMono }}>{t.pair}</span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ color: t.dir === 'buy' ? C.green : C.red, fontSize: 13, fontWeight: 700 }}>{t.dir === 'buy' ? '▲' : '▼'}</span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <Badge text={t.res.toUpperCase()} color={t.res === 'win' ? C.green : t.res === 'loss' ? C.red : C.muted2} bg={t.res === 'win' ? 'rgba(34,197,94,0.12)' : t.res === 'loss' ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.1)'} />
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: 12, fontFamily: C.fontMono, color: C.text }}>{t.entry || '—'}</td>
                          <td style={{ padding: '11px 14px', fontSize: 12, fontFamily: C.fontMono, color: C.red }}>{t.sl || '—'}</td>
                          <td style={{ padding: '11px 14px', fontSize: 12, fontFamily: C.fontMono, color: C.green }}>{t.tp || '—'}</td>
                          <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, fontFamily: C.fontMono, color: t.pnl >= 0 ? C.green : C.red, whiteSpace: 'nowrap' }}>{fmtUSD(t.pnl)}</td>
                          <td style={{ padding: '11px 14px', fontSize: 12, fontFamily: C.fontMono, color: t.pnl >= 0 ? C.green : C.red, whiteSpace: 'nowrap' }}>{t.pnl >= 0 ? '+' : ''}{pct}%</td>
                          <td style={{ padding: '11px 14px' }}>
                            {t.tvUrl
                              ? <a href={t.tvUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: C.blue, fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <i className="ti ti-external-link" aria-hidden="true" /> Ver
                                </a>
                              : <span style={{ color: C.muted, fontSize: 11 }}>—</span>
                            }
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={e => { e.stopPropagation(); openTradeModal(t); }} style={{ background: 'rgba(59,130,246,0.12)', border: `1px solid ${C.border}`, borderRadius: 5, width: 28, height: 28, cursor: 'pointer', color: C.blue, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="ti ti-edit" aria-hidden="true" />
                              </button>
                              <button onClick={e => { e.stopPropagation(); deleteTrade(t.id); }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, width: 28, height: 28, cursor: 'pointer', color: C.red, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="ti ti-trash" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── CALENDARIO ───────────────────────────────────────────── */}
          {page === 'calendario' && (
            <div className="pe">
              <CalendarView trades={trades} calMonth={calMonth} setCalMonth={setCalMonth} />
            </div>
          )}

          {/* ─── RENDIMIENTO ──────────────────────────────────────────── */}
          {page === 'rendimiento' && (
            <div className="pe">
              <RendimientoView trades={trades} capital={capital} />
            </div>
          )}

          {/* ─── CAPITAL ──────────────────────────────────────────────── */}
          {page === 'capital' && (
            <div className="pe">
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Capital & aportaciones</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                  <div style={SEC}>Capital inicial</div>
                  <label style={LBL}>Importe €</label>
                  <input type="number" value={capInitial} onChange={e => setCapInitial(e.target.value)} placeholder="200.00" style={{ ...INP, marginBottom: 12 }} />
                  <button onClick={setIC} style={{ width: '100%', padding: 10, background: C.blue, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Guardar capital</button>
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                  <div style={SEC}>Nueva aportación</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><label style={LBL}>Fecha</label><input type="date" value={apDate} onChange={e => setApDate(e.target.value)} style={INP} /></div>
                    <div><label style={LBL}>Importe €</label><input type="number" value={apAmount} onChange={e => setApAmount(e.target.value)} style={INP} /></div>
                  </div>
                  <label style={LBL}>Descripción</label>
                  <input type="text" value={apDesc} onChange={e => setApDesc(e.target.value)} placeholder="Aportación mensual" style={{ ...INP, marginBottom: 12 }} />
                  <button onClick={addAp} style={{ width: '100%', padding: 10, background: C.blue, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Añadir aportación</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { l: 'Capital inicial', v: fmtAbs(capital.initial), c: C.blue },
                  { l: 'Total aportado', v: fmtAbs(totalAport), c: C.amber },
                  { l: 'P&L total', v: fmtUSD(totalPnl), c: totalPnl >= 0 ? C.green : C.red },
                  { l: 'Balance total', v: fmtAbs(balance), c: C.text },
                ].map(s => <MetricCard key={s.l} label={s.l} value={s.v} color={s.c} />)}
              </div>
              {capital.aportaciones.length > 0 && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700 }}>Historial de aportaciones</div>
                  {capital.aportaciones.map(a => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 18px', borderBottom: `1px solid ${C.border}` }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{a.desc}</div>
                        <div style={{ fontSize: 10, color: C.muted, fontFamily: C.fontMono }}>{a.date}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: C.fontMono, fontWeight: 700, color: C.green, fontSize: 14 }}>+{fmtAbs(a.amount)}</span>
                        <button onClick={() => delAp(a.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: C.red, padding: '3px 8px', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── PSICOLOGÍA ───────────────────────────────────────────── */}
          {page === 'psicologia' && <div className="pe"><PsicologiaView /></div>}

          {/* ─── RIESGO ───────────────────────────────────────────────── */}
          {page === 'riesgo' && (
            <div className="pe">
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Control de Riesgo</div>
              <ObjetivosRiesgo trades={trades} />
            </div>
          )}

          {/* ─── DIARIO ───────────────────────────────────────────────── */}
          {page === 'diario' && (
            <div className="pe">
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Diario & Semáforo</div>
              <DiarioClient />
            </div>
          )}

          {/* ─── CALCULADORA ──────────────────────────────────────────── */}
          {page === 'calculadora' && (
            <div className="pe">
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Calculadora de posición</div>
              <CalculadoraClient capital={balance} />
            </div>
          )}

          {/* ─── ALERTAS ──────────────────────────────────────────────── */}
          {page === 'alertas' && (
            <div className="pe">
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Alertas inteligentes</div>
              <AlertasClient trades={trades} />
            </div>
          )}

          {/* ─── PATRIMONIO ───────────────────────────────────────────── */}
          {page === 'patrimonio' && (
            <div className="pe">
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Patrimonio & Inversiones</div>
              <PatrimonioClient tradingBalance={balance} />
            </div>
          )}

          {/* ─── LOGROS ───────────────────────────────────────────────── */}
          {page === 'logros' && (
            <div className="pe">
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Logros & Diplomas</div>
              <LogrosClient trades={trades} totalPnl={totalPnl} />
            </div>
          )}

          {/* ─── OBJETIVOS ────────────────────────────────────────────── */}
          {page === 'objetivos' && (
            <div className="pe">
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Objetivos</div>
              <div style={{ color: C.muted, fontSize: 12 }}>Usa el módulo de Riesgo para configurar tus objetivos de P&L.</div>
            </div>
          )}

          {/* ─── CONFIGURACIÓN ────────────────────────────────────────── */}
          {page === 'configuracion' && (
            <div className="pe">
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Configuración de cuenta</div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
                <div style={SEC}>Cuenta activa</div>
                <div style={{ marginBottom: 16 }}>
                  {accounts.map(acc => (
                    <div key={acc.id} onClick={() => switchAccount(acc)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 8, cursor: 'pointer', marginBottom: 6,
                      background: activeAccount.id === acc.id ? 'rgba(59,130,246,0.1)' : C.bg2, border: `1px solid ${activeAccount.id === acc.id ? C.border2 : C.border}`,
                    }}>
                      <i className="ti ti-wallet" style={{ color: acc.color, fontSize: 16 }} aria-hidden="true" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: acc.color }}>{acc.name}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{acc.type}</div>
                      </div>
                      {activeAccount.id === acc.id && <Badge text="Activa" color={C.blue} bg="rgba(59,130,246,0.15)" />}
                    </div>
                  ))}
                </div>
                <button onClick={logout} style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 20px', color: C.red, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────── */}
      {TradeDetailModal}
      {TradeFormModal}
    </div>
  );
}
