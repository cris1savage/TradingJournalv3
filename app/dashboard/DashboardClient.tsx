'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

type Trade = {
  id: number; date: string; time: string; pair: string; tf: string;
  dir: string; res: string; plan: string | null;
  entry: number; sl: number; tp: number; risk: number; lot: number;
  rr: string; pnl: number; rreal: string; conf: string[]; emo: string; notes: string;
};


type EconEvent = {
  title: string; date: string; currency: string;
  impact: string; country: string;
  forecast: string; previous: string; actual: string | null;
};

type Capital = {
  initial: number;
  aportaciones: { id: number; date: string; amount: number; desc: string }[];
};

type Page = 'dashboard' | 'nuevo' | 'historial' | 'capital' | 'noticias';

const fmt = (n: number, sign = true) => (sign && n > 0 ? '+' : '') + n.toFixed(2) + '€';
const fmtAbs = (n: number) => n.toFixed(2) + '€';

// Animated counter hook
function useCounter(target: number, duration = 1000) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    const startTime = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(start + diff * ease);
      if (p < 1) requestAnimationFrame(tick);
      else prev.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

export default function DashboardClient() {
  const [page, setPage] = useState<Page>('dashboard');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [capital, setCapital] = useState<Capital>({ initial: 0, aportaciones: [] });
  const [loading, setLoading] = useState(true);
  const [histFilter, setHistFilter] = useState('all');
  const [modalTrade, setModalTrade] = useState<Trade | null>(null);
  const [calMonth, setCalMonth] = useState(new Date());

  const [econEvents, setEconEvents] = useState<EconEvent[]>([]);
  const [econLoading, setEconLoading] = useState(false);
  const [econUpdated, setEconUpdated] = useState('');
  const [emo, setEmo] = useState('');

  // Form
  const [fDate, setFDate] = useState('');
  const [fTime, setFTime] = useState('');
  const [fPair, setFPair] = useState('XAU/USD');
  const [fTf, setFTf] = useState('15M');
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
  const [saving, setSaving] = useState(false);

  // Capital form
  const [capInitial, setCapInitial] = useState('');
  const [apDate, setApDate] = useState('');
  const [apAmount, setApAmount] = useState('');
  const [apDesc, setApDesc] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tRes, cRes] = await Promise.all([fetch('/api/trades'), fetch('/api/capital')]);
    if (tRes.ok) setTrades(await tRes.json());
    if (cRes.ok) { const c = await cRes.json(); setCapital(c); setCapInitial(c.initial?.toString() || ''); }
    setLoading(false);
  }, []);


  const loadEcon = useCallback(async () => {
    setEconLoading(true);
    try {
      const res = await fetch('/api/calendar');
      if (res.ok) {
        const data = await res.json();
        setEconEvents(data.events || []);
        setEconUpdated(data.updated || '');
      }
    } catch {}
    setEconLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    loadEcon();
    const now = new Date();
    setFDate(now.toISOString().split('T')[0]);
    setFTime(now.toTimeString().slice(0, 5));
    setApDate(now.toISOString().split('T')[0]);
  }, [loadData]);

  useEffect(() => {
    const e = parseFloat(fEntry), sl = parseFloat(fSl), tp = parseFloat(fTp);
    if (e && sl && tp) { const r = Math.abs(e - sl), p = Math.abs(tp - e); if (r > 0) { setFRR('1:' + (p / r).toFixed(1)); return; } }
    setFRR('—');
  }, [fEntry, fSl, fTp]);

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalAport = capital.aportaciones.reduce((s, a) => s + a.amount, 0);
  const balance = capital.initial + totalAport + totalPnl;
  const wins = trades.filter(t => t.res === 'win').length;
  const losses = trades.filter(t => t.res === 'loss').length;
  const bes = trades.filter(t => t.res === 'be').length;
  const wr = trades.length ? Math.round(wins / trades.length * 100) : 0;

  const animBalance = useCounter(balance);
  const animPnl = useCounter(totalPnl);
  const animWr = useCounter(wr);
  const animTrades = useCounter(trades.length);

  async function saveTrade() {
    if (!fDate || !fPair || !fDir || !fRes) { alert('Rellena fecha, activo, dirección y resultado.'); return; }
    const pnl = parseFloat(fPnl);
    if (isNaN(pnl)) { alert('Introduce el P&L real.'); return; }
    setSaving(true);
    const trade: Trade = {
      id: Date.now(), date: fDate, time: fTime, pair: fPair, tf: fTf,
      dir: fDir, res: fRes, plan: fPlan,
      entry: parseFloat(fEntry) || 0, sl: parseFloat(fSl) || 0,
      tp: parseFloat(fTp) || 0, risk: parseFloat(fRisk) || 0,
      lot: parseFloat(fLot) || 0, rr: fRR, pnl, rreal: fRreal,
      conf: fConf, emo: fEmo, notes: fNotes,
    };
    await fetch('/api/trades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trade) });
    await loadData(); resetForm(); setSaving(false); setPage('dashboard');
  }

  function resetForm() {
    const now = new Date();
    setFDate(now.toISOString().split('T')[0]); setFTime(now.toTimeString().slice(0, 5));
    setFPair('XAU/USD'); setFTf('15M'); setFDir(null); setFRes(null); setFPlan(null);
    setFEntry(''); setFSl(''); setFTp(''); setFRisk(''); setFLot(''); setFRR('—');
    setFPnl(''); setFRreal(''); setFConf([]); setFEmo(''); setFNotes('');
  }

  async function deleteTrade(id: number) {
    if (!confirm('¿Eliminar?')) return;
    await fetch('/api/trades', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setModalTrade(null); await loadData();
  }

  async function setInitialCapital() {
    const val = parseFloat(capInitial);
    if (isNaN(val) || val <= 0) { alert('Capital inválido.'); return; }
    await fetch('/api/capital', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'setInitial', amount: val }) });
    await loadData(); alert('✓ Capital guardado');
  }

  async function addAportacion() {
    const amount = parseFloat(apAmount);
    if (!apDate || isNaN(amount) || amount <= 0) { alert('Rellena fecha e importe.'); return; }
    await fetch('/api/capital', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addAport', date: apDate, amount, desc: apDesc || 'Aportación' }) });
    setApAmount(''); setApDesc(''); await loadData();
  }

  async function deleteAport(id: number) {
    await fetch('/api/capital', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteAport', id }) });
    await loadData();
  }

  async function logout() { await fetch('/api/auth', { method: 'DELETE' }); window.location.href = '/login'; }
  function toggleConf(c: string) { setFConf(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]); }

  // Calendar
  const calDays = () => {
    const year = calMonth.getFullYear(), month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const byDay: Record<string, number> = {};
    trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + t.pnl; });
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, pnl: byDay[key] ?? null });
    }
    return cells;
  };

  // Chart data
  const capitalCurve = () => {
    let running = capital.initial;
    const events: { date: string; val: number }[] = [];
    capital.aportaciones.forEach(a => events.push({ date: a.date, val: a.amount }));
    trades.forEach(t => events.push({ date: t.date + ' ' + t.time, val: t.pnl }));
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const labels = ['Inicio'], data = [capital.initial];
    events.forEach(e => { running += e.val; labels.push(e.date.split(' ')[0]); data.push(parseFloat(running.toFixed(2))); });
    return { labels, data };
  };

  const monthly = trades.reduce((acc, t) => { const m = t.date.slice(0, 7); acc[m] = (acc[m] || 0) + t.pnl; return acc; }, {} as Record<string, number>);
  const monthLabels = Object.keys(monthly).sort();
  const monthData = monthLabels.map(m => parseFloat(monthly[m].toFixed(2)));
  const curve = capitalCurve();
  const last20 = trades.slice(-20);
  const filteredTrades = histFilter === 'all' ? [...trades].reverse() : [...trades].filter(t => t.res === histFilter || t.pair === histFilter).reverse();

  const days = Object.entries(trades.reduce((acc, t) => { acc[t.date] = (acc[t.date] || 0) + t.pnl; return acc; }, {} as Record<string, number>));
  const bestDay = days.length ? days.reduce((b, d) => (d[1] as number) > (b[1] as number) ? d : b, ['—', -Infinity]) : null;
  const worstDay = days.length ? days.reduce((w, d) => (d[1] as number) < (w[1] as number) ? d : w, ['—', Infinity]) : null;

  const chartOpts = (yLabel = '€'): object => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0d1b3e', titleColor: '#93c5fd', bodyColor: '#e2e8f0', borderColor: '#1e3a6e', borderWidth: 1 } },
    scales: {
      x: { ticks: { color: '#4a6fa5', font: { family: 'monospace', size: 9 }, maxTicksLimit: 7 }, grid: { color: '#0d1b3e' } },
      y: { ticks: { color: '#4a6fa5', font: { family: 'monospace', size: 9 }, callback: (v: number | string) => v + yLabel }, grid: { color: '#0d1b3e' } }
    }
  });

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Buenos días' : now.getHours() < 20 ? 'Buenas tardes' : 'Buenas noches';
  const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#060d1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '2px solid #1e3a6e', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: '#4a6fa5', fontFamily: 'monospace', fontSize: 12 }}>Cargando journal...</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#060d1f', fontFamily: "'Inter', sans-serif", color: '#e2e8f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #060d1f; } ::-webkit-scrollbar-thumb { background: #1e3a6e; border-radius: 2px; }
        input, select, textarea { font-family: inherit; }
        select option { background: #0d1b3e; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
        .page-enter { animation: fadeIn 0.3s ease; }
        .stat-card { transition: transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(59,130,246,0.15); }
        .nav-item { transition: all 0.15s; }
        .nav-item:hover { background: #0d1b3e !important; color: #93c5fd !important; }
        .trade-row:hover { background: rgba(59,130,246,0.05) !important; }
        .btn-primary { transition: all 0.15s; }
        .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .cal-day:hover { border-color: #3b82f6 !important; }
        input:focus, select:focus, textarea:focus { border-color: #3b82f6 !important; outline: none; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
      `}</style>

      {/* SIDEBAR */}
      <div className="sidebar-desktop" style={{ width: 220, background: '#07102a', borderRight: '1px solid #0d1b3e', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100 }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #0d1b3e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📈</div>
            <div>
              <div style={{ fontFamily: 'Space Mono', fontSize: 11, fontWeight: 700, color: '#93c5fd', letterSpacing: '0.05em' }}>TRADE LOG</div>
              <div style={{ fontSize: 9, color: '#4a6fa5', letterSpacing: '0.1em' }}>JOURNAL PRO</div>
            </div>
          </div>
        </div>

        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {([['dashboard', '◈', 'Dashboard'], ['nuevo', '＋', 'Nuevo Trade'], ['historial', '≡', 'Historial'], ['capital', '◎', 'Capital']] as [Page, string, string][]).map(([p, icon, label]) => (
            <div key={p} className="nav-item" onClick={() => setPage(p)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', color: page === p ? '#93c5fd' : '#4a6fa5', background: page === p ? '#0d1b3e' : 'transparent', borderLeft: `2px solid ${page === p ? '#3b82f6' : 'transparent'}`, marginBottom: 2, fontSize: 13, fontWeight: page === p ? 600 : 400 }}>
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 14px', borderTop: '1px solid #0d1b3e' }}>
          <div style={{ background: 'linear-gradient(135deg, #0d1b3e, #0f2554)', border: '1px solid #1e3a6e', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
            <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#4a6fa5', letterSpacing: '0.15em', marginBottom: 4 }}>BALANCE</div>
            <div style={{ fontFamily: 'Space Mono', fontSize: 18, fontWeight: 700, color: balance >= capital.initial ? '#34d399' : '#f87171' }}>{fmtAbs(animBalance)}</div>
            <div style={{ fontSize: 10, color: totalPnl >= 0 ? '#34d399' : '#f87171', marginTop: 2 }}>{fmt(totalPnl)} P&L</div>
          </div>
          <button onClick={logout} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid #1e3a6e', borderRadius: 7, color: '#4a6fa5', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cerrar sesión</button>
        </div>
      </div>

      {/* MAIN */}
      <div className="main-mobile" style={{ marginLeft: 220, flex: 1, padding: '24px', minHeight: '100vh' }}>

        {/* DASHBOARD */}
        {page === 'dashboard' && (
          <div className="page-enter">
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#4a6fa5', fontFamily: 'Space Mono', letterSpacing: '0.1em', marginBottom: 4 }}>{dateStr.toUpperCase()}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#e2e8f0' }}>{greeting}, <span style={{ color: '#3b82f6' }}>Cristian</span></div>
                </div>
                <button onClick={() => setPage('nuevo')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ＋ Nuevo Trade
                </button>
              </div>
            </div>

            {/* STAT CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'BALANCE', value: fmtAbs(animBalance), sub: 'Capital total', color: '#3b82f6', icon: '◎', positive: balance >= capital.initial },
                { label: 'P&L TOTAL', value: (animPnl >= 0 ? '+' : '') + animPnl.toFixed(2) + '€', sub: `${Math.round(animTrades)} operaciones`, color: totalPnl >= 0 ? '#34d399' : '#f87171', icon: '↗', positive: totalPnl >= 0 },
                { label: 'WIN RATE', value: Math.round(animWr) + '%', sub: `${wins}W · ${losses}L · ${bes}BE`, color: '#a78bfa', icon: '◈', positive: wr >= 50 },
                { label: 'TRADES', value: String(Math.round(animTrades)), sub: `${Object.keys(trades.reduce((a,t)=>{a[t.date]=1;return a},{}as Record<string,number>)).length} días operados`, color: '#f59e0b', icon: '≡', positive: true },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ background: 'linear-gradient(135deg, #07102a, #0a1628)', border: `1px solid #0d1b3e`, borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}88, ${s.color})` }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5' }}>{s.label}</div>
                    <div style={{ fontSize: 16, color: s.color, opacity: 0.6 }}>{s.icon}</div>
                  </div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 22, fontWeight: 700, color: s.positive ? s.color : '#f87171', marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#4a6fa5' }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* CHARTS ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ background: '#07102a', border: '1px solid #0d1b3e', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Curva de Capital</div>
                    <div style={{ fontSize: 11, color: '#4a6fa5', marginTop: 2 }}>Evolución del balance con aportaciones</div>
                  </div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 11, color: balance >= capital.initial ? '#34d399' : '#f87171' }}>{fmt(balance - capital.initial)}</div>
                </div>
                <div style={{ height: 180 }}>
                  {curve.data.length > 1 ? (
                    <Line data={{ labels: curve.labels, datasets: [{ data: curve.data, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', borderWidth: 2, pointRadius: curve.data.length < 15 ? 3 : 0, pointBackgroundColor: '#3b82f6', fill: true, tension: 0.4 }] }} options={chartOpts() as object} />
                  ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6fa5', fontSize: 12 }}>Sin datos aún — añade tu primer trade</div>}
                </div>
              </div>
              <div style={{ background: '#07102a', border: '1px solid #0d1b3e', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Distribución</div>
                <div style={{ fontSize: 11, color: '#4a6fa5', marginBottom: 14 }}>Wins / Losses / Breakeven</div>
                <div style={{ height: 180 }}>
                  {trades.length > 0 ? (
                    <Doughnut data={{ labels: ['Wins', 'Losses', 'BE'], datasets: [{ data: [wins, losses, bes], backgroundColor: ['rgba(52,211,153,0.85)', 'rgba(248,113,113,0.85)', 'rgba(167,139,250,0.6)'], borderWidth: 0, hoverOffset: 6 }] }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#93c5fd', font: { size: 10 }, padding: 12, boxWidth: 10 } }, tooltip: { backgroundColor: '#0d1b3e', titleColor: '#93c5fd', bodyColor: '#e2e8f0' } } }} />
                  ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6fa5', fontSize: 12 }}>Sin datos aún</div>}
                </div>
              </div>
            </div>

            {/* CALENDAR + TRADES */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {/* CALENDAR */}
              <div style={{ background: '#07102a', border: '1px solid #0d1b3e', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Calendario P&L</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))} style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 5, color: '#93c5fd', width: 24, height: 24, cursor: 'pointer', fontSize: 12 }}>‹</button>
                    <span style={{ fontFamily: 'Space Mono', fontSize: 11, color: '#93c5fd', minWidth: 100, textAlign: 'center' }}>
                      {calMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
                    </span>
                    <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))} style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 5, color: '#93c5fd', width: 24, height: 24, cursor: 'pointer', fontSize: 12 }}>›</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
                  {['L','M','X','J','V','S','D'].map(d => <div key={d} style={{ textAlign: 'center', fontFamily: 'Space Mono', fontSize: 8, color: '#4a6fa5', padding: '4px 0' }}>{d}</div>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                  {calDays().map((cell, i) => (
                    <div key={i} className="cal-day" style={{
                      aspectRatio: '1', borderRadius: 5, border: `1px solid ${cell?.pnl != null ? (cell.pnl >= 0 ? '#134e3a' : '#4c1414') : '#0d1b3e'}`,
                      background: cell?.pnl != null ? (cell.pnl >= 0 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)') : 'transparent',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: cell ? 'default' : 'default', transition: 'border-color 0.15s'
                    }}>
                      {cell && <>
                        <div style={{ fontSize: 9, color: cell.pnl != null ? '#93c5fd' : '#4a6fa5', fontWeight: 600 }}>{cell.day}</div>
                        {cell.pnl != null && <div style={{ fontSize: 7, fontFamily: 'monospace', color: cell.pnl >= 0 ? '#34d399' : '#f87171', marginTop: 1, fontWeight: 700 }}>{cell.pnl >= 0 ? '+' : ''}{cell.pnl.toFixed(0)}</div>}
                      </>}
                    </div>
                  ))}
                </div>
              </div>

              {/* RECENT TRADES */}
              <div style={{ background: '#07102a', border: '1px solid #0d1b3e', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Trades Recientes</div>
                  <button onClick={() => setPage('historial')} style={{ fontSize: 11, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>Ver todos →</button>
                </div>
                {trades.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#4a6fa5', fontSize: 12 }}>Sin trades aún</div>
                ) : [...trades].reverse().slice(0, 7).map(t => (
                  <div key={t.id} onClick={() => setModalTrade(t)} className="trade-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 7, cursor: 'pointer', marginBottom: 4, border: '1px solid transparent', transition: 'all 0.12s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.res === 'win' ? '#34d399' : t.res === 'loss' ? '#f87171' : '#a78bfa', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{t.pair} <span style={{ fontSize: 10, color: t.dir === 'buy' ? '#34d399' : '#f87171', fontFamily: 'monospace' }}>{t.dir === 'buy' ? '▲' : '▼'}</span></div>
                        <div style={{ fontSize: 10, color: '#4a6fa5' }}>{t.date} · {t.tf}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 13, fontWeight: 700, color: t.pnl > 0 ? '#34d399' : t.pnl < 0 ? '#f87171' : '#a78bfa' }}>{fmt(t.pnl)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTTOM ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#07102a', border: '1px solid #0d1b3e', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>P&L Mensual</div>
                <div style={{ height: 140 }}>
                  {monthLabels.length > 0 ? (
                    <Bar data={{ labels: monthLabels, datasets: [{ data: monthData, backgroundColor: monthData.map(v => v >= 0 ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)'), borderRadius: 4 }] }} options={chartOpts() as object} />
                  ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6fa5', fontSize: 12 }}>Sin datos</div>}
                </div>
              </div>
              <div style={{ background: '#07102a', border: '1px solid #0d1b3e', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Estado Emocional Hoy</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {['😐 Neutro', '😌 Tranquilo', '💪 Confiado', '😰 Ansioso', '😤 Frustrado', '🎲 FOMO', '😡 Revenge'].map(e => (
                    <button key={e} onClick={() => setEmo(emo === e ? '' : e)} style={{ padding: '6px 12px', borderRadius: 20, border: `1px solid ${emo === e ? '#3b82f6' : '#1e3a6e'}`, background: emo === e ? 'rgba(59,130,246,0.15)' : 'transparent', color: emo === e ? '#93c5fd' : '#4a6fa5', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>{e}</button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  <div style={{ background: '#0d1b3e', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#4a6fa5', marginBottom: 4 }}>MEJOR DÍA</div>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 14, fontWeight: 700, color: '#34d399' }}>{bestDay ? fmt(bestDay[1] as number) : '—'}</div>
                    <div style={{ fontSize: 10, color: '#4a6fa5', marginTop: 2 }}>{bestDay?.[0] || '—'}</div>
                  </div>
                  <div style={{ background: '#0d1b3e', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#4a6fa5', marginBottom: 4 }}>PEOR DÍA</div>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 14, fontWeight: 700, color: '#f87171' }}>{worstDay ? fmt(worstDay[1] as number) : '—'}</div>
                    <div style={{ fontSize: 10, color: '#4a6fa5', marginTop: 2 }}>{worstDay?.[0] || '—'}</div>
                  </div>
                </div>
              </div>

            {/* ECON WIDGET */}
            <div style={{ background: '#07102a', border: '1px solid #0d1b3e', borderRadius: 12, padding: 18, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>📰 Próximos eventos económicos</div>
                  <div style={{ fontSize: 11, color: '#4a6fa5', marginTop: 2 }}>USD · EUR · GBP — Alto y medio impacto</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={loadEcon} style={{ fontSize: 11, color: '#3b82f6', background: 'none', border: '1px solid #1e3a6e', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>↻ Actualizar</button>
                  <button onClick={() => setPage('noticias')} style={{ fontSize: 11, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>Ver todo →</button>
                </div>
              </div>
              {econLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#4a6fa5', fontSize: 12 }}>Cargando eventos...</div>
              ) : econEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#4a6fa5', fontSize: 12 }}>Sin eventos disponibles</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {econEvents.slice(0, 6).map((ev, i) => {
                    const d = new Date(ev.date);
                    const isHigh = ev.impact === 'High';
                    const isPast = d < new Date();
                    return (
                      <div key={i} style={{ background: '#0d1b3e', borderRadius: 8, padding: '10px 12px', border: `1px solid ${isHigh ? '#4c1414' : '#1e3a6e'}`, opacity: isPast ? 0.6 : 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 9, fontFamily: 'Space Mono', padding: '2px 6px', borderRadius: 4, background: ev.currency === 'USD' ? 'rgba(59,130,246,0.2)' : ev.currency === 'EUR' ? 'rgba(52,211,153,0.2)' : 'rgba(167,139,250,0.2)', color: ev.currency === 'USD' ? '#93c5fd' : ev.currency === 'EUR' ? '#34d399' : '#a78bfa' }}>{ev.currency}</span>
                          <span style={{ fontSize: 9, color: isHigh ? '#f87171' : '#f59e0b', fontWeight: 600 }}>{isHigh ? '🔴 ALTO' : '🟡 MEDIO'}</span>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0', marginBottom: 4, lineHeight: 1.3 }}>{ev.title}</div>
                        <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#4a6fa5' }}>{d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · {d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                        {ev.actual && <div style={{ fontSize: 10, color: '#34d399', marginTop: 4, fontFamily: 'Space Mono' }}>Real: {ev.actual}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

            </div>

        )}

        {/* NUEVO TRADE */}
        {page === 'nuevo' && (
          <div className="page-enter">
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>Nuevo Trade</div>
              <div style={{ fontSize: 12, color: '#4a6fa5', marginTop: 2 }}>Registra tu operación</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }}>
              <div style={{ background: '#07102a', border: '1px solid #0d1b3e', borderRadius: 12, padding: 22 }}>
                {[
                  { title: 'Info básica', content: (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div><label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>FECHA</label><input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, width: '100%' }} /></div>
                        <div><label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>HORA</label><input type="time" value={fTime} onChange={e => setFTime(e.target.value)} style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, width: '100%' }} /></div>
                        <div><label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>ACTIVO</label>
                          <select value={fPair} onChange={e => setFPair(e.target.value)} style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, width: '100%' }}>
                            <option>XAU/USD</option><option>NAS100</option><option>BTC/USD</option><option>Otro</option>
                          </select>
                        </div>
                        <div><label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>TIMEFRAME</label>
                          <select value={fTf} onChange={e => setFTf(e.target.value)} style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, width: '100%' }}>
                            <option>15M</option><option>1H</option><option>4H</option>
                          </select>
                        </div>
                      </div>
                      <label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>DIRECCIÓN</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[['buy', '▲ LONG', '#34d399', 'rgba(52,211,153,0.1)', '#134e3a'], ['sell', '▼ SHORT', '#f87171', 'rgba(248,113,113,0.1)', '#4c1414']].map(([v, l, c, bg, bc]) => (
                          <button key={v} onClick={() => setFDir(v)} style={{ padding: '10px', borderRadius: 8, border: `1px solid ${fDir === v ? c : '#1e3a6e'}`, background: fDir === v ? bg : '#0d1b3e', color: fDir === v ? c : '#4a6fa5', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{l}</button>
                        ))}
                      </div>
                    </>
                  )},
                  { title: 'Precios & Gestión', content: (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                        {[['ENTRADA', fEntry, setFEntry], ['STOP LOSS', fSl, setFSl], ['TAKE PROFIT', fTp, setFTp]].map(([l, v, s]) => (
                          <div key={l as string}><label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>{l as string}</label><input type="number" value={v as string} onChange={e => (s as (x:string)=>void)(e.target.value)} placeholder="0.00" style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, width: '100%' }} /></div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        <div><label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>RIESGO €</label><input type="number" value={fRisk} onChange={e => setFRisk(e.target.value)} placeholder="0.00" style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, width: '100%' }} /></div>
                        <div><label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>LOTE</label><input type="number" value={fLot} onChange={e => setFLot(e.target.value)} placeholder="0.01" style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, width: '100%' }} /></div>
                        <div><label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>R:R AUTO</label><div style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '9px 12px', fontFamily: 'Space Mono', fontWeight: 600, color: parseFloat(fRR.split(':')[1]) >= 2 ? '#34d399' : '#f59e0b', textAlign: 'center', fontSize: 13 }}>{fRR}</div></div>
                      </div>
                    </>
                  )},
                  { title: 'Resultado', content: (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                        {[['win','✓ WIN','#34d399','rgba(52,211,153,0.1)'], ['loss','✕ LOSS','#f87171','rgba(248,113,113,0.1)'], ['be','— BE','#a78bfa','rgba(167,139,250,0.1)']].map(([v,l,c,bg]) => (
                          <button key={v} onClick={() => setFRes(v)} style={{ padding: '9px', borderRadius: 8, border: `1px solid ${fRes === v ? c : '#1e3a6e'}`, background: fRes === v ? bg : '#0d1b3e', color: fRes === v ? c : '#4a6fa5', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{l}</button>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div><label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>P&L REAL €</label><input type="number" value={fPnl} onChange={e => setFPnl(e.target.value)} placeholder="±0.00" style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, width: '100%' }} /></div>
                        <div><label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>R OBTENIDO</label><input type="text" value={fRreal} onChange={e => setFRreal(e.target.value)} placeholder="+2R" style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, width: '100%' }} /></div>
                      </div>
                    </>
                  )},
                ].map(section => (
                  <div key={section.title} style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.2em', color: '#3b82f6', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #0d1b3e', textTransform: 'uppercase' }}>{section.title}</div>
                    {section.content}
                  </div>
                ))}

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.2em', color: '#3b82f6', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #0d1b3e' }}>CONFLUENCIAS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['Zona liquidez', 'Fibo 0.618', 'Fibo 0.5', 'Fibo 0.786', 'Nº redondo', 'DXY confirm', 'Sesión asiática', 'Dirección 4H', 'Estructura 1H'].map(c => (
                      <button key={c} onClick={() => toggleConf(c)} style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${fConf.includes(c) ? '#3b82f6' : '#1e3a6e'}`, background: fConf.includes(c) ? 'rgba(59,130,246,0.15)' : 'transparent', color: fConf.includes(c) ? '#93c5fd' : '#4a6fa5', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>{c}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.2em', color: '#3b82f6', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #0d1b3e' }}>PSICOLOGÍA</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {['😐 Neutro', '😌 Tranquilo', '💪 Confiado', '😰 Ansioso', '😤 Frustrado', '🎲 FOMO', '😡 Revenge'].map(e => (
                      <button key={e} onClick={() => setFEmo(fEmo === e ? '' : e)} style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${fEmo === e ? '#a78bfa' : '#1e3a6e'}`, background: fEmo === e ? 'rgba(167,139,250,0.15)' : 'transparent', color: fEmo === e ? '#a78bfa' : '#4a6fa5', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s' }}>{e}</button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[['yes','✓ Plan seguido','#34d399','rgba(52,211,153,0.1)'], ['no','✕ Sin plan','#f87171','rgba(248,113,113,0.1)']].map(([v,l,c,bg]) => (
                      <button key={v} onClick={() => setFPlan(v)} style={{ padding: '9px', borderRadius: 8, border: `1px solid ${fPlan === v ? c : '#1e3a6e'}`, background: fPlan === v ? bg : '#0d1b3e', color: fPlan === v ? c : '#4a6fa5', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{l}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.2em', color: '#3b82f6', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #0d1b3e' }}>NOTAS</div>
                  <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="¿Qué setup viste? ¿Qué salió bien o mal? ¿Qué aprendiste?" style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 13, width: '100%', minHeight: 90, resize: 'vertical', lineHeight: 1.6 }} />
                </div>

                <button className="btn-primary" onClick={saveTrade} disabled={saving} style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando...' : '+ Guardar Operación'}
                </button>
              </div>

              {/* PREVIEW */}
              <div style={{ position: 'sticky', top: 24 }}>
                <div style={{ background: '#07102a', border: '1px solid #0d1b3e', borderRadius: 12, padding: 18, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd', marginBottom: 14 }}>Vista previa</div>
                  {[['Par', fPair], ['Dirección', fDir ? (fDir === 'buy' ? '▲ LONG' : '▼ SHORT') : '—'], ['R:R', fRR], ['Riesgo', fRisk ? fRisk + '€' : '—'], ['Resultado', fRes?.toUpperCase() || '—'], ['P&L', fPnl ? (parseFloat(fPnl) >= 0 ? '+' : '') + parseFloat(fPnl).toFixed(2) + '€' : '—'], ['Plan', fPlan === 'yes' ? '✓ Sí' : fPlan === 'no' ? '✕ No' : '—']].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #0d1b3e', fontSize: 12 }}>
                      <span style={{ color: '#4a6fa5' }}>{k}</span>
                      <span style={{ fontFamily: 'Space Mono', fontWeight: 600, fontSize: 11 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'linear-gradient(135deg, #07102a, #0a1628)', border: '1px solid #1e3a6e', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 11, color: '#4a6fa5', marginBottom: 6 }}>Balance actual</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 22, fontWeight: 700, color: balance >= capital.initial ? '#34d399' : '#f87171' }}>{fmtAbs(balance)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HISTORIAL */}
        {page === 'historial' && (
          <div className="page-enter">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>Historial</div>
                <div style={{ fontSize: 12, color: '#4a6fa5', marginTop: 2 }}>{filteredTrades.length} operaciones</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['all','Todas'], ['win','Wins'], ['loss','Losses'], ['XAU/USD','Oro'], ['NAS100','Nasdaq']].map(([f, l]) => (
                  <button key={f} onClick={() => setHistFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${histFilter === f ? '#3b82f6' : '#1e3a6e'}`, background: histFilter === f ? 'rgba(59,130,246,0.15)' : 'transparent', color: histFilter === f ? '#93c5fd' : '#4a6fa5', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ background: '#07102a', border: '1px solid #0d1b3e', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 90px 55px 80px 60px 1fr 90px', padding: '10px 18px', background: '#060d1f', borderBottom: '1px solid #0d1b3e', gap: 8 }}>
                {['Fecha', 'Activo', 'Dir', 'Resultado', 'Plan', 'Notas', 'P&L'].map(h => (
                  <span key={h} style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4a6fa5' }}>{h}</span>
                ))}
              </div>
              {filteredTrades.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '52px 20px', color: '#4a6fa5', fontSize: 13 }}>Sin operaciones. Añade tu primer trade.</div>
              ) : filteredTrades.map(t => (
                <div key={t.id} onClick={() => setModalTrade(t)} className="trade-row" style={{ display: 'grid', gridTemplateColumns: '100px 90px 55px 80px 60px 1fr 90px', padding: '12px 18px', borderBottom: '1px solid #0d1b3e', gap: 8, alignItems: 'center', cursor: 'pointer', transition: 'background 0.1s' }}>
                  <span style={{ fontFamily: 'Space Mono', fontSize: 11, color: '#4a6fa5' }}>{t.date}</span>
                  <span style={{ fontFamily: 'Space Mono', fontSize: 11, color: '#93c5fd' }}>{t.pair}</span>
                  <span style={{ fontSize: 12, color: t.dir === 'buy' ? '#34d399' : '#f87171', fontWeight: 600 }}>{t.dir === 'buy' ? '▲ L' : '▼ S'}</span>
                  <span style={{ padding: '3px 8px', borderRadius: 5, fontSize: 10, fontFamily: 'Space Mono', fontWeight: 600, background: t.res === 'win' ? 'rgba(52,211,153,0.12)' : t.res === 'loss' ? 'rgba(248,113,113,0.12)' : 'rgba(167,139,250,0.12)', color: t.res === 'win' ? '#34d399' : t.res === 'loss' ? '#f87171' : '#a78bfa', display: 'inline-block', textAlign: 'center' }}>{t.res.toUpperCase()}</span>
                  <span style={{ fontSize: 11, color: t.plan === 'yes' ? '#34d399' : t.plan === 'no' ? '#f87171' : '#4a6fa5' }}>{t.plan === 'yes' ? '✓' : t.plan === 'no' ? '✕' : '—'}</span>
                  <span style={{ color: '#4a6fa5', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.notes ? t.notes.slice(0, 45) + (t.notes.length > 45 ? '…' : '') : '—'}</span>
                  <span style={{ fontFamily: 'Space Mono', fontSize: 13, fontWeight: 700, textAlign: 'right', color: t.pnl > 0 ? '#34d399' : t.pnl < 0 ? '#f87171' : '#a78bfa' }}>{fmt(t.pnl)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CAPITAL */}
        {page === 'capital' && (
          <div className="page-enter">
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>Capital</div>
              <div style={{ fontSize: 12, color: '#4a6fa5', marginTop: 2 }}>Gestión de capital y aportaciones</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
              <div>
                <div style={{ background: '#07102a', border: '1px solid #0d1b3e', borderRadius: 12, padding: 20, marginBottom: 14 }}>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.2em', color: '#3b82f6', marginBottom: 14 }}>CAPITAL INICIAL</div>
                  <label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>IMPORTE €</label>
                  <input type="number" value={capInitial} onChange={e => setCapInitial(e.target.value)} placeholder="500.00" style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, width: '100%', marginBottom: 12 }} />
                  <button onClick={setInitialCapital} style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg, #065f46, #10b981)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Guardar capital inicial</button>
                </div>
                <div style={{ background: '#07102a', border: '1px solid #0d1b3e', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.2em', color: '#3b82f6', marginBottom: 14 }}>NUEVA APORTACIÓN</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div><label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>FECHA</label><input type="date" value={apDate} onChange={e => setApDate(e.target.value)} style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, width: '100%' }} /></div>
                    <div><label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>IMPORTE €</label><input type="number" value={apAmount} onChange={e => setApAmount(e.target.value)} placeholder="100.00" style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, width: '100%' }} /></div>
                  </div>
                  <label style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', display: 'block', marginBottom: 5 }}>DESCRIPCIÓN</label>
                  <input type="text" value={apDesc} onChange={e => setApDesc(e.target.value)} placeholder="Aportación mensual agosto" style={{ background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, width: '100%', marginBottom: 12 }} />
                  <button onClick={addAportacion} style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Añadir aportación</button>
                </div>
              </div>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[
                    { l: 'Capital inicial', v: fmtAbs(capital.initial), c: '#34d399' },
                    { l: 'Total aportado', v: fmtAbs(totalAport), c: '#f59e0b' },
                    { l: 'P&L total', v: fmt(totalPnl), c: totalPnl >= 0 ? '#34d399' : '#f87171' },
                    { l: 'Balance total', v: fmtAbs(balance), c: '#3b82f6' },
                  ].map(s => (
                    <div key={s.l} style={{ background: '#07102a', border: `1px solid #0d1b3e`, borderTop: `2px solid ${s.c}`, borderRadius: 10, padding: 14 }}>
                      <div style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.15em', color: '#4a6fa5', marginBottom: 6 }}>{s.l.toUpperCase()}</div>
                      <div style={{ fontFamily: 'Space Mono', fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#07102a', border: '1px solid #0d1b3e', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.2em', color: '#3b82f6', marginBottom: 14 }}>HISTORIAL APORTACIONES</div>
                  {capital.aportaciones.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#4a6fa5', fontSize: 12 }}>Sin aportaciones aún</div>
                  ) : capital.aportaciones.map(a => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#0d1b3e', borderRadius: 8, marginBottom: 6, border: '1px solid #1e3a6e' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.desc}</div>
                        <div style={{ fontSize: 11, color: '#4a6fa5' }}>{a.date}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'Space Mono', fontWeight: 700, color: '#34d399' }}>+{fmtAbs(a.amount)}</span>
                        <button onClick={() => deleteAport(a.id)} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid #f87171', color: '#f87171', padding: '3px 8px', borderRadius: 6, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


        {/* NOTICIAS / CALENDARIO ECONÓMICO */}
        {page === 'noticias' && (
          <div className="page-enter">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>Calendario Económico</div>
                <div style={{ fontSize: 12, color: '#4a6fa5', marginTop: 2 }}>Eventos USD · EUR · GBP — Alto y medio impacto{econUpdated ? ` · Actualizado ${new Date(econUpdated).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
              </div>
              <button onClick={loadEcon} disabled={econLoading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px', background: '#0d1b3e', border: '1px solid #1e3a6e', borderRadius: 8, color: '#93c5fd', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                {econLoading ? '⟳ Cargando...' : '↻ Actualizar datos'}
              </button>
            </div>

            {/* IMPACT LEGEND */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              {[['🔴 Alto impacto', '#f87171', 'rgba(248,113,113,0.1)'], ['🟡 Medio impacto', '#f59e0b', 'rgba(245,158,11,0.1)']].map(([l, c, bg]) => (
                <div key={l} style={{ padding: '6px 14px', borderRadius: 20, background: bg as string, border: `1px solid ${c}33`, fontSize: 11, color: c as string }}>{l}</div>
              ))}
              <div style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(59,130,246,0.1)', border: '1px solid #1e3a6e', fontSize: 11, color: '#93c5fd' }}>💡 Evita operar 15min antes y después</div>
            </div>

            {econLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#4a6fa5' }}>
                <div style={{ width: 32, height: 32, border: '2px solid #1e3a6e', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 12 }}>Buscando eventos económicos...</div>
              </div>
            ) : econEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#4a6fa5', fontSize: 13 }}>Sin eventos disponibles. Intenta actualizar.</div>
            ) : (() => {
              // Group by date
              const grouped: Record<string, EconEvent[]> = {};
              econEvents.forEach(ev => {
                const dateKey = new Date(ev.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
                if (!grouped[dateKey]) grouped[dateKey] = [];
                grouped[dateKey].push(ev);
              });

              return Object.entries(grouped).map(([dateLabel, events]) => (
                <div key={dateLabel} style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 10, letterSpacing: '0.15em', color: '#3b82f6', textTransform: 'uppercase', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #0d1b3e' }}>{dateLabel}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {events.map((ev, i) => {
                      const d = new Date(ev.date);
                      const isHigh = ev.impact === 'High';
                      const isPast = d < new Date();
                      const isNear = !isPast && (d.getTime() - new Date().getTime()) < 3600000;
                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 60px 40px 1fr 100px 100px 100px', gap: 12, alignItems: 'center', padding: '12px 16px', background: isNear ? 'rgba(245,158,11,0.06)' : '#07102a', border: `1px solid ${isNear ? '#f59e0b44' : isHigh ? '#4c141444' : '#0d1b3e'}`, borderRadius: 9, opacity: isPast ? 0.55 : 1 }}>
                          <div style={{ fontFamily: 'Space Mono', fontSize: 11, color: isNear ? '#f59e0b' : '#93c5fd', fontWeight: isNear ? 700 : 400 }}>{d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}{isNear && <div style={{ fontSize: 8, color: '#f59e0b', marginTop: 2 }}>¡PRÓXIMO!</div>}</div>
                          <div><span style={{ fontSize: 10, fontFamily: 'Space Mono', padding: '3px 8px', borderRadius: 5, background: ev.currency === 'USD' ? 'rgba(59,130,246,0.2)' : ev.currency === 'EUR' ? 'rgba(52,211,153,0.2)' : 'rgba(167,139,250,0.2)', color: ev.currency === 'USD' ? '#93c5fd' : ev.currency === 'EUR' ? '#34d399' : '#a78bfa', fontWeight: 600 }}>{ev.currency}</span></div>
                          <div style={{ fontSize: 14 }}>{isHigh ? '🔴' : '🟡'}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{ev.title}{isPast && <span style={{ fontSize: 10, color: '#4a6fa5', fontWeight: 400, marginLeft: 8 }}>finalizado</span>}</div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#4a6fa5', marginBottom: 2 }}>ANTERIOR</div>
                            <div style={{ fontFamily: 'Space Mono', fontSize: 12, color: '#93c5fd' }}>{ev.previous}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#4a6fa5', marginBottom: 2 }}>PREVISIÓN</div>
                            <div style={{ fontFamily: 'Space Mono', fontSize: 12, color: '#f59e0b' }}>{ev.forecast}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#4a6fa5', marginBottom: 2 }}>REAL</div>
                            <div style={{ fontFamily: 'Space Mono', fontSize: 12, fontWeight: 700, color: ev.actual ? '#34d399' : '#4a6fa5' }}>{ev.actual || '—'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}

            {/* REGLAS DE TRADING EN NOTICIAS */}
            <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 18, marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 12 }}>⚠️ Reglas de trading en eventos de alto impacto</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  '🚫 No abrir operaciones 15 min antes de evento rojo',
                  '⏳ Esperar al menos 15 min después de la publicación',
                  '📊 El Oro reacciona especialmente al IPC y decisiones FED',
                  '📈 El Nasdaq es muy sensible a NFP y tipos de interés',
                  '💱 El spread se amplía justo antes de las noticias',
                  '✅ Los mejores setups aparecen 30 min después del evento',
                ].map((rule, i) => (
                  <div key={i} style={{ background: '#0d1b3e', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#93c5fd', lineHeight: 1.5 }}>{rule}</div>
                ))}
              </div>
            </div>
          </div>
        )}

      {/* MODAL */}
      {modalTrade && (
        <div onClick={e => e.target === e.currentTarget && setModalTrade(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#07102a', border: '1px solid #1e3a6e', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{modalTrade.pair}</div>
                <div style={{ fontSize: 11, color: '#4a6fa5', marginTop: 2 }}>{modalTrade.date} · {modalTrade.time} · {modalTrade.tf}</div>
              </div>
              <button onClick={() => setModalTrade(null)} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #1e3a6e', background: '#0d1b3e', color: '#4a6fa5', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
                { l: 'Resultado', v: modalTrade.res.toUpperCase(), c: modalTrade.res === 'win' ? '#34d399' : modalTrade.res === 'loss' ? '#f87171' : '#a78bfa' },
                { l: 'P&L', v: fmt(modalTrade.pnl), c: modalTrade.pnl > 0 ? '#34d399' : modalTrade.pnl < 0 ? '#f87171' : '#a78bfa' },
                { l: 'Dirección', v: modalTrade.dir === 'buy' ? '▲ LONG' : '▼ SHORT', c: modalTrade.dir === 'buy' ? '#34d399' : '#f87171' },
                { l: 'R:R', v: modalTrade.rr, c: '#93c5fd' },
                { l: 'Riesgo', v: modalTrade.risk + '€', c: '#f87171' },
                { l: 'R obtenido', v: modalTrade.rreal || '—', c: '#34d399' },
              ].map(s => (
                <div key={s.l} style={{ background: '#0d1b3e', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 9, letterSpacing: '0.12em', color: '#4a6fa5', marginBottom: 4, textTransform: 'uppercase' }}>{s.l}</div>
                  <div style={{ fontFamily: 'Space Mono', fontSize: 14, fontWeight: 700, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
            {modalTrade.entry > 0 && <div style={{ background: '#0d1b3e', borderRadius: 8, padding: '10px 12px', fontFamily: 'Space Mono', fontSize: 11, lineHeight: 2, marginBottom: 12 }}>Entry: <span style={{ color: '#f59e0b' }}>{modalTrade.entry}</span> · SL: <span style={{ color: '#f87171' }}>{modalTrade.sl}</span> · TP: <span style={{ color: '#34d399' }}>{modalTrade.tp}</span> · Lote: {modalTrade.lot}</div>}
            {modalTrade.conf.length > 0 && <div style={{ marginBottom: 12 }}><div style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#4a6fa5', marginBottom: 6, letterSpacing: '0.15em' }}>CONFLUENCIAS</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{modalTrade.conf.map(c => <span key={c} style={{ padding: '4px 10px', background: 'rgba(59,130,246,0.1)', border: '1px solid #1e3a6e', borderRadius: 12, fontSize: 11 }}>{c}</span>)}</div></div>}
            <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
              <div><div style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#4a6fa5', marginBottom: 3, letterSpacing: '0.12em' }}>EMOCIÓN</div><span style={{ fontSize: 13 }}>{modalTrade.emo || '—'}</span></div>
              <div><div style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#4a6fa5', marginBottom: 3, letterSpacing: '0.12em' }}>PLAN</div><span style={{ color: modalTrade.plan === 'yes' ? '#34d399' : '#f87171', fontWeight: 600 }}>{modalTrade.plan === 'yes' ? '✓ Sí' : modalTrade.plan === 'no' ? '✕ No' : '—'}</span></div>
            </div>
            {modalTrade.notes && <div style={{ background: '#0d1b3e', borderRadius: 8, padding: 12, fontSize: 12, color: '#93c5fd', lineHeight: 1.7, marginBottom: 14 }}>{modalTrade.notes}</div>}
            <button onClick={() => deleteTrade(modalTrade.id)} style={{ width: '100%', padding: '11px', background: 'rgba(248,113,113,0.15)', border: '1px solid #f87171', borderRadius: 8, color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Eliminar operación</button>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <div className="bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#07102a', borderTop: '1px solid #0d1b3e', padding: '8px 0', zIndex: 200, display: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {([['dashboard','◈','Inicio'], ['nuevo','➕','Trade'], ['historial','≡','Historial'], ['capital','◎','Capital'], ['noticias','📰','Noticias']] as [Page,string,string][]).map(([p,icon,label]) => (
            <button key={p} onClick={() => setPage(p)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', color: page === p ? '#3b82f6' : '#4a6fa5', transition: 'color 0.15s' }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}