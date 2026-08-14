'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

type Trade = { id: number; date: string; time: string; pair: string; tf: string; dir: string; res: string; plan: string | null; entry: number; sl: number; tp: number; risk: number; lot: number; rr: string; pnl: number; rreal: string; conf: string[]; emo: string; notes: string; };
type Capital = { initial: number; aportaciones: { id: number; date: string; amount: number; desc: string }[]; };
type Objetivo = { id: number; label: string; target: number; current: number; color: string; };
type Page = 'dashboard' | 'nuevo' | 'historial' | 'capital' | 'noticias' | 'rendimiento' | 'objetivos';

const fmt = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '€';
const fmtA = (n: number) => n.toFixed(2) + '€';
const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

const G = {
  bg: '#0b1a2e', sb: '#0d1f38', card: '#112240', card2: '#162d4a',
  border: 'rgba(100,160,255,0.12)', border2: 'rgba(0,229,255,0.3)',
  accent: '#4d9fff', cyan: '#00e5ff', green: '#00e676', red: '#ff4081',
  gold: '#ffb300', purple: '#7c4dff', text: '#e8f4ff', muted: '#4a7a9b', muted2: '#6b9cc7',
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

const Logo = () => (
  <svg width="46" height="46" viewBox="0 0 46 46" fill="none">
    {/* Background with subtle inner glow */}
    <rect width="46" height="46" rx="13" fill="#060f1e"/>
    <rect width="46" height="46" rx="13" fill="url(#lgInner)" opacity="0.6"/>
    {/* Glowing border */}
    <rect x="0.75" y="0.75" width="44.5" height="44.5" rx="12.25" stroke="url(#lgBorder)" strokeWidth="1.5" fill="none"/>
    {/* S letter - bold, left */}
    <text x="11" y="30" fontFamily="'Arial Black',Impact,'Helvetica Neue',sans-serif" fontSize="20" fontWeight="900" fill="url(#lgS)">S</text>
    {/* T letter - bold, right, slightly offset */}
    <text x="26" y="30" fontFamily="'Arial Black',Impact,'Helvetica Neue',sans-serif" fontSize="20" fontWeight="900" fill="url(#lgT)">T</text>
    {/* Thin accent line below */}
    <rect x="8" y="33.5" width="30" height="1.5" rx="0.75" fill="url(#lgLine)"/>
    {/* Top right glow dot */}
    <circle cx="40" cy="9" r="2.5" fill="#00e5ff" opacity="0.9" style={{filter:'blur(0.5px)'}}/>
    <circle cx="40" cy="9" r="5" fill="#00e5ff" opacity="0.15"/>
    <defs>
      <linearGradient id="lgInner" x1="0" y1="0" x2="46" y2="46">
        <stop offset="0%" stopColor="#1a3a6e" stopOpacity="0.4"/>
        <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.05"/>
      </linearGradient>
      <linearGradient id="lgBorder" x1="0" y1="0" x2="46" y2="46">
        <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.9"/>
        <stop offset="40%" stopColor="#4d9fff" stopOpacity="0.6"/>
        <stop offset="100%" stopColor="#4d9fff" stopOpacity="0.1"/>
      </linearGradient>
      <linearGradient id="lgS" x1="0" y1="10" x2="0" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff"/>
        <stop offset="100%" stopColor="#4d9fff"/>
      </linearGradient>
      <linearGradient id="lgT" x1="0" y1="10" x2="0" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00e5ff"/>
        <stop offset="100%" stopColor="#4d9fff"/>
      </linearGradient>
      <linearGradient id="lgLine" x1="8" y1="0" x2="38" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#4d9fff" stopOpacity="0.2"/>
        <stop offset="40%" stopColor="#00e5ff"/>
        <stop offset="100%" stopColor="#4d9fff" stopOpacity="0.2"/>
      </linearGradient>
    </defs>
  </svg>
);

const CircleGauge = ({ value, max, label, sublabel, color, size = 100 }: { value: number; max: number; label: string; sublabel: string; color: string; size?: number }) => {
  const pct = max > 0 ? Math.min(Math.abs(value) / max, 1) : 0;
  const r = (size - 14) / 2, circ = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9"/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="9"
            strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}90)`, transition: 'stroke-dasharray 1.2s ease' }}/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: size > 90 ? 16 : 13, fontWeight: 700, color: G.text }}>{label}</span>
        </div>
      </div>
      <span style={{ fontSize: 9, color: G.muted, fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{sublabel}</span>
    </div>
  );
};

const SemiGauge = ({ value, max, label, sublabel, color }: { value: number; max: number; label: string; sublabel: string; color: string }) => {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = 46, cx = 65, cy = 58;
  const arc = (angle: number) => ({ x: cx + r * Math.cos(Math.PI + angle * Math.PI), y: cy + r * Math.sin(Math.PI + angle * Math.PI) });
  const end = arc(pct);
  const largeArc = pct > 0.5 ? 1 : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="130" height="75" viewBox="0 0 130 75">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9" strokeLinecap="round"/>
        {pct > 0 && <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${color})` }}/>}
        <text x={cx} y={cy + 2} textAnchor="middle" fill={G.text} fontSize="20" fontWeight="700" fontFamily="'Outfit', sans-serif">{label}</text>
      </svg>
      <span style={{ fontSize: 9, color: G.muted, fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: -8 }}>{sublabel}</span>
    </div>
  );
};

const ProgressBall = ({ objetivo, onEdit, onDelete }: { objetivo: Objetivo; onEdit: () => void; onDelete: () => void }) => {
  const pct = objetivo.target > 0 ? Math.min(objetivo.current / objetivo.target * 100, 100) : 0;
  const r = 38, circ = 2 * Math.PI * r;
  return (
    <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, padding: '16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative' }}>
      <button onClick={onDelete} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: G.muted, cursor: 'pointer', fontSize: 12 }}>✕</button>
      <div style={{ position: 'relative', width: 90, height: 90 }}>
        <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7"/>
          <circle cx="45" cy="45" r={r} fill="none" stroke={objetivo.color} strokeWidth="7"
            strokeDasharray={`${circ * pct / 100} ${circ}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${objetivo.color})`, transition: 'stroke-dasharray 1s ease' }}/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: objetivo.color }}>{Math.round(pct)}%</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: G.text, marginBottom: 3 }}>{objetivo.label}</div>
        <div style={{ fontSize: 10, color: G.muted, fontFamily: 'monospace' }}>{fmtA(objetivo.current)} / {fmtA(objetivo.target)}</div>
      </div>
      <button onClick={onEdit} style={{ fontSize: 10, color: G.accent, background: 'none', border: `1px solid ${G.border}`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'monospace' }}>Editar</button>
    </div>
  );
};

export default function DashboardClient() {
  const [page, setPage] = useState<Page>('dashboard');
  const [mobile, setMobile] = useState(false);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [capital, setCapital] = useState<Capital>({ initial: 0, aportaciones: [] });
  const [loading, setLoading] = useState(true);
  const [histFilter, setHistFilter] = useState('all');
  const [modalTrade, setModalTrade] = useState<Trade | null>(null);
  const [calMonth, setCalMonth] = useState(new Date());
  const [sidebarTab, setSidebarTab] = useState<'semanas'|'meses'|'años'>('meses');
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [showObjModal, setShowObjModal] = useState(false);
  const [editObj, setEditObj] = useState<Objetivo | null>(null);
  const [objLabel, setObjLabel] = useState('');
  const [objTarget, setObjTarget] = useState('');
  const [objColor, setObjColor] = useState(G.cyan);
  const [objCurrent, setObjCurrent] = useState('');

  const [fDate,setFDate]=useState(''); const [fTime,setFTime]=useState(''); const [fPair,setFPair]=useState('XAU/USD'); const [fTf,setFTf]=useState('15M');
  const [fDir,setFDir]=useState<string|null>(null); const [fEntry,setFEntry]=useState(''); const [fSl,setFSl]=useState(''); const [fTp,setFTp]=useState('');
  const [fRisk,setFRisk]=useState(''); const [fLot,setFLot]=useState(''); const [fRR,setFRR]=useState('—'); const [fRes,setFRes]=useState<string|null>(null);
  const [fPnl,setFPnl]=useState(''); const [fRreal,setFRreal]=useState(''); const [fConf,setFConf]=useState<string[]>([]); const [fEmo,setFEmo]=useState('');
  const [fPlan,setFPlan]=useState<string|null>(null); const [fNotes,setFNotes]=useState(''); const [saving,setSaving]=useState(false);
  const [capInitial,setCapInitial]=useState(''); const [apDate,setApDate]=useState(''); const [apAmount,setApAmount]=useState(''); const [apDesc,setApDesc]=useState('');

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check(); window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tR,cR] = await Promise.all([fetch('/api/trades'),fetch('/api/capital')]);
    if (tR.ok) setTrades(await tR.json());
    if (cR.ok) { const c = await cR.json(); setCapital(c); setCapInitial(c.initial?.toString()||''); }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const n=new Date(); setFDate(n.toISOString().split('T')[0]); setFTime(n.toTimeString().slice(0,5)); setApDate(n.toISOString().split('T')[0]);
    const saved = localStorage.getItem('st_objetivos'); if (saved) setObjetivos(JSON.parse(saved));
  }, [loadData]);

  useEffect(() => { const e=parseFloat(fEntry),sl=parseFloat(fSl),tp=parseFloat(fTp); if(e&&sl&&tp){const r=Math.abs(e-sl),p=Math.abs(tp-e);if(r>0){setFRR('1:'+(p/r).toFixed(1));return;}} setFRR('—'); }, [fEntry,fSl,fTp]);

  const saveObjetivos = (obs: Objetivo[]) => { setObjetivos(obs); localStorage.setItem('st_objetivos', JSON.stringify(obs)); };

  const totalPnl = trades.reduce((s,t)=>s+t.pnl,0);
  const totalAport = capital.aportaciones.reduce((s,a)=>s+a.amount,0);
  const balance = capital.initial + totalAport + totalPnl;
  const wins=trades.filter(t=>t.res==='win').length, losses=trades.filter(t=>t.res==='loss').length, bes=trades.filter(t=>t.res==='be').length;
  const wr = trades.length ? Math.round(wins/trades.length*100) : 0;
  const byDay = trades.reduce((a,t)=>{ a[t.date]=(a[t.date]||0)+t.pnl; return a; },{} as Record<string,number>);
  const todayTrades = trades.filter(t=>t.date===new Date().toISOString().split('T')[0]);

  const weeklyStats = (() => {
    const weeks: Record<string,{pnl:number;trades:number;wins:number}> = {};
    trades.forEach(t => { const d=new Date(t.date),day=d.getDay(),mon=new Date(d); mon.setDate(d.getDate()-(day===0?6:day-1)); const key=mon.toISOString().split('T')[0]; if(!weeks[key])weeks[key]={pnl:0,trades:0,wins:0}; weeks[key].pnl+=t.pnl;weeks[key].trades++;if(t.res==='win')weeks[key].wins++; });
    return Object.entries(weeks).sort(([a],[b])=>b.localeCompare(a)).slice(0,12);
  })();
  const monthlyStats = (() => {
    const m: Record<string,{pnl:number;trades:number;wins:number}> = {};
    trades.forEach(t => { const k=t.date.slice(0,7); if(!m[k])m[k]={pnl:0,trades:0,wins:0}; m[k].pnl+=t.pnl;m[k].trades++;if(t.res==='win')m[k].wins++; });
    return Object.entries(m).sort(([a],[b])=>b.localeCompare(a));
  })();
  const yearlyStats = (() => {
    const y: Record<string,{pnl:number;trades:number;wins:number}> = {};
    trades.forEach(t => { const k=t.date.slice(0,4); if(!y[k])y[k]={pnl:0,trades:0,wins:0}; y[k].pnl+=t.pnl;y[k].trades++;if(t.res==='win')y[k].wins++; });
    return Object.entries(y).sort(([a],[b])=>b.localeCompare(a));
  })();
  const currentStats = sidebarTab==='semanas'?weeklyStats:sidebarTab==='meses'?monthlyStats:yearlyStats;
  const maxAbsPnl = Math.max(...currentStats.map(([,s])=>Math.abs(s.pnl)),1);

  const animBalance = useCounter(balance);
  const animWr = useCounter(wr);

  const capitalCurve = () => {
    let run = capital.initial;
    const evs: {date:string;val:number}[] = [];
    capital.aportaciones.forEach(a=>evs.push({date:a.date,val:a.amount}));
    trades.forEach(t=>evs.push({date:t.date+' '+t.time,val:t.pnl}));
    evs.sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
    const labels=['Inicio'],data=[capital.initial];
    evs.forEach(e=>{run+=e.val;labels.push(e.date.split(' ')[0]);data.push(parseFloat(run.toFixed(2)));});
    return {labels,data};
  };
  const curve = capitalCurve();
  const filteredTrades = histFilter==='all'?[...trades].reverse():[...trades].filter(t=>t.res===histFilter||t.pair===histFilter).reverse();
  const last10 = trades.slice(-10);

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
  function openObjModal(obj?: Objetivo){if(obj){setEditObj(obj);setObjLabel(obj.label);setObjTarget(String(obj.target));setObjCurrent(String(obj.current));setObjColor(obj.color);}else{setEditObj(null);setObjLabel('');setObjTarget('');setObjCurrent('');setObjColor(G.cyan);}setShowObjModal(true);}
  function saveObj(){if(!objLabel||!objTarget)return;const v:Objetivo={id:editObj?.id||Date.now(),label:objLabel,target:parseFloat(objTarget),current:parseFloat(objCurrent)||0,color:objColor};const updated=editObj?objetivos.map(o=>o.id===editObj.id?v:o):[...objetivos,v];saveObjetivos(updated);setShowObjModal(false);}
  function deleteObj(id:number){saveObjetivos(objetivos.filter(o=>o.id!==id));}

  const calDays=()=>{const y=calMonth.getFullYear(),m=calMonth.getMonth();const fd=new Date(y,m,1).getDay();const dim=new Date(y,m+1,0).getDate();const offset=fd===0?6:fd-1;const cells=[];for(let i=0;i<offset;i++)cells.push(null);for(let d=1;d<=dim;d++){const k=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;cells.push({day:d,pnl:byDay[k]??null});}return cells;};

  const now2=new Date();
  const dateStr=now2.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
  const greeting=now2.getHours()<12?'Buenos días':now2.getHours()<20?'Buenas tardes':'Buenas noches';

  const inp:React.CSSProperties={background:G.card2,border:`1px solid ${G.border}`,borderRadius:8,padding:'9px 12px',color:G.text,fontFamily:'inherit',fontSize:13,width:'100%'};
  const secT:React.CSSProperties={fontFamily:'monospace',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:G.accent,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${G.border}`};
  const lbl:React.CSSProperties={fontFamily:'monospace',fontSize:9,letterSpacing:'0.15em',textTransform:'uppercase',color:G.muted,display:'block',marginBottom:5};

  const Tog=({label,active,color,bg,onClick}:{label:string;active:boolean;color:string;bg:string;onClick:()=>void})=>(
    <button onClick={onClick} style={{padding:'9px 8px',borderRadius:8,border:`1px solid ${active?color:G.border}`,background:active?bg:G.card2,color:active?color:G.muted,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',boxShadow:active?`0 0 10px ${color}40`:'none'}}>{label}</button>
  );

  const navItems: [Page,string,string][] = mobile
    ? [['dashboard','◉','Inicio'],['nuevo','⊕','Trade'],['historial','≡','Historial'],['noticias','⚡','Noticias']]
    : [['dashboard','◉','Dashboard'],['nuevo','⊕','Nuevo Trade'],['historial','≡','Historial'],['capital','◈','Capital'],['noticias','⚡','Noticias'],['rendimiento','📈','Rendimiento'],['objetivos','🎯','Objetivos']];

  if(loading) return(
    <div style={{minHeight:'100vh',background:G.bg,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <div style={{width:48,height:48,position:'relative'}}>
        <div style={{position:'absolute',inset:0,border:`2px solid ${G.border}`,borderTop:`2px solid ${G.accent}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
        <div style={{position:'absolute',inset:8,border:`2px solid ${G.border}`,borderBottom:`2px solid ${G.cyan}`,borderRadius:'50%',animation:'spin 1.2s linear infinite reverse'}}/>
      </div>
      <div style={{fontFamily:'monospace',fontSize:11,color:G.muted,letterSpacing:'0.2em'}}>CARGANDO SAVAGE TRADING...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const sidebarW = mobile ? 0 : 250;

  return (
    <div style={{display:'flex',minHeight:'100vh',background:G.bg,fontFamily:"'Outfit','Inter',sans-serif",color:G.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:${G.bg}}::-webkit-scrollbar-thumb{background:${G.border2};border-radius:2px}
        input,select,textarea{font-family:inherit} select option{background:${G.card2}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}
        .pe{animation:fadeUp 0.3s ease}
        input:focus,select:focus,textarea:focus{outline:none;border-color:${G.accent}88!important;box-shadow:0 0 0 2px ${G.accent}12!important}
        .navitem:hover{background:${G.card2}!important;color:${G.accent}!important}
        .trow:hover{background:${G.card2}!important}
        .statcard:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(77,159,255,0.18)!important}
        .tradecircle:hover{transform:scale(1.12)}
      `}</style>

      {/* ══ SIDEBAR — desktop only ══ */}
      {!mobile && (
        <div style={{width:sidebarW,background:G.sb,borderRight:`1px solid ${G.border}`,display:'flex',flexDirection:'column',position:'fixed',top:0,left:0,bottom:0,zIndex:100,overflowY:'auto'}}>
          <div style={{padding:'18px 16px 14px',borderBottom:`1px solid ${G.border}`,flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <Logo/>
              <div>
                <div style={{fontFamily:'Outfit',fontSize:14,fontWeight:800,background:`linear-gradient(135deg,${G.accent},${G.cyan})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',letterSpacing:'0.02em'}}>SAVAGE TRADING</div>
                <div style={{fontSize:9,color:G.muted,letterSpacing:'0.14em',fontFamily:'monospace',marginTop:1}}>JOURNAL PRO</div>
              </div>
            </div>
          </div>
          <nav style={{padding:'10px 10px',flexShrink:0}}>
            {navItems.map(([p,icon,label])=>(
              <div key={p} className="navitem" onClick={()=>setPage(p)} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:9,cursor:'pointer',color:page===p?G.accent:G.muted,background:page===p?`${G.accent}10`:'transparent',borderLeft:`2px solid ${page===p?G.accent:'transparent'}`,marginBottom:2,fontSize:13,fontWeight:page===p?600:400,transition:'all 0.15s'}}>
                <span style={{fontSize:14,width:18,textAlign:'center'}}>{icon}</span>
                <span>{label}</span>
                {page===p&&<div style={{marginLeft:'auto',width:5,height:5,borderRadius:'50%',background:G.accent,boxShadow:`0 0 8px ${G.accent}`}}/>}
              </div>
            ))}
          </nav>

          {/* Perf history */}
          <div style={{padding:'10px 12px',borderTop:`1px solid ${G.border}`,flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
            <div style={{fontFamily:'monospace',fontSize:8,letterSpacing:'0.18em',color:G.muted,marginBottom:8,textTransform:'uppercase'}}>RENDIMIENTO</div>
            <div style={{display:'flex',background:G.bg,borderRadius:7,padding:3,gap:2,marginBottom:10,flexShrink:0}}>
              {(['semanas','meses','años'] as const).map(t=>(
                <button key={t} onClick={()=>setSidebarTab(t)} style={{flex:1,padding:'4px 0',borderRadius:5,border:'none',background:sidebarTab===t?G.card2:'transparent',color:sidebarTab===t?G.accent:G.muted,fontSize:8,cursor:'pointer',fontFamily:'monospace',letterSpacing:'0.06em',textTransform:'uppercase',transition:'all 0.15s'}}>
                  {t.slice(0,3).toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{overflowY:'auto',flex:1}}>
              {currentStats.length===0?<div style={{textAlign:'center',padding:'20px 0',color:G.muted,fontSize:11}}>Sin datos</div>
              :currentStats.map(([key,s])=>{
                const barW=Math.abs(s.pnl)/maxAbsPnl;
                const label=sidebarTab==='semanas'?`Sem ${key.slice(5)}`:sidebarTab==='meses'?new Date(key+'-01').toLocaleDateString('es-ES',{month:'short',year:'2-digit'}).toUpperCase():key;
                return(
                  <div key={key} style={{marginBottom:7,padding:'8px 10px',background:G.card,borderRadius:8,border:`1px solid ${G.border}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                      <span style={{fontFamily:'monospace',fontSize:9,color:G.muted2}}>{label}</span>
                      <span style={{fontFamily:'Outfit',fontSize:12,fontWeight:700,color:s.pnl>=0?G.green:G.red}}>{fmt(s.pnl)}</span>
                    </div>
                    <div style={{height:3,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden',marginBottom:3}}>
                      <div style={{height:'100%',width:`${barW*100}%`,background:s.pnl>=0?G.green:G.red,borderRadius:2,transition:'width 0.8s ease'}}/>
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

          {/* Balance */}
          <div style={{padding:'10px 12px 16px',borderTop:`1px solid ${G.border}`,flexShrink:0}}>
            <div style={{background:G.bg,border:`1px solid ${G.border2}`,borderRadius:11,padding:'12px 14px',marginBottom:10}}>
              <div style={{fontFamily:'monospace',fontSize:8,color:G.muted,letterSpacing:'0.15em',marginBottom:4}}>BALANCE ACTUAL</div>
              <div style={{fontFamily:'Outfit',fontSize:22,fontWeight:800,color:balance>=capital.initial?G.green:G.red}}>{fmtA(animBalance)}</div>
              <div style={{display:'flex',alignItems:'center',gap:4,marginTop:3}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:totalPnl>=0?G.green:G.red,boxShadow:`0 0 5px ${totalPnl>=0?G.green:G.red}`}}/>
                <span style={{fontSize:10,color:totalPnl>=0?G.green:G.red,fontFamily:'Outfit',fontWeight:600}}>{fmt(totalPnl)} P&L</span>
              </div>
            </div>
            <button onClick={logout} style={{width:'100%',padding:'7px',background:'transparent',border:`1px solid ${G.border}`,borderRadius:7,color:G.muted,fontSize:10,cursor:'pointer',fontFamily:'monospace',letterSpacing:'0.08em'}}>CERRAR SESIÓN</button>
          </div>
        </div>
      )}

      {/* ══ MAIN ══ */}
      <div style={{marginLeft:mobile?0:sidebarW,flex:1,padding:mobile?'16px 14px 80px':'22px 24px',minHeight:'100vh'}}>

        {/* ─── DASHBOARD ─── */}
        {page==='dashboard'&&(
          <div className="pe">
            {mobile&&(
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}><Logo/><div style={{fontFamily:'Outfit',fontSize:13,fontWeight:800,background:`linear-gradient(135deg,${G.accent},${G.cyan})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>SAVAGE TRADING</div></div>
                <div style={{fontFamily:'Outfit',fontSize:16,fontWeight:800,color:balance>=capital.initial?G.green:G.red}}>{fmtA(balance)}</div>
              </div>
            )}
            {!mobile&&(
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:22}}>
                <div>
                  <div style={{fontFamily:'monospace',fontSize:9,color:G.muted,letterSpacing:'0.15em',marginBottom:5}}>{dateStr}</div>
                  <div style={{fontSize:28,fontWeight:800,letterSpacing:'-0.02em',color:G.text,fontFamily:'Outfit'}}>
                    {greeting}, <span style={{background:`linear-gradient(135deg,${G.accent},${G.cyan})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Cristian</span>
                  </div>
                </div>
                <button onClick={()=>setPage('nuevo')} style={{display:'flex',alignItems:'center',gap:7,padding:'11px 22px',background:`linear-gradient(135deg,${G.accent},${G.cyan})`,border:'none',borderRadius:10,color:'#05111e',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Outfit',boxShadow:`0 0 22px ${G.accent}50`,letterSpacing:'0.02em'}}>
                  ⊕ Nuevo Trade
                </button>
              </div>
            )}

            {/* STAT CARDS */}
            <div style={{display:'grid',gridTemplateColumns:mobile?'1fr 1fr':'repeat(3,1fr)',gap:10,marginBottom:12}}>
              {[
                {label:'BALANCE',val:fmtA(animBalance),sub:'Capital total',color:G.accent},
                {label:'P&L TOTAL',val:fmt(totalPnl),sub:`${trades.length} operaciones`,color:totalPnl>=0?G.green:G.red},
                {label:'HOY',val:String(todayTrades.length)+' ops',sub:fmt(todayTrades.reduce((s,t)=>s+t.pnl,0))+' hoy',color:G.gold},
              ].map(s=>(
                <div key={s.label} className="statcard" style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:'14px 16px',position:'relative',overflow:'hidden',transition:'all 0.2s',cursor:'default'}}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${s.color},transparent)`}}/>
                  <div style={{fontFamily:'monospace',fontSize:9,letterSpacing:'0.18em',color:G.muted,marginBottom:6,textTransform:'uppercase'}}>{s.label}</div>
                  <div style={{fontFamily:'Outfit',fontSize:mobile?20:26,fontWeight:800,color:s.color,lineHeight:1}}>{s.val}</div>
                  <div style={{fontSize:11,color:G.muted,marginTop:5,fontFamily:'Outfit'}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* GAUGES */}
            <div style={{display:'grid',gridTemplateColumns:mobile?'repeat(2,1fr)':'repeat(4,1fr)',gap:10,marginBottom:12}}>
              {[
                <CircleGauge key="wr" value={wr} max={100} label={Math.round(animWr)+'%'} sublabel="WIN RATE" color={wr>=50?G.green:G.red} size={mobile?90:100}/>,
                <SemiGauge key="wins" value={wins} max={Math.max(trades.length,1)} label={String(wins)} sublabel="WINS TOTALES" color={G.green}/>,
                <CircleGauge key="ret" value={capital.initial>0?(balance-capital.initial)/capital.initial*100:0} max={20} label={capital.initial>0?((balance-capital.initial)/capital.initial*100).toFixed(1)+'%':'—'} sublabel="RETORNO %" color={G.accent} size={mobile?90:100}/>,
                <CircleGauge key="plan" value={trades.filter(t=>t.plan==='yes').length} max={Math.max(trades.length,1)} label={trades.length>0?Math.round(trades.filter(t=>t.plan==='yes').length/trades.length*100)+'%':'—'} sublabel="CON PLAN" color={G.purple} size={mobile?90:100}/>,
              ].map((el,i)=>(
                <div key={i} style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:14,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                  {el}
                </div>
              ))}
            </div>

            {/* CAPITAL CURVE */}
            {!mobile&&(
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:18,marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <div><div style={{fontSize:13,fontWeight:600,fontFamily:'Outfit'}}>Curva de Capital</div><div style={{fontSize:11,color:G.muted}}>Evolución histórica</div></div>
                  <span style={{fontFamily:'Outfit',fontSize:13,fontWeight:700,color:balance>=capital.initial?G.green:G.red}}>{fmt(balance-capital.initial)}</span>
                </div>
                <div style={{height:160}}>
                  {curve.data.length>1
                    ? <Line data={{labels:curve.labels,datasets:[{data:curve.data,borderColor:G.accent,backgroundColor:`${G.accent}10`,borderWidth:2.5,pointRadius:curve.data.length<15?4:0,pointBackgroundColor:G.accent,pointBorderColor:G.bg,pointBorderWidth:2,fill:true,tension:0.4}]}}
                        options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:G.card2,titleColor:G.accent,bodyColor:G.text}},scales:{x:{ticks:{color:G.muted,font:{family:'monospace' as const,size:9},maxTicksLimit:6},grid:{color:'rgba(255,255,255,0.03)'}},y:{ticks:{color:G.muted,font:{family:'monospace' as const,size:9},callback:(v:unknown)=>String(v)+'€'},grid:{color:'rgba(255,255,255,0.03)'}}}}}/>
                    : <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:G.muted,fontSize:12,flexDirection:'column',gap:8}}><span style={{fontSize:28}}>📊</span>Añade tu primer trade</div>}
                </div>
              </div>
            )}

            {/* CALENDAR + RECENT */}
            <div style={{display:'grid',gridTemplateColumns:mobile?'1fr':'1fr 1fr',gap:10,marginBottom:12}}>
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:600,fontFamily:'Outfit'}}>Calendario P&L</div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()-1))} style={{background:G.card2,border:`1px solid ${G.border}`,borderRadius:5,color:G.accent,width:22,height:22,cursor:'pointer',fontSize:11}}>‹</button>
                    <span style={{fontFamily:'monospace',fontSize:9,color:G.accent,minWidth:90,textAlign:'center'}}>{calMonth.toLocaleDateString('es-ES',{month:'short',year:'numeric'}).toUpperCase()}</span>
                    <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()+1))} style={{background:G.card2,border:`1px solid ${G.border}`,borderRadius:5,color:G.accent,width:22,height:22,cursor:'pointer',fontSize:11}}>›</button>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:3}}>
                  {['L','M','X','J','V','S','D'].map(d=><div key={d} style={{textAlign:'center',fontFamily:'monospace',fontSize:7,color:G.muted}}>{d}</div>)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
                  {calDays().map((cell,i)=>{
                    const isToday=cell&&`${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}`===new Date().toISOString().split('T')[0];
                    return(
                      <div key={i} style={{aspectRatio:'1',borderRadius:5,border:`1px solid ${cell?.pnl!=null?(cell.pnl>=0?`${G.green}35`:`${G.red}35`):isToday?G.accent:G.border}`,background:cell?.pnl!=null?(cell.pnl>=0?`${G.green}12`:`${G.red}12`):isToday?`${G.accent}10`:'transparent',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                        {cell&&<>
                          <div style={{fontSize:7,color:isToday?G.accent:cell.pnl!=null?G.text:G.muted,fontWeight:600}}>{cell.day}</div>
                          {cell.pnl!=null&&<div style={{fontSize:6,fontFamily:'monospace',color:cell.pnl>=0?G.green:G.red,fontWeight:700}}>{cell.pnl>=0?'+':''}{cell.pnl.toFixed(0)}</div>}
                        </>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:600,fontFamily:'Outfit'}}>Trades Recientes</div>
                  <button onClick={()=>setPage('historial')} style={{fontSize:10,color:G.accent,background:'none',border:'none',cursor:'pointer',fontFamily:'monospace'}}>VER TODOS →</button>
                </div>
                {trades.length===0?<div style={{textAlign:'center',padding:'24px 0',color:G.muted,fontSize:12}}>Sin trades aún</div>
                :[...trades].reverse().slice(0,6).map(t=>(
                  <div key={t.id} onClick={()=>setModalTrade(t)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 8px',borderRadius:8,cursor:'pointer',marginBottom:3,transition:'background 0.1s'}}
                    onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=G.card2}
                    onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:t.res==='win'?G.green:t.res==='loss'?G.red:G.purple,flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,fontFamily:'Outfit'}}>{t.pair} <span style={{fontSize:10,color:t.dir==='buy'?G.green:G.red}}>{t.dir==='buy'?'▲':'▼'}</span></div>
                        <div style={{fontSize:10,color:G.muted}}>{t.date} · {t.tf}</div>
                      </div>
                    </div>
                    <div style={{fontFamily:'Outfit',fontSize:14,fontWeight:700,color:t.pnl>0?G.green:t.pnl<0?G.red:G.purple}}>{fmt(t.pnl)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* LAST 10 CIRCLES */}
            {!mobile&&(
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:16,marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:600,fontFamily:'Outfit',marginBottom:12}}>Últimas operaciones</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                  {last10.map(t=>(
                    <div key={t.id} onClick={()=>setModalTrade(t)} className="tradecircle" style={{width:56,height:56,borderRadius:'50%',background:t.res==='win'?`${G.green}18`:t.res==='loss'?`${G.red}18`:`${G.purple}18`,border:`2px solid ${t.res==='win'?G.green:t.res==='loss'?G.red:G.purple}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'transform 0.2s',boxShadow:`0 0 10px ${t.res==='win'?G.green:t.res==='loss'?G.red:G.purple}25`}}>
                      <div style={{fontFamily:'Outfit',fontSize:9,fontWeight:700,color:t.res==='win'?G.green:t.res==='loss'?G.red:G.purple,lineHeight:1}}>{t.pnl>=0?'+':''}{Math.abs(t.pnl).toFixed(0)}</div>
                      <div style={{fontSize:7,color:G.muted,marginTop:1}}>{t.pair.split('/')[0]}</div>
                    </div>
                  ))}
                  {last10.length===0&&<div style={{color:G.muted,fontSize:12}}>Sin trades</div>}
                </div>
              </div>
            )}

            {/* OBJETIVOS preview */}
            {objetivos.length>0&&(
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:16,marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:600,fontFamily:'Outfit'}}>🎯 Mis Objetivos</div>
                  <button onClick={()=>setPage('objetivos')} style={{fontSize:10,color:G.accent,background:'none',border:'none',cursor:'pointer',fontFamily:'monospace'}}>VER TODOS →</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(objetivos.length,mobile?2:4)},1fr)`,gap:10}}>
                  {objetivos.slice(0,mobile?2:4).map(o=>(
                    <ProgressBall key={o.id} objetivo={o} onEdit={()=>openObjModal(o)} onDelete={()=>deleteObj(o.id)}/>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── NUEVO TRADE ─── */}
        {page==='nuevo'&&(
          <div className="pe">
            {mobile&&<div style={{fontSize:18,fontWeight:700,fontFamily:'Outfit',marginBottom:16}}>⊕ Nuevo Trade</div>}
            {!mobile&&<div style={{marginBottom:18}}><div style={{fontSize:22,fontWeight:700,fontFamily:'Outfit'}}>Nuevo Trade</div><div style={{fontSize:12,color:G.muted}}>Registra tu operación</div></div>}
            <div style={{display:'grid',gridTemplateColumns:mobile?'1fr':'1fr 260px',gap:12,alignItems:'start'}}>
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:mobile?16:20}}>
                <div style={secT}>INFO BÁSICA</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  <div><label style={lbl}>FECHA</label><input type="date" value={fDate} onChange={e=>setFDate(e.target.value)} style={inp}/></div>
                  <div><label style={lbl}>HORA</label><input type="time" value={fTime} onChange={e=>setFTime(e.target.value)} style={inp}/></div>
                  <div><label style={lbl}>ACTIVO</label><select value={fPair} onChange={e=>setFPair(e.target.value)} style={inp}><option>XAU/USD</option><option>NAS100</option><option>BTC/USD</option><option>Otro</option></select></div>
                  <div><label style={lbl}>TIMEFRAME</label><select value={fTf} onChange={e=>setFTf(e.target.value)} style={inp}><option>15M</option><option>1H</option><option>4H</option></select></div>
                </div>
                <div style={{marginBottom:16}}><label style={lbl}>DIRECCIÓN</label><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><Tog label="▲ LONG" active={fDir==='buy'} color={G.green} bg={`${G.green}15`} onClick={()=>setFDir('buy')}/><Tog label="▼ SHORT" active={fDir==='sell'} color={G.red} bg={`${G.red}15`} onClick={()=>setFDir('sell')}/></div></div>
                <div style={secT}>PRECIOS</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
                  {[['ENTRADA',fEntry,setFEntry],['SL',fSl,setFSl],['TP',fTp,setFTp]].map(([l,v,s])=>(
                    <div key={l as string}><label style={lbl}>{l as string}</label><input type="number" value={v as string} onChange={e=>(s as (x:string)=>void)(e.target.value)} placeholder="0.00" style={inp}/></div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
                  <div><label style={lbl}>RIESGO €</label><input type="number" value={fRisk} onChange={e=>setFRisk(e.target.value)} placeholder="0.00" style={inp}/></div>
                  <div><label style={lbl}>LOTE</label><input type="number" value={fLot} onChange={e=>setFLot(e.target.value)} placeholder="0.01" style={inp}/></div>
                  <div><label style={lbl}>R:R</label><div style={{background:G.card2,border:`1px solid ${parseFloat(fRR.split(':')[1])>=2?`${G.green}60`:G.border}`,borderRadius:8,padding:'9px 12px',fontFamily:'Outfit',fontWeight:700,color:parseFloat(fRR.split(':')[1])>=2?G.green:G.gold,textAlign:'center',fontSize:13}}>{fRR}</div></div>
                </div>
                <div style={secT}>RESULTADO</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
                  <Tog label="✓ WIN" active={fRes==='win'} color={G.green} bg={`${G.green}15`} onClick={()=>setFRes('win')}/>
                  <Tog label="✕ LOSS" active={fRes==='loss'} color={G.red} bg={`${G.red}15`} onClick={()=>setFRes('loss')}/>
                  <Tog label="— BE" active={fRes==='be'} color={G.purple} bg={`${G.purple}15`} onClick={()=>setFRes('be')}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                  <div><label style={lbl}>P&L €</label><input type="number" value={fPnl} onChange={e=>setFPnl(e.target.value)} placeholder="±0.00" style={inp}/></div>
                  <div><label style={lbl}>R OBTENIDO</label><input type="text" value={fRreal} onChange={e=>setFRreal(e.target.value)} placeholder="+2R" style={inp}/></div>
                </div>
                <div style={secT}>CONFLUENCIAS</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:16}}>
                  {['Zona liquidez','Fibo 0.618','Fibo 0.5','Fibo 0.786','Nº redondo','DXY','Sesión asiática','4H dir.','Estructura 1H'].map(c=>(
                    <button key={c} onClick={()=>toggleConf(c)} style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${fConf.includes(c)?G.accent:G.border}`,background:fConf.includes(c)?`${G.accent}15`:'transparent',color:fConf.includes(c)?G.accent:G.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit',transition:'all 0.12s'}}>{c}</button>
                  ))}
                </div>
                <div style={secT}>PSICOLOGÍA</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                  {['😐 Neutro','😌 Tranquilo','💪 Confiado','😰 Ansioso','😤 Frustrado','🎲 FOMO','😡 Revenge'].map(e=>(
                    <button key={e} onClick={()=>setFEmo(fEmo===e?'':e)} style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${fEmo===e?G.purple:G.border}`,background:fEmo===e?`${G.purple}18`:'transparent',color:fEmo===e?G.purple:G.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit',transition:'all 0.12s'}}>{e}</button>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
                  <Tog label="✓ Plan seguido" active={fPlan==='yes'} color={G.green} bg={`${G.green}15`} onClick={()=>setFPlan('yes')}/>
                  <Tog label="✕ Sin plan" active={fPlan==='no'} color={G.red} bg={`${G.red}15`} onClick={()=>setFPlan('no')}/>
                </div>
                <div style={secT}>NOTAS</div>
                <textarea value={fNotes} onChange={e=>setFNotes(e.target.value)} placeholder="¿Qué setup viste? ¿Qué aprendiste?" style={{...inp,minHeight:70,resize:'vertical',lineHeight:1.6,marginBottom:16}}/>
                <button onClick={saveTrade} disabled={saving} style={{width:'100%',padding:13,background:saving?G.muted:`linear-gradient(135deg,${G.accent},${G.cyan})`,border:'none',borderRadius:10,color:'#05111e',fontSize:14,fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:'Outfit',boxShadow:saving?'none':`0 0 20px ${G.accent}40`,letterSpacing:'0.02em',transition:'all 0.2s'}}>
                  {saving?'⟳ GUARDANDO...':'⊕ GUARDAR OPERACIÓN'}
                </button>
              </div>
              {!mobile&&(
                <div style={{position:'sticky',top:22,display:'flex',flexDirection:'column',gap:10}}>
                  <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:14}}>
                    <div style={{fontSize:11,fontWeight:600,color:G.accent,marginBottom:10,fontFamily:'monospace',letterSpacing:'0.1em'}}>PREVIEW</div>
                    {[['PAR',fPair],['DIR',fDir?(fDir==='buy'?'▲ LONG':'▼ SHORT'):'—'],['R:R',fRR],['RIESGO',fRisk?fRisk+'€':'—'],['RESULTADO',fRes?.toUpperCase()||'—'],['P&L',fPnl?fmt(parseFloat(fPnl)):'—'],['PLAN',fPlan==='yes'?'✓':fPlan==='no'?'✕':'—']].map(([k,v])=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${G.border}`,fontSize:11}}>
                        <span style={{color:G.muted,fontFamily:'monospace',fontSize:9}}>{k}</span>
                        <span style={{fontFamily:'Outfit',fontWeight:700,fontSize:12}}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{background:G.card,border:`1px solid ${G.border2}`,borderRadius:12,padding:14}}>
                    <div style={{fontFamily:'monospace',fontSize:9,color:G.muted,marginBottom:4}}>BALANCE ACTUAL</div>
                    <div style={{fontFamily:'Outfit',fontSize:22,fontWeight:800,color:balance>=capital.initial?G.green:G.red}}>{fmtA(balance)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── HISTORIAL ─── */}
        {page==='historial'&&(
          <div className="pe">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:8}}>
              <div><div style={{fontSize:22,fontWeight:700,fontFamily:'Outfit'}}>Historial</div><div style={{fontSize:12,color:G.muted}}>{filteredTrades.length} operaciones</div></div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {[['all','Todas'],['win','Wins'],['loss','Losses'],['XAU/USD','Oro'],['NAS100','Nasdaq']].map(([f,l])=>(
                  <button key={f} onClick={()=>setHistFilter(f)} style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${histFilter===f?G.accent:G.border}`,background:histFilter===f?`${G.accent}15`:'transparent',color:histFilter===f?G.accent:G.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,overflow:'hidden'}}>
              {!mobile&&<div style={{display:'grid',gridTemplateColumns:'100px 90px 55px 80px 1fr 90px',padding:'9px 16px',background:G.bg,borderBottom:`1px solid ${G.border}`,gap:8}}>
                {['Fecha','Activo','Dir','Resultado','Notas','P&L'].map(h=><span key={h} style={{fontFamily:'monospace',fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:G.muted}}>{h}</span>)}
              </div>}
              {filteredTrades.length===0?<div style={{textAlign:'center',padding:'40px 0',color:G.muted,fontSize:13}}>Sin operaciones</div>
              :filteredTrades.map(t=>(
                mobile
                  ? <div key={t.id} onClick={()=>setModalTrade(t)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',borderBottom:`1px solid ${G.border}`,cursor:'pointer'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:t.res==='win'?G.green:t.res==='loss'?G.red:G.purple}}/>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,fontFamily:'Outfit'}}>{t.pair} <span style={{fontSize:11,color:t.dir==='buy'?G.green:G.red}}>{t.dir==='buy'?'▲':'▼'}</span></div>
                          <div style={{fontSize:10,color:G.muted}}>{t.date} · {t.res.toUpperCase()}</div>
                        </div>
                      </div>
                      <div style={{fontFamily:'Outfit',fontSize:14,fontWeight:700,color:t.pnl>0?G.green:t.pnl<0?G.red:G.purple}}>{fmt(t.pnl)}</div>
                    </div>
                  : <div key={t.id} onClick={()=>setModalTrade(t)} className="trow" style={{display:'grid',gridTemplateColumns:'100px 90px 55px 80px 1fr 90px',padding:'11px 16px',borderBottom:`1px solid ${G.border}`,gap:8,alignItems:'center',cursor:'pointer',transition:'background 0.1s'}}>
                      <span style={{fontFamily:'monospace',fontSize:11,color:G.muted}}>{t.date}</span>
                      <span style={{fontFamily:'monospace',fontSize:11,color:G.accent}}>{t.pair}</span>
                      <span style={{fontSize:12,color:t.dir==='buy'?G.green:G.red,fontWeight:700}}>{t.dir==='buy'?'▲':'▼'}</span>
                      <span style={{padding:'3px 7px',borderRadius:5,fontSize:10,fontFamily:'monospace',fontWeight:700,background:t.res==='win'?`${G.green}18`:t.res==='loss'?`${G.red}18`:`${G.purple}18`,color:t.res==='win'?G.green:t.res==='loss'?G.red:G.purple,display:'inline-block'}}>{t.res.toUpperCase()}</span>
                      <span style={{color:G.muted,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.notes?t.notes.slice(0,40)+(t.notes.length>40?'…':''):'—'}</span>
                      <span style={{fontFamily:'Outfit',fontSize:13,fontWeight:700,textAlign:'right',color:t.pnl>0?G.green:t.pnl<0?G.red:G.purple}}>{fmt(t.pnl)}</span>
                    </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── CAPITAL ─── */}
        {page==='capital'&&(
          <div className="pe">
            <div style={{marginBottom:18}}><div style={{fontSize:22,fontWeight:700,fontFamily:'Outfit'}}>Capital</div><div style={{fontSize:12,color:G.muted}}>Gestión de capital y aportaciones</div></div>
            <div style={{display:'grid',gridTemplateColumns:mobile?'1fr':'1fr 1fr',gap:12,alignItems:'start'}}>
              <div>
                <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:18,marginBottom:10}}>
                  <div style={secT}>CAPITAL INICIAL</div>
                  <label style={lbl}>IMPORTE €</label>
                  <input type="number" value={capInitial} onChange={e=>setCapInitial(e.target.value)} placeholder="500.00" style={{...inp,marginBottom:12}}/>
                  <button onClick={setIC} style={{width:'100%',padding:11,background:`linear-gradient(135deg,#065f46,${G.green})`,border:'none',borderRadius:9,color:'#05111e',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Outfit'}}>Guardar capital inicial</button>
                </div>
                <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:18}}>
                  <div style={secT}>NUEVA APORTACIÓN</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                    <div><label style={lbl}>FECHA</label><input type="date" value={apDate} onChange={e=>setApDate(e.target.value)} style={inp}/></div>
                    <div><label style={lbl}>IMPORTE €</label><input type="number" value={apAmount} onChange={e=>setApAmount(e.target.value)} placeholder="100.00" style={inp}/></div>
                  </div>
                  <label style={lbl}>DESCRIPCIÓN</label>
                  <input type="text" value={apDesc} onChange={e=>setApDesc(e.target.value)} placeholder="Aportación mensual" style={{...inp,marginBottom:12}}/>
                  <button onClick={addAp} style={{width:'100%',padding:11,background:`linear-gradient(135deg,${G.accent},${G.cyan})`,border:'none',borderRadius:9,color:'#05111e',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Outfit'}}>Añadir aportación</button>
                </div>
              </div>
              <div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  {[{l:'Capital inicial',v:fmtA(capital.initial),c:G.accent},{l:'Total aportado',v:fmtA(totalAport),c:G.gold},{l:'P&L total',v:fmt(totalPnl),c:totalPnl>=0?G.green:G.red},{l:'Balance total',v:fmtA(balance),c:G.cyan}].map(s=>(
                    <div key={s.l} style={{background:G.card,border:`1px solid ${G.border}`,borderTop:`2px solid ${s.c}`,borderRadius:12,padding:14}}>
                      <div style={{fontFamily:'monospace',fontSize:8,color:G.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:'0.1em'}}>{s.l}</div>
                      <div style={{fontFamily:'Outfit',fontSize:20,fontWeight:800,color:s.c}}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:16}}>
                  <div style={secT}>HISTORIAL APORTACIONES</div>
                  {capital.aportaciones.length===0?<div style={{textAlign:'center',padding:'16px 0',color:G.muted,fontSize:12}}>Sin aportaciones</div>
                  :capital.aportaciones.map(a=>(
                    <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 10px',background:G.card2,borderRadius:8,marginBottom:6,border:`1px solid ${G.border}`}}>
                      <div><div style={{fontWeight:600,fontSize:13,fontFamily:'Outfit'}}>{a.desc}</div><div style={{fontSize:11,color:G.muted}}>{a.date}</div></div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontFamily:'Outfit',fontWeight:700,color:G.green}}>+{fmtA(a.amount)}</span>
                        <button onClick={()=>delAp(a.id)} style={{background:`${G.red}15`,border:`1px solid ${G.red}50`,color:G.red,padding:'3px 8px',borderRadius:6,fontSize:10,cursor:'pointer'}}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── NOTICIAS ─── */}
        {page==='noticias'&&(
          <div className="pe">
            <div style={{marginBottom:18}}><div style={{fontSize:22,fontWeight:700,fontFamily:'Outfit'}}>Noticias & Calendario</div><div style={{fontSize:12,color:G.muted}}>Datos en tiempo real · Investing.com + TradingView</div></div>

            {/* Calendario Investing.com — full width */}
            <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,overflow:'hidden',marginBottom:12}}>
              <div style={{padding:'14px 16px',borderBottom:`1px solid ${G.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><div style={{fontSize:13,fontWeight:600,fontFamily:'Outfit'}}>📅 Calendario Económico — Tiempo Real</div><div style={{fontSize:11,color:G.muted}}>USD · EUR · GBP · Alto y medio impacto · Horario España</div></div>
                <a href="https://es.investing.com/economic-calendar/" target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:G.accent,fontFamily:'monospace',textDecoration:'none'}}>ABRIR EN INVESTING →</a>
              </div>
              <div style={{height:600,background:'#fff'}}>
                <iframe
                  src="https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&category=_employment,_economicActivity,_inflation,_credit,_centralBanks,_confidenceIndex,_balance,_Bonds&importance=2,3&features=datepicker,timezone,timeselector,filters&countries=5,22,6,25,32&calType=week&timeZone=18&lang=3"
                  style={{width:'100%',height:'100%',border:'none'}}
                  title="Calendario económico Investing.com"
                  loading="lazy"
                />
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:mobile?'1fr':'1fr 1fr',gap:12,marginBottom:12}}>
              {/* TradingView News */}
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,overflow:'hidden'}}>
                <div style={{padding:'14px 16px',borderBottom:`1px solid ${G.border}`}}><div style={{fontSize:13,fontWeight:600,fontFamily:'Outfit'}}>📰 Noticias Forex & Mercados</div><div style={{fontSize:11,color:G.muted}}>TradingView · Actualización continua</div></div>
                <div style={{height:440}}>
                  <iframe
                    src="https://www.tradingview.com/embed-widget/timeline/?feedMode=market&market=forex&isTransparent=true&displayMode=regular&width=100%25&height=100%25&colorTheme=dark&locale=es"
                    style={{width:'100%',height:'100%',border:'none'}}
                    title="Noticias TradingView"
                    loading="lazy"
                  />
                </div>
              </div>
              {/* TradingView Market Overview */}
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,overflow:'hidden'}}>
                <div style={{padding:'14px 16px',borderBottom:`1px solid ${G.border}`}}><div style={{fontSize:13,fontWeight:600,fontFamily:'Outfit'}}>📊 Resumen de Mercado</div><div style={{fontSize:11,color:G.muted}}>Oro · Nasdaq · Crypto · Forex</div></div>
                <div style={{height:440}}>
                  <iframe
                    src="https://www.tradingview.com/embed-widget/market-overview/?colorTheme=dark&dateRange=12M&showSymbolLogo=true&isTransparent=true&width=100%25&height=100%25&locale=es&tabs=%5B%7B%22title%22%3A%22%C3%8Dndices%22%2C%22symbols%22%3A%5B%7B%22s%22%3A%22NASDAQ%3ANDX%22%7D%2C%7B%22s%22%3A%22OANDA%3AXAUUSD%22%7D%2C%7B%22s%22%3A%22TVC%3ADXY%22%7D%5D%7D%2C%7B%22title%22%3A%22Crypto%22%2C%22symbols%22%3A%5B%7B%22s%22%3A%22BITSTAMP%3ABTCUSD%22%7D%2C%7B%22s%22%3A%22BINANCE%3AETHUSD%22%7D%5D%7D%5D"
                    style={{width:'100%',height:'100%',border:'none'}}
                    title="Market Overview TradingView"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
            {/* Ticker tape */}
            <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,overflow:'hidden',marginBottom:12}}>
              <div style={{padding:'12px 16px',borderBottom:`1px solid ${G.border}`}}><div style={{fontSize:13,fontWeight:600,fontFamily:'Outfit'}}>📊 Precios en Tiempo Real</div></div>
              <div style={{height:70}}>
                <iframe
                  src="https://www.tradingview.com/embed-widget/ticker-tape/?symbols=%5B%7B%22proName%22%3A%22OANDA%3AXAUUSD%22%2C%22title%22%3A%22Oro%22%7D%2C%7B%22proName%22%3A%22NASDAQ%3ANDX%22%2C%22title%22%3A%22Nasdaq%22%7D%2C%7B%22proName%22%3A%22FX%3AEURUSD%22%2C%22title%22%3A%22EUR%2FUSD%22%7D%2C%7B%22proName%22%3A%22BITSTAMP%3ABTCUSD%22%2C%22title%22%3A%22Bitcoin%22%7D%2C%7B%22proName%22%3A%22TVC%3ADXY%22%2C%22title%22%3A%22DXY%22%7D%5D&showSymbolLogo=true&isTransparent=true&displayMode=adaptive&colorTheme=dark&locale=es"
                  style={{width:'100%',height:'100%',border:'none'}}
                  title="Ticker precios"
                  loading="lazy"
                />
              </div>
            </div>
            <div style={{background:`${G.gold}07`,border:`1px solid ${G.gold}28`,borderRadius:12,padding:16}}>
              <div style={{fontSize:13,fontWeight:600,color:G.gold,marginBottom:10,fontFamily:'Outfit'}}>⚠️ Reglas en noticias de alto impacto</div>
              <div style={{display:'grid',gridTemplateColumns:mobile?'1fr':'1fr 1fr',gap:8}}>
                {['🚫 No abrir 15 min antes de evento rojo','⏳ Esperar 15 min después de la publicación','📊 El Oro reacciona fuerte al IPC y FED','📈 Nasdaq muy sensible al NFP y tipos','💱 Spread se amplía antes de noticias','✅ Mejores setups 30 min después'].map((r,i)=>(
                  <div key={i} style={{background:G.card,borderRadius:8,padding:'9px 12px',fontSize:12,color:G.muted2,lineHeight:1.5,border:`1px solid ${G.border}`,fontFamily:'Outfit'}}>{r}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── RENDIMIENTO ─── */}
        {page==='rendimiento'&&(
          <div className="pe">
            <div style={{marginBottom:18}}><div style={{fontSize:22,fontWeight:700,fontFamily:'Outfit'}}>Rendimiento Histórico</div><div style={{fontSize:12,color:G.muted}}>Análisis completo de tu performance</div></div>
            {/* Resumen anual */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
              {[{l:'P&L Total',v:fmt(totalPnl),c:totalPnl>=0?G.green:G.red},{l:'Win Rate',v:wr+'%',c:wr>=50?G.green:G.red},{l:'Total Trades',v:String(trades.length),c:G.accent},{l:'Días operados',v:String(Object.keys(byDay).length),c:G.gold}].map(s=>(
                <div key={s.l} style={{background:G.card,border:`1px solid ${G.border}`,borderTop:`2px solid ${s.c}`,borderRadius:12,padding:16}}>
                  <div style={{fontFamily:'monospace',fontSize:9,color:G.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:'0.1em'}}>{s.l}</div>
                  <div style={{fontFamily:'Outfit',fontSize:24,fontWeight:800,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
            {/* Yearly */}
            {yearlyStats.length>0&&(
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:18,marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:600,fontFamily:'Outfit',marginBottom:14}}>📅 Rendimiento Anual</div>
                {yearlyStats.map(([year,s])=>(
                  <div key={year} style={{display:'grid',gridTemplateColumns:'80px 1fr 100px 80px 80px',gap:12,alignItems:'center',padding:'12px 0',borderBottom:`1px solid ${G.border}`}}>
                    <div style={{fontFamily:'Outfit',fontSize:18,fontWeight:800,color:G.accent}}>{year}</div>
                    <div style={{height:8,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${Math.min(Math.abs(s.pnl)/maxAbsPnl*100,100)}%`,background:s.pnl>=0?G.green:G.red,borderRadius:4,transition:'width 0.8s ease'}}/>
                    </div>
                    <div style={{fontFamily:'Outfit',fontSize:16,fontWeight:700,color:s.pnl>=0?G.green:G.red,textAlign:'right'}}>{fmt(s.pnl)}</div>
                    <div style={{textAlign:'center'}}><div style={{fontSize:10,color:G.muted}}>trades</div><div style={{fontFamily:'Outfit',fontWeight:700,color:G.text}}>{s.trades}</div></div>
                    <div style={{textAlign:'center'}}><div style={{fontSize:10,color:G.muted}}>win rate</div><div style={{fontFamily:'Outfit',fontWeight:700,color:s.wins/s.trades>=0.5?G.green:G.red}}>{s.trades>0?Math.round(s.wins/s.trades*100):0}%</div></div>
                  </div>
                ))}
              </div>
            )}
            {/* Monthly */}
            {monthlyStats.length>0&&(
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:18,marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:600,fontFamily:'Outfit',marginBottom:14}}>📆 Rendimiento Mensual</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
                  {monthlyStats.map(([month,s])=>{
                    const pct=Math.abs(s.pnl)/maxAbsPnl;
                    return(
                      <div key={month} style={{background:G.card2,border:`1px solid ${s.pnl>=0?`${G.green}25`:`${G.red}25`}`,borderRadius:10,padding:'12px 14px'}}>
                        <div style={{fontFamily:'monospace',fontSize:10,color:G.muted2,marginBottom:6}}>{new Date(month+'-01').toLocaleDateString('es-ES',{month:'long',year:'numeric'}).toUpperCase()}</div>
                        <div style={{fontFamily:'Outfit',fontSize:18,fontWeight:800,color:s.pnl>=0?G.green:G.red,marginBottom:8}}>{fmt(s.pnl)}</div>
                        <div style={{height:4,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden',marginBottom:6}}>
                          <div style={{height:'100%',width:`${pct*100}%`,background:s.pnl>=0?G.green:G.red,borderRadius:2}}/>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between'}}>
                          <span style={{fontSize:10,color:G.muted}}>{s.trades} ops</span>
                          <span style={{fontSize:10,color:s.wins/s.trades>=0.5?G.green:G.muted}}>{s.trades>0?Math.round(s.wins/s.trades*100):0}% WR</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Weekly */}
            {weeklyStats.length>0&&(
              <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:18}}>
                <div style={{fontSize:14,fontWeight:600,fontFamily:'Outfit',marginBottom:14}}>📅 Últimas Semanas</div>
                {weeklyStats.map(([week,s])=>(
                  <div key={week} style={{display:'grid',gridTemplateColumns:'120px 1fr 100px 70px 70px',gap:10,alignItems:'center',padding:'9px 0',borderBottom:`1px solid ${G.border}`}}>
                    <div style={{fontFamily:'monospace',fontSize:10,color:G.muted2}}>Sem {week.slice(5)}</div>
                    <div style={{height:5,background:'rgba(255,255,255,0.05)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${Math.abs(s.pnl)/maxAbsPnl*100}%`,background:s.pnl>=0?G.green:G.red,borderRadius:3}}/>
                    </div>
                    <div style={{fontFamily:'Outfit',fontSize:14,fontWeight:700,color:s.pnl>=0?G.green:G.red,textAlign:'right'}}>{fmt(s.pnl)}</div>
                    <div style={{textAlign:'center',fontSize:11,color:G.muted}}>{s.trades} ops</div>
                    <div style={{textAlign:'center',fontSize:11,color:s.wins/s.trades>=0.5?G.green:G.muted}}>{s.trades>0?Math.round(s.wins/s.trades*100):0}%</div>
                  </div>
                ))}
              </div>
            )}
            {trades.length===0&&<div style={{textAlign:'center',padding:'60px 0',color:G.muted,fontSize:13}}>Sin datos aún. Añade tu primer trade.</div>}
          </div>
        )}

        {/* ─── OBJETIVOS ─── */}
        {page==='objetivos'&&(
          <div className="pe">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <div><div style={{fontSize:22,fontWeight:700,fontFamily:'Outfit'}}>🎯 Mis Objetivos</div><div style={{fontSize:12,color:G.muted}}>Define y sigue tu progreso</div></div>
              <button onClick={()=>openObjModal()} style={{padding:'10px 18px',background:`linear-gradient(135deg,${G.accent},${G.cyan})`,border:'none',borderRadius:10,color:'#05111e',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Outfit'}}>+ Nuevo objetivo</button>
            </div>
            {objetivos.length===0?
              <div style={{textAlign:'center',padding:'60px 0',color:G.muted,fontSize:13}}>
                <div style={{fontSize:40,marginBottom:12}}>🎯</div>
                <div>Sin objetivos aún. Crea el primero.</div>
                <button onClick={()=>openObjModal()} style={{marginTop:16,padding:'10px 20px',background:`${G.accent}20`,border:`1px solid ${G.accent}`,borderRadius:10,color:G.accent,fontSize:13,cursor:'pointer',fontFamily:'Outfit'}}>+ Crear objetivo</button>
              </div>
            :(
              <>
                <div style={{display:'grid',gridTemplateColumns:`repeat(${mobile?2:Math.min(objetivos.length,4)},1fr)`,gap:14,marginBottom:20}}>
                  {objetivos.map(o=><ProgressBall key={o.id} objetivo={o} onEdit={()=>openObjModal(o)} onDelete={()=>deleteObj(o.id)}/>)}
                </div>
                {/* Objectives detail */}
                <div style={{background:G.card,border:`1px solid ${G.border}`,borderRadius:12,padding:18}}>
                  <div style={{fontSize:14,fontWeight:600,fontFamily:'Outfit',marginBottom:14}}>Detalle de objetivos</div>
                  {objetivos.map(o=>{
                    const pct=o.target>0?Math.min(o.current/o.target*100,100):0;
                    return(
                      <div key={o.id} style={{marginBottom:12,padding:'12px 14px',background:G.card2,borderRadius:10,border:`1px solid ${G.border}`}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                          <div style={{fontFamily:'Outfit',fontSize:14,fontWeight:600}}>{o.label}</div>
                          <div style={{fontFamily:'Outfit',fontSize:13,fontWeight:700,color:o.color}}>{Math.round(pct)}% — {fmtA(o.current)} / {fmtA(o.target)}</div>
                        </div>
                        <div style={{height:8,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
                          <div style={{height:'100%',width:`${pct}%`,background:o.color,borderRadius:4,transition:'width 1s ease',boxShadow:`0 0 8px ${o.color}60`}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ══ MOBILE BOTTOM NAV ══ */}
      {mobile&&(
        <div style={{position:'fixed',bottom:0,left:0,right:0,background:G.sb,borderTop:`1px solid ${G.border}`,zIndex:200,display:'flex',paddingBottom:'env(safe-area-inset-bottom)'}}>
          {navItems.map(([p,icon,label])=>(
            <button key={p} onClick={()=>setPage(p)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'8px 4px',background:'none',border:'none',cursor:'pointer',color:page===p?G.accent:G.muted,transition:'color 0.15s',filter:page===p?`drop-shadow(0 0 5px ${G.accent})`:'none'}}>
              <span style={{fontSize:17}}>{icon}</span>
              <span style={{fontSize:8,fontFamily:'monospace',letterSpacing:'0.05em'}}>{label.slice(0,8)}</span>
            </button>
          ))}
        </div>
      )}

      {/* ══ OBJETIVO MODAL ══ */}
      {showObjModal&&(
        <div onClick={e=>e.target===e.currentTarget&&setShowObjModal(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'}}>
          <div style={{background:G.card,border:`1px solid ${G.border2}`,borderRadius:16,padding:24,width:'100%',maxWidth:400}}>
            <div style={{fontSize:16,fontWeight:700,fontFamily:'Outfit',marginBottom:18}}>{editObj?'Editar':'Nuevo'} Objetivo</div>
            <div style={{marginBottom:12}}>
              <label style={lbl}>NOMBRE DEL OBJETIVO</label>
              <input value={objLabel} onChange={e=>setObjLabel(e.target.value)} placeholder="Ej: 5% este mes" style={inp}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div><label style={lbl}>META (€)</label><input type="number" value={objTarget} onChange={e=>setObjTarget(e.target.value)} placeholder="100.00" style={inp}/></div>
              <div><label style={lbl}>ACTUAL (€)</label><input type="number" value={objCurrent} onChange={e=>setObjCurrent(e.target.value)} placeholder="0.00" style={inp}/></div>
            </div>
            <div style={{marginBottom:18}}>
              <label style={lbl}>COLOR</label>
              <div style={{display:'flex',gap:8}}>
                {[G.cyan,G.green,G.red,G.gold,G.purple,G.accent].map(c=>(
                  <button key={c} onClick={()=>setObjColor(c)} style={{width:28,height:28,borderRadius:'50%',background:c,border:`3px solid ${objColor===c?'white':'transparent'}`,cursor:'pointer',transition:'all 0.15s',boxShadow:objColor===c?`0 0 10px ${c}`:'none'}}/>
                ))}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button onClick={()=>setShowObjModal(false)} style={{padding:11,background:'transparent',border:`1px solid ${G.border}`,borderRadius:9,color:G.muted,fontSize:13,cursor:'pointer',fontFamily:'Outfit'}}>Cancelar</button>
              <button onClick={saveObj} style={{padding:11,background:`linear-gradient(135deg,${G.accent},${G.cyan})`,border:'none',borderRadius:9,color:'#05111e',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Outfit'}}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ TRADE MODAL ══ */}
      {modalTrade&&(
        <div onClick={e=>e.target===e.currentTarget&&setModalTrade(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'}}>
          <div style={{background:G.card,border:`1px solid ${G.border2}`,borderRadius:16,padding:22,width:'100%',maxWidth:480,maxHeight:'85vh',overflowY:'auto',boxShadow:`0 0 40px ${G.accent}12`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div><div style={{fontSize:16,fontWeight:700,color:G.accent,fontFamily:'Outfit'}}>{modalTrade.pair}</div><div style={{fontSize:11,color:G.muted}}>{modalTrade.date} · {modalTrade.time} · {modalTrade.tf}</div></div>
              <button onClick={()=>setModalTrade(null)} style={{width:30,height:30,borderRadius:8,border:`1px solid ${G.border}`,background:G.card2,color:G.muted,cursor:'pointer',fontSize:15}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              {[{l:'Resultado',v:modalTrade.res.toUpperCase(),c:modalTrade.res==='win'?G.green:modalTrade.res==='loss'?G.red:G.purple},{l:'P&L',v:fmt(modalTrade.pnl),c:modalTrade.pnl>0?G.green:modalTrade.pnl<0?G.red:G.purple},{l:'Dirección',v:modalTrade.dir==='buy'?'▲ LONG':'▼ SHORT',c:modalTrade.dir==='buy'?G.green:G.red},{l:'R:R',v:modalTrade.rr,c:G.gold},{l:'Riesgo',v:modalTrade.risk+'€',c:G.red},{l:'R obtenido',v:modalTrade.rreal||'—',c:G.green}].map(s=>(
                <div key={s.l} style={{background:G.card2,borderRadius:9,padding:'10px 12px',border:`1px solid ${G.border}`}}>
                  <div style={{fontFamily:'monospace',fontSize:8,letterSpacing:'0.12em',color:G.muted,marginBottom:4,textTransform:'uppercase'}}>{s.l}</div>
                  <div style={{fontFamily:'Outfit',fontSize:15,fontWeight:700,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
            {modalTrade.entry>0&&<div style={{background:G.card2,borderRadius:9,padding:'10px 12px',fontFamily:'monospace',fontSize:11,lineHeight:2,marginBottom:10,border:`1px solid ${G.border}`}}>Entry: <span style={{color:G.gold}}>{modalTrade.entry}</span> · SL: <span style={{color:G.red}}>{modalTrade.sl}</span> · TP: <span style={{color:G.green}}>{modalTrade.tp}</span></div>}
            {modalTrade.conf.length>0&&<div style={{marginBottom:10}}><div style={{fontFamily:'monospace',fontSize:8,color:G.muted,marginBottom:5,textTransform:'uppercase',letterSpacing:'0.1em'}}>Confluencias</div><div style={{display:'flex',flexWrap:'wrap',gap:4}}>{modalTrade.conf.map(c=><span key={c} style={{padding:'4px 10px',background:`${G.accent}10`,border:`1px solid ${G.border}`,borderRadius:12,fontSize:11,color:G.accent}}>{c}</span>)}</div></div>}
            <div style={{display:'flex',gap:16,marginBottom:10}}>
              <div><div style={{fontFamily:'monospace',fontSize:8,color:G.muted,marginBottom:2,textTransform:'uppercase'}}>Emoción</div><span style={{fontSize:13}}>{modalTrade.emo||'—'}</span></div>
              <div><div style={{fontFamily:'monospace',fontSize:8,color:G.muted,marginBottom:2,textTransform:'uppercase'}}>Plan</div><span style={{color:modalTrade.plan==='yes'?G.green:G.red,fontWeight:700,fontFamily:'Outfit'}}>{modalTrade.plan==='yes'?'✓ Sí':modalTrade.plan==='no'?'✕ No':'—'}</span></div>
            </div>
            {modalTrade.notes&&<div style={{background:G.card2,borderRadius:9,padding:12,fontSize:12,color:G.muted2,lineHeight:1.7,marginBottom:12,border:`1px solid ${G.border}`,fontFamily:'Outfit'}}>{modalTrade.notes}</div>}
            <button onClick={()=>deleteTrade(modalTrade.id)} style={{width:'100%',padding:11,background:`${G.red}15`,border:`1px solid ${G.red}50`,borderRadius:9,color:G.red,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Outfit'}}>Eliminar operación</button>
          </div>
        </div>
      )}
    </div>
  );
}
