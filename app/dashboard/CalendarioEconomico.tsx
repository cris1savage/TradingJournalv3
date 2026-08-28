'use client';
import { useState, useEffect } from 'react';

const G = {
  card:'#0c1628', card2:'#0f1e38', surface:'#080f1e',
  border:'rgba(0,180,255,0.1)', border2:'rgba(0,180,255,0.22)',
  cyan:'#00d4ff', green:'#00e676', red:'#ff3366', gold:'#f5a623',
  text:'#e8f0fe', muted:'#4a6a8a', muted2:'#8ba0bf',
  fontData:"'JetBrains Mono',monospace" as string,
  fontUi:"'Inter',sans-serif" as string,
};

type Evento = {
  fecha: string;
  hora: string;
  moneda: string;
  impacto: 'HIGH' | 'MEDIUM' | 'LOW';
  titulo: string;
  actual: string | null;
  estimado: string | null;
  previo: string | null;
  restringido: boolean;
};

const IMPACT = {
  HIGH:   { bg:'rgba(255,51,102,0.12)', border:'rgba(255,51,102,0.35)', color:'#ff3366', label:'ALTO' },
  MEDIUM: { bg:'rgba(245,166,35,0.10)', border:'rgba(245,166,35,0.3)',  color:'#f5a623', label:'MEDIO' },
  LOW:    { bg:'rgba(0,180,255,0.07)',  border:'rgba(0,180,255,0.2)',   color:'#00d4ff', label:'BAJO' },
};

const FLAG: Record<string,string> = { USD:'🇺🇸', EUR:'🇪🇺', GBP:'🇬🇧', JPY:'🇯🇵', CAD:'🇨🇦', CHF:'🇨🇭', AUD:'🇦🇺' };

const DIAS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function formatFecha(fechaStr: string) {
  const d = new Date(fechaStr + 'T12:00:00');
  return `${DIAS_ES[d.getDay()]}, ${d.getDate()} ${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
}

export default function CalendarioEconomico() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroImpacto, setFiltroImpacto] = useState<'ALL'|'HIGH'|'MEDIUM'>('ALL');
  const [filtroMoneda, setFiltroMoneda] = useState<'ALL'|'USD'|'EUR'|'GBP'>('ALL');
  const [lastUpdated, setLastUpdated] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/economic-calendar');
      if (!r.ok) throw new Error('Error');
      const data: Evento[] = await r.json();
      setEventos(data);
      setLastUpdated(new Date().toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' }));
    } catch {
      setError('Error cargando el calendario. Inténtalo de nuevo.');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split('T')[0];

  const filtered = eventos.filter(e => {
    if (filtroImpacto !== 'ALL' && e.impacto !== filtroImpacto) return false;
    if (filtroMoneda !== 'ALL' && e.moneda !== filtroMoneda) return false;
    return true;
  });

  // Group by date
  const byDate: Record<string, Evento[]> = {};
  filtered.forEach(e => {
    if (!byDate[e.fecha]) byDate[e.fecha] = [];
    byDate[e.fecha].push(e);
  });

  const todayEvents = byDate[today]?.filter(e => e.restringido) || [];

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', gap:14 }}>
      <div style={{ width:36, height:36, border:`2px solid ${G.border}`, borderTop:`2px solid ${G.cyan}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <div style={{ fontFamily:G.fontData, fontSize:11, color:G.muted, letterSpacing:'0.15em' }}>CARGANDO EVENTOS...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ background:`${G.red}10`, border:`1px solid ${G.red}30`, borderRadius:12, padding:'20px', textAlign:'center' }}>
      <div style={{ fontSize:13, color:G.red, fontFamily:G.fontUi, marginBottom:10 }}>{error}</div>
      <button onClick={load} style={{ padding:'8px 16px', background:`${G.cyan}15`, border:`1px solid ${G.cyan}`, borderRadius:7, color:G.cyan, fontSize:12, cursor:'pointer', fontFamily:G.fontUi }}>Reintentar</button>
    </div>
  );

  return (
    <div>
      {/* Header with refresh */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontFamily:G.fontData, fontSize:10, color:G.muted }}>
          {lastUpdated && `Actualizado ${lastUpdated}`}
        </div>
        <button onClick={load} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:G.card, border:`1px solid ${G.border}`, borderRadius:7, color:G.muted2, fontSize:11, cursor:'pointer', fontFamily:G.fontUi }}>
          ↻ Actualizar
        </button>
      </div>

      {/* Restringido HOY */}
      {todayEvents.length > 0 && (
        <div style={{ background:'rgba(255,51,102,0.08)', border:'1px solid rgba(255,51,102,0.3)', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:'rgba(255,51,102,0.2)', border:'1px solid rgba(255,51,102,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }}>🛡️</div>
            <div style={{ fontFamily:G.fontUi, fontSize:14, fontWeight:700, color:'#ff3366' }}>Restringido hoy</div>
            <div style={{ width:22, height:22, borderRadius:'50%', background:'#ff3366', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:G.fontData, fontSize:10, fontWeight:700, color:'#fff' }}>{todayEvents.length}</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'70px 80px 90px 1fr', gap:8, padding:'6px 8px', background:'rgba(255,51,102,0.12)', borderRadius:6, marginBottom:6 }}>
            {['HORA','MONEDA','IMPACTO','TÍTULO'].map(h=><span key={h} style={{ fontFamily:G.fontData, fontSize:8, color:'#ff6680', letterSpacing:'0.12em', textTransform:'uppercase' }}>{h}</span>)}
          </div>
          {todayEvents.map((e,i)=>(
            <div key={i} style={{ display:'grid', gridTemplateColumns:'70px 80px 90px 1fr', gap:8, padding:'8px', borderBottom: i<todayEvents.length-1?'1px solid rgba(255,51,102,0.1)':'none', alignItems:'center' }}>
              <span style={{ fontFamily:G.fontData, fontSize:13, fontWeight:700, color:G.text }}>{e.hora}</span>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ fontSize:15 }}>{FLAG[e.moneda]||'🌐'}</span>
                <span style={{ fontFamily:G.fontData, fontSize:11, color:G.muted2 }}>{e.moneda}</span>
              </div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:4, background:IMPACT[e.impacto].bg, border:`1px solid ${IMPACT[e.impacto].border}` }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:IMPACT[e.impacto].color }}/>
                <span style={{ fontFamily:G.fontData, fontSize:9, fontWeight:700, color:IMPACT[e.impacto].color, letterSpacing:'0.06em' }}>{IMPACT[e.impacto].label}</span>
              </div>
              <span style={{ fontFamily:G.fontUi, fontSize:12, color:G.text }}>{e.titulo}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:5 }}>
          {(['ALL','USD','EUR','GBP'] as const).map(m=>(
            <button key={m} onClick={()=>setFiltroMoneda(m)} style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${filtroMoneda===m?G.cyan:G.border}`, background:filtroMoneda===m?'rgba(0,212,255,0.1)':'transparent', color:filtroMoneda===m?G.cyan:G.muted, fontSize:11, cursor:'pointer', fontFamily:G.fontData, fontWeight:600 }}>
              {m==='ALL'?'Todas':`${FLAG[m]||''} ${m}`}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:5 }}>
          {([['ALL','Todos'],['HIGH','🔴 Alto'],['MEDIUM','🟡 Medio']] as const).map(([v,l])=>(
            <button key={v} onClick={()=>setFiltroImpacto(v)} style={{ padding:'5px 12px', borderRadius:6, border:`1px solid ${filtroImpacto===v?G.cyan:G.border}`, background:filtroImpacto===v?'rgba(0,212,255,0.08)':'transparent', color:filtroImpacto===v?G.text:G.muted, fontSize:11, cursor:'pointer', fontFamily:G.fontUi }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Events by day */}
      {Object.entries(byDate).map(([fecha, evs])=>{
        const esHoy = fecha === today;
        return (
          <div key={fecha} style={{ background:G.card, border:`1px solid ${esHoy?'rgba(0,212,255,0.25)':G.border}`, borderRadius:12, overflow:'hidden', marginBottom:10 }}>
            {/* Day header */}
            <div style={{ padding:'10px 16px', background:esHoy?'rgba(0,212,255,0.06)':G.surface, borderBottom:`1px solid ${G.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {esHoy && <div style={{ width:6, height:6, borderRadius:'50%', background:G.cyan, boxShadow:`0 0 8px ${G.cyan}` }}/>}
                <span style={{ fontFamily:G.fontData, fontSize:13, fontWeight:700, color:esHoy?G.cyan:G.text }}>{formatFecha(fecha)}</span>
                {esHoy && <span style={{ fontFamily:G.fontData, fontSize:9, color:G.cyan, background:'rgba(0,212,255,0.12)', padding:'2px 8px', borderRadius:3 }}>HOY</span>}
              </div>
              <span style={{ fontFamily:G.fontData, fontSize:10, color:G.muted }}>{evs.length} evento{evs.length!==1?'s':''}</span>
            </div>
            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'70px 80px 90px 1fr 80px 80px 80px', gap:8, padding:'7px 16px', background:'rgba(0,0,0,0.15)' }}>
              {['HORA','MONEDA','IMPACTO','TÍTULO','PREVIO','ESTIM.','ACTUAL'].map(h=>(
                <span key={h} style={{ fontFamily:G.fontData, fontSize:8, color:G.muted, letterSpacing:'0.1em', textTransform:'uppercase' }}>{h}</span>
              ))}
            </div>
            {evs.map((e,i)=>{
              const imp = IMPACT[e.impacto];
              return (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'70px 80px 90px 1fr 80px 80px 80px', gap:8, padding:'11px 16px', borderBottom: i<evs.length-1?`1px solid ${G.border}`:'none', alignItems:'center', transition:'background 0.1s' }}
                  onMouseEnter={ev=>(ev.currentTarget as HTMLDivElement).style.background=G.card2}
                  onMouseLeave={ev=>(ev.currentTarget as HTMLDivElement).style.background='transparent'}>
                  <span style={{ fontFamily:G.fontData, fontSize:13, fontWeight:700, color:G.text }}>{e.hora}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:16 }}>{FLAG[e.moneda]||'🌐'}</span>
                    <span style={{ fontFamily:G.fontData, fontSize:11, color:G.muted2, fontWeight:600 }}>{e.moneda}</span>
                  </div>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:4, background:imp.bg, border:`1px solid ${imp.border}` }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:imp.color }}/>
                    <span style={{ fontFamily:G.fontData, fontSize:9, fontWeight:700, color:imp.color, letterSpacing:'0.06em' }}>{imp.label}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {e.restringido && <span style={{ fontSize:11 }}>🛡️</span>}
                    <span style={{ fontFamily:G.fontUi, fontSize:12, color:G.text }}>{e.titulo}</span>
                  </div>
                  <span style={{ fontFamily:G.fontData, fontSize:11, color:G.muted, textAlign:'right' }}>{e.previo||'—'}</span>
                  <span style={{ fontFamily:G.fontData, fontSize:11, color:G.muted, textAlign:'right' }}>{e.estimado||'—'}</span>
                  <span style={{ fontFamily:G.fontData, fontSize:11, fontWeight:e.actual?700:400, color:e.actual?G.green:G.muted, textAlign:'right' }}>{e.actual||'—'}</span>
                </div>
              );
            })}
          </div>
        );
      })}

      {filtered.length === 0 && !loading && (
        <div style={{ textAlign:'center', padding:'40px', color:G.muted, fontFamily:G.fontUi, fontSize:13 }}>
          Sin eventos para los filtros seleccionados
        </div>
      )}
    </div>
  );
}
