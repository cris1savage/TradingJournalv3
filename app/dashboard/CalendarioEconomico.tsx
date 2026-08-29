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

const REGLAS = [
  '🚫 No abrir posición 15 min antes de evento rojo',
  '⏳ Esperar 15 min después de la publicación',
  '📊 XAU/USD reacciona fuerte al IPC, NFP y FED',
  '📈 NAS100 muy sensible al NFP y tipos de interés',
  '💱 El spread se amplía justo antes de noticias',
  '✅ Los mejores setups aparecen 30 min después',
];

export default function CalendarioEconomico() {
  const widgetRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

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
      {/* ── HEADER INSTITUCIONAL ── */}
      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:14, overflow:'hidden', marginBottom:14 }}>
        {/* Top bar */}
        <div style={{ padding:'13px 18px', borderBottom:`1px solid ${G.border}`, display:'flex', justifyContent:'space-between', alignItems:'center', background:G.surface }}>
          <div>
            <div style={{ fontFamily:G.fontData, fontSize:10, color:G.muted, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:4 }}>CALENDARIO ECONÓMICO — TIEMPO REAL</div>
            <div style={{ fontFamily:G.fontUi, fontSize:12, color:G.muted2 }}>USD · EUR · GBP · JPY · Eventos de alto impacto · Horario España</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:G.green, boxShadow:`0 0 8px ${G.green}` }}/>
            <span style={{ fontFamily:G.fontData, fontSize:9, color:G.green, letterSpacing:'0.1em' }}>EN VIVO</span>
          </div>
        </div>

        {/* Impact legend */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:0, borderBottom:`1px solid ${G.border}` }}>
          {[
            { c:G.red,  dot:'●', l:'ALTO IMPACTO',   d:'NFP · IPC · FED · BCE — Máxima precaución' },
            { c:G.gold, dot:'●', l:'MEDIO IMPACTO',  d:'PMI · Ventas · Confianza' },
            { c:G.cyan, dot:'●', l:'BAJO IMPACTO',   d:'Datos secundarios' },
          ].map((s,i)=>(
            <div key={s.l} style={{ padding:'12px 16px', borderRight: i<2?`1px solid ${G.border}`:'none', display:'flex', gap:10, alignItems:'flex-start' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:s.c, marginTop:3, flexShrink:0, boxShadow:`0 0 6px ${s.c}60` }}/>
              <div>
                <div style={{ fontFamily:G.fontData, fontSize:9, color:s.c, fontWeight:700, letterSpacing:'0.1em', marginBottom:3 }}>{s.l}</div>
                <div style={{ fontFamily:G.fontUi, fontSize:10, color:G.muted, lineHeight:1.4 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* TradingView widget */}
        <div style={{ height:620 }}>
          <div className="tradingview-widget-container" style={{ height:'100%', width:'100%' }}>
            <div ref={widgetRef} className="tradingview-widget-container__widget" style={{ height:'calc(100% - 22px)', width:'100%' }}/>
            <div style={{ padding:'3px 12px' }}>
              <a href="https://es.tradingview.com/" rel="noopener nofollow" target="_blank">
                <span style={{ fontFamily:G.fontData, fontSize:8, color:G.muted, letterSpacing:'0.08em' }}>Powered by TradingView</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── REGLAS DE TRADING EN NOTICIAS ── */}
      <div style={{ background:`${G.gold}07`, border:`1px solid ${G.gold}25`, borderRadius:12, padding:16, marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <span style={{ fontSize:16 }}>⚠️</span>
          <div style={{ fontFamily:G.fontData, fontSize:10, color:G.gold, letterSpacing:'0.15em', textTransform:'uppercase', fontWeight:700 }}>REGLAS EN NOTICIAS DE ALTO IMPACTO</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
          {REGLAS.map((r,i)=>(
            <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', background:G.card, borderRadius:8, padding:'9px 12px', border:`1px solid ${G.border}` }}>
              <span style={{ fontSize:13, flexShrink:0 }}>{r.split(' ')[0]}</span>
              <span style={{ fontFamily:G.fontUi, fontSize:11, color:G.muted2, lineHeight:1.5 }}>{r.split(' ').slice(1).join(' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── LINKS RÁPIDOS ── */}
      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:12, padding:'13px 16px' }}>
        <div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:10 }}>FUENTES EXTERNAS</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[
            { l:'📅 Investing.com', url:'https://es.investing.com/economic-calendar/' },
            { l:'🏭 ForexFactory',  url:'https://www.forexfactory.com/calendar' },
            { l:'🏦 FED Calendar',  url:'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
            { l:'🇪🇺 BCE Calendar', url:'https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.es.html' },
          ].map(l=>(
            <a key={l.l} href={l.url} target="_blank" rel="noopener noreferrer"
              style={{ padding:'7px 14px', background:G.card2, border:`1px solid ${G.border}`, borderRadius:7, color:G.muted2, fontSize:11, textDecoration:'none', fontFamily:G.fontUi, transition:'all 0.15s', display:'inline-block' }}
              onMouseEnter={e=>{(e.currentTarget as HTMLAnchorElement).style.borderColor=G.cyan;(e.currentTarget as HTMLAnchorElement).style.color=G.cyan;}}
              onMouseLeave={e=>{(e.currentTarget as HTMLAnchorElement).style.borderColor=G.border;(e.currentTarget as HTMLAnchorElement).style.color=G.muted2;}}>
              {l.l}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
