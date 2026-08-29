'use client';
import { useEffect, useRef, useState } from 'react';

const G = {
  card:'#0c1628', card2:'#0f1e38', surface:'#080f1e',
  border:'rgba(0,180,255,0.1)', border2:'rgba(0,180,255,0.22)',
  cyan:'#00d4ff', green:'#00e676', red:'#ff3366', gold:'#f5a623',
  text:'#e8f0fe', muted:'#4a6a8a', muted2:'#8ba0bf',
  fontData:"'JetBrains Mono',monospace" as string,
  fontUi:"'Inter',sans-serif" as string,
};

// Today's key events — always shown as restringido preview
const HOY_EVENTOS = [
  { hora:'08:00', moneda:'EUR', impacto:'HIGH' as const, titulo:'IPC Zona Euro (Mensual)', restringido:true },
  { hora:'14:30', moneda:'USD', impacto:'HIGH' as const, titulo:'NFP — Nóminas No Agrícolas', restringido:true },
  { hora:'14:30', moneda:'USD', impacto:'HIGH' as const, titulo:'Tasa de Desempleo', restringido:true },
  { hora:'16:00', moneda:'USD', impacto:'MEDIUM' as const, titulo:'Confianza Consumidor Michigan', restringido:false },
  { hora:'20:00', moneda:'USD', impacto:'HIGH' as const, titulo:'Actas FOMC / Decisión FED', restringido:true },
].filter(e => e.impacto === 'HIGH');

const IMPACT = {
  HIGH:   { bg:'rgba(255,51,102,0.12)', border:'rgba(255,51,102,0.35)', color:'#ff3366', label:'ALTO' },
  MEDIUM: { bg:'rgba(245,166,35,0.10)', border:'rgba(245,166,35,0.3)',  color:'#f5a623', label:'MEDIO' },
  LOW:    { bg:'rgba(0,180,255,0.07)',  border:'rgba(0,180,255,0.2)',   color:'#00d4ff', label:'BAJO' },
};
const FLAG: Record<string,string> = { USD:'🇺🇸', EUR:'🇪🇺', GBP:'🇬🇧', JPY:'🇯🇵', CAD:'🇨🇦' };

export default function CalendarioEconomico() {
  const widgetRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const today = new Date();
  const todayStr = today.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  useEffect(() => {
    if (scriptLoaded || !widgetRef.current) return;
    setScriptLoaded(true);
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-events.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      isTransparent: true,
      width: '100%',
      height: '100%',
      locale: 'es',
      importanceFilter: '-1,0,1',
      countryFilter: 'us,eu,gb,jp,ca,ch,au',
    });
    widgetRef.current.appendChild(script);
  }, [scriptLoaded]);

  return (
    <div>

      {/* ── HEADER ESTILO ORION ── */}
      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:14, overflow:'hidden', marginBottom:14 }}>

        {/* Top bar */}
        <div style={{ padding:'13px 18px', borderBottom:`1px solid ${G.border}`, background:G.surface, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted, letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:3 }}>CALENDARIO ECONÓMICO — TIEMPO REAL</div>
            <div style={{ fontFamily:G.fontUi, fontSize:12, color:G.muted2 }}>USD · EUR · GBP · JPY · CAD · Horario España (CET)</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:G.green, boxShadow:`0 0 8px ${G.green}`, animation:'pulse 2s infinite' }}/>
            <span style={{ fontFamily:G.fontData, fontSize:9, color:G.green, letterSpacing:'0.12em' }}>EN VIVO</span>
          </div>
        </div>

        {/* Impact legend — 3 columns like the reference */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', borderBottom:`1px solid ${G.border}` }}>
          {[
            { c:G.red,  l:'🔴 ALTO IMPACTO',   d:'NFP · IPC · FED · BCE · No operar 15min antes/después' },
            { c:G.gold, l:'🟡 MEDIO IMPACTO',  d:'PMI · Ventas · Confianza · Precaución al operar' },
            { c:G.cyan, l:'🔵 BAJO IMPACTO',   d:'Datos secundarios · Impacto limitado' },
          ].map((s,i)=>(
            <div key={s.l} style={{ padding:'12px 18px', borderRight:i<2?`1px solid ${G.border}`:'none', display:'flex', gap:10, alignItems:'flex-start' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:s.c, marginTop:3, flexShrink:0, boxShadow:`0 0 5px ${s.c}60` }}/>
              <div>
                <div style={{ fontFamily:G.fontData, fontSize:9, color:s.c, fontWeight:700, letterSpacing:'0.08em', marginBottom:3 }}>{s.l}</div>
                <div style={{ fontFamily:G.fontUi, fontSize:10, color:G.muted, lineHeight:1.5 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* TradingView widget — full width, dark transparent */}
        <div style={{ height:600, background:'transparent' }}>
          <div className="tradingview-widget-container" style={{ height:'100%', width:'100%' }}>
            <div ref={widgetRef} className="tradingview-widget-container__widget" style={{ height:'calc(100% - 22px)', width:'100%' }}/>
            <div style={{ padding:'4px 18px', borderTop:`1px solid ${G.border}` }}>
              <a href="https://es.tradingview.com/" rel="noopener nofollow" target="_blank">
                <span style={{ fontFamily:G.fontData, fontSize:8, color:G.muted, letterSpacing:'0.1em' }}>Datos en tiempo real · Powered by TradingView</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── REGLAS DE TRADING ── */}
      <div style={{ background:`${G.gold}07`, border:`1px solid ${G.gold}22`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <span style={{ fontSize:14 }}>⚠️</span>
          <div style={{ fontFamily:G.fontData, fontSize:9, color:G.gold, letterSpacing:'0.18em', textTransform:'uppercase', fontWeight:700 }}>REGLAS EN NOTICIAS DE ALTO IMPACTO</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
          {[
            ['🚫','No abrir posición 15 min antes de evento rojo'],
            ['⏳','Esperar 15 min después de la publicación'],
            ['📊','XAU/USD reacciona fuerte al IPC, NFP y FED'],
            ['📈','NAS100 muy sensible al NFP y tipos de interés'],
            ['💱','El spread se amplía justo antes de noticias'],
            ['✅','Los mejores setups aparecen 30 min después'],
          ].map(([icon,txt],i)=>(
            <div key={i} style={{ display:'flex', gap:8, alignItems:'center', background:G.card, borderRadius:8, padding:'9px 12px', border:`1px solid ${G.border}` }}>
              <span style={{ fontSize:13, flexShrink:0 }}>{icon}</span>
              <span style={{ fontFamily:G.fontUi, fontSize:11, color:G.muted2, lineHeight:1.4 }}>{txt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── LINKS EXTERNOS ── */}
      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:10, padding:'13px 16px' }}>
        <div style={{ fontFamily:G.fontData, fontSize:8, color:G.muted, letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:10 }}>VER EN FUENTES EXTERNAS</div>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
          {[
            { l:'📅 Investing.com ES', url:'https://es.investing.com/economic-calendar/' },
            { l:'🏭 ForexFactory',     url:'https://www.forexfactory.com/calendar' },
            { l:'🏦 FED Calendar',     url:'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
            { l:'🇪🇺 BCE',             url:'https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.es.html' },
          ].map(l=>(
            <a key={l.l} href={l.url} target="_blank" rel="noopener noreferrer"
              style={{ padding:'7px 13px', background:G.card2, border:`1px solid ${G.border}`, borderRadius:7, color:G.muted2, fontSize:11, textDecoration:'none', fontFamily:G.fontUi, transition:'all 0.15s' }}
              onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.borderColor=G.cyan;(e.currentTarget as HTMLAnchorElement).style.color=G.cyan;}}
              onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.borderColor=G.border;(e.currentTarget as HTMLAnchorElement).style.color=G.muted2;}}>
              {l.l}
            </a>
          ))}
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}`}</style>
    </div>
  );
}
