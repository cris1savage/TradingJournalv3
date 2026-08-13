'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

type Trade = { id: number; date: string; time: string; pair: string; tf: string; dir: string; res: string; plan: string | null; entry: number; sl: number; tp: number; risk: number; lot: number; rr: string; pnl: number; rreal: string; conf: string[]; emo: string; notes: string; };
type EconEvent = { title: string; date: string; currency: string; impact: string; country: string; forecast: string | null; previous: string | null; actual: string | null; };
type Capital = { initial: number; aportaciones: { id: number; date: string; amount: number; desc: string }[]; };
type Page = 'dashboard' | 'nuevo' | 'historial' | 'capital' | 'noticias';

const fmt = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '€';
const fmtA = (n: number) => n.toFixed(2) + '€';

// Color palette matching the reference image
const G = {
  bg: '#0b1a2e',
  sb: '#0d1f38',
  card: '#112240',
  card2: '#162d4a',
  cardHover: '#1a3558',
  border: 'rgba(100,160,255,0.12)',
  border2: 'rgba(100,160,255,0.25)',
  accent: '#4d9fff',
  accentGlow: '#64b4ff',
  cyan: '#00e5ff',
  green: '#00e676',
  red: '#ff4081',
  gold: '#ffb300',
  purple: '#7c4dff',
  text: '#e8f4ff',
  muted: '#4a7a9b',
  muted2: '#6b9cc7',
  white: '#ffffff',
};

function useCounter(target: number, dur = 1000) {
  const [v, sv] = useState(0); const p = useRef(0);
  useEffect(() => {
    const s = p.current, d = target - s, t0 = performance.now();
    const tick = (n: number) => { const pr = Math.min((n - t0) / dur, 1), e = 1 - Math.pow(1 - pr, 3); sv(s + d * e); if (pr < 1) requestAnimationFrame(tick); else p.current = target; };
    requestAnimationFrame(tick);
  }, [target, dur]);
  return v;
}

// Epic logo with electric blue chart
const Logo = () => (
  <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
    <rect width="42" height="42" rx="12" fill="url(#logoGrad)"/>
    <rect x="1" y="1" width="40" height="40" rx="11" stroke="url(#logoBorder)" strokeWidth="1.5" fill="none"/>
    {/* Grid lines */}
    <line x1="8" y1="32" x2="35" y2="32" stroke="rgba(77,159,255,0.3)" strokeWidth="0.5"/>
    <line x1="8" y1="24" x2="35" y2="24" stroke="rgba(77,159,255,0.2)" strokeWidth="0.5"/>
    <line x1="8" y1="16" x2="35" y2="16" stroke="rgba(77,159,255,0.15)" strokeWidth="0.5"/>
    {/* Chart area fill */}
    <path d="M8,32 L14,22 L19,26 L26,12 L33,17 L33,32 Z" fill="url(#chartFill)" opacity="0.4"/>
    {/* Chart line */}
    <polyline points="8,32 14,22 19,26 26,12 33,17" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Dots */}
    <circle cx="26" cy="12" r="2.5" fill="#64b4ff"/>
    <circle cx="33" cy="17" r="2" fill="#64b4ff" opacity="0.7"/>
    <circle cx="26" cy="12" r="4.5" fill="rgba(100,180,255,0.2)"/>
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="42" y2="42">
        <stop offset="0%" stopColor="#0d2347"/>
        <stop offset="100%" stopColor="#0a1628"/>
      </linearGradient>
      <linearGradient id="logoBorder" x1="0" y1="0" x2="42" y2="42">
        <stop offset="0%" stopColor="#4d9fff" stopOpacity="0.6"/>
        <stop offset="100%" stopColor="#4d9fff" stopOpacity="0.1"/>
      </linearGradient>
      <linearGradient id="lineGrad" x1="8" y1="0" x2="33" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#4d9fff"/>
        <stop offset="100%" stopColor="#00e5ff"/>
      </linearGradient>
      <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4d9fff"/>
        <stop offset="100%" stopColor="#4d9fff" stopOpacity="0"/>
      </linearGradient>
    </defs>
  </svg>
);

// Circular progress gauge
const CircleGauge = ({ value, max, label, sublabel, color, size = 100 }: { value: number; max: number; label: string; sublabel: string; color: string; size?: number }) => {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)`, transition: 'stroke-dasharray 1s ease' }}/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: size > 90 ? 15 : 12, fontWeight: 700, color: G.text, lineHeight: 1 }}>{label}</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: G.muted2, textAlign: 'center', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{sublabel}</div>
    </div>
  );
};

// Semi-circle gauge (speedometer style)
const SemiGauge = ({ value, max, label, color }: { value: number; max: number; label: string; color: string }) => {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = 52, cx = 70, cy = 70;
  const startAngle = Math.PI, endAngle = 2 * Math.PI;
  const angle = startAngle + pct * Math.PI;
  const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
  const xA = cx + r * Math.cos(angle), yA = cy + r * Math.sin(angle);
  const bgPath = `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  const fgPath = `M ${x1} ${y1} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${xA} ${yA}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="140" height="80" viewBox="0 0 140 80">
        <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round"/>
        {pct > 0 && <path d={fgPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${color})` }}/>}
        <text x="70" y="68" textAnchor="middle" fill={G.text} fontSize="18" fontWeight="700" fontFamily="Space Mono, monospace">{label}</text>
      </svg>
    </div>
  );
};

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
  const [sidebarTab, setSidebarTab] = useState<'semanas'|'meses'|'años'>('meses');

  const [fDate,setFDate]=useState(''); const [fTime,setFTime]=useState(''); const [fPair,setFPair]=useState('XAU/USD'); const [fTf,setFTf]=useState('15M');
  const [fDir,setFDir]=useState<string|null>(null); const [fEntry,setFEntry]=useState(''); const [fSl,setFSl]=useState(''); const [fTp,setFTp]=useState('');
  const [fRisk,setFRisk]=useState(''); const [fLot,setFLot]=useState(''); const [fRR,setFRR]=useState('—'); const [fRes,setFRes]=useState<string|null>(null);
  const [fPnl,setFPnl]=useState(''); const [fRreal,setFRreal]=useState(''); const [fConf,setFConf]=useState<string[]>([]); const [fEmo,setFEmo]=useState('');
  const [fPlan,setFPlan]=useState<string|null>(null); const [fNotes,setFNotes]=useState(''); const [saving,setSaving]=useState(false);
  const [capInitial,setCapInitial]=useState(''); const [apDate,setApDate]=useState(''); const [apAmount,setApAmount]=useState(''); const [apDesc,setApDesc]=useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tR,cR] = await Promise.all([fetch('/api/trades'),fetch('/api/capital')]);
    if (tR.ok) setTrades(await tR.json());
    if (cR.ok) { const c = await cR.json(); setCapital(c); setCapInitial(c.initial?.toString()||''); }
    setLoading(false);
  }, []);

  const loadEcon = useCallback(async () => {
    setEconLoading(true);
    try { const r = await fetch('/api/calendar'); if (r.ok) { const d = await r.json(); setEconEvents(d.events||[]); setEconUpdated(d.updated||''); } } catch {}
    setEconLoading(false);
  }, []);

  useEffect(() => { loadData(); loadEcon(); const n=new Date(); setFDate(n.toISOString().split('T')[0]); setFTime(n.toTimeString().slice(0,5)); setApDate(n.toISOString().split('T')[0]); }, [loadData,loadEcon]);
  useEffect(() => { const e=parseFloat(fEntry),sl=parseFloat(fSl),tp=parseFloat(fTp); if(e&&sl&&tp){const r=Math.abs(e-sl),p=Math.abs(tp-e);if(r>0){setFRR('1:'+(p/r).toFixed(1));return;}} setFRR('—'); }, [fEntry,fSl,fTp]);

  const totalPnl = trades.reduce((s,t)=>s+t.pnl,0);
  const totalAport = capital.aportaciones.reduce((s,a)=>s+a.amount,0);
  const balance = capital.initial + totalAport + totalPnl;
  const wins=trades.filter(t=>t.res==='win').length, losses=trades.filter(t=>t.res==='loss').length, bes=trades.filter(t=>t.res==='be').length;
  const wr = trades.length ? Math.round(wins/trades.length*100) : 0;
  const byDay = trades.reduce((a,t)=>{ a[t.date]=(a[t.date]||0)+t.pnl; return a; },{} as Record<string,number>);

  // Weekly stats
  const weeklyStats = (() => {
    const weeks: Record<string, {pnl:number;trades:number;wins:number}> = {};
    trades.forEach(t => {
      const d = new Date(t.date); const day = d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - (day===0?6:day-1));
      const key = mon.toISOString().split('T')[0];
      if (!weeks[key]) weeks[key] = {pnl:0,trades:0,wins:0};
      weeks[key].pnl += t.pnl; weeks[key].trades++; if(t.res==='win') weeks[key].wins++;
    });
    return Object.entries(weeks).sort(([a],[b])=>b.localeCompare(a)).slice(0,10);
  })();

  // Monthly stats
  const monthlyStats = (() => {
    const months: Record<string, {pnl:number;trades:number;wins:number}> = {};
    trades.forEach(t => {
      const key = t.date.slice(0,7);
      if (!months[key]) months[key] = {pnl:0,trades:0,wins:0};
      months[key].pnl += t.pnl; months[key].trades++; if(t.res==='win') months[key].wins++;
    });
    return Object.entries(months).sort(([a],[b])=>b.localeCompare(a));
  })();

  // Yearly stats
  const yearlyStats = (() => {
    const years: Record<string, {pnl:number;trades:number;wins:number}> = {};
    trades.forEach(t => {
      const key = t.date.slice(0,4);
      if (!years[key]) years[key] = {pnl:0,trades:0,wins:0};
      years[key].pnl += t.pnl; years[key].trades++; if(t.res==='win') years[key].wins++;
    });
    return Object.entries(years).sort(([a],[b])=>b.localeCompare(a));
  })();

  const animBalance = useCounter(balance);
  const animWr = useCounter(wr);
  const animTrades = useCounter(trades.length);

  const capitalCurve = () => {
    let run = capital.initial;
    const evs: {date:string;val:number}[] = [];
    capital.aportaciones.forEach(a=>evs.push({date:a.date,val:a.amount}));
    trades.forEach(t=>evs.push({date:t.date+' '+t.time,val:t.pnl}));
    evs.sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
    const labels=['Inicio'], data=[capital.initial];
    evs.forEach(e=>{run+=e.val;labels.push(e.date.split(' ')[0]);data.push(parseFloat(run.toFixed(2)));});
    return {labels,data};
  };

  const curve = capitalCurve();
  const last10 = trades.slice(-10);
  const filteredTrades = histFilter==='all'?[...trades].reverse():[...trades].filter(t=>t.res===histFilter||t.pair===histFilter).reverse();

  async function saveTrade() {
    if(!fDate||!fPair||!fDir||!fRes){alert('Rellena fecha, activo, dirección y resultado.');return;}
    const pnl=parseFloat(fPnl); if(isNaN(pnl)){alert('Introduce el P&L real.');return;}
    setSaving(true);
    const t:Trade={id:Date.now(),date:fDate,time:fTime,pair:fPair,tf:fTf,dir:fDir,res:fRes,plan:fPlan,entry:parseFloat(fEntry)||0,sl:parseFloat(fSl)||0,tp:parseFloat(fTp)||0,risk:parseFloat(fRisk)||0,lot:parseFloat(fLot)||0,rr:fRR,pnl,rreal:fRreal,conf:fConf,emo:fEmo,notes:fNotes};
    await fetch('/api/trades',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(t)});
    await loadData(); resetForm(); setSaving(false); setPage('dashboard');
  }

  function resetForm(){const n=new Date();setFDate(n.toISOString().split('T')[0]);setFTime(n.toTimeString().slice(0,5));setFPair('XAU/USD');setFTf('15M');setFDir(null);setFRes(null);setFPlan(null);setFEntry('');setFSl('');setFTp('');setFRisk('');setFLot('');setFRR('—');setFPnl('');setFRreal('');setFConf([]);setFEmo('');setFNotes('');}
  async function deleteTrade(id:number){if(!confirm('¿Eliminar?'))return;await fetch('/api/trades',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});setModalTrade(null);await loadData();}
  async function setIC(){const v=parseFloat(capInitial);if(isNaN(v)||v<=0){alert('Capital inválido.');return;}await fetch('/api/capital',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'setInitial',amount:v})});await loadData();alert('✓ Capital guardado');}
  async function addAp(){const a=parseFloat(apAmount);if(!apDate||isNaN(a)||a<=0){alert('Rellena fecha e importe.');return;}await fetch('/api/capital',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'addAport',date:apDate,amount:a,desc:apDesc||'Aportación'})});setApAmount('');setApDesc('');await loadData();}
  async function delAp(id:number){await fetch('/api/capital',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'deleteAport',id})});await loadData();}
  async function logout(){await fetch('/api/auth',{method:'DELETE'});window.location.href='/login';}
  function toggleConf(c:string){setFConf(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);}

  const calDays=()=>{const y=calMonth.getFullYear(),m=calMonth.getMonth();const fd=new Date(y,m,1).getDay();const dim=new Date(y,m+1,0).getDate();const offset=fd===0?6:fd-1;const cells=[];for(let i=0;i<offset;i++)cells.push(null);for(let d=1;d<=dim;d++){const k=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;cells.push({day:d,pnl:byDay[k]??null});}return cells;};

  const now2=new Date();
  const dateStr=now2.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const greeting=now2.getHours()<12?'Buenos días':now2.getHours()<20?'Buenas tardes':'Buenas noches';

  const inp:React.CSSProperties={background:G.card,border:`1px solid ${G.border}`,borderRadius:8,padding:'9px 12px',color:G.text,fontFamily:'inherit',fontSize:13,width:'100%'};
  const secT:React.CSSProperties={fontFamily:'monospace',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:G.accent,marginBottom:14,paddingBottom:8,borderBottom:`1px solid ${G.border}`};
  const lbl:React.CSSProperties={fontFamily:'monospace',fontSize:9,letterSpacing:'0.15em',textTransform:'uppercase',color:G.muted,display:'block',marginBottom:5};

  const Card = ({children, style}: {children:React.ReactNode; style?:React.CSSProperties}) => (
    <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:18,...style}}>{children}</div>
  );

  const Tog=({label,active,color,bg,onClick}:{label:string;active:boolean;color:string;bg:string;onClick:()=>void})=>(
    <button onClick={onClick} style={{padding:'9px 8px',borderRadius:8,border:`1px solid ${active?color:G.border}`,background:active?bg:G.card,color:active?color:G.muted,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',boxShadow:active?`0 0 12px ${color}40`:'none'}}>{label}</button>
  );

  const econByDate=econEvents.reduce((a,ev)=>{const k=new Date(ev.date).toDateString();if(!a[k])a[k]=[];a[k].push(ev);return a;},{} as Record<string,EconEvent[]>);
  const todayKey=new Date().toDateString();
  const todayEvents=econByDate[todayKey]||[];

  const currentStats = sidebarTab==='semanas'?weeklyStats:sidebarTab==='meses'?monthlyStats:yearlyStats;
  const maxAbsPnl = Math.max(...currentStats.map(([,s])=>Math.abs(s.pnl)), 1);

  if(loading) return(
    <div style={{minHeight:'100vh',background:G.bg,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <div style={{width:48,height:48,position:'relative'}}>
        <div style={{position:'absolute',inset:0,border:`2px solid ${G.border}`,borderTop:`2px solid ${G.accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
        <div style={{position:'absolute',inset:8,border:`2px solid ${G.border}`,borderBottom:`2px solid ${G.cyan}`,borderRadius:'50%',animation:'spin 1.2s linear infinite reverse'}}/>
      </div>
      <div style={{fontFamily:'monospace',fontSize:11,color:G.muted,letterSpacing:'0.2em'}}>CARGANDO APEX TRADER...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{display:'flex',minHeight:'100vh',background:G.bg,fontFamily:"'Inter',sans-serif",color:G.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:${G.bg}}::-webkit-scrollbar-thumb{background:${G.border2};border-radius:2px}
        input,select,textarea{font-family:inherit} select option{background:${G.card}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}
        @keyframes shimmer{0%{opacity:0.6}50%{opacity:1}100%{opacity:0.6}}
        .pe{animation:fadeUp 0.3s ease}
        input:focus,select:focus,textarea:focus{outline:none;border-color:${G.accent}88!important;box-shadow:0 0 0 2px ${G.accent}15!important}
        .trow:hover{background:${G.card2}!important}
        .navitem:hover{background:${G.card2}!important;color:${G.accent}!important}
        .statcard:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(77,159,255,0.15)!important}
        @media(max-width:768px){.sbd{display:none!important}.mc{margin-left:0!important;padding-bottom:72px!important}.bn{display:flex!important}}
        @media(min-width:769px){.bn{display:none!important}}
      `}</style>

      {/* ══ SIDEBAR ══ */}
      <div className="sbd" style={{width:260,background:G.sb,borderRight:`1px solid ${G.border}`,display:'flex',flexDirection:'column',position:'fixed',top:0,left:0,bottom:0,zIndex:100,overflowY:'auto'}}>
        {/* Brand */}
        <div style={{padding:'18px 16px 14px',borderBottom:`1px solid ${G.border}`,flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Logo/>
            <div>
              <div style={{fontFamily:'Space Mono',fontSize:13,fontWeight:700,background:`linear-gradient(135deg,${G.accent},${G.cyan})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:'0.04em'}}>APEX TRADER</div>
              <div style={{fontSize:9,color:G.muted,letterSpacing:'0.12em',fontFamily:'monospace',marginTop:1}}>JOURNAL PRO</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{padding:'10px 10px',flexShrink:0}}>
          {(['dashboard','nuevo','historial','capital','noticias'] as Page[]).map((p,i)=>{
            const icons=['◉','⊕','≡','◈','⚡'],labels=['Dashboard','Nuevo Trade','Historial','Capital','Noticias'];
            return(
              <div key={p} className="navitem" onClick={()=>setPage(p)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:9,cursor:'pointer',color:page===p?G.accent:G.muted,background:page===p?`${G.accent}10`:'transparent',borderLeft:`2px solid ${page===p?G.accent:'transparent'}`,marginBottom:2,fontSize:13,fontWeight:page===p?600:400,transition:'all 0.15s'}}>
                <span style={{fontSize:14,width:18,textAlign:'center'}}>{icons[i]}</span>
                <span>{labels[i]}</span>
                {page===p&&<div style={{marginLeft:'auto',width:5,height:5,borderRadius:'50%',background:G.accent,boxShadow:`0 0 8px ${G.accent}`}}/>}
              </div>
            );
          })}
        </div>

        {/* ── PERFORMANCE HISTORY ── */}
        <div style={{padding:'12px 12px',borderTop:`1px solid ${G.border}`,flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
          <div style={{fontFamily:'monospace',fontSize:9,letterSpacing:'0.18em',color:G.muted,marginBottom:10,textTransform:'uppercase'}}>RENDIMIENTO HISTÓRICO</div>
          {/* Tabs */}
          <div style={{display:'flex',background:G.bg,borderRadius:8,padding:3,gap:2,marginBottom:12,flexShrink:0}}>
            {(['semanas','meses','años'] as const).map(t=>(
              <button key={t} onClick={()=>setSidebarTab(t)} style={{flex:1,padding:'5px 0',borderRadius:6,border:'none',background:sidebarTab===t?G.card2:'transparent',color:sidebarTab===t?G.accent:G.muted,fontSize:9,cursor:'pointer',fontFamily:'monospace',letterSpacing:'0.06em',textTransform:'uppercase',transition:'all 0.15s',boxShadow:sidebarTab===t?`0 0 8px ${G.accent}20`:'none'}}>
                {t.slice(0,3).toUpperCase()}
              </button>
            ))}
          </div>

          {/* Stats list */}
          <div style={{overflowY:'auto',flex:1,minHeight:0}}>
            {currentStats.length===0?(
              <div style={{textAlign:'center',padding:'20px 0',color:G.muted,fontSize:11}}>Sin datos aún</div>
            ):currentStats.map(([key,s])=>{
              const barW = Math.abs(s.pnl)/maxAbsPnl;
              const label = sidebarTab==='semanas'?`Sem ${key.slice(5)}`:sidebarTab==='meses'?new Date(key+'-01').toLocaleDateString('es-ES',{month:'short',year:'2-digit'}).toUpperCase():key;
              return(
                <div key={key} style={{marginBottom:8,padding:'8px 10px',background:G.card,borderRadius:8,border:`1px solid ${G.border}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                    <span style={{fontFamily:'monospace',fontSize:9,color:G.muted2,letterSpacing:'0.06em'}}>{label}</span>
                    <span style={{fontFamily:'Space Mono',fontSize:12,fontWeight:700,color:s.pnl>=0?G.green:G.red}}>{fmt(s.pnl)}</span>
                  </div>
                  {/* Mini bar */}
                  <div style={{height:3,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden',marginBottom:4}}>
                    <div style={{height:'100%',width:`${barW*100}%`,background:s.pnl>=0?G.green:G.red,borderRadius:2,boxShadow:`0 0 6px ${s.pnl>=0?G.green:G.red}60`,transition:'width 0.8s ease'}}/>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <span style={{fontSize:9,color:G.muted}}>{s.trades} ops</span>
                    <span style={{fontSize:9,color:s.wins/s.trades>=0.5?G.green:G.muted}}>{s.trades>0?Math.round(s.wins/s.trades*100):0}% WR</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Balance + logout */}
        <div style={{padding:'12px 12px 16px',borderTop:`1px solid ${G.border}`,flexShrink:0}}>
          <div style={{background:G.bg,border:`1px solid ${G.border2}`,borderRadius:11,padding:'12px 14px',marginBottom:10,boxShadow:`inset 0 0 20px ${G.accent}08`}}>
            <div style={{fontFamily:'monospace',fontSize:8,color:G.muted,letterSpacing:'0.15em',marginBottom:4}}>BALANCE ACTUAL</div>
            <div style={{fontFamily:'Space Mono',fontSize:20,fontWeight:700,color:balance>=capital.initial?G.green:G.red}}>{fmtA(animBalance)}</div>
            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:3}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:totalPnl>=0?G.green:G.red,boxShadow:`0 0 6px ${totalPnl>=0?G.green:G.red}`}}/>
              <span style={{fontSize:10,color:totalPnl>=0?G.green:G.red,fontFamily:'monospace'}}>{fmt(totalPnl)} P&L</span>
            </div>
          </div>
          <button onClick={logout} style={{width:'100%',padding:'7px',background:'transparent',border:`1px solid ${G.border}`,borderRadius:7,color:G.muted,fontSize:10,cursor:'pointer',fontFamily:'monospace',letterSpacing:'0.08em'}}>CERRAR SESIÓN</button>
        </div>
      </div>

      {/* ══ MAIN ══ */}
      <div className="mc" style={{marginLeft:260,flex:1,padding:'22px 24px',minHeight:'100vh'}}>

        {/* ═══ DASHBOARD ═══ */}
        {page==='dashboard'&&(
          <div className="pe">
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:22}}>
              <div>
                <div style={{fontFamily:'monospace',fontSize:9,color:G.muted,letterSpacing:'0.15em',marginBottom:5,textTransform:'uppercase'}}>{dateStr}</div>
                <div style={{fontSize:26,fontWeight:700,letterSpacing:'-0.02em',color:G.white}}>
                  {greeting}, <span style={{background:`linear-gradient(135deg,${G.accent},${G.cyan})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Cristian</span>
                </div>
              </div>
              <button onClick={()=>setPage('nuevo')} style={{display:'flex',alignItems:'center',gap:7,padding:'10px 20px',background:`linear-gradient(135deg,${G.accent},${G.cyan})`,border:'none',borderRadius:10,color:'#05111e',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 0 20px ${G.accent}50`,letterSpacing:'0.02em'}}>
                ⊕ Nuevo Trade
              </button>
            </div>

            {/* TOP STAT CARDS */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:14}}>
              {[
                {label:'BALANCE TOTAL',val:fmtA(animBalance),sub:'Capital + Aportaciones + P&L',color:G.accent,icon:'◎'},
                {label:'P&L TOTAL',val:fmt(totalPnl),sub:`${trades.length} operaciones registradas`,color:totalPnl>=0?G.green:G.red,icon:'↗'},
                {label:'TRADES HOY',val:String(trades.filter(t=>t.date===new Date().toISOString().split('T')[0]).length),sub:`${trades.length} histórico total`,color:G.gold,icon:'≡'},
              ].map(s=>(
                <div key={s.label} className="statcard" style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:'16px 18px',position:'relative',overflow:'hidden',transition:'all 0.2s',cursor:'default'}}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${s.color},transparent)`}}/>
                  <div style={{position:'absolute',top:10,right:14,fontSize:24,opacity:0.08,color:s.color}}>{s.icon}</div>
                  <div style={{fontFamily:'monospace',fontSize:9,letterSpacing:'0.18em',color:G.muted,marginBottom:8,textTransform:'uppercase'}}>{s.label}</div>
                  <div style={{fontFamily:'Space Mono',fontSize:26,fontWeight:700,color:s.color,lineHeight:1,letterSpacing:'-0.02em'}}>{s.val}</div>
                  <div style={{fontSize:11,color:G.muted,marginTop:6}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* GAUGES ROW */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:14}}>
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <CircleGauge value={wr} max={100} label={Math.round(animWr)+'%'} sublabel="WIN RATE" color={wr>=50?G.green:G.red} size={100}/>
              </div>
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <SemiGauge value={wins} max={Math.max(trades.length,1)} label={String(wins)} color={G.green}/>
                <div style={{fontFamily:'monospace',fontSize:9,color:G.muted,letterSpacing:'0.1em',textAlign:'center',marginTop:2}}>WINS TOTALES</div>
              </div>
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <CircleGauge value={capital.initial>0?(balance-capital.initial)/capital.initial*100:0} max={20} label={capital.initial>0?((balance-capital.initial)/capital.initial*100).toFixed(1)+'%':'—'} sublabel="RETORNO %" color={G.accent} size={100}/>
              </div>
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:16,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <CircleGauge value={trades.filter(t=>t.plan==='yes').length} max={Math.max(trades.length,1)} label={trades.length>0?Math.round(trades.filter(t=>t.plan==='yes').length/trades.length*100)+'%':'—'} sublabel="CON PLAN" color={G.purple} size={100}/>
              </div>
            </div>

            {/* CAPITAL CURVE */}
            <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:18,marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div><div style={{fontSize:13,fontWeight:600,color:G.text}}>Curva de Capital</div><div style={{fontSize:11,color:G.muted,marginTop:2}}>Evolución histórica del balance</div></div>
                <span style={{fontFamily:'Space Mono',fontSize:12,fontWeight:700,color:balance>=capital.initial?G.green:G.red}}>{fmt(balance-capital.initial)}</span>
              </div>
              <div style={{height:180}}>
                {curve.data.length>1?
                  <Line
                    data={{labels:curve.labels,datasets:[{data:curve.data,borderColor:G.accent,backgroundColor:`${G.accent}12`,borderWidth:2.5,pointRadius:curve.data.length<15?4:0,pointBackgroundColor:G.accent,pointBorderColor:G.bg,pointBorderWidth:2,fill:true,tension:0.4}]}}
                    options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:G.card2,titleColor:G.accent,bodyColor:G.text,borderColor:G.border,borderWidth:1}},scales:{x:{ticks:{color:G.muted,font:{family:'monospace' as const,size:9},maxTicksLimit:6},grid:{color:'rgba(255,255,255,0.03)'}},y:{ticks:{color:G.muted,font:{family:'monospace' as const,size:9},callback:(v:unknown)=>String(v)+'€'},grid:{color:'rgba(255,255,255,0.03)'}}}}}
                  />
                :<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:G.muted,fontSize:12,flexDirection:'column',gap:8}}><span style={{fontSize:28}}>📊</span>Añade tu primer trade</div>}
              </div>
            </div>

            {/* CALENDAR + RECENT TRADES */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
              {/* Calendar */}
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:18}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600}}>Calendario P&L</div>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()-1))} style={{background:G.card2,border:`1px solid ${G.border}`,borderRadius:6,color:G.accent,width:24,height:24,cursor:'pointer',fontSize:12}}>‹</button>
                    <span style={{fontFamily:'monospace',fontSize:9,color:G.accent,minWidth:96,textAlign:'center',letterSpacing:'0.06em'}}>{calMonth.toLocaleDateString('es-ES',{month:'short',year:'numeric'}).toUpperCase()}</span>
                    <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()+1))} style={{background:G.card2,border:`1px solid ${G.border}`,borderRadius:6,color:G.accent,width:24,height:24,cursor:'pointer',fontSize:12}}>›</button>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:3}}>
                  {['L','M','X','J','V','S','D'].map(d=><div key={d} style={{textAlign:'center',fontFamily:'monospace',fontSize:7,color:G.muted,letterSpacing:'0.08em'}}>{d}</div>)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
                  {calDays().map((cell,i)=>{
                    const isToday=cell&&`${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}`===new Date().toISOString().split('T')[0];
                    return(
                      <div key={i} style={{aspectRatio:'1',borderRadius:5,border:`1px solid ${cell?.pnl!=null?(cell.pnl>=0?`${G.green}35`:`${G.red}35`):isToday?G.accent:G.border}`,background:cell?.pnl!=null?(cell.pnl>=0?`${G.green}12`:`${G.red}12`):isToday?`${G.accent}10`:'transparent',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',boxShadow:isToday?`0 0 8px ${G.accent}30`:'none'}}>
                        {cell&&<>
                          <div style={{fontSize:7,color:isToday?G.accent:cell.pnl!=null?G.text:G.muted,fontWeight:isToday?700:600}}>{cell.day}</div>
                          {cell.pnl!=null&&<div style={{fontSize:6,fontFamily:'monospace',color:cell.pnl>=0?G.green:G.red,fontWeight:700}}>{cell.pnl>=0?'+':''}{cell.pnl.toFixed(0)}</div>}
                        </>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent trades */}
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:18}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600}}>Trades Recientes</div>
                  <button onClick={()=>setPage('historial')} style={{fontSize:10,color:G.accent,background:'none',border:'none',cursor:'pointer',fontFamily:'monospace'}}>VER TODOS →</button>
                </div>
                {trades.length===0?<div style={{textAlign:'center',padding:'28px 0',color:G.muted,fontSize:12}}>Sin trades aún</div>
                :[...trades].reverse().slice(0,7).map(t=>(
                  <div key={t.id} onClick={()=>setModalTrade(t)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderRadius:8,cursor:'pointer',marginBottom:4,transition:'all 0.12s'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=G.card2}
                    onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                    <div style={{display:'flex',alignItems:'center',gap:9}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:t.res==='win'?G.green:t.res==='loss'?G.red:G.purple,flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:G.text}}>{t.pair} <span style={{fontSize:10,color:t.dir==='buy'?G.green:G.red}}>{t.dir==='buy'?'▲':'▼'}</span></div>
                        <div style={{fontSize:10,color:G.muted}}>{t.date} · {t.tf}</div>
                      </div>
                    </div>
                    <div style={{fontFamily:'Space Mono',fontSize:13,fontWeight:700,color:t.pnl>0?G.green:t.pnl<0?G.red:G.purple}}>{fmt(t.pnl)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* DONUT DISTRIBUTION + LAST TRADES CIRCLES */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:12,marginBottom:14}}>
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:18,display:'flex',flexDirection:'column',alignItems:'center'}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4,alignSelf:'flex-start'}}>Distribución</div>
                <div style={{fontSize:11,color:G.muted,marginBottom:12,alignSelf:'flex-start'}}>Wins / Losses / Breakeven</div>
                {trades.length>0?
                  <div style={{width:160,height:160}}>
                    <Doughnut data={{labels:['Wins','Losses','BE'],datasets:[{data:[wins,losses,bes],backgroundColor:[`${G.green}cc`,`${G.red}cc`,`${G.purple}99`],borderWidth:0,hoverOffset:8}]}}
                      options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:G.text,font:{size:10},padding:10,boxWidth:8,boxHeight:8}},tooltip:{backgroundColor:G.card2,titleColor:G.accent,bodyColor:G.text}}}}/>
                  </div>
                :<div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:G.muted,fontSize:12}}>Sin datos</div>}
              </div>

              {/* Last 10 trades as circles */}
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:18}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Últimas {last10.length} Operaciones</div>
                <div style={{fontSize:11,color:G.muted,marginBottom:14}}>Resultado visual por trade</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:10,justifyContent:'flex-start'}}>
                  {last10.map((t,i)=>(
                    <div key={t.id} onClick={()=>setModalTrade(t)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,cursor:'pointer'}}>
                      <div style={{width:52,height:52,borderRadius:'50%',background:t.res==='win'?`${G.green}20`:t.res==='loss'?`${G.red}20`:`${G.purple}20`,border:`2px solid ${t.res==='win'?G.green:t.res==='loss'?G.red:G.purple}`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 0 12px ${t.res==='win'?G.green:t.res==='loss'?G.red:G.purple}30`,transition:'transform 0.2s'}}
                        onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.transform='scale(1.1)'}
                        onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.transform='scale(1)'}>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontFamily:'Space Mono',fontSize:9,fontWeight:700,color:t.res==='win'?G.green:t.res==='loss'?G.red:G.purple,lineHeight:1}}>{t.pnl>=0?'+':''}{Math.abs(t.pnl).toFixed(0)}</div>
                          <div style={{fontSize:7,color:G.muted,marginTop:1}}>{t.pair.split('/')[0]}</div>
                        </div>
                      </div>
                      <div style={{fontSize:8,color:G.muted,fontFamily:'monospace'}}>{t.date.slice(5)}</div>
                    </div>
                  ))}
                  {last10.length===0&&<div style={{color:G.muted,fontSize:12}}>Sin trades aún</div>}
                </div>
              </div>
            </div>

            {/* TODAY'S ECON EVENTS */}
            <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:18}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div><div style={{fontSize:13,fontWeight:600}}>⚡ Eventos Económicos — Hoy</div><div style={{fontSize:11,color:G.muted,marginTop:2}}>USD · EUR · GBP</div></div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={loadEcon} style={{fontSize:10,color:G.accent,background:G.card2,border:`1px solid ${G.border}`,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:'monospace'}}>↻</button>
                  <button onClick={()=>setPage('noticias')} style={{fontSize:10,color:G.accent,background:'none',border:`1px solid ${G.border}`,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:'monospace'}}>CALENDARIO →</button>
                </div>
              </div>
              {econLoading?<div style={{textAlign:'center',padding:'16px 0',color:G.muted,fontSize:12}}>Cargando...</div>
              :todayEvents.length===0?
                <div style={{textAlign:'center',padding:'16px 0',color:G.muted,fontSize:12}}>No hay eventos relevantes hoy · <span style={{color:G.accent,cursor:'pointer'}} onClick={()=>setPage('noticias')}>Ver semana completa →</span></div>
              :(
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {todayEvents.map((ev,i)=>{
                    const d=new Date(ev.date); const isPast=d<new Date(); const isNear=!isPast&&(d.getTime()-new Date().getTime())<3600000;
                    return(
                      <div key={i} style={{background:G.card2,borderRadius:9,padding:'11px 12px',border:`1px solid ${isNear?`${G.gold}50`:ev.impact==='High'?`${G.red}25`:G.border}`,opacity:isPast?0.55:1,boxShadow:isNear?`0 0 14px ${G.gold}20`:ev.impact==='High'&&!isPast?`0 0 8px ${G.red}12`:'none'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                          <span style={{fontFamily:'Space Mono',fontSize:12,fontWeight:700,color:isNear?G.gold:G.text}}>{d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</span>
                          <div style={{display:'flex',gap:5,alignItems:'center'}}>
                            <span style={{fontSize:9,fontFamily:'monospace',padding:'2px 6px',borderRadius:4,background:ev.currency==='USD'?`${G.accent}25`:ev.currency==='EUR'?`${G.cyan}20`:`${G.purple}25`,color:ev.currency==='USD'?G.accent:ev.currency==='EUR'?G.cyan:G.purple,fontWeight:700}}>{ev.currency}</span>
                            <span>{ev.impact==='High'?'🔴':'🟡'}</span>
                          </div>
                        </div>
                        <div style={{fontSize:11,fontWeight:600,color:G.text,lineHeight:1.3,marginBottom:6}}>{ev.title}</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:3}}>
                          {[['ANT',ev.previous,G.muted2],['PREV',ev.forecast,G.gold],['REAL',ev.actual,G.green]].map(([l,v,c])=>(
                            <div key={l as string} style={{textAlign:'center',background:G.bg,borderRadius:5,padding:'4px 2px'}}>
                              <div style={{fontFamily:'monospace',fontSize:7,color:G.muted}}>{l}</div>
                              <div style={{fontFamily:'monospace',fontSize:10,fontWeight:700,color:(v?c:G.muted) as string}}>{(v as string)||'—'}</div>
                            </div>
                          ))}
                        </div>
                        {isNear&&<div style={{marginTop:6,textAlign:'center',fontSize:8,color:G.gold,fontFamily:'monospace',animation:'pulse 1.5s ease infinite'}}>⚠ NO OPERES — PRÓXIMO</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ NUEVO TRADE ═══ */}
        {page==='nuevo'&&(
          <div className="pe">
            <div style={{marginBottom:20}}><div style={{fontSize:22,fontWeight:700}}>Nuevo Trade</div><div style={{fontSize:12,color:G.muted,marginTop:2}}>Registra tu operación</div></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 270px',gap:14,alignItems:'start'}}>
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:22}}>
                <div style={secT}>INFO BÁSICA</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  <div><label style={lbl}>FECHA</label><input type="date" value={fDate} onChange={e=>setFDate(e.target.value)} style={inp}/></div>
                  <div><label style={lbl}>HORA</label><input type="time" value={fTime} onChange={e=>setFTime(e.target.value)} style={inp}/></div>
                  <div><label style={lbl}>ACTIVO</label><select value={fPair} onChange={e=>setFPair(e.target.value)} style={inp}><option>XAU/USD</option><option>NAS100</option><option>BTC/USD</option><option>Otro</option></select></div>
                  <div><label style={lbl}>TIMEFRAME</label><select value={fTf} onChange={e=>setFTf(e.target.value)} style={inp}><option>15M</option><option>1H</option><option>4H</option></select></div>
                </div>
                <div style={{marginBottom:20}}><label style={lbl}>DIRECCIÓN</label><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><Tog label="▲ LONG" active={fDir==='buy'} color={G.green} bg={`${G.green}15`} onClick={()=>setFDir('buy')}/><Tog label="▼ SHORT" active={fDir==='sell'} color={G.red} bg={`${G.red}15`} onClick={()=>setFDir('sell')}/></div></div>
                <div style={secT}>PRECIOS</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
                  {[['ENTRADA',fEntry,setFEntry],['STOP LOSS',fSl,setFSl],['TAKE PROFIT',fTp,setFTp]].map(([l,v,s])=>(
                    <div key={l as string}><label style={lbl}>{l as string}</label><input type="number" value={v as string} onChange={e=>(s as (x:string)=>void)(e.target.value)} placeholder="0.00" style={inp}/></div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20}}>
                  <div><label style={lbl}>RIESGO €</label><input type="number" value={fRisk} onChange={e=>setFRisk(e.target.value)} placeholder="0.00" style={inp}/></div>
                  <div><label style={lbl}>LOTE</label><input type="number" value={fLot} onChange={e=>setFLot(e.target.value)} placeholder="0.01" style={inp}/></div>
                  <div><label style={lbl}>R:R</label><div style={{background:G.card2,border:`1px solid ${parseFloat(fRR.split(':')[1])>=2?`${G.green}60`:G.border}`,borderRadius:8,padding:'9px 12px',fontFamily:'monospace',fontWeight:700,color:parseFloat(fRR.split(':')[1])>=2?G.green:G.gold,textAlign:'center',fontSize:13}}>{fRR}</div></div>
                </div>
                <div style={secT}>RESULTADO</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
                  <Tog label="✓ WIN" active={fRes==='win'} color={G.green} bg={`${G.green}15`} onClick={()=>setFRes('win')}/>
                  <Tog label="✕ LOSS" active={fRes==='loss'} color={G.red} bg={`${G.red}15`} onClick={()=>setFRes('loss')}/>
                  <Tog label="— BE" active={fRes==='be'} color={G.purple} bg={`${G.purple}15`} onClick={()=>setFRes('be')}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
                  <div><label style={lbl}>P&L REAL €</label><input type="number" value={fPnl} onChange={e=>setFPnl(e.target.value)} placeholder="±0.00" style={inp}/></div>
                  <div><label style={lbl}>R OBTENIDO</label><input type="text" value={fRreal} onChange={e=>setFRreal(e.target.value)} placeholder="+2R" style={inp}/></div>
                </div>
                <div style={secT}>CONFLUENCIAS</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:20}}>
                  {['Zona liquidez','Fibo 0.618','Fibo 0.5','Fibo 0.786','Nº redondo','DXY confirm','Sesión asiática','Dirección 4H','Estructura 1H'].map(c=>(
                    <button key={c} onClick={()=>toggleConf(c)} style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${fConf.includes(c)?G.accent:G.border}`,background:fConf.includes(c)?`${G.accent}15`:'transparent',color:fConf.includes(c)?G.accent:G.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit',transition:'all 0.12s'}}>{c}</button>
                  ))}
                </div>
                <div style={secT}>PSICOLOGÍA</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                  {['😐 Neutro','😌 Tranquilo','💪 Confiado','😰 Ansioso','😤 Frustrado','🎲 FOMO','😡 Revenge'].map(e=>(
                    <button key={e} onClick={()=>setFEmo(fEmo===e?'':e)} style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${fEmo===e?G.purple:G.border}`,background:fEmo===e?`${G.purple}18`:'transparent',color:fEmo===e?G.purple:G.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit',transition:'all 0.12s'}}>{e}</button>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
                  <Tog label="✓ Plan seguido" active={fPlan==='yes'} color={G.green} bg={`${G.green}15`} onClick={()=>setFPlan('yes')}/>
                  <Tog label="✕ Sin plan" active={fPlan==='no'} color={G.red} bg={`${G.red}15`} onClick={()=>setFPlan('no')}/>
                </div>
                <div style={secT}>NOTAS</div>
                <textarea value={fNotes} onChange={e=>setFNotes(e.target.value)} placeholder="¿Qué setup viste? ¿Qué aprendiste?" style={{...inp,minHeight:80,resize:'vertical',lineHeight:1.6,marginBottom:20}}/>
                <button onClick={saveTrade} disabled={saving} style={{width:'100%',padding:13,background:saving?G.muted:`linear-gradient(135deg,${G.accent},${G.cyan})`,border:'none',borderRadius:10,color:'#05111e',fontSize:14,fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:saving?'none':`0 0 20px ${G.accent}40`,letterSpacing:'0.03em',transition:'all 0.2s'}}>
                  {saving?'⟳ GUARDANDO...':'⊕ GUARDAR OPERACIÓN'}
                </button>
              </div>
              <div style={{position:'sticky',top:22,display:'flex',flexDirection:'column',gap:12}}>
                <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:16}}>
                  <div style={{fontSize:11,fontWeight:600,color:G.accent,marginBottom:12,fontFamily:'monospace',letterSpacing:'0.1em'}}>PREVIEW</div>
                  {[['PAR',fPair],['DIR',fDir?(fDir==='buy'?'▲ LONG':'▼ SHORT'):'—'],['R:R',fRR],['RIESGO',fRisk?fRisk+'€':'—'],['RES.',fRes?.toUpperCase()||'—'],['P&L',fPnl?fmt(parseFloat(fPnl)):'—'],['PLAN',fPlan==='yes'?'✓':fPlan==='no'?'✕':'—']].map(([k,v])=>(
                    <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${G.border}`,fontSize:11}}>
                      <span style={{color:G.muted,fontFamily:'monospace',fontSize:9}}>{k}</span>
                      <span style={{fontFamily:'monospace',fontWeight:700,fontSize:11,color:G.text}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{background:G.card,border:`1px solid ${G.border2}`,borderRadius:14,padding:16}}>
                  <div style={{fontFamily:'monospace',fontSize:9,color:G.muted,marginBottom:5}}>BALANCE ACTUAL</div>
                  <div style={{fontFamily:'Space Mono',fontSize:22,fontWeight:700,color:balance>=capital.initial?G.green:G.red}}>{fmtA(balance)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ HISTORIAL ═══ */}
        {page==='historial'&&(
          <div className="pe">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div><div style={{fontSize:22,fontWeight:700}}>Historial</div><div style={{fontSize:12,color:G.muted,marginTop:2}}>{filteredTrades.length} operaciones</div></div>
              <div style={{display:'flex',gap:6}}>
                {[['all','Todas'],['win','Wins'],['loss','Losses'],['XAU/USD','Oro'],['NAS100','Nasdaq']].map(([f,l])=>(
                  <button key={f} onClick={()=>setHistFilter(f)} style={{padding:'5px 13px',borderRadius:20,border:`1px solid ${histFilter===f?G.accent:G.border}`,background:histFilter===f?`${G.accent}15`:'transparent',color:histFilter===f?G.accent:G.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit',transition:'all 0.12s'}}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'100px 90px 55px 80px 60px 1fr 90px',padding:'10px 18px',background:G.bg,borderBottom:`1px solid ${G.border}`,gap:8}}>
                {['Fecha','Activo','Dir','Resultado','Plan','Notas','P&L'].map(h=><span key={h} style={{fontFamily:'monospace',fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:G.muted}}>{h}</span>)}
              </div>
              {filteredTrades.length===0?<div style={{textAlign:'center',padding:'48px 0',color:G.muted,fontSize:13}}>Sin operaciones</div>
              :filteredTrades.map(t=>(
                <div key={t.id} onClick={()=>setModalTrade(t)} className="trow" style={{display:'grid',gridTemplateColumns:'100px 90px 55px 80px 60px 1fr 90px',padding:'12px 18px',borderBottom:`1px solid ${G.border}`,gap:8,alignItems:'center',cursor:'pointer',transition:'background 0.1s'}}>
                  <span style={{fontFamily:'monospace',fontSize:11,color:G.muted}}>{t.date}</span>
                  <span style={{fontFamily:'monospace',fontSize:11,color:G.accent}}>{t.pair}</span>
                  <span style={{fontSize:12,color:t.dir==='buy'?G.green:G.red,fontWeight:700}}>{t.dir==='buy'?'▲ L':'▼ S'}</span>
                  <span style={{padding:'3px 8px',borderRadius:5,fontSize:10,fontFamily:'monospace',fontWeight:700,background:t.res==='win'?`${G.green}18`:t.res==='loss'?`${G.red}18`:`${G.purple}18`,color:t.res==='win'?G.green:t.res==='loss'?G.red:G.purple,display:'inline-block'}}>{t.res.toUpperCase()}</span>
                  <span style={{color:t.plan==='yes'?G.green:t.plan==='no'?G.red:G.muted,fontSize:12,fontWeight:700}}>{t.plan==='yes'?'✓':t.plan==='no'?'✕':'—'}</span>
                  <span style={{color:G.muted,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.notes?t.notes.slice(0,40)+(t.notes.length>40?'…':''):'—'}</span>
                  <span style={{fontFamily:'Space Mono',fontSize:13,fontWeight:700,textAlign:'right',color:t.pnl>0?G.green:t.pnl<0?G.red:G.purple}}>{fmt(t.pnl)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ CAPITAL ═══ */}
        {page==='capital'&&(
          <div className="pe">
            <div style={{marginBottom:20}}><div style={{fontSize:22,fontWeight:700}}>Capital</div><div style={{fontSize:12,color:G.muted,marginTop:2}}>Gestión de capital y aportaciones</div></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,alignItems:'start'}}>
              <div>
                <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:20,marginBottom:12}}>
                  <div style={secT}>CAPITAL INICIAL</div>
                  <label style={lbl}>IMPORTE €</label>
                  <input type="number" value={capInitial} onChange={e=>setCapInitial(e.target.value)} placeholder="500.00" style={{...inp,marginBottom:12}}/>
                  <button onClick={setIC} style={{width:'100%',padding:11,background:`linear-gradient(135deg,#065f46,${G.green})`,border:'none',borderRadius:9,color:'#05111e',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 0 16px ${G.green}25`}}>Guardar capital inicial</button>
                </div>
                <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:20}}>
                  <div style={secT}>NUEVA APORTACIÓN</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                    <div><label style={lbl}>FECHA</label><input type="date" value={apDate} onChange={e=>setApDate(e.target.value)} style={inp}/></div>
                    <div><label style={lbl}>IMPORTE €</label><input type="number" value={apAmount} onChange={e=>setApAmount(e.target.value)} placeholder="100.00" style={inp}/></div>
                  </div>
                  <label style={lbl}>DESCRIPCIÓN</label>
                  <input type="text" value={apDesc} onChange={e=>setApDesc(e.target.value)} placeholder="Aportación mensual agosto" style={{...inp,marginBottom:12}}/>
                  <button onClick={addAp} style={{width:'100%',padding:11,background:`linear-gradient(135deg,${G.accent},${G.cyan})`,border:'none',borderRadius:9,color:'#05111e',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 0 16px ${G.accent}25`}}>Añadir aportación</button>
                </div>
              </div>
              <div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                  {[{l:'Capital inicial',v:fmtA(capital.initial),c:G.accent},{l:'Total aportado',v:fmtA(totalAport),c:G.gold},{l:'P&L total',v:fmt(totalPnl),c:totalPnl>=0?G.green:G.red},{l:'Balance total',v:fmtA(balance),c:G.cyan}].map(s=>(
                    <div key={s.l} style={{background:G.card,border:`1px solid ${G.border}`,borderTop:`2px solid ${s.c}`,borderRadius:12,padding:14}}>
                      <div style={{fontFamily:'monospace',fontSize:8,color:G.muted,letterSpacing:'0.1em',marginBottom:6,textTransform:'uppercase'}}>{s.l}</div>
                      <div style={{fontFamily:'Space Mono',fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:14,padding:18}}>
                  <div style={secT}>HISTORIAL APORTACIONES</div>
                  {capital.aportaciones.length===0?<div style={{textAlign:'center',padding:'20px 0',color:G.muted,fontSize:12}}>Sin aportaciones aún</div>
                  :capital.aportaciones.map(a=>(
                    <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 12px',background:G.card2,borderRadius:8,marginBottom:6,border:`1px solid ${G.border}`}}>
                      <div><div style={{fontWeight:600,fontSize:13}}>{a.desc}</div><div style={{fontSize:11,color:G.muted}}>{a.date}</div></div>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontFamily:'monospace',fontWeight:700,color:G.green}}>+{fmtA(a.amount)}</span>
                        <button onClick={()=>delAp(a.id)} style={{background:`${G.red}15`,border:`1px solid ${G.red}50`,color:G.red,padding:'3px 8px',borderRadius:6,fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ NOTICIAS ═══ */}
        {page==='noticias'&&(
          <div className="pe">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontSize:22,fontWeight:700}}>Calendario Económico</div>
                <div style={{fontSize:12,color:G.muted,marginTop:2}}>USD · EUR · GBP — Alto y medio impacto{econUpdated?` · Act. ${new Date(econUpdated).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}`:''}</div>
              </div>
              <button onClick={loadEcon} disabled={econLoading} style={{padding:'9px 16px',background:G.card2,border:`1px solid ${G.border}`,borderRadius:8,color:G.accent,fontSize:11,cursor:'pointer',fontFamily:'monospace',letterSpacing:'0.08em'}}>
                {econLoading?'⟳ CARGANDO...':'↻ ACTUALIZAR'}
              </button>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:18}}>
              {[['🔴 Alto impacto — no operar',G.red],['🟡 Medio impacto — precaución',G.gold],['⚠ Esperar 15min antes/después',G.accent]].map(([l,c])=>(
                <div key={l} style={{padding:'6px 14px',borderRadius:20,background:`${c}12`,border:`1px solid ${c}35`,fontSize:11,color:c as string}}>{l}</div>
              ))}
            </div>

            {econLoading?<div style={{textAlign:'center',padding:'60px 0',color:G.muted}}><div style={{width:32,height:32,border:`2px solid ${G.border}`,borderTop:`2px solid ${G.accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px'}}/><div style={{fontFamily:'monospace',fontSize:11}}>BUSCANDO EVENTOS...</div></div>
            :econEvents.length===0?<div style={{textAlign:'center',padding:'60px 0',color:G.muted,fontSize:13}}>Sin eventos. Pulsa actualizar.</div>
            :(() => {
              const grouped:Record<string,EconEvent[]>={};
              econEvents.forEach(ev=>{
                const d=new Date(ev.date);
                const k=d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
                if(!grouped[k])grouped[k]=[];
                grouped[k].push(ev);
              });
              return Object.entries(grouped).map(([dateLabel,events])=>{
                const isToday=events.some(ev=>new Date(ev.date).toDateString()===new Date().toDateString());
                return(
                  <div key={dateLabel} style={{marginBottom:20}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${G.border}`}}>
                      <div style={{fontFamily:'monospace',fontSize:10,letterSpacing:'0.15em',color:isToday?G.accent:G.muted2,textTransform:'uppercase'}}>{dateLabel}</div>
                      {isToday&&<span style={{fontSize:9,fontFamily:'monospace',padding:'2px 8px',borderRadius:4,background:`${G.accent}20`,color:G.accent,border:`1px solid ${G.accent}40`}}>● HOY</span>}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:5}}>
                      {events.map((ev,i)=>{
                        const d=new Date(ev.date); const isPast=d<new Date(); const isNear=!isPast&&(d.getTime()-new Date().getTime())<3600000;
                        return(
                          <div key={i} style={{display:'grid',gridTemplateColumns:'100px 65px 36px 1fr 95px 95px 95px',gap:10,alignItems:'center',padding:'12px 16px',background:isNear?`${G.gold}08`:G.card,border:`1px solid ${isNear?`${G.gold}45`:ev.impact==='High'?`${G.red}20`:G.border}`,borderRadius:10,opacity:isPast?0.5:1,boxShadow:isNear?`0 0 14px ${G.gold}15`:ev.impact==='High'&&!isPast?`0 0 8px ${G.red}08`:'none'}}>
                            <div>
                              <div style={{fontFamily:'Space Mono',fontSize:14,fontWeight:700,color:isNear?G.gold:G.white}}>{d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</div>
                              <div style={{fontFamily:'monospace',fontSize:8,color:G.muted,marginTop:1}}>{d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'2-digit'})}</div>
                              {isNear&&<div style={{fontSize:7,color:G.gold,fontFamily:'monospace',marginTop:2,animation:'pulse 1.5s ease infinite'}}>¡PRÓXIMO!</div>}
                              {isPast&&<div style={{fontSize:7,color:G.muted,fontFamily:'monospace',marginTop:1}}>finalizado</div>}
                            </div>
                            <div style={{textAlign:'center'}}>
                              <span style={{fontSize:10,fontFamily:'monospace',padding:'3px 8px',borderRadius:5,background:ev.currency==='USD'?`${G.accent}25`:ev.currency==='EUR'?`${G.cyan}20`:`${G.purple}25`,color:ev.currency==='USD'?G.accent:ev.currency==='EUR'?G.cyan:G.purple,fontWeight:700}}>{ev.currency}</span>
                            </div>
                            <div style={{fontSize:18,textAlign:'center'}}>{ev.impact==='High'?'🔴':'🟡'}</div>
                            <div style={{fontSize:13,fontWeight:600,color:G.text}}>{ev.title}</div>
                            {[['ANT.',ev.previous,G.muted2],['PREV.',ev.forecast,G.gold],['REAL',ev.actual,G.green]].map(([lbl2,val,col])=>(
                              <div key={lbl2 as string} style={{textAlign:'center',background:G.card2,borderRadius:7,padding:'7px 6px',border:`1px solid ${val&&lbl2==='REAL'?`${col}30`:G.border}`}}>
                                <div style={{fontFamily:'monospace',fontSize:7,color:G.muted,marginBottom:3,letterSpacing:'0.1em'}}>{lbl2}</div>
                                <div style={{fontFamily:'Space Mono',fontSize:12,fontWeight:700,color:(val?col:G.muted) as string}}>{(val as string)||'—'}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}

            <div style={{background:`${G.gold}07`,border:`1px solid ${G.gold}28`,borderRadius:14,padding:18,marginTop:8}}>
              <div style={{fontSize:13,fontWeight:600,color:G.gold,marginBottom:12}}>⚠️ Reglas en eventos de alto impacto</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {['🚫 No abrir posiciones 15 min antes del evento rojo','⏳ Esperar 15 min después antes de entrar','📊 El Oro reacciona fuerte al IPC y decisiones FED','📈 El Nasdaq es muy sensible a NFP y tipos de interés','💱 El spread se amplía justo antes de las noticias','✅ Los mejores setups aparecen 30 min después'].map((r,i)=>(
                  <div key={i} style={{background:G.card,borderRadius:8,padding:'9px 12px',fontSize:12,color:G.muted2,lineHeight:1.5,border:`1px solid ${G.border}`}}>{r}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE NAV */}
      <div className="bn" style={{position:'fixed',bottom:0,left:0,right:0,background:G.sb,borderTop:`1px solid ${G.border}`,zIndex:200,display:'none'}}>
        <div style={{display:'flex',justifyContent:'space-around',padding:'8px 0'}}>
          {(['dashboard','nuevo','historial','capital','noticias'] as Page[]).map((p,i)=>{
            const icons=['◉','⊕','≡','◈','⚡'],labels=['Inicio','Trade','Historial','Capital','Noticias'];
            return<button key={p} onClick={()=>setPage(p)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'6px 12px',background:'none',border:'none',cursor:'pointer',color:page===p?G.accent:G.muted,transition:'color 0.15s'}}><span style={{fontSize:18}}>{icons[i]}</span><span style={{fontSize:9,fontFamily:'monospace'}}>{labels[i]}</span></button>;
          })}
        </div>
      </div>

      {/* MODAL */}
      {modalTrade&&(
        <div onClick={e=>e.target===e.currentTarget&&setModalTrade(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'}}>
          <div style={{background:G.card,border:`1px solid ${G.border2}`,borderRadius:18,padding:24,width:'100%',maxWidth:480,maxHeight:'85vh',overflowY:'auto',boxShadow:`0 0 40px ${G.accent}15`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <div><div style={{fontSize:16,fontWeight:700,color:G.accent}}>{modalTrade.pair}</div><div style={{fontSize:11,color:G.muted,marginTop:2}}>{modalTrade.date} · {modalTrade.time} · {modalTrade.tf}</div></div>
              <button onClick={()=>setModalTrade(null)} style={{width:30,height:30,borderRadius:8,border:`1px solid ${G.border}`,background:G.card2,color:G.muted,cursor:'pointer',fontSize:15}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
              {[{l:'Resultado',v:modalTrade.res.toUpperCase(),c:modalTrade.res==='win'?G.green:modalTrade.res==='loss'?G.red:G.purple},{l:'P&L',v:fmt(modalTrade.pnl),c:modalTrade.pnl>0?G.green:modalTrade.pnl<0?G.red:G.purple},{l:'Dirección',v:modalTrade.dir==='buy'?'▲ LONG':'▼ SHORT',c:modalTrade.dir==='buy'?G.green:G.red},{l:'R:R',v:modalTrade.rr,c:G.gold},{l:'Riesgo',v:modalTrade.risk+'€',c:G.red},{l:'R obtenido',v:modalTrade.rreal||'—',c:G.green}].map(s=>(
                <div key={s.l} style={{background:G.card2,borderRadius:9,padding:'10px 12px',border:`1px solid ${G.border}`}}>
                  <div style={{fontFamily:'monospace',fontSize:8,letterSpacing:'0.12em',color:G.muted,marginBottom:4,textTransform:'uppercase'}}>{s.l}</div>
                  <div style={{fontFamily:'Space Mono',fontSize:14,fontWeight:700,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
            {modalTrade.entry>0&&<div style={{background:G.card2,borderRadius:9,padding:'10px 12px',fontFamily:'monospace',fontSize:11,lineHeight:2,marginBottom:12,border:`1px solid ${G.border}`}}>Entry: <span style={{color:G.gold}}>{modalTrade.entry}</span> · SL: <span style={{color:G.red}}>{modalTrade.sl}</span> · TP: <span style={{color:G.green}}>{modalTrade.tp}</span></div>}
            {modalTrade.conf.length>0&&<div style={{marginBottom:12}}><div style={{fontFamily:'monospace',fontSize:8,color:G.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:'0.1em'}}>Confluencias</div><div style={{display:'flex',flexWrap:'wrap',gap:5}}>{modalTrade.conf.map(c=><span key={c} style={{padding:'4px 10px',background:`${G.accent}10`,border:`1px solid ${G.border}`,borderRadius:12,fontSize:11,color:G.accent}}>{c}</span>)}</div></div>}
            <div style={{display:'flex',gap:16,marginBottom:12}}>
              <div><div style={{fontFamily:'monospace',fontSize:8,color:G.muted,marginBottom:3,textTransform:'uppercase'}}>Emoción</div><span style={{fontSize:13}}>{modalTrade.emo||'—'}</span></div>
              <div><div style={{fontFamily:'monospace',fontSize:8,color:G.muted,marginBottom:3,textTransform:'uppercase'}}>Plan</div><span style={{color:modalTrade.plan==='yes'?G.green:G.red,fontWeight:700}}>{modalTrade.plan==='yes'?'✓ Sí':modalTrade.plan==='no'?'✕ No':'—'}</span></div>
            </div>
            {modalTrade.notes&&<div style={{background:G.card2,borderRadius:9,padding:12,fontSize:12,color:G.muted2,lineHeight:1.7,marginBottom:14,border:`1px solid ${G.border}`}}>{modalTrade.notes}</div>}
            <button onClick={()=>deleteTrade(modalTrade.id)} style={{width:'100%',padding:11,background:`${G.red}15`,border:`1px solid ${G.red}50`,borderRadius:9,color:G.red,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Eliminar operación</button>
          </div>
        </div>
      )}
    </div>
  );
}
