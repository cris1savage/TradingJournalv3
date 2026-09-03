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
type Page = 'dashboard' | 'historial' | 'nuevo' | 'capital' | 'riesgo' | 'psicologia' | 'diario' | 'logros' | 'calculadora' | 'objetivos' | 'alertas' | 'patrimonio' | 'configuracion' | 'calendario' | 'rendimiento';

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const C = {
  bg:    '#0a0f1e',
  bg2:   '#0d1526',
  bg3:   '#111d35',
  card:  '#0f1d35',
  card2: '#142040',
  border: 'rgba(255,255,255,0.07)',
  borderB: 'rgba(59,130,246,0.2)',
  blue:  '#3B82F6',
  blue2: '#60a5fa',
  blue3: '#93c5fd',
  green: '#22c55e',
  red:   '#ef4444',
  amber: '#f59e0b',
  text:  '#ffffff',
  text2: '#94a3b8',
  text3: '#475569',
};

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'propia', name: 'Cuenta Propia', type: 'Propia', color: C.blue },
  { id: 'ftmo', name: 'FTMO Challenge', type: 'Fondeo', color: '#a855f7' },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => {
  const abs = Math.abs(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n >= 0 ? '+' : '-') + '€' + abs;
};
const fmtAbs = (n: number) => '€' + Math.abs(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function useCounter(target: number, dur = 900) {
  const [v, sv] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const s = prev.current, diff = target - s, t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      sv(s + diff * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick); else prev.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, dur]);
  return v;
}

// ─── FORM ELEMENTS ───────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  background: '#080d1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
  padding: '9px 13px', color: '#fff', fontSize: 13, width: '100%', fontFamily: 'inherit',
};
const LBL: React.CSSProperties = {
  fontSize: 10, color: '#64748b', textTransform: 'uppercase' as const,
  letterSpacing: '0.8px', display: 'block', marginBottom: 5,
};
const SEC: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase' as const,
  letterSpacing: '1.2px', marginBottom: 14, paddingBottom: 8,
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

function Tog({ label, active, color, bg, onClick }: { label: string; active: boolean; color: string; bg: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '9px 6px', borderRadius: 8, border: `1px solid ${active ? color : 'rgba(255,255,255,0.07)'}`,
      background: active ? bg : 'rgba(255,255,255,0.03)', color: active ? color : '#64748b',
      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
    }}>{label}</button>
  );
}

// ─── BADGE ───────────────────────────────────────────────────────────────────
function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{ background: bg, color, borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.5px' }}>{text}</span>
  );
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#0d1526', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {children}
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
  useEffect(() => { const s = localStorage.getItem('st_psych_v2'); if (s) setEntries(JSON.parse(s)); }, []);
  const save = () => {
    const entry: PsychEntry = { date, score: parseInt(score) || 80, state, notes };
    const updated = [...entries.filter(e => e.date !== date), entry].sort((a, b) => b.date.localeCompare(a.date));
    setEntries(updated); localStorage.setItem('st_psych_v2', JSON.stringify(updated)); setNotes('');
  };
  const avg = entries.length ? Math.round(entries.reduce((a, e) => a + e.score, 0) / entries.length) : 96;
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Psicología de trading</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 11, color: C.text2, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>Score mental promedio</div>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 72, fontWeight: 900, color: C.blue, lineHeight: 1 }}>{avg}</div>
            <div style={{ fontSize: 11, color: C.text2, marginTop: 8 }}>/ 100</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 16 }}>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < Math.round(avg / 10) ? C.blue : 'rgba(255,255,255,0.08)' }} />
              ))}
            </div>
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 11, color: C.text2, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>Estado mental</div>
          {[
            { l: 'Días peak 🔥', v: entries.filter(e => e.state === 'Peak').length, c: C.green },
            { l: 'Días buenos ✅', v: entries.filter(e => e.state === 'Bueno').length, c: C.blue },
            { l: 'Días difíciles ⚠️', v: entries.filter(e => e.state === 'Difícil').length, c: C.red },
            { l: 'Sin registro', v: Math.max(0, 30 - entries.length), c: C.text2 },
          ].map(s => (
            <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 12, color: C.text2 }}>{s.l}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: s.c }}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, padding: 24 }}>
        <div style={SEC}>Registro diario</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div><label style={LBL}>Fecha</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={INP} /></div>
          <div><label style={LBL}>Score (0–100)</label><input type="number" value={score} onChange={e => setScore(e.target.value)} min="0" max="100" style={INP} /></div>
          <div><label style={LBL}>Estado</label>
            <select value={state} onChange={e => setState(e.target.value)} style={{ ...INP, background: '#080d1a' }}>
              <option>Peak</option><option>Bueno</option><option>Difícil</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}><label style={LBL}>Notas</label><input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Cómo te sientes hoy..." style={INP} /></div>
        </div>
        <button onClick={save} style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '9px 22px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Guardar</button>
      </div>
      {entries.length > 0 && (
        <div style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, overflow: 'hidden', marginTop: 16 }}>
          {entries.slice(0, 8).map(e => (
            <div key={e.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div><span style={{ fontSize: 12, color: C.text2 }}>{e.date}</span>{e.notes && <span style={{ fontSize: 11, color: C.text3, marginLeft: 12 }}>{e.notes}</span>}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge text={e.state} color={e.state === 'Peak' ? C.green : e.state === 'Bueno' ? C.blue : C.red} bg={e.state === 'Peak' ? 'rgba(34,197,94,0.12)' : e.state === 'Bueno' ? 'rgba(59,130,246,0.12)' : 'rgba(239,68,68,0.12)'} />
                <span style={{ fontSize: 18, fontWeight: 900, color: C.blue }}>{e.score}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CALENDARIO ───────────────────────────────────────────────────────────────
function CalendarView({ trades, calMonth, setCalMonth }: { trades: Trade[]; calMonth: Date; setCalMonth: (d: Date) => void }) {
  const byDay: Record<string, number> = {};
  trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const fd = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
  const offset = fd === 0 ? 6 : fd - 1;
  const cells: (null | { day: number; pnl: number | null })[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) {
    const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, pnl: byDay[k] ?? null });
  }
  const today = new Date().toISOString().split('T')[0];
  const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
  const totalMonth = Object.entries(byDay).filter(([k]) => k.startsWith(monthKey)).reduce((a, [, v]) => a + v, 0);
  const dayTraded = cells.filter(c => c?.pnl !== null).length;
  const winDays = cells.filter(c => c?.pnl !== null && (c?.pnl ?? 0) >= 0).length;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Calendario P&L</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setCalMonth(new Date(y, m - 1))} style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 7, color: C.blue, width: 32, height: 32, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.blue2, minWidth: 140, textAlign: 'center' }}>
            {calMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
          </span>
          <button onClick={() => setCalMonth(new Date(y, m + 1))} style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 7, color: C.blue, width: 32, height: 32, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>›</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: C.text3, padding: '4px 0', fontWeight: 700, letterSpacing: '0.5px' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 24 }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} style={{ aspectRatio: '1', minHeight: 64 }} />;
          const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
          const isToday = k === today;
          const hasData = cell.pnl !== null;
          const isWin = (cell.pnl ?? 0) >= 0;
          return (
            <div key={i} style={{
              aspectRatio: '1', minHeight: 64, borderRadius: 10,
              background: hasData ? (isWin ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)') : C.card,
              border: `1px solid ${isToday ? C.blue : hasData ? (isWin ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)') : C.border}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: isToday ? C.blue : C.text, lineHeight: 1 }}>{cell.day}</div>
              {hasData && (
                <div style={{ fontSize: 11, fontWeight: 800, color: isWin ? C.green : C.red, marginTop: 4 }}>
                  {isWin ? '+' : '-'}€{Math.abs(cell.pnl!).toFixed(0)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { l: 'P&L mensual', v: fmt(totalMonth), c: totalMonth >= 0 ? C.green : C.red },
          { l: 'Días operados', v: String(dayTraded), c: C.blue },
          { l: 'Win rate mes', v: dayTraded > 0 ? Math.round(winDays / dayTraded * 100) + '%' : '0%', c: C.text },
        ].map(s => (
          <div key={s.l} style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: C.text2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{s.l}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RENDIMIENTO ─────────────────────────────────────────────────────────────
function RendimientoView({ trades }: { trades: Trade[] }) {
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
    instMap[t.pair].count++; instMap[t.pair].pnl += t.pnl;
    if (t.res === 'win') instMap[t.pair].wins++;
  });
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Rendimiento</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { l: 'Mejor semana', v: weeks.length ? fmt(Math.max(...weeks.map(w => weeklyMap[w]))) : '—', c: C.green },
          { l: 'Peor semana', v: weeks.length ? fmt(Math.min(...weeks.map(w => weeklyMap[w]))) : '—', c: C.red },
          { l: 'P&L total', v: fmt(totalPnl), c: totalPnl >= 0 ? C.green : C.red },
          { l: 'Semanas +', v: String(weeks.filter(w => weeklyMap[w] > 0).length), c: C.blue },
        ].map(s => (
          <div key={s.l} style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, color: C.text2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{s.l}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 18 }}>P&L por semana</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130 }}>
          {weeks.length === 0 && <div style={{ color: C.text2, fontSize: 12 }}>Sin datos</div>}
          {weeks.map(w => {
            const v = weeklyMap[w];
            const h = Math.max(6, Math.abs(v) / maxV * 120);
            return (
              <div key={w} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <div style={{ fontSize: 10, color: v >= 0 ? C.green : C.red, fontWeight: 700 }}>{v >= 0 ? '+' : ''}€{Math.abs(v).toFixed(0)}</div>
                <div style={{ width: '100%', height: h, borderRadius: '4px 4px 0 0', background: v >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)' }} />
                <div style={{ fontSize: 9, color: C.text3 }}>{w.slice(5)}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, padding: '20px 22px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Por instrumento</div>
        {Object.keys(instMap).length === 0 && <div style={{ color: C.text2, fontSize: 12 }}>Sin datos</div>}
        {Object.keys(instMap).sort((a, b) => instMap[b].pnl - instMap[a].pnl).map(pair => (
          <div key={pair} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{pair}</span>
              <span style={{ fontSize: 10, color: C.text2, marginLeft: 10 }}>{instMap[pair].count} ops · {Math.round(instMap[pair].wins / instMap[pair].count * 100)}% WR</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: instMap[pair].pnl >= 0 ? C.green : C.red }}>{fmt(instMap[pair].pnl)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Trade form state
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
    const check = () => setMobile(window.innerWidth < 900);
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
    if (e && sl && tp) { const r = Math.abs(e - sl), p = Math.abs(tp - e); if (r > 0) { setFRR('1:' + (p / r).toFixed(1)); return; } }
    setFRR('—');
  }, [fEntry, fSl, fTp]);

  // Metrics
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalAport = capital.aportaciones.reduce((s, a) => s + a.amount, 0);
  const balance = capital.initial + totalAport + totalPnl;
  const wins = trades.filter(t => t.res === 'win').length;
  const losses = trades.filter(t => t.res === 'loss').length;
  const wr = trades.length ? Math.round(wins / trades.length * 100) : 0;
  const grossWin = trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const pf = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0;
  const ret = capital.initial > 0 ? totalPnl / capital.initial * 100 : 0;
  const lastUpdated = trades.length > 0 ? new Date(Math.max(...trades.map(t => new Date(t.date).getTime()))).toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const animBalance = useCounter(balance);
  const animPnl = useCounter(totalPnl);

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
      setFRisk(String(trade.risk)); setFLot(String(trade.lot)); setFRes(trade.res);
      setFPnl(String(trade.pnl)); setFRreal(trade.rreal); setFConf(trade.conf);
      setFEmo(trade.emo); setFPlan(trade.plan); setFNotes(trade.notes); setFTvUrl(trade.tvUrl || '');
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

  const navSections = [
    { label: 'Principal', items: [
      { p: 'dashboard' as Page, label: 'Dashboard', icon: '▦' },
      { p: 'historial' as Page, label: 'Historial', icon: '≡' },
      { p: 'calendario' as Page, label: 'Calendario P&L', icon: '▦' },
      { p: 'rendimiento' as Page, label: 'Rendimiento', icon: '↗' },
    ]},
    { label: 'Análisis', items: [
      { p: 'riesgo' as Page, label: 'Riesgo', icon: '⬡' },
      { p: 'psicologia' as Page, label: 'Psicología', icon: '◎' },
      { p: 'diario' as Page, label: 'Diario', icon: '▸' },
      { p: 'capital' as Page, label: 'Capital', icon: '◈' },
    ]},
    { label: 'Herramientas', items: [
      { p: 'calculadora' as Page, label: 'Calculadora', icon: '⊞' },
      { p: 'alertas' as Page, label: 'Alertas', icon: '◌' },
      { p: 'patrimonio' as Page, label: 'Patrimonio', icon: '◆' },
    ]},
    { label: 'Cuenta', items: [
      { p: 'objetivos' as Page, label: 'Objetivos', icon: '◎' },
      { p: 'logros' as Page, label: 'Logros', icon: '★' },
      { p: 'configuracion' as Page, label: 'Configuración', icon: '⚙' },
    ]},
  ];

  const currentPageLabel = navSections.flatMap(s => s.items).find(i => i.p === page)?.label || 'Dashboard';

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: `2px solid ${C.borderB}`, borderTop: `2px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 11, color: C.text2, letterSpacing: '2px' }}>CARGANDO...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const SB_W = 220;

  // ── SIDEBAR ──
  const Sidebar = (
    <div style={{
      width: SB_W, minWidth: SB_W, background: C.bg2,
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', flexDirection: 'column',
      position: mobile ? 'fixed' : 'fixed',
      top: 0, left: mobile ? (sidebarOpen ? 0 : -SB_W) : 0,
      bottom: 0, zIndex: 200, overflowY: 'auto',
      transition: mobile ? 'left 0.25s ease' : 'none',
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
          {/* Wallet icon SVG */}
          <div style={{ width: 32, height: 32, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', letterSpacing: '0.3px' }}>SAVAGE TRADING</div>
            <div style={{ fontSize: 9, color: C.text3, letterSpacing: '1.5px', marginTop: 1 }}>JOURNAL PRO</div>
          </div>
        </div>
      </div>

      {/* Account picker */}
      <div style={{ padding: '12px 12px 0', position: 'relative' }}>
        <button onClick={() => setShowAccountPicker(!showAccountPicker)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
          background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10,
          cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
        }}>
          <div style={{ width: 28, height: 28, background: 'rgba(59,130,246,0.15)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={activeAccount.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: activeAccount.color }}>{activeAccount.name}</div>
            <div style={{ fontSize: 9, color: C.text2, marginTop: 1 }}>{activeAccount.type}</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.text2} strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        {showAccountPicker && (
          <div style={{ position: 'absolute', top: '100%', left: 12, right: 12, background: C.bg3, border: `1px solid ${C.borderB}`, borderRadius: 10, zIndex: 300, marginTop: 4, boxShadow: '0 12px 40px rgba(0,0,0,0.7)', overflow: 'hidden' }}>
            {accounts.map(acc => (
              <div key={acc.id} onClick={() => switchAccount(acc)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: activeAccount.id === acc.id ? 'rgba(59,130,246,0.1)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={acc.color} strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: acc.color, flex: 1 }}>{acc.name}</span>
                {activeAccount.id === acc.id && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={acc.color} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Balance quick */}
      <div style={{ margin: '10px 12px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ fontSize: 9, color: C.text2, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 5 }}>Balance</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.blue }}>{fmtAbs(animBalance)}</div>
        <div style={{ fontSize: 11, color: totalPnl >= 0 ? C.green : C.red, marginTop: 3, fontWeight: 700 }}>
          {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}€ P&L
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '6px 8px', overflowY: 'auto' }}>
        {navSections.map(section => (
          <div key={section.label}>
            <div style={{ fontSize: 9, color: C.text3, textTransform: 'uppercase', letterSpacing: '1.2px', padding: '10px 10px 4px', fontWeight: 700 }}>{section.label}</div>
            {section.items.map(item => (
              <div key={item.p} onClick={() => { setPage(item.p); if (mobile) setSidebarOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 1,
                  background: page === item.p ? 'rgba(59,130,246,0.12)' : 'transparent',
                  borderLeft: `2px solid ${page === item.p ? C.blue : 'transparent'}`,
                  color: page === item.p ? C.blue : C.text2,
                  fontSize: 13, fontWeight: page === item.p ? 600 : 400, transition: 'all 0.12s',
                }}>
                <span style={{ fontSize: 13, opacity: 0.7, width: 16, textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <button onClick={logout} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, color: C.text2, fontSize: 11, cursor: 'pointer', letterSpacing: '0.5px' }}>
          CERRAR SESIÓN
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, fontFamily: "'Inter', system-ui, sans-serif", color: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(59,130,246,0.2);border-radius:2px}
        input,select,textarea{font-family:inherit;} select option{background:#0d1526;}
        input:focus,select:focus,textarea:focus{outline:none;border-color:rgba(59,130,246,0.5)!important;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .pe{animation:fadeUp 0.2s ease;}
        .nav-hover:hover{background:rgba(59,130,246,0.08)!important;color:#fff!important;}
        .row-hover:hover{background:rgba(59,130,246,0.05)!important;}
        .mod-hover:hover{border-color:rgba(59,130,246,0.3)!important;background:rgba(59,130,246,0.06)!important;}
      `}</style>

      {/* Sidebar */}
      {Sidebar}
      {mobile && sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }} />}

      {/* Main */}
      <div style={{ marginLeft: mobile ? 0 : SB_W, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Topbar — estilo TradeX Nova */}
        <div style={{
          background: C.bg2, borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '0 24px', height: 54, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {mobile && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: C.text2, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>☰</button>
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{currentPageLabel}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 7, padding: '5px 12px', fontSize: 11, color: C.text2 }}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
            </div>
            <button onClick={() => openTradeModal()} style={{
              background: C.blue, border: 'none', borderRadius: 8, padding: '7px 16px',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nuevo trade
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>

          {/* ─── DASHBOARD ──────────────────────────────────────────────────── */}
          {page === 'dashboard' && (
            <div className="pe">
              {/* Page title + actions — igual que TradeX Nova */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px' }}>Dashboard</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.blue, border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    Ver informes
                  </button>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 14px', color: C.text2, fontSize: 12, cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </button>
                </div>
              </div>

              {/* ACCOUNT BALANCE CARD — grande, estilo TradeX Nova */}
              <div style={{
                background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 16,
                padding: '24px 28px', marginBottom: 16, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.blue}, transparent)` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, background: 'rgba(59,130,246,0.15)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Account Balance</div>
                    <div style={{ fontSize: 11, color: C.text2 }}>Selected Account · {activeAccount.name}</div>
                  </div>
                  <button onClick={() => loadData()} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.text2, cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                  </button>
                </div>
                <div style={{ fontSize: 44, fontWeight: 900, color: '#fff', letterSpacing: '-1px', marginBottom: 6, lineHeight: 1 }}>
                  {fmtAbs(animBalance)}
                </div>
                <div style={{ fontSize: 12, color: C.text2, marginBottom: 18 }}>Started with {fmtAbs(capital.initial)}</div>
                <div style={{ display: 'flex', gap: 32 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.text2} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      <span style={{ fontSize: 11, color: C.text2 }}>Net P&L</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: totalPnl >= 0 ? C.blue : C.red }}>
                      {totalPnl >= 0 ? '+' : ''}{fmtAbs(Math.abs(animPnl))}
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.text2} strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                      <span style={{ fontSize: 11, color: C.text2 }}>Return</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: ret >= 0 ? C.blue : C.red }}>
                      {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 16 }}>Last updated: {lastUpdated}</div>
              </div>

              {/* Quick Access — 2x2 grid estilo TradeX Nova */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text2, marginBottom: 12, letterSpacing: '0.3px' }}>Quick Access</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Journal', icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                    ), action: () => setPage('historial') },
                    { label: 'Analytics', icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    ), action: () => setPage('rendimiento') },
                    { label: 'NOVA AI', icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                    ), action: () => setPage('psicologia') },
                    { label: 'Settings', icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    ), action: () => setPage('configuracion') },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} className="mod-hover" style={{
                      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                      padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                      color: C.text2, fontFamily: 'inherit', transition: 'all 0.15s', textAlign: 'left' as const,
                    }}>
                      <div style={{ color: C.blue2 }}>{item.icon}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Metrics row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { l: 'Total P&L', v: fmt(totalPnl), c: totalPnl >= 0 ? C.green : C.red },
                  { l: 'Win Rate', v: wr + '%', c: wr >= 50 ? C.green : C.red },
                  { l: 'Profit Factor', v: pf === 999 ? '∞' : pf.toFixed(2), c: '#fff' },
                  { l: 'Total trades', v: String(trades.length), c: C.blue },
                ].map(s => (
                  <div key={s.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px' }}>
                    <div style={{ fontSize: 10, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>{s.l}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Capital curve */}
              <div style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Curva de capital</div>
                    <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>Evolución histórica</div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: totalPnl >= 0 ? C.green : C.red }}>{fmt(totalPnl)}</span>
                </div>
                <div style={{ height: 170 }}>
                  {capCurve.data.length > 1
                    ? <Line data={{ labels: capCurve.labels, datasets: [{ data: capCurve.data, borderColor: C.blue, backgroundColor: 'rgba(59,130,246,0.07)', borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, fill: true, tension: 0.08 }] }}
                        options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: C.bg3, titleColor: C.blue2, bodyColor: '#fff', borderColor: C.borderB, borderWidth: 1 } }, scales: { x: { ticks: { color: C.text3, font: { size: 9 }, maxTicksLimit: 6 }, grid: { color: 'rgba(255,255,255,0.03)' } }, y: { ticks: { color: C.text3, font: { size: 9 }, callback: (v: unknown) => '€' + String(v) }, grid: { color: 'rgba(255,255,255,0.03)' } } } }} />
                    : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text2, fontSize: 12 }}>Añade tu primer trade</div>
                  }
                </div>
              </div>

              {/* Recent trades */}
              <div style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Trades recientes</div>
                  <button onClick={() => setPage('historial')} style={{ fontSize: 10, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.3px' }}>VER TODOS →</button>
                </div>
                {trades.length === 0
                  ? <div style={{ textAlign: 'center', padding: '32px 0', color: C.text2, fontSize: 12 }}>Sin trades aún</div>
                  : [...trades].reverse().slice(0, 5).map(t => (
                    <div key={t.id} className="row-hover" onClick={() => setModalTrade(t)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.1s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.res === 'win' ? C.green : t.res === 'loss' ? C.red : C.text2 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{t.pair} <span style={{ fontSize: 11, color: t.dir === 'buy' ? C.green : C.red }}>{t.dir === 'buy' ? '▲' : '▼'}</span></div>
                          <div style={{ fontSize: 10, color: C.text2 }}>{t.date} · {t.tf}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: t.pnl > 0 ? C.green : t.pnl < 0 ? C.red : C.text2 }}>{fmt(t.pnl)}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* ─── HISTORIAL ──────────────────────────────────────────────────── */}
          {page === 'historial' && (
            <div className="pe">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>Historial de trades</div>
                  <div style={{ fontSize: 11, color: C.text2, marginTop: 3 }}>{trades.length} operaciones registradas</div>
                </div>
                <button onClick={() => openTradeModal()} style={{ background: C.blue, border: 'none', borderRadius: 9, padding: '9px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Añadir trade
                </button>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: 'rgba(59,130,246,0.05)' }}>
                      {['Fecha', 'Par', 'Dir.', 'Resultado', 'Entrada', 'SL', 'TP', 'P&L', '% Bal', 'TV', 'Acciones'].map(h => (
                        <th key={h} style={{ fontSize: 9, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.8px', padding: '11px 14px', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: C.text2, fontSize: 12 }}>Sin trades. Añade tu primera operación.</td></tr>}
                    {[...trades].reverse().map(t => {
                      const pct = capital.initial > 0 ? (t.pnl / capital.initial * 100).toFixed(2) : '0.00';
                      return (
                        <tr key={t.id} className="row-hover" style={{ cursor: 'pointer', transition: 'background 0.1s' }}>
                          <td style={{ padding: '11px 14px', fontSize: 12, color: C.text2, whiteSpace: 'nowrap' }}>{t.date}</td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ background: 'rgba(59,130,246,0.12)', color: C.blue2, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{t.pair}</span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ color: t.dir === 'buy' ? C.green : C.red, fontSize: 13, fontWeight: 800 }}>{t.dir === 'buy' ? '▲' : '▼'}</span>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <Badge text={t.res.toUpperCase()} color={t.res === 'win' ? C.green : t.res === 'loss' ? C.red : C.text2} bg={t.res === 'win' ? 'rgba(34,197,94,0.12)' : t.res === 'loss' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)'} />
                          </td>
                          <td style={{ padding: '11px 14px', fontSize: 12, color: '#fff' }}>{t.entry || '—'}</td>
                          <td style={{ padding: '11px 14px', fontSize: 12, color: C.red }}>{t.sl || '—'}</td>
                          <td style={{ padding: '11px 14px', fontSize: 12, color: C.green }}>{t.tp || '—'}</td>
                          <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 900, color: t.pnl >= 0 ? C.green : C.red, whiteSpace: 'nowrap' }}>{fmt(t.pnl)}</td>
                          <td style={{ padding: '11px 14px', fontSize: 12, color: t.pnl >= 0 ? C.green : C.red, whiteSpace: 'nowrap' }}>{t.pnl >= 0 ? '+' : ''}{pct}%</td>
                          <td style={{ padding: '11px 14px' }}>
                            {t.tvUrl
                              ? <a href={t.tvUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: C.blue, fontSize: 11, textDecoration: 'none', fontWeight: 600 }}>↗ Ver</a>
                              : <span style={{ color: C.text3, fontSize: 11 }}>—</span>
                            }
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={e => { e.stopPropagation(); openTradeModal(t); }} style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: C.blue, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                ✎
                              </button>
                              <button onClick={e => { e.stopPropagation(); deleteTrade(t.id); }} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: C.red, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                ✕
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

          {page === 'calendario' && <div className="pe"><CalendarView trades={trades} calMonth={calMonth} setCalMonth={setCalMonth} /></div>}
          {page === 'rendimiento' && <div className="pe"><RendimientoView trades={trades} /></div>}
          {page === 'psicologia' && <div className="pe"><PsicologiaView /></div>}

          {page === 'riesgo' && (
            <div className="pe">
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>Control de Riesgo</div>
              <ObjetivosRiesgo trades={trades} />
            </div>
          )}
          {page === 'diario' && (
            <div className="pe">
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>Diario & Semáforo</div>
              <DiarioClient />
            </div>
          )}
          {page === 'calculadora' && (
            <div className="pe">
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>Calculadora de posición</div>
              <CalculadoraClient capital={balance} />
            </div>
          )}
          {page === 'alertas' && (
            <div className="pe">
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>Alertas inteligentes</div>
              <AlertasClient trades={trades} />
            </div>
          )}
          {page === 'patrimonio' && (
            <div className="pe">
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>Patrimonio & Inversiones</div>
              <PatrimonioClient tradingBalance={balance} />
            </div>
          )}
          {page === 'logros' && (
            <div className="pe">
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>Logros & Diplomas</div>
              <LogrosClient trades={trades} totalPnl={totalPnl} />
            </div>
          )}
          {page === 'objetivos' && (
            <div className="pe">
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 16 }}>Objetivos</div>
              <ObjetivosRiesgo trades={trades} />
            </div>
          )}

          {page === 'capital' && (
            <div className="pe">
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>Capital & aportaciones</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, padding: 22 }}>
                  <div style={SEC}>Capital inicial</div>
                  <label style={LBL}>Importe</label>
                  <input type="number" value={capInitial} onChange={e => setCapInitial(e.target.value)} placeholder="200.00" style={{ ...INP, marginBottom: 14 }} />
                  <button onClick={setIC} style={{ width: '100%', padding: 11, background: C.blue, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Guardar capital</button>
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, padding: 22 }}>
                  <div style={SEC}>Nueva aportación</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div><label style={LBL}>Fecha</label><input type="date" value={apDate} onChange={e => setApDate(e.target.value)} style={INP} /></div>
                    <div><label style={LBL}>Importe</label><input type="number" value={apAmount} onChange={e => setApAmount(e.target.value)} style={INP} /></div>
                  </div>
                  <label style={LBL}>Descripción</label>
                  <input type="text" value={apDesc} onChange={e => setApDesc(e.target.value)} placeholder="Aportación mensual" style={{ ...INP, marginBottom: 14 }} />
                  <button onClick={addAp} style={{ width: '100%', padding: 11, background: C.blue, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Añadir</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                {[{ l: 'Capital inicial', v: fmtAbs(capital.initial), c: C.blue }, { l: 'Aportado', v: fmtAbs(totalAport), c: C.amber }, { l: 'P&L total', v: fmt(totalPnl), c: totalPnl >= 0 ? C.green : C.red }, { l: 'Balance', v: fmtAbs(balance), c: '#fff' }].map(s => (
                  <div key={s.l} style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 12, padding: '16px 18px' }}>
                    <div style={{ fontSize: 10, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>{s.l}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>
              {capital.aportaciones.length > 0 && (
                <div style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, fontWeight: 700 }}>Historial de aportaciones</div>
                  {capital.aportaciones.map(a => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div><div style={{ fontSize: 13, fontWeight: 600 }}>{a.desc}</div><div style={{ fontSize: 10, color: C.text2 }}>{a.date}</div></div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: C.green, fontSize: 14 }}>+{fmtAbs(a.amount)}</span>
                        <button onClick={() => delAp(a.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: C.red, padding: '3px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {page === 'configuracion' && (
            <div className="pe">
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 20 }}>Configuración</div>
              <div style={{ background: C.card, border: `1px solid ${C.borderB}`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
                <div style={SEC}>Cuentas activas</div>
                {accounts.map(acc => (
                  <div key={acc.id} onClick={() => switchAccount(acc)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, cursor: 'pointer', marginBottom: 8, background: activeAccount.id === acc.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${activeAccount.id === acc.id ? C.borderB : C.border}` }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={acc.color} strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: acc.color }}>{acc.name}</div><div style={{ fontSize: 10, color: C.text2 }}>{acc.type}</div></div>
                    {activeAccount.id === acc.id && <Badge text="Activa" color={C.blue} bg="rgba(59,130,246,0.12)" />}
                  </div>
                ))}
              </div>
              <button onClick={logout} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '11px 22px', color: C.red, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cerrar sesión
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ─── MODALS ─────────────────────────────────────────────────────────── */}
      {/* Trade detail */}
      {modalTrade && (
        <Modal title={`${modalTrade.pair} · ${modalTrade.date}`} onClose={() => setModalTrade(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              ['Dirección', modalTrade.dir === 'buy' ? '▲ LONG' : '▼ SHORT', modalTrade.dir === 'buy' ? C.green : C.red],
              ['Resultado', modalTrade.res.toUpperCase(), modalTrade.res === 'win' ? C.green : modalTrade.res === 'loss' ? C.red : C.text2],
              ['P&L', fmt(modalTrade.pnl), modalTrade.pnl >= 0 ? C.green : C.red],
              ['R:R', modalTrade.rr, '#fff'],
              ['Entrada', String(modalTrade.entry), '#fff'],
              ['SL / TP', `${modalTrade.sl} / ${modalTrade.tp}`, '#fff'],
            ].map(([k, v, col]) => (
              <div key={k as string} style={{ background: '#080d1a', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 9, color: C.text2, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: col as string }}>{v}</div>
              </div>
            ))}
          </div>
          {modalTrade.tvUrl && (
            <a href={modalTrade.tvUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: C.blue, fontSize: 12, textDecoration: 'none', background: 'rgba(59,130,246,0.1)', border: `1px solid ${C.borderB}`, borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontWeight: 600 }}>
              ↗ Ver en TradingView
            </a>
          )}
          {modalTrade.notes && <div style={{ background: '#080d1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12, fontSize: 12, color: C.text2, marginBottom: 16 }}>{modalTrade.notes}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setModalTrade(null); openTradeModal(modalTrade); }} style={{ flex: 1, background: 'rgba(59,130,246,0.1)', border: `1px solid ${C.borderB}`, borderRadius: 8, padding: '9px', color: C.blue, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Editar</button>
            <button onClick={() => deleteTrade(modalTrade.id)} style={{ flex: 1, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '9px', color: C.red, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Eliminar</button>
          </div>
        </Modal>
      )}

      {/* Trade form */}
      {showTradeModal && (
        <Modal title={editingTrade ? 'Editar trade' : 'Nuevo trade'} onClose={() => setShowTradeModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div><label style={LBL}>Fecha</label><input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={INP} /></div>
            <div><label style={LBL}>Hora</label><input type="time" value={fTime} onChange={e => setFTime(e.target.value)} style={INP} /></div>
            <div><label style={LBL}>Par</label>
              <select value={fPair} onChange={e => setFPair(e.target.value)} style={{ ...INP, background: '#080d1a' }}>
                <option>XAUUSD</option><option>NAS100</option><option>EURUSD</option><option>BTCUSD</option><option>US30</option><option>Otro</option>
              </select>
            </div>
            <div><label style={LBL}>Timeframe</label>
              <select value={fTf} onChange={e => setFTf(e.target.value)} style={{ ...INP, background: '#080d1a' }}>
                <option>1M</option><option>5M</option><option>15M</option><option>1H</option><option>4H</option><option>1D</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={LBL}>Dirección</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Tog label="▲ LONG" active={fDir === 'buy'} color={C.green} bg="rgba(34,197,94,0.1)" onClick={() => setFDir('buy')} />
              <Tog label="▼ SHORT" active={fDir === 'sell'} color={C.red} bg="rgba(239,68,68,0.1)" onClick={() => setFDir('sell')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div><label style={LBL}>Entrada</label><input type="number" value={fEntry} onChange={e => setFEntry(e.target.value)} style={INP} /></div>
            <div><label style={LBL}>Stop Loss</label><input type="number" value={fSl} onChange={e => setFSl(e.target.value)} style={INP} /></div>
            <div><label style={LBL}>Take Profit</label><input type="number" value={fTp} onChange={e => setFTp(e.target.value)} style={INP} /></div>
            <div><label style={LBL}>Riesgo €</label><input type="number" value={fRisk} onChange={e => setFRisk(e.target.value)} style={INP} /></div>
            <div><label style={LBL}>Lote</label><input type="number" value={fLot} onChange={e => setFLot(e.target.value)} step="0.01" style={INP} /></div>
            <div><label style={LBL}>R:R</label><div style={{ ...INP, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: C.blue, fontSize: 13 }}>{fRR}</div></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={LBL}>Resultado</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <Tog label="✓ WIN" active={fRes === 'win'} color={C.green} bg="rgba(34,197,94,0.1)" onClick={() => setFRes('win')} />
              <Tog label="✕ LOSS" active={fRes === 'loss'} color={C.red} bg="rgba(239,68,68,0.1)" onClick={() => setFRes('loss')} />
              <Tog label="— BE" active={fRes === 'be'} color={C.text2} bg="rgba(255,255,255,0.06)" onClick={() => setFRes('be')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div><label style={LBL}>P&L €</label><input type="number" value={fPnl} onChange={e => setFPnl(e.target.value)} style={INP} /></div>
            <div><label style={LBL}>R obtenido</label><input type="text" value={fRreal} onChange={e => setFRreal(e.target.value)} placeholder="+2R" style={INP} /></div>
          </div>
          <div style={{ marginBottom: 12 }}><label style={LBL}>Link foto TradingView</label><input type="url" value={fTvUrl} onChange={e => setFTvUrl(e.target.value)} placeholder="https://www.tradingview.com/..." style={INP} /></div>
          <div style={{ marginBottom: 14 }}><label style={LBL}>Notas</label><textarea value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Setup, confluencias, aprendizajes..." style={{ ...INP, minHeight: 60, resize: 'vertical' } as React.CSSProperties} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowTradeModal(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 18px', color: C.text2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={saveTrade} disabled={saving} style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '9px 24px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Guardando...' : 'Guardar trade'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
