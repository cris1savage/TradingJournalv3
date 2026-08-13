'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

type Trade = { id: number; date: string; time: string; pair: string; tf: string; dir: string; res: string; plan: string | null; entry: number; sl: number; tp: number; risk: number; lot: number; rr: string; pnl: number; rreal: string; conf: string[]; emo: string; notes: string; };
type EconEvent = { title: string; date: string; currency: string; impact: string; country: string; forecast: string | null; previous: string | null; actual: string | null; };
type Capital = { initial: number; aportaciones: { id: number; date: string; amount: number; desc: string }[]; };
type Page = 'dashboard' | 'nuevo' | 'historial' | 'capital' | 'noticias';

const fmt = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '€';
const fmtA = (n: number) => n.toFixed(2) + '€';
const G = { bg:'#060e1f', sb:'#080f22', card:'#0a1628', card2:'#0d1f38', border:'rgba(0,245,196,0.08)', border2:'rgba(0,245,196,0.2)', cyan:'#00f5c4', blue:'#0ea5e9', purple:'#8b5cf6', red:'#ff4d6d', gold:'#fbbf24', text:'#e2f0ff', muted:'#3a6a9a', muted2:'#5a8ab8' };

function useCounter(target: number, dur = 1200) {
  const [v, sv] = useState(0); const p = useRef(0);
  useEffect(() => { const s = p.current, d = target - s, t0 = performance.now(); const tick = (n: number) => { const pr = Math.min((n - t0) / dur, 1), e = 1 - Math.pow(1 - pr, 4); sv(s + d * e); if (pr < 1) requestAnimationFrame(tick); else p.current = target; }; requestAnimationFrame(tick); }, [target, dur]);
  return v;
}

const Logo = () => <svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect width="38" height="38" rx="11" fill="url(#lg)"/><polyline points="7,28 13,17 19,21 27,9 32,13" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="27" cy="9" r="3" fill="#00f5c4"/><circle cx="32" cy="13" r="2" fill="#00f5c4" opacity="0.5"/><line x1="7" y1="31" x2="32" y2="31" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/><defs><linearGradient id="lg" x1="0" y1="0" x2="38" y2="38"><stop offset="0%" stopColor="#0f3460"/><stop offset="100%" stopColor="#0a1628"/></linearGradient></defs></svg>;

export default function DashboardClient() {
  const [page, setPage] = useState<Page>('dashboard');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [capital, setCapital] = useState<Capital>({ initial: 0, aportaciones: [] });
  const [loading, setLoading] = useState(true);
  const [histFilter, setHistFilter] = useState('all');
  const [modalTrade, setModalTrade] = useState<Trade | null>(null);
  const [calMonth, setCalMonth] = useState(new Date());
  const [emo, setEmo] = useState('');
  const [econEvents, setEconEvents] = useState<EconEvent[]>([]);
  const [econLoading, setEconLoading] = useState(false);
  const [econUpdated, setEconUpdated] = useState('');
  const [dashPeriod, setDashPeriod] = useState<'week'|'month'|'year'|'all'>('all');

  // Form
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

  // Computed
  const totalPnl = trades.reduce((s,t)=>s+t.pnl,0);
  const totalAport = capital.aportaciones.reduce((s,a)=>s+a.amount,0);
  const balance = capital.initial + totalAport + totalPnl;
  const wins=trades.filter(t=>t.res==='win').length, losses=trades.filter(t=>t.res==='loss').length, bes=trades.filter(t=>t.res==='be').length;
  const wr = trades.length ? Math.round(wins/trades.length*100) : 0;
  const avgRR = (() => { const ws=trades.filter(t=>t.res==='win'); if(!ws.length) return 0; const total=ws.reduce((s,t)=>{ const n=parseFloat(t.rreal||'0'); return s+(isNaN(n)?0:n); },0); return total/ws.length; })();
  const byDay = trades.reduce((a,t)=>{ a[t.date]=(a[t.date]||0)+t.pnl; return a; },{} as Record<string,number>);
  const bestDay = Object.entries(byDay).reduce((b,d)=>(d[1]>b[1]?d:b),['—',-Infinity] as [string,number]);
  const worstDay = Object.entries(byDay).reduce((w,d)=>(d[1]<w[1]?d:w),['—',Infinity] as [string,number]);

  // Period filter
  const periodTrades = (() => {
    if (dashPeriod === 'all') return trades;
    const now = new Date(); const cutoff = new Date();
    if (dashPeriod==='week') cutoff.setDate(now.getDate()-7);
    if (dashPeriod==='month') cutoff.setMonth(now.getMonth()-1);
    if (dashPeriod==='year') cutoff.setFullYear(now.getFullYear()-1);
    return trades.filter(t => new Date(t.date) >= cutoff);
  })();
  const periodPnl = periodTrades.reduce((s,t)=>s+t.pnl,0);
  const periodWr = periodTrades.length ? Math.round(periodTrades.filter(t=>t.res==='win').length/periodTrades.length*100) : 0;

  const animBalance = useCounter(balance);
  const animPnl = useCounter(totalPnl);
  const animWr = useCounter(wr);
  const animTrades = useCounter(trades.length);

  const capitalCurve = () => {
    let run = capital.initial;
    const evs: {date:string;val:number;type:string}[] = [];
    capital.aportaciones.forEach(a=>evs.push({date:a.date,val:a.amount,type:'aport'}));
    trades.forEach(t=>evs.push({date:t.date+' '+t.time,val:t.pnl,type:'trade'}));
    evs.sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime());
    const labels=['Inicio'], data=[capital.initial];
    evs.forEach(e=>{run+=e.val;labels.push(e.date.split(' ')[0]);data.push(parseFloat(run.toFixed(2)));});
    return {labels,data};
  };

  const monthly = trades.reduce((a,t)=>{ const m=t.date.slice(0,7); a[m]=(a[m]||0)+t.pnl; return a; },{} as Record<string,number>);
  const mLabels=Object.keys(monthly).sort(), mData=mLabels.map(m=>parseFloat(monthly[m].toFixed(2)));
  const curve = capitalCurve();
  const last20 = trades.slice(-20);
  const filteredTrades = histFilter==='all'?[...trades].reverse():[...trades].filter(t=>t.res===histFilter||t.pair===histFilter).reverse();

  async function saveTrade() {
    if(!fDate||!fPair||!fDir||!fRes){alert('Rellena fecha, activo, dirección y resultado.');return;}
    const pnl=parseFloat(fPnl); if(isNaN(pnl)){alert('Introduce el P&L real.');return;}
    setSaving(true);
    const t:Trade={id:Date.now(),date:fDate,time:fTime,pair:fPair,tf:fTf,dir:fDir,res:fRes,plan:fPlan,entry:parseFloat(fEntry)||0,sl:parseFloat(fSl)||0,tp:parseFloat(fTp)||0,risk:parseFloat(fRisk)||0,lot:parseFloat(fLot)||0,rr:fRR,pnl,rreal:fRreal,conf:fConf,emo:fEmo,notes:fNotes};
    await fetch('/api/trades',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(t)});
    await loadData(); resetForm(); setSaving(false); setPage('dashboard');
  }

  function resetForm() { const n=new Date(); setFDate(n.toISOString().split('T')[0]); setFTime(n.toTimeString().slice(0,5)); setFPair('XAU/USD');setFTf('15M');setFDir(null);setFRes(null);setFPlan(null);setFEntry('');setFSl('');setFTp('');setFRisk('');setFLot('');setFRR('—');setFPnl('');setFRreal('');setFConf([]);setFEmo('');setFNotes(''); }
  async function deleteTrade(id:number){if(!confirm('¿Eliminar?'))return;await fetch('/api/trades',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});setModalTrade(null);await loadData();}
  async function setIC(){const v=parseFloat(capInitial);if(isNaN(v)||v<=0){alert('Capital inválido.');return;}await fetch('/api/capital',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'setInitial',amount:v})});await loadData();alert('✓ Capital guardado');}
  async function addAp(){const a=parseFloat(apAmount);if(!apDate||isNaN(a)||a<=0){alert('Rellena fecha e importe.');return;}await fetch('/api/capital',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'addAport',date:apDate,amount:a,desc:apDesc||'Aportación'})});setApAmount('');setApDesc('');await loadData();}
  async function delAp(id:number){await fetch('/api/capital',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'deleteAport',id})});await loadData();}
  async function logout(){await fetch('/api/auth',{method:'DELETE'});window.location.href='/login';}
  function toggleConf(c:string){setFConf(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);}

  const calDays=()=>{ const y=calMonth.getFullYear(),m=calMonth.getMonth(); const fd=new Date(y,m,1).getDay(); const dim=new Date(y,m+1,0).getDate(); const offset=fd===0?6:fd-1; const cells=[]; for(let i=0;i<offset;i++)cells.push(null); for(let d=1;d<=dim;d++){const k=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;cells.push({day:d,pnl:byDay[k]??null});}return cells;};

  const now2=new Date(); const dateStr=now2.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); const greeting=now2.getHours()<12?'Buenos días':now2.getHours()<20?'Buenas tardes':'Buenas noches';

  const cOpts=(yLabel='€'):object=>({responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#0a1628',titleColor:G.cyan,bodyColor:G.text,borderColor:'#1a3a5c',borderWidth:1}},scales:{x:{ticks:{color:G.muted,font:{family:'monospace',size:9},maxTicksLimit:6},grid:{color:'rgba(255,255,255,0.03)'}},y:{ticks:{color:G.muted,font:{family:'monospace',size:9},callback:(v:string|number)=>v+yLabel},grid:{color:'rgba(255,255,255,0.03)'}}}});

  const inp:React.CSSProperties={background:G.card2,border:`1px solid ${G.border}`,borderRadius:8,padding:'9px 12px',color:G.text,fontFamily:'inherit',fontSize:13,width:'100%'};
  const secT:React.CSSProperties={fontFamily:'monospace',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:G.cyan,marginBottom:14,paddingBottom:8,borderBottom:`1px solid ${G.border}`};
  const lbl:React.CSSProperties={fontFamily:'monospace',fontSize:9,letterSpacing:'0.15em',textTransform:'uppercase',color:G.muted,display:'block',marginBottom:5};
  const cardStyle:React.CSSProperties={background:`linear-gradient(135deg,${G.card},${G.card2})`,border:`1px solid ${G.border}`,borderRadius:14,padding:20,boxShadow:'0 4px 24px rgba(0,0,0,0.4)'};

  const Tog=({label,active,color,bg,onClick}:{label:string;active:boolean;color:string;bg:string;onClick:()=>void})=>(
    <button onClick={onClick} style={{padding:'9px 8px',borderRadius:8,border:`1px solid ${active?color:G.border}`,background:active?bg:G.card2,color:active?color:G.muted,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',boxShadow:active?`0 0 12px ${color}40`:'none'}}>{label}</button>
  );

  // Group econ events by date
  const econByDate=econEvents.reduce((a,ev)=>{const k=new Date(ev.date).toDateString();if(!a[k])a[k]=[];a[k].push(ev);return a;},{} as Record<string,EconEvent[]>);
  const todayKey=new Date().toDateString();
  const todayEvents=econByDate[todayKey]||[];

  if(loading) return(
    <div style={{minHeight:'100vh',background:G.bg,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <div style={{width:48,height:48,position:'relative'}}>
        <div style={{position:'absolute',inset:0,border:`2px solid ${G.border}`,borderTop:`2px solid ${G.cyan}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
        <div style={{position:'absolute',inset:8,border:`2px solid ${G.border}`,borderBottom:`2px solid ${G.purple}`,borderRadius:'50%',animation:'spin 1.2s linear infinite reverse'}}/>
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
        input,select,textarea{font-family:inherit}
        select option{background:${G.card2}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}
        .pe{animation:fadeUp 0.3s ease}
        input:focus,select:focus,textarea:focus{outline:none;border-color:${G.cyan}88!important;box-shadow:0 0 0 2px ${G.cyan}15!important}
        .nr:hover{background:${G.cyan}08!important}
        @media(max-width:768px){.sbd{display:none!important}.mc{margin-left:0!important;padding-bottom:72px!important}.bn{display:flex!important}.sg4{grid-template-columns:repeat(2,1fr)!important}.cg2{grid-template-columns:1fr!important}}
        @media(min-width:769px){.bn{display:none!important}}
      `}</style>

      {/* SIDEBAR */}
      <div className="sbd" style={{width:230,background:G.sb,borderRight:`1px solid ${G.border}`,display:'flex',flexDirection:'column',position:'fixed',top:0,left:0,bottom:0,zIndex:100}}>
        <div style={{padding:'20px 18px 16px',borderBottom:`1px solid ${G.border}`}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Logo/>
            <div>
              <div style={{fontFamily:'Space Mono',fontSize:12,fontWeight:700,color:G.cyan,letterSpacing:'0.06em'}}>APEX TRADER</div>
              <div style={{fontSize:9,color:G.muted,letterSpacing:'0.12em',fontFamily:'monospace'}}>JOURNAL PRO</div>
            </div>
          </div>
        </div>
        <nav style={{padding:'12px 10px',flex:1}}>
          {(['dashboard','nuevo','historial','capital','noticias'] as Page[]).map((p,i)=>{
            const icons=['▣','⊕','☰','◈','⚡'], labels=['Dashboard','Nuevo Trade','Historial','Capital','Noticias'];
            return(
              <div key={p} onClick={()=>setPage(p)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:10,cursor:'pointer',color:page===p?G.cyan:G.muted,background:page===p?`${G.cyan}0d`:'transparent',borderLeft:`2px solid ${page===p?G.cyan:'transparent'}`,marginBottom:3,fontSize:13,fontWeight:page===p?600:400,transition:'all 0.15s'}}>
                <span style={{fontSize:14,width:18,textAlign:'center',filter:page===p?`drop-shadow(0 0 5px ${G.cyan})`:'none'}}>{icons[i]}</span>
                <span>{labels[i]}</span>
                {page===p&&<div style={{marginLeft:'auto',width:4,height:4,borderRadius:'50%',background:G.cyan,boxShadow:`0 0 6px ${G.cyan}`}}/>}
              </div>
            );
          })}
        </nav>
        {/* Today's events in sidebar */}
        {todayEvents.length>0&&(
          <div style={{padding:'12px 14px',borderTop:`1px solid ${G.border}`}}>
            <div style={{fontFamily:'monospace',fontSize:8,color:G.muted,letterSpacing:'0.15em',marginBottom:8}}>HOY EN EL MERCADO</div>
            {todayEvents.slice(0,3).map((ev,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:7,marginBottom:5,padding:'6px 8px',background:G.card2,borderRadius:7,border:`1px solid ${ev.impact==='High'?`${G.red}30`:G.border}`}}>
                <span style={{fontSize:10}}>{ev.impact==='High'?'🔴':'🟡'}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:9,color:G.text,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.title}</div>
                  <div style={{fontSize:8,color:G.muted,fontFamily:'monospace'}}>{new Date(ev.date).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})} · {ev.currency}</div>
                </div>
              </div>
            ))}
            {todayEvents.length>3&&<div style={{fontSize:9,color:G.muted,textAlign:'center',cursor:'pointer',marginTop:4}} onClick={()=>setPage('noticias')}>+{todayEvents.length-3} más →</div>}
          </div>
        )}
        <div style={{padding:'12px 14px 18px',borderTop:todayEvents.length>0?'none':`1px solid ${G.border}`}}>
          <div style={{background:`linear-gradient(135deg,${G.card},${G.card2})`,border:`1px solid ${G.border2}`,borderRadius:12,padding:'13px 15px',marginBottom:10,boxShadow:`0 0 20px ${G.cyan}0a`}}>
            <div style={{fontFamily:'monospace',fontSize:8,color:G.muted,letterSpacing:'0.15em',marginBottom:4}}>BALANCE ACTUAL</div>
            <div style={{fontFamily:'Space Mono',fontSize:20,fontWeight:700,color:balance>=capital.initial?G.cyan:G.red}}>{fmtA(animBalance)}</div>
            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:4}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:totalPnl>=0?G.cyan:G.red,boxShadow:`0 0 5px ${totalPnl>=0?G.cyan:G.red}`}}/>
              <span style={{fontSize:10,color:totalPnl>=0?G.cyan:G.red,fontFamily:'monospace'}}>{fmt(totalPnl)} P&L</span>
            </div>
          </div>
          <button onClick={logout} style={{width:'100%',padding:'7px',background:'transparent',border:`1px solid ${G.border}`,borderRadius:7,color:G.muted,fontSize:10,cursor:'pointer',fontFamily:'monospace',letterSpacing:'0.08em'}}>CERRAR SESIÓN</button>
        </div>
      </div>

      {/* MAIN */}
      <div className="mc" style={{marginLeft:230,flex:1,padding:'22px 26px',minHeight:'100vh'}}>

        {/* ═══ DASHBOARD ═══ */}
        {page==='dashboard'&&(
          <div className="pe">
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
              <div>
                <div style={{fontFamily:'monospace',fontSize:9,color:G.muted,letterSpacing:'0.15em',marginBottom:4,textTransform:'uppercase'}}>{dateStr}</div>
                <div style={{fontSize:26,fontWeight:700,letterSpacing:'-0.02em'}}>{greeting}, <span style={{color:G.cyan,textShadow:`0 0 20px ${G.cyan}50`}}>Cristian</span></div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                {/* Period selector */}
                <div style={{display:'flex',background:G.card2,border:`1px solid ${G.border}`,borderRadius:9,padding:3,gap:2}}>
                  {(['week','month','year','all'] as const).map(p=>(
                    <button key={p} onClick={()=>setDashPeriod(p)} style={{padding:'5px 12px',borderRadius:7,border:'none',background:dashPeriod===p?`${G.cyan}20`:'transparent',color:dashPeriod===p?G.cyan:G.muted,fontSize:10,cursor:'pointer',fontFamily:'monospace',letterSpacing:'0.05em',transition:'all 0.15s',boxShadow:dashPeriod===p?`0 0 8px ${G.cyan}30`:'none'}}>
                      {{week:'7D',month:'1M',year:'1A',all:'TODO'}[p]}
                    </button>
                  ))}
                </div>
                <button onClick={()=>setPage('nuevo')} style={{display:'flex',alignItems:'center',gap:7,padding:'10px 18px',background:`linear-gradient(135deg,#0ea5e9,${G.cyan})`,border:'none',borderRadius:10,color:'#030a12',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 0 20px ${G.cyan}35`,letterSpacing:'0.02em'}}>
                  ⊕ Nuevo Trade
                </button>
              </div>
            </div>

            {/* STAT CARDS */}
            <div className="sg4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
              {[
                {label:'BALANCE TOTAL',val:fmtA(animBalance),sub:'Capital + Aportaciones + P&L',color:G.cyan,icon:'◎',glow:true},
                {label:'P&L '+{week:'SEMANA',month:'MES',year:'AÑO',all:'TOTAL'}[dashPeriod],val:fmt(dashPeriod==='all'?animPnl:periodPnl),sub:`${periodTrades.length} ops · ${dashPeriod==='all'?'histórico':dashPeriod}`,color:periodPnl>=0?G.cyan:G.red,icon:'↗',glow:false},
                {label:'WIN RATE',val:Math.round(dashPeriod==='all'?animWr:periodWr)+'%',sub:`${periodTrades.filter(t=>t.res==='win').length}W · ${periodTrades.filter(t=>t.res==='loss').length}L · ${periodTrades.filter(t=>t.res==='be').length}BE`,color:G.purple,icon:'◈',glow:false},
                {label:'TRADES',val:String(Math.round(animTrades)),sub:`${Object.keys(byDay).length} días operados`,color:G.gold,icon:'≡',glow:false},
              ].map(s=>(
                <div key={s.label} style={{background:`linear-gradient(135deg,${G.card},${G.card2})`,border:`1px solid ${s.glow?`${s.color}30`:G.border}`,borderRadius:14,padding:'16px 18px',position:'relative',overflow:'hidden',boxShadow:s.glow?`0 0 20px ${s.color}15`:'none',transition:'transform 0.2s,box-shadow 0.2s'}}
                  onMouseEnter={e=>{const el=e.currentTarget as HTMLDivElement;el.style.transform='translateY(-2px)';el.style.boxShadow=`0 8px 30px ${s.color}20`;}}
                  onMouseLeave={e=>{const el=e.currentTarget as HTMLDivElement;el.style.transform='';el.style.boxShadow=s.glow?`0 0 20px ${s.color}15`:'none';}}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${s.color},transparent)`}}/>
                  <div style={{position:'absolute',top:12,right:14,fontSize:22,opacity:0.1,color:s.color}}>{s.icon}</div>
                  <div style={{fontFamily:'monospace',fontSize:9,letterSpacing:'0.18em',color:G.muted,marginBottom:10,textTransform:'uppercase'}}>{s.label}</div>
                  <div style={{fontFamily:'Space Mono',fontSize:24,fontWeight:700,color:s.color,letterSpacing:'-0.02em',lineHeight:1}}>{s.val}</div>
                  <div style={{fontSize:11,color:G.muted,marginTop:6}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* EXTRA STATS ROW */}
            <div className="sg4" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:16}}>
              {[
                {l:'MEJOR DÍA',v:bestDay[1]>-Infinity?fmt(bestDay[1] as number):'—',s:bestDay[0]==='—'?'—':bestDay[0],c:G.cyan},
                {l:'PEOR DÍA',v:worstDay[1]<Infinity?fmt(worstDay[1] as number):'—',s:worstDay[0]==='—'?'—':worstDay[0],c:G.red},
                {l:'AVG R:R WINS',v:avgRR>0?'+'+avgRR.toFixed(1)+'R':'—',s:'En operaciones ganadoras',c:G.gold},
                {l:'CON PLAN',v:trades.filter(t=>t.plan==='yes').length+'/'+trades.length,s:'P&L: '+fmt(trades.filter(t=>t.plan==='yes').reduce((s,t)=>s+t.pnl,0)),c:G.purple},
              ].map(s=>(
                <div key={s.l} style={{background:G.card2,border:`1px solid ${G.border}`,borderRadius:10,padding:'12px 14px'}}>
                  <div style={{fontFamily:'monospace',fontSize:8,letterSpacing:'0.15em',color:G.muted,marginBottom:6,textTransform:'uppercase'}}>{s.l}</div>
                  <div style={{fontFamily:'Space Mono',fontSize:17,fontWeight:700,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10,color:G.muted,marginTop:3}}>{s.s}</div>
                </div>
              ))}
            </div>

            {/* CHARTS R1 */}
            <div className="cg2" style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12,marginBottom:12}}>
              <div style={cardStyle}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <div><div style={{fontSize:13,fontWeight:600}}>Curva de Capital</div><div style={{fontSize:11,color:G.muted,marginTop:2}}>Evolución histórica del balance</div></div>
                  <span style={{fontFamily:'monospace',fontSize:11,color:balance>=capital.initial?G.cyan:G.red}}>{fmt(balance-capital.initial)}</span>
                </div>
                <div style={{height:180}}>
                  {curve.data.length>1?<Line data={{labels:curve.labels,datasets:[{data:curve.data,borderColor:G.cyan,backgroundColor:`${G.cyan}0a`,borderWidth:2.5,pointRadius:curve.data.length<15?4:0,pointBackgroundColor:G.cyan,pointBorderColor:G.bg,pointBorderWidth:2,fill:true,tension:0.4}]}} options={cOpts() as object}/>
                  :<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:G.muted,fontSize:12,flexDirection:'column',gap:8}}><span style={{fontSize:28}}>📊</span>Sin datos aún</div>}
                </div>
              </div>
              <div style={cardStyle}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Distribución</div>
                <div style={{fontSize:11,color:G.muted,marginBottom:14}}>Wins / Losses / Breakeven</div>
                <div style={{height:180}}>
                  {trades.length>0?<Doughnut data={{labels:['Wins','Losses','BE'],datasets:[{data:[wins,losses,bes],backgroundColor:[`${G.cyan}cc`,`${G.red}cc`,`${G.purple}99`],borderWidth:0,hoverOffset:8}]}} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:G.text,font:{size:10},padding:12,boxWidth:10,boxHeight:10}},tooltip:{backgroundColor:G.card,titleColor:G.cyan,bodyColor:G.text}}}}/>
                  :<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:G.muted,fontSize:12}}>Sin datos</div>}
                </div>
              </div>
            </div>

            {/* CHARTS R2 — P&L por op + Mensual */}
            <div className="cg2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              <div style={cardStyle}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>P&L por Operación</div>
                <div style={{fontSize:11,color:G.muted,marginBottom:12}}>Últimas 20 operaciones</div>
                <div style={{height:150}}>
                  {last20.length>0?<Bar data={{labels:last20.map(t=>t.pair.split('/')[0]),datasets:[{data:last20.map(t=>t.pnl),backgroundColor:last20.map(t=>t.pnl>=0?`${G.cyan}aa`:`${G.red}aa`),borderRadius:4}]}} options={cOpts() as object}/>
                  :<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:G.muted,fontSize:12}}>Sin datos</div>}
                </div>
              </div>
              <div style={cardStyle}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>P&L Mensual</div>
                <div style={{fontSize:11,color:G.muted,marginBottom:12}}>Rendimiento acumulado por mes</div>
                <div style={{height:150}}>
                  {mLabels.length>0?<Bar data={{labels:mLabels,datasets:[{data:mData,backgroundColor:mData.map(v=>v>=0?`${G.cyan}aa`:`${G.red}aa`),borderRadius:4}]}} options={cOpts() as object}/>
                  :<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:G.muted,fontSize:12}}>Sin datos</div>}
                </div>
              </div>
            </div>

            {/* CALENDAR + TRADES */}
            <div className="cg2" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
              {/* Calendar */}
              <div style={cardStyle}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600}}>Calendario P&L</div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()-1))} style={{background:G.card2,border:`1px solid ${G.border}`,borderRadius:6,color:G.cyan,width:24,height:24,cursor:'pointer',fontSize:12}}>‹</button>
                    <span style={{fontFamily:'monospace',fontSize:9,color:G.cyan,minWidth:100,textAlign:'center',letterSpacing:'0.06em'}}>{calMonth.toLocaleDateString('es-ES',{month:'long',year:'numeric'}).toUpperCase()}</span>
                    <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()+1))} style={{background:G.card2,border:`1px solid ${G.border}`,borderRadius:6,color:G.cyan,width:24,height:24,cursor:'pointer',fontSize:12}}>›</button>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
                  {['L','M','X','J','V','S','D'].map(d=><div key={d} style={{textAlign:'center',fontFamily:'monospace',fontSize:7,color:G.muted,letterSpacing:'0.08em'}}>{d}</div>)}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
                  {calDays().map((cell,i)=>(
                    <div key={i} style={{aspectRatio:'1',borderRadius:5,border:`1px solid ${cell?.pnl!=null?(cell.pnl>=0?`${G.cyan}40`:`${G.red}40`):G.border}`,background:cell?.pnl!=null?(cell.pnl>=0?`${G.cyan}12`:`${G.red}12`):'transparent',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',boxShadow:cell?.pnl!=null&&cell.pnl>0?`0 0 6px ${G.cyan}15`:'none'}}>
                      {cell&&<>
                        <div style={{fontSize:7,color:cell.pnl!=null?G.text:G.muted,fontWeight:600}}>{cell.day}</div>
                        {cell.pnl!=null&&<div style={{fontSize:6,fontFamily:'monospace',color:cell.pnl>=0?G.cyan:G.red,fontWeight:700}}>{cell.pnl>=0?'+':''}{cell.pnl.toFixed(0)}</div>}
                      </>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent trades */}
              <div style={cardStyle}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <div style={{fontSize:13,fontWeight:600}}>Trades Recientes</div>
                  <button onClick={()=>setPage('historial')} style={{fontSize:10,color:G.cyan,background:'none',border:'none',cursor:'pointer',fontFamily:'monospace'}}>VER TODOS →</button>
                </div>
                {trades.length===0?<div style={{textAlign:'center',padding:'32px 0',color:G.muted,fontSize:12}}>Sin trades aún</div>
                :[...trades].reverse().slice(0,7).map(t=>(
                  <div key={t.id} onClick={()=>setModalTrade(t)} className="nr" style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderRadius:8,cursor:'pointer',marginBottom:4,border:`1px solid transparent`,transition:'all 0.12s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:9}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:t.res==='win'?G.cyan:t.res==='loss'?G.red:G.purple,boxShadow:`0 0 5px ${t.res==='win'?G.cyan:t.res==='loss'?G.red:G.purple}`}}/>
                      <div>
                        <div style={{fontSize:12,fontWeight:600}}>{t.pair} <span style={{fontSize:10,color:t.dir==='buy'?G.cyan:G.red}}>{t.dir==='buy'?'▲':'▼'}</span></div>
                        <div style={{fontSize:10,color:G.muted}}>{t.date} · {t.tf}</div>
                      </div>
                    </div>
                    <div style={{fontFamily:'Space Mono',fontSize:13,fontWeight:700,color:t.pnl>0?G.cyan:t.pnl<0?G.red:G.purple}}>{fmt(t.pnl)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ECON TODAY WIDGET */}
            <div style={cardStyle}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>⚡ Eventos Económicos de Hoy</div>
                  <div style={{fontSize:11,color:G.muted,marginTop:2}}>USD · EUR · GBP — Horario España (CET)</div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={loadEcon} style={{fontSize:10,color:G.cyan,background:G.card2,border:`1px solid ${G.border}`,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:'monospace',letterSpacing:'0.05em'}}>↻ HOY</button>
                  <button onClick={()=>setPage('noticias')} style={{fontSize:10,color:G.cyan,background:'none',border:`1px solid ${G.border}`,borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:'monospace'}}>CALENDARIO →</button>
                </div>
              </div>
              {econLoading?<div style={{textAlign:'center',padding:'20px 0',color:G.muted,fontSize:12}}>Cargando eventos...</div>
              :todayEvents.length===0?
                <div style={{textAlign:'center',padding:'20px 0',color:G.muted,fontSize:12}}>
                  No hay eventos de alto/medio impacto hoy · <span style={{color:G.cyan,cursor:'pointer'}} onClick={()=>setPage('noticias')}>Ver calendario completo →</span>
                </div>
              :(
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {todayEvents.map((ev,i)=>{
                    const d=new Date(ev.date); const isPast=d<new Date(); const isNear=!isPast&&(d.getTime()-new Date().getTime())<3600000;
                    return(
                      <div key={i} style={{background:G.card2,borderRadius:9,padding:'11px 13px',border:`1px solid ${isNear?`${G.gold}50`:ev.impact==='High'?`${G.red}25`:G.border}`,boxShadow:isNear?`0 0 12px ${G.gold}20`:ev.impact==='High'&&!isPast?`0 0 8px ${G.red}12`:'none',opacity:isPast?0.55:1}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                          <span style={{fontFamily:'Space Mono',fontSize:11,fontWeight:700,color:isNear?G.gold:G.text}}>{d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</span>
                          <div style={{display:'flex',gap:5,alignItems:'center'}}>
                            <span style={{fontSize:9,fontFamily:'monospace',padding:'2px 6px',borderRadius:4,background:ev.currency==='USD'?`${G.blue}25`:ev.currency==='EUR'?`${G.cyan}20`:`${G.purple}25`,color:ev.currency==='USD'?G.blue:ev.currency==='EUR'?G.cyan:G.purple,fontWeight:700}}>{ev.currency}</span>
                            <span>{ev.impact==='High'?'🔴':'🟡'}</span>
                          </div>
                        </div>
                        <div style={{fontSize:11,fontWeight:600,color:G.text,lineHeight:1.3,marginBottom:6}}>{ev.title}</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4}}>
                          {[['PREV',ev.previous,G.muted2],['PREV',ev.forecast,G.gold],['REAL',ev.actual,G.cyan]].map(([l,v,c],j)=>(
                            <div key={j} style={{textAlign:'center'}}>
                              <div style={{fontFamily:'monospace',fontSize:7,color:G.muted,letterSpacing:'0.1em'}}>{['PREV','PREV','REAL'][j]}</div>
                              <div style={{fontFamily:'monospace',fontSize:10,fontWeight:700,color:c as string}}>{(v as string)||'—'}</div>
                            </div>
                          ))}
                        </div>
                        {isNear&&<div style={{marginTop:6,textAlign:'center',fontSize:8,color:G.gold,fontFamily:'monospace',animation:'pulse 1.5s ease infinite'}}>⚠ EN MENOS DE 1H — NO OPERES</div>}
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
            <div style={{marginBottom:22}}><div style={{fontSize:22,fontWeight:700}}>Nuevo Trade</div><div style={{fontSize:12,color:G.muted,marginTop:2}}>Registra tu operación con todos los detalles</div></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 280px',gap:16,alignItems:'start'}}>
              <div style={{background:`linear-gradient(135deg,${G.card},${G.card2})`,border:`1px solid ${G.border}`,borderRadius:14,padding:22}}>
                <div style={secT}>INFO BÁSICA</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  <div><label style={lbl}>FECHA</label><input type="date" value={fDate} onChange={e=>setFDate(e.target.value)} style={inp}/></div>
                  <div><label style={lbl}>HORA</label><input type="time" value={fTime} onChange={e=>setFTime(e.target.value)} style={inp}/></div>
                  <div><label style={lbl}>ACTIVO</label><select value={fPair} onChange={e=>setFPair(e.target.value)} style={inp}><option>XAU/USD</option><option>NAS100</option><option>BTC/USD</option><option>Otro</option></select></div>
                  <div><label style={lbl}>TIMEFRAME</label><select value={fTf} onChange={e=>setFTf(e.target.value)} style={inp}><option>15M</option><option>1H</option><option>4H</option></select></div>
                </div>
                <div style={{marginBottom:20}}><label style={lbl}>DIRECCIÓN</label><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><Tog label="▲ LONG" active={fDir==='buy'} color={G.cyan} bg={`${G.cyan}15`} onClick={()=>setFDir('buy')}/><Tog label="▼ SHORT" active={fDir==='sell'} color={G.red} bg={`${G.red}15`} onClick={()=>setFDir('sell')}/></div></div>

                <div style={secT}>PRECIOS & GESTIÓN</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
                  {[['ENTRADA',fEntry,setFEntry],['STOP LOSS',fSl,setFSl],['TAKE PROFIT',fTp,setFTp]].map(([l,v,s])=>(
                    <div key={l as string}><label style={lbl}>{l as string}</label><input type="number" value={v as string} onChange={e=>(s as (x:string)=>void)(e.target.value)} placeholder="0.00" style={inp}/></div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20}}>
                  <div><label style={lbl}>RIESGO €</label><input type="number" value={fRisk} onChange={e=>setFRisk(e.target.value)} placeholder="0.00" style={inp}/></div>
                  <div><label style={lbl}>LOTE</label><input type="number" value={fLot} onChange={e=>setFLot(e.target.value)} placeholder="0.01" style={inp}/></div>
                  <div><label style={lbl}>R:R AUTO</label><div style={{background:G.card2,border:`1px solid ${parseFloat(fRR.split(':')[1])>=2?`${G.cyan}60`:G.border}`,borderRadius:8,padding:'9px 12px',fontFamily:'monospace',fontWeight:700,color:parseFloat(fRR.split(':')[1])>=2?G.cyan:G.gold,textAlign:'center',fontSize:13,boxShadow:parseFloat(fRR.split(':')[1])>=2?`0 0 10px ${G.cyan}30`:'none'}}>{fRR}</div></div>
                </div>

                <div style={secT}>RESULTADO</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
                  <Tog label="✓ WIN" active={fRes==='win'} color={G.cyan} bg={`${G.cyan}15`} onClick={()=>setFRes('win')}/>
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
                    <button key={c} onClick={()=>toggleConf(c)} style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${fConf.includes(c)?G.cyan:G.border}`,background:fConf.includes(c)?`${G.cyan}15`:'transparent',color:fConf.includes(c)?G.cyan:G.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit',transition:'all 0.12s',boxShadow:fConf.includes(c)?`0 0 8px ${G.cyan}25`:'none'}}>{c}</button>
                  ))}
                </div>

                <div style={secT}>PSICOLOGÍA</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                  {['😐 Neutro','😌 Tranquilo','💪 Confiado','😰 Ansioso','😤 Frustrado','🎲 FOMO','😡 Revenge'].map(e=>(
                    <button key={e} onClick={()=>setFEmo(fEmo===e?'':e)} style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${fEmo===e?G.purple:G.border}`,background:fEmo===e?`${G.purple}18`:'transparent',color:fEmo===e?G.purple:G.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit',transition:'all 0.12s'}}>{e}</button>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:20}}>
                  <Tog label="✓ Plan seguido" active={fPlan==='yes'} color={G.cyan} bg={`${G.cyan}15`} onClick={()=>setFPlan('yes')}/>
                  <Tog label="✕ Sin plan" active={fPlan==='no'} color={G.red} bg={`${G.red}15`} onClick={()=>setFPlan('no')}/>
                </div>

                <div style={secT}>NOTAS</div>
                <textarea value={fNotes} onChange={e=>setFNotes(e.target.value)} placeholder="¿Qué setup viste? ¿Qué aprendiste?" style={{...inp,minHeight:80,resize:'vertical',lineHeight:1.6,marginBottom:20}}/>
                <button onClick={saveTrade} disabled={saving} style={{width:'100%',padding:13,background:saving?G.muted:`linear-gradient(135deg,#0ea5e9,${G.cyan})`,border:'none',borderRadius:10,color:'#030a12',fontSize:14,fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit',boxShadow:saving?'none':`0 0 20px ${G.cyan}35`,letterSpacing:'0.03em',transition:'all 0.2s'}}>
                  {saving?'⟳ GUARDANDO...':'⊕ GUARDAR OPERACIÓN'}
                </button>
              </div>
              <div style={{position:'sticky',top:22,display:'flex',flexDirection:'column',gap:12}}>
                <div style={{...cardStyle,padding:16}}>
                  <div style={{fontSize:11,fontWeight:600,color:G.cyan,marginBottom:12,fontFamily:'monospace',letterSpacing:'0.1em'}}>PREVIEW</div>
                  {[['PAR',fPair],['DIR',fDir?(fDir==='buy'?'▲ LONG':'▼ SHORT'):'—'],['R:R',fRR],['RIESGO',fRisk?fRisk+'€':'—'],['RESULTADO',fRes?.toUpperCase()||'—'],['P&L',fPnl?fmt(parseFloat(fPnl)):'—'],['PLAN',fPlan==='yes'?'✓ Sí':fPlan==='no'?'✕ No':'—']].map(([k,v])=>(
                    <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${G.border}`,fontSize:11}}>
                      <span style={{color:G.muted,fontFamily:'monospace',fontSize:9,letterSpacing:'0.08em'}}>{k}</span>
                      <span style={{fontFamily:'monospace',fontWeight:700,fontSize:11}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{...cardStyle,padding:16,border:`1px solid ${G.border2}`,boxShadow:`0 0 18px ${G.cyan}0a`}}>
                  <div style={{fontFamily:'monospace',fontSize:9,color:G.muted,letterSpacing:'0.1em',marginBottom:5}}>BALANCE ACTUAL</div>
                  <div style={{fontFamily:'Space Mono',fontSize:22,fontWeight:700,color:balance>=capital.initial?G.cyan:G.red}}>{fmtA(balance)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ HISTORIAL ═══ */}
        {page==='historial'&&(
          <div className="pe">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
              <div><div style={{fontSize:22,fontWeight:700}}>Historial</div><div style={{fontSize:12,color:G.muted,marginTop:2}}>{filteredTrades.length} operaciones</div></div>
              <div style={{display:'flex',gap:6}}>
                {[['all','Todas'],['win','Wins'],['loss','Losses'],['XAU/USD','Oro'],['NAS100','Nasdaq']].map(([f,l])=>(
                  <button key={f} onClick={()=>setHistFilter(f)} style={{padding:'5px 13px',borderRadius:20,border:`1px solid ${histFilter===f?G.cyan:G.border}`,background:histFilter===f?`${G.cyan}15`:'transparent',color:histFilter===f?G.cyan:G.muted,fontSize:11,cursor:'pointer',fontFamily:'inherit',transition:'all 0.12s',boxShadow:histFilter===f?`0 0 8px ${G.cyan}25`:'none'}}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{background:`linear-gradient(135deg,${G.card},${G.card2})`,border:`1px solid ${G.border}`,borderRadius:14,overflow:'hidden'}}>
              <div style={{display:'grid',gridTemplateColumns:'100px 90px 55px 80px 60px 1fr 90px',padding:'10px 18px',background:G.bg,borderBottom:`1px solid ${G.border}`,gap:8}}>
                {['Fecha','Activo','Dir','Resultado','Plan','Notas','P&L'].map(h=><span key={h} style={{fontFamily:'monospace',fontSize:9,letterSpacing:'0.12em',textTransform:'uppercase',color:G.muted}}>{h}</span>)}
              </div>
              {filteredTrades.length===0?<div style={{textAlign:'center',padding:'52px 0',color:G.muted,fontSize:13}}>Sin operaciones. Añade tu primer trade.</div>
              :filteredTrades.map(t=>(
                <div key={t.id} onClick={()=>setModalTrade(t)} style={{display:'grid',gridTemplateColumns:'100px 90px 55px 80px 60px 1fr 90px',padding:'12px 18px',borderBottom:`1px solid ${G.border}`,gap:8,alignItems:'center',cursor:'pointer',transition:'background 0.1s'}}
                  onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=`${G.cyan}06`}
                  onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                  <span style={{fontFamily:'monospace',fontSize:11,color:G.muted}}>{t.date}</span>
                  <span style={{fontFamily:'monospace',fontSize:11,color:G.cyan}}>{t.pair}</span>
                  <span style={{fontSize:12,color:t.dir==='buy'?G.cyan:G.red,fontWeight:700}}>{t.dir==='buy'?'▲ L':'▼ S'}</span>
                  <span style={{padding:'3px 8px',borderRadius:5,fontSize:10,fontFamily:'monospace',fontWeight:700,background:t.res==='win'?`${G.cyan}18`:t.res==='loss'?`${G.red}18`:`${G.purple}18`,color:t.res==='win'?G.cyan:t.res==='loss'?G.red:G.purple,display:'inline-block'}}>{t.res.toUpperCase()}</span>
                  <span style={{color:t.plan==='yes'?G.cyan:t.plan==='no'?G.red:G.muted,fontSize:12,fontWeight:700}}>{t.plan==='yes'?'✓':t.plan==='no'?'✕':'—'}</span>
                  <span style={{color:G.muted,fontSize:11,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.notes?t.notes.slice(0,45)+(t.notes.length>45?'…':''):'—'}</span>
                  <span style={{fontFamily:'Space Mono',fontSize:13,fontWeight:700,textAlign:'right',color:t.pnl>0?G.cyan:t.pnl<0?G.red:G.purple}}>{fmt(t.pnl)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ CAPITAL ═══ */}
        {page==='capital'&&(
          <div className="pe">
            <div style={{marginBottom:22}}><div style={{fontSize:22,fontWeight:700}}>Capital</div><div style={{fontSize:12,color:G.muted,marginTop:2}}>Gestión de capital y aportaciones mensuales</div></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start'}}>
              <div>
                <div style={{...cardStyle,marginBottom:14}}>
                  <div style={secT}>CAPITAL INICIAL</div>
                  <label style={lbl}>IMPORTE €</label>
                  <input type="number" value={capInitial} onChange={e=>setCapInitial(e.target.value)} placeholder="500.00" style={{...inp,marginBottom:14}}/>
                  <button onClick={setIC} style={{width:'100%',padding:12,background:`linear-gradient(135deg,#065f46,${G.cyan})`,border:'none',borderRadius:9,color:'#030a12',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 0 18px ${G.cyan}25`}}>Guardar capital inicial</button>
                </div>
                <div style={cardStyle}>
                  <div style={secT}>NUEVA APORTACIÓN</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                    <div><label style={lbl}>FECHA</label><input type="date" value={apDate} onChange={e=>setApDate(e.target.value)} style={inp}/></div>
                    <div><label style={lbl}>IMPORTE €</label><input type="number" value={apAmount} onChange={e=>setApAmount(e.target.value)} placeholder="100.00" style={inp}/></div>
                  </div>
                  <label style={lbl}>DESCRIPCIÓN</label>
                  <input type="text" value={apDesc} onChange={e=>setApDesc(e.target.value)} placeholder="Aportación mensual agosto" style={{...inp,marginBottom:14}}/>
                  <button onClick={addAp} style={{width:'100%',padding:12,background:`linear-gradient(135deg,#0ea5e9,${G.cyan})`,border:'none',borderRadius:9,color:'#030a12',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 0 18px ${G.cyan}25`}}>Añadir aportación</button>
                </div>
              </div>
              <div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
                  {[{l:'Capital inicial',v:fmtA(capital.initial),c:G.cyan},{l:'Total aportado',v:fmtA(totalAport),c:G.gold},{l:'P&L total',v:fmt(totalPnl),c:totalPnl>=0?G.cyan:G.red},{l:'Balance total',v:fmtA(balance),c:G.blue}].map(s=>(
                    <div key={s.l} style={{background:`linear-gradient(135deg,${G.card},${G.card2})`,border:`1px solid ${G.border}`,borderTop:`2px solid ${s.c}`,borderRadius:12,padding:16,boxShadow:`0 0 14px ${s.c}08`}}>
                      <div style={{fontFamily:'monospace',fontSize:8,color:G.muted,letterSpacing:'0.1em',marginBottom:6,textTransform:'uppercase'}}>{s.l}</div>
                      <div style={{fontFamily:'Space Mono',fontSize:20,fontWeight:700,color:s.c}}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <div style={cardStyle}>
                  <div style={secT}>HISTORIAL APORTACIONES</div>
                  {capital.aportaciones.length===0?<div style={{textAlign:'center',padding:'20px 0',color:G.muted,fontSize:12}}>Sin aportaciones aún</div>
                  :capital.aportaciones.map(a=>(
                    <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',background:G.card2,borderRadius:9,marginBottom:7,border:`1px solid ${G.border}`}}>
                      <div><div style={{fontWeight:600,fontSize:13}}>{a.desc}</div><div style={{fontSize:11,color:G.muted}}>{a.date}</div></div>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontFamily:'monospace',fontWeight:700,color:G.cyan}}>+{fmtA(a.amount)}</span>
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
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
              <div>
                <div style={{fontSize:22,fontWeight:700}}>Calendario Económico</div>
                <div style={{fontSize:12,color:G.muted,marginTop:2}}>USD · EUR · GBP — Alto y medio impacto{econUpdated?` · Actualizado ${new Date(econUpdated).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}`:''}</div>
              </div>
              <button onClick={loadEcon} disabled={econLoading} style={{display:'flex',alignItems:'center',gap:7,padding:'9px 16px',background:G.card2,border:`1px solid ${G.border}`,borderRadius:8,color:G.cyan,fontSize:11,cursor:'pointer',fontFamily:'monospace',letterSpacing:'0.08em'}}>
                {econLoading?'⟳ CARGANDO...':'↻ ACTUALIZAR'}
              </button>
            </div>

            {/* Legend */}
            <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:20}}>
              {[['🔴 Alto impacto — evitar operar',G.red],['🟡 Medio impacto — precaución',G.gold],['⚠ No operar 15min antes/después',G.cyan]].map(([l,c])=>(
                <div key={l} style={{padding:'6px 14px',borderRadius:20,background:`${c}12`,border:`1px solid ${c}35`,fontSize:11,color:c as string}}>{l}</div>
              ))}
            </div>

            {econLoading?<div style={{textAlign:'center',padding:'60px 0',color:G.muted}}><div style={{width:32,height:32,border:`2px solid ${G.border}`,borderTop:`2px solid ${G.cyan}`,borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px'}}/><div style={{fontFamily:'monospace',fontSize:11,letterSpacing:'0.1em'}}>BUSCANDO EVENTOS...</div></div>
            :econEvents.length===0?<div style={{textAlign:'center',padding:'60px 0',color:G.muted,fontSize:13}}>Sin eventos. Intenta actualizar.</div>
            :(() => {
              // Group by date
              const grouped:Record<string,EconEvent[]>={};
              econEvents.forEach(ev=>{
                const k=new Date(ev.date).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
                if(!grouped[k])grouped[k]=[];
                grouped[k].push(ev);
              });
              return Object.entries(grouped).map(([dateLabel,events])=>{
                const isToday=events.some(ev=>new Date(ev.date).toDateString()===new Date().toDateString());
                return(
                  <div key={dateLabel} style={{marginBottom:22}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${G.border}`}}>
                      <div style={{fontFamily:'monospace',fontSize:10,letterSpacing:'0.18em',color:isToday?G.cyan:G.muted2,textTransform:'uppercase',textShadow:isToday?`0 0 10px ${G.cyan}60`:'none'}}>{dateLabel}</div>
                      {isToday&&<span style={{fontSize:9,fontFamily:'monospace',padding:'2px 8px',borderRadius:4,background:`${G.cyan}20`,color:G.cyan,border:`1px solid ${G.cyan}40`}}>HOY</span>}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {events.map((ev,i)=>{
                        const d=new Date(ev.date); const isPast=d<new Date(); const isNear=!isPast&&(d.getTime()-new Date().getTime())<3600000;
                        return(
                          <div key={i} style={{display:'grid',gridTemplateColumns:'90px 65px 36px 1fr 95px 95px 95px',gap:12,alignItems:'center',padding:'13px 18px',background:isNear?`${G.gold}07`:`linear-gradient(135deg,${G.card},${G.card2})`,border:`1px solid ${isNear?`${G.gold}45`:ev.impact==='High'?`${G.red}20`:G.border}`,borderRadius:10,opacity:isPast?0.5:1,boxShadow:isNear?`0 0 14px ${G.gold}18`:ev.impact==='High'&&!isPast?`0 0 8px ${G.red}08`:'none'}}>
                            <div>
                              <div style={{fontFamily:'Space Mono',fontSize:13,fontWeight:700,color:isNear?G.gold:G.text}}>{d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</div>
                              <div style={{fontFamily:'monospace',fontSize:8,color:G.muted,marginTop:2}}>{d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'})}</div>
                              {isNear&&<div style={{fontSize:7,color:G.gold,fontFamily:'monospace',marginTop:2,animation:'pulse 1.5s ease infinite'}}>¡PRÓXIMO!</div>}
                            </div>
                            <span style={{fontSize:10,fontFamily:'monospace',padding:'3px 8px',borderRadius:5,background:ev.currency==='USD'?`${G.blue}25`:ev.currency==='EUR'?`${G.cyan}20`:`${G.purple}25`,color:ev.currency==='USD'?G.blue:ev.currency==='EUR'?G.cyan:G.purple,fontWeight:700,textAlign:'center'}}>{ev.currency}</span>
                            <div style={{fontSize:16,textAlign:'center'}}>{ev.impact==='High'?'🔴':'🟡'}</div>
                            <div>
                              <div style={{fontSize:13,fontWeight:600,color:G.text}}>{ev.title}</div>
                              {isPast&&<span style={{fontSize:10,color:G.muted,fontWeight:400}}> · finalizado</span>}
                            </div>
                            {[['ANTERIOR',ev.previous,G.muted2],['PREVISIÓN',ev.forecast,G.gold],['REAL',ev.actual,G.cyan]].map(([lbl2,val,col])=>(
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

            <div style={{background:`${G.gold}07`,border:`1px solid ${G.gold}28`,borderRadius:14,padding:20,marginTop:12}}>
              <div style={{fontSize:13,fontWeight:600,color:G.gold,marginBottom:12}}>⚠️ Reglas de trading en noticias de alto impacto</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {['🚫 No abrir operaciones 15 min antes de evento rojo','⏳ Esperar al menos 15 min después de la publicación','📊 El Oro reacciona especialmente al IPC y decisiones FED','📈 El Nasdaq es muy sensible a NFP y tipos de interés','💱 El spread se amplía justo antes de las noticias','✅ Los mejores setups aparecen 30 min después del evento'].map((r,i)=>(
                  <div key={i} style={{background:G.card2,borderRadius:8,padding:'9px 12px',fontSize:12,color:G.muted2,lineHeight:1.5,border:`1px solid ${G.border}`}}>{r}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE NAV */}
      <div className="bn" style={{position:'fixed',bottom:0,left:0,right:0,background:G.sb,borderTop:`1px solid ${G.border}`,paddingBottom:'env(safe-area-inset-bottom)',zIndex:200,display:'none'}}>
        <div style={{display:'flex',justifyContent:'space-around',padding:'8px 0'}}>
          {(['dashboard','nuevo','historial','capital','noticias'] as Page[]).map((p,i)=>{
            const icons=['▣','⊕','☰','◈','⚡'],labels=['Inicio','Trade','Historial','Capital','Noticias'];
            return<button key={p} onClick={()=>setPage(p)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'6px 12px',background:'none',border:'none',cursor:'pointer',color:page===p?G.cyan:G.muted,transition:'color 0.15s',filter:page===p?`drop-shadow(0 0 5px ${G.cyan})`:'none'}}><span style={{fontSize:18}}>{icons[i]}</span><span style={{fontSize:9,fontFamily:'monospace'}}>{labels[i]}</span></button>;
          })}
        </div>
      </div>

      {/* MODAL */}
      {modalTrade&&(
        <div onClick={e=>e.target===e.currentTarget&&setModalTrade(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'}}>
          <div style={{background:`linear-gradient(135deg,${G.card},${G.card2})`,border:`1px solid ${G.border2}`,borderRadius:18,padding:24,width:'100%',maxWidth:500,maxHeight:'85vh',overflowY:'auto',boxShadow:`0 0 50px ${G.cyan}12`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18}}>
              <div><div style={{fontSize:16,fontWeight:700,color:G.cyan}}>{modalTrade.pair}</div><div style={{fontSize:11,color:G.muted,marginTop:2}}>{modalTrade.date} · {modalTrade.time} · {modalTrade.tf}</div></div>
              <button onClick={()=>setModalTrade(null)} style={{width:30,height:30,borderRadius:8,border:`1px solid ${G.border}`,background:G.card2,color:G.muted,cursor:'pointer',fontSize:15}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
              {[{l:'Resultado',v:modalTrade.res.toUpperCase(),c:modalTrade.res==='win'?G.cyan:modalTrade.res==='loss'?G.red:G.purple},{l:'P&L',v:fmt(modalTrade.pnl),c:modalTrade.pnl>0?G.cyan:modalTrade.pnl<0?G.red:G.purple},{l:'Dirección',v:modalTrade.dir==='buy'?'▲ LONG':'▼ SHORT',c:modalTrade.dir==='buy'?G.cyan:G.red},{l:'R:R',v:modalTrade.rr,c:G.gold},{l:'Riesgo',v:modalTrade.risk+'€',c:G.red},{l:'R obtenido',v:modalTrade.rreal||'—',c:G.cyan}].map(s=>(
                <div key={s.l} style={{background:G.card2,borderRadius:9,padding:'10px 13px',border:`1px solid ${G.border}`}}>
                  <div style={{fontFamily:'monospace',fontSize:8,letterSpacing:'0.12em',color:G.muted,marginBottom:4,textTransform:'uppercase'}}>{s.l}</div>
                  <div style={{fontFamily:'Space Mono',fontSize:14,fontWeight:700,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
            {modalTrade.entry>0&&<div style={{background:G.card2,borderRadius:9,padding:'10px 13px',fontFamily:'monospace',fontSize:11,lineHeight:2,marginBottom:12,border:`1px solid ${G.border}`}}>Entry: <span style={{color:G.gold}}>{modalTrade.entry}</span> · SL: <span style={{color:G.red}}>{modalTrade.sl}</span> · TP: <span style={{color:G.cyan}}>{modalTrade.tp}</span> · Lote: {modalTrade.lot}</div>}
            {modalTrade.conf.length>0&&<div style={{marginBottom:12}}><div style={{fontFamily:'monospace',fontSize:8,color:G.muted,marginBottom:6,letterSpacing:'0.12em',textTransform:'uppercase'}}>Confluencias</div><div style={{display:'flex',flexWrap:'wrap',gap:5}}>{modalTrade.conf.map(c=><span key={c} style={{padding:'4px 10px',background:`${G.cyan}10`,border:`1px solid ${G.border}`,borderRadius:12,fontSize:11,color:G.cyan}}>{c}</span>)}</div></div>}
            <div style={{display:'flex',gap:18,marginBottom:12}}>
              <div><div style={{fontFamily:'monospace',fontSize:8,color:G.muted,marginBottom:3,letterSpacing:'0.1em',textTransform:'uppercase'}}>Emoción</div><span style={{fontSize:13}}>{modalTrade.emo||'—'}</span></div>
              <div><div style={{fontFamily:'monospace',fontSize:8,color:G.muted,marginBottom:3,letterSpacing:'0.1em',textTransform:'uppercase'}}>Plan</div><span style={{color:modalTrade.plan==='yes'?G.cyan:G.red,fontWeight:700}}>{modalTrade.plan==='yes'?'✓ Sí':modalTrade.plan==='no'?'✕ No':'—'}</span></div>
            </div>
            {modalTrade.notes&&<div style={{background:G.card2,borderRadius:9,padding:13,fontSize:12,color:G.muted2,lineHeight:1.7,marginBottom:14,border:`1px solid ${G.border}`}}>{modalTrade.notes}</div>}
            <button onClick={()=>deleteTrade(modalTrade.id)} style={{width:'100%',padding:11,background:`${G.red}15`,border:`1px solid ${G.red}50`,borderRadius:9,color:G.red,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Eliminar operación</button>
          </div>
        </div>
      )}
    </div>
  );
}
