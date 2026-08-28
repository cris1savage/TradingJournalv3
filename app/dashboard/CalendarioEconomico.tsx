'use client';
import { useState, useEffect, useCallback } from 'react';

const G = {
  card:'#0c1628', card2:'#0f1e38', surface:'#080f1e',
  border:'rgba(0,180,255,0.1)', border2:'rgba(0,180,255,0.22)',
  cyan:'#00d4ff', green:'#00e676', red:'#ff3366', gold:'#f5a623',
  text:'#e8f0fe', muted:'#4a6a8a', muted2:'#8ba0bf',
  fontData:"'JetBrains Mono',monospace" as string,
  fontUi:"'Inter',sans-serif" as string,
};

type Evento = {
  fecha: string; hora: string; moneda: string;
  impacto: 'HIGH'|'MEDIUM'|'LOW';
  titulo: string;
  actual: string|null; estimado: string|null; previo: string|null;
  restringido: boolean;
};

const IMPACT = {
  HIGH:   { bg:'rgba(255,51,102,0.12)', border:'rgba(255,51,102,0.35)', color:'#ff3366', label:'ALTO' },
  MEDIUM: { bg:'rgba(245,166,35,0.10)', border:'rgba(245,166,35,0.3)',  color:'#f5a623', label:'MEDIO' },
  LOW:    { bg:'rgba(0,180,255,0.07)',  border:'rgba(0,180,255,0.2)',   color:'#00d4ff', label:'BAJO' },
};
const FLAG: Record<string,string> = { USD:'🇺🇸',EUR:'🇪🇺',GBP:'🇬🇧',JPY:'🇯🇵',CAD:'🇨🇦',CHF:'🇨🇭',AUD:'🇦🇺',NZD:'🇳🇿',CNY:'🇨🇳' };
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONEDAS_OK = ['USD','EUR','GBP','JPY','CAD','CHF','AUD','NZD'];

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function formatFecha(fechaStr: string) {
  const d = new Date(fechaStr + 'T12:00:00');
  return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function weekLabel(monday: Date): string {
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  return `${monday.getDate()} ${MESES[monday.getMonth()]} – ${sunday.getDate()} ${MESES[sunday.getMonth()]} ${sunday.getFullYear()}`;
}

export default function CalendarioEconomico() {
  const [weekOffset, setWeekOffset] = useState(0); // 0=current, -1=prev, +1=next
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroImpacto, setFiltroImpacto] = useState<'ALL'|'HIGH'|'MEDIUM'>('ALL');
  const [filtroMoneda, setFiltroMoneda] = useState<'ALL'|'USD'|'EUR'|'GBP'>('ALL');
  const [lastUpdated, setLastUpdated] = useState('');

  const currentMonday = getMondayOf(new Date());
  const viewMonday = new Date(currentMonday);
  viewMonday.setDate(currentMonday.getDate() + weekOffset * 7);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const from = viewMonday.toISOString().split('T')[0];
      const r = await fetch(`/api/economic-calendar?from=${from}`);
      const data = await r.json();
      if (Array.isArray(data)) {
        setEventos(data);
        setLastUpdated(new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}));
      } else {
        setError('Error al cargar datos');
      }
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().split('T')[0];
  const isCurrentWeek = weekOffset === 0;

  const filtered = eventos.filter(e => {
    if (!MONEDAS_OK.includes(e.moneda)) return false;
    if (filtroImpacto !== 'ALL' && e.impacto !== filtroImpacto) return false;
    if (filtroMoneda !== 'ALL' && e.moneda !== filtroMoneda) return false;
    return true;
  });

  const byDate: Record<string,Evento[]> = {};
  filtered.forEach(e => { if (!byDate[e.fecha]) byDate[e.fecha]=[];  byDate[e.fecha].push(e); });

  const todayEvents = (byDate[today]||[]).filter(e=>e.restringido);

  return (
    <div>
      {/* Week navigator */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, background:G.card, border:`1px solid ${G.border}`, borderRadius:12, padding:'12px 16px' }}>
        <button onClick={()=>setWeekOffset(w=>w-1)} style={{ width:34, height:34, borderRadius:8, background:G.card2, border:`1px solid ${G.border}`, color:G.muted2, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:G.fontData, fontSize:12, fontWeight:700, color:isCurrentWeek?G.cyan:G.text }}>{weekLabel(viewMonday)}</div>
          <div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted, marginTop:3, letterSpacing:'0.1em' }}>
            {weekOffset===0?'SEMANA ACTUAL':weekOffset<0?`HACE ${Math.abs(weekOffset)} SEMANA${Math.abs(weekOffset)>1?'S':''}`:`EN ${weekOffset} SEMANA${weekOffset>1?'S':''}`}
          </div>
        </div>
        <button onClick={()=>setWeekOffset(w=>w+1)} style={{ width:34, height:34, borderRadius:8, background:G.card2, border:`1px solid ${G.border}`, color:G.muted2, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
      </div>

      {/* Controls row */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {(['ALL','USD','EUR','GBP'] as const).map(m=>(
            <button key={m} onClick={()=>setFiltroMoneda(m)} style={{ padding:'5px 11px', borderRadius:6, border:`1px solid ${filtroMoneda===m?G.cyan:G.border}`, background:filtroMoneda===m?'rgba(0,212,255,0.1)':'transparent', color:filtroMoneda===m?G.cyan:G.muted, fontSize:11, cursor:'pointer', fontFamily:G.fontData, fontWeight:600 }}>
              {m==='ALL'?'Todas':`${FLAG[m]||''} ${m}`}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:5, alignItems:'center' }}>
          {([['ALL','Todos'],['HIGH','🔴 Alto'],['MEDIUM','🟡 Medio']] as const).map(([v,l])=>(
            <button key={v} onClick={()=>setFiltroImpacto(v)} style={{ padding:'5px 11px', borderRadius:6, border:`1px solid ${filtroImpacto===v?G.cyan:G.border}`, background:filtroImpacto===v?'rgba(0,212,255,0.08)':'transparent', color:filtroImpacto===v?G.text:G.muted, fontSize:11, cursor:'pointer', fontFamily:G.fontUi }}>
              {l}
            </button>
          ))}
          <button onClick={load} style={{ padding:'5px 12px', background:G.card, border:`1px solid ${G.border}`, borderRadius:6, color:G.muted2, fontSize:11, cursor:'pointer', fontFamily:G.fontUi, marginLeft:4 }}>↻</button>
        </div>
      </div>
      {lastUpdated && <div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted, marginBottom:12 }}>Actualizado {lastUpdated}</div>}

      {/* Loading */}
      {loading && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'50px 0', gap:12 }}>
          <div style={{ width:32, height:32, border:`2px solid ${G.border}`, borderTop:`2px solid ${G.cyan}`, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          <div style={{ fontFamily:G.fontData, fontSize:10, color:G.muted, letterSpacing:'0.15em' }}>CARGANDO...</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ background:`${G.red}10`, border:`1px solid ${G.red}30`, borderRadius:10, padding:'16px', textAlign:'center', marginBottom:12 }}>
          <div style={{ fontSize:13, color:G.red, fontFamily:G.fontUi, marginBottom:8 }}>{error}</div>
          <button onClick={load} style={{ padding:'7px 16px', background:`${G.cyan}15`, border:`1px solid ${G.cyan}`, borderRadius:7, color:G.cyan, fontSize:12, cursor:'pointer', fontFamily:G.fontUi }}>Reintentar</button>
        </div>
      )}

      {/* Restringido HOY - only show on current week */}
      {!loading && isCurrentWeek && todayEvents.length > 0 && (
        <div style={{ background:'rgba(255,51,102,0.08)', border:'1px solid rgba(255,51,102,0.3)', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ fontSize:16 }}>🛡️</span>
            <span style={{ fontFamily:G.fontUi, fontSize:14, fontWeight:700, color:'#ff3366' }}>Restringido hoy</span>
            <div style={{ width:20, height:20, borderRadius:'50%', background:'#ff3366', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:G.fontData, fontSize:10, fontWeight:700, color:'#fff' }}>{todayEvents.length}</div>
          </div>
          {todayEvents.map((e,i)=>(
            <div key={i} style={{ display:'grid', gridTemplateColumns:'65px 75px 85px 1fr', gap:8, padding:'8px 4px', borderBottom:i<todayEvents.length-1?'1px solid rgba(255,51,102,0.1)':'none', alignItems:'center' }}>
              <span style={{ fontFamily:G.fontData, fontSize:13, fontWeight:700, color:G.text }}>{e.hora}</span>
              <div style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ fontSize:14 }}>{FLAG[e.moneda]||'🌐'}</span><span style={{ fontFamily:G.fontData, fontSize:10, color:G.muted2 }}>{e.moneda}</span></div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'2px 7px', borderRadius:4, background:IMPACT[e.impacto].bg, border:`1px solid ${IMPACT[e.impacto].border}` }}>
                <div style={{ width:4, height:4, borderRadius:'50%', background:IMPACT[e.impacto].color }}/>
                <span style={{ fontFamily:G.fontData, fontSize:8, fontWeight:700, color:IMPACT[e.impacto].color }}>{IMPACT[e.impacto].label}</span>
              </div>
              <span style={{ fontFamily:G.fontUi, fontSize:12, color:G.text }}>{e.titulo}</span>
            </div>
          ))}
        </div>
      )}

      {/* Events */}
      {!loading && !error && Object.entries(byDate).map(([fecha,evs])=>{
        const esHoy = fecha===today && isCurrentWeek;
        const esPasado = fecha < today;
        return (
          <div key={fecha} style={{ background:G.card, border:`1px solid ${esHoy?'rgba(0,212,255,0.3)':G.border}`, borderRadius:12, overflow:'hidden', marginBottom:10, opacity:esPasado&&!isCurrentWeek?0.85:1 }}>
            <div style={{ padding:'10px 16px', background:esHoy?'rgba(0,212,255,0.06)':G.surface, borderBottom:`1px solid ${G.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {esHoy && <div style={{ width:6, height:6, borderRadius:'50%', background:G.cyan, boxShadow:`0 0 8px ${G.cyan}` }}/>}
                <span style={{ fontFamily:G.fontData, fontSize:13, fontWeight:700, color:esHoy?G.cyan:G.text }}>{formatFecha(fecha)}</span>
                {esHoy && <span style={{ fontFamily:G.fontData, fontSize:8, color:G.cyan, background:'rgba(0,212,255,0.12)', padding:'2px 7px', borderRadius:3, letterSpacing:'0.1em' }}>HOY</span>}
                {esPasado && <span style={{ fontFamily:G.fontData, fontSize:8, color:G.muted, background:'rgba(255,255,255,0.04)', padding:'2px 7px', borderRadius:3 }}>PASADO</span>}
              </div>
              <span style={{ fontFamily:G.fontData, fontSize:10, color:G.muted }}>{evs.length} evento{evs.length!==1?'s':''}</span>
            </div>
            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'65px 75px 85px 1fr 75px 75px 75px', gap:8, padding:'6px 16px', background:'rgba(0,0,0,0.12)' }}>
              {['HORA','MONEDA','IMPACTO','TÍTULO','PREVIO','ESTIM.','ACTUAL'].map(h=>(
                <span key={h} style={{ fontFamily:G.fontData, fontSize:8, color:G.muted, letterSpacing:'0.08em', textTransform:'uppercase' }}>{h}</span>
              ))}
            </div>
            {evs.map((e,i)=>{
              const imp=IMPACT[e.impacto];
              return (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'65px 75px 85px 1fr 75px 75px 75px', gap:8, padding:'10px 16px', borderBottom:i<evs.length-1?`1px solid ${G.border}`:'none', alignItems:'center', transition:'background 0.1s' }}
                  onMouseEnter={ev=>(ev.currentTarget as HTMLDivElement).style.background=G.card2}
                  onMouseLeave={ev=>(ev.currentTarget as HTMLDivElement).style.background='transparent'}>
                  <span style={{ fontFamily:G.fontData, fontSize:13, fontWeight:700, color:G.text }}>{e.hora}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:15 }}>{FLAG[e.moneda]||'🌐'}</span>
                    <span style={{ fontFamily:G.fontData, fontSize:11, color:G.muted2, fontWeight:600 }}>{e.moneda}</span>
                  </div>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:4, background:imp.bg, border:`1px solid ${imp.border}` }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:imp.color }}/>
                    <span style={{ fontFamily:G.fontData, fontSize:9, fontWeight:700, color:imp.color, letterSpacing:'0.05em' }}>{imp.label}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    {e.restringido&&<span style={{ fontSize:10 }}>🛡️</span>}
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

      {!loading && !error && Object.keys(byDate).length===0 && (
        <div style={{ textAlign:'center', padding:'50px 20px', color:G.muted }}>
          <div style={{ fontSize:36, marginBottom:10 }}>📭</div>
          <div style={{ fontFamily:G.fontUi, fontSize:13, marginBottom:6 }}>Sin eventos para esta semana</div>
          <div style={{ fontFamily:G.fontUi, fontSize:11 }}>Prueba otra semana o cambia los filtros</div>
        </div>
      )}

      {/* Leyenda */}
      {!loading && (
        <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:10, padding:'12px 16px', marginTop:8 }}>
          <div style={{ fontFamily:G.fontData, fontSize:8, color:G.muted, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:8 }}>LEYENDA</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {[{c:G.red,l:'ALTO impacto',d:'NFP, IPC, FED — no operar 15min antes/después'},{c:G.gold,l:'MEDIO impacto',d:'PMI, Ventas — precaución'},{c:G.cyan,l:'🛡️ Restringido',d:'Evento donde Orion puede limitar operaciones'}].map(s=>(
              <div key={s.l} style={{ display:'flex', gap:7, alignItems:'flex-start' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:s.c, marginTop:3, flexShrink:0 }}/>
                <div>
                  <div style={{ fontFamily:G.fontData, fontSize:9, color:s.c, fontWeight:700, marginBottom:1 }}>{s.l}</div>
                  <div style={{ fontFamily:G.fontUi, fontSize:10, color:G.muted, lineHeight:1.4 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
