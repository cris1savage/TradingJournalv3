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

type Trade = { date: string; res: string; pnl: number; };
type RiskConfig = {
  maxPerdidaDiaria: number; maxPerdidaSemanal: number; maxPerdidaMensual: number;
  objetivoDiario: number; objetivoSemanal: number; objetivoMensual: number;
};
const DEFAULT: RiskConfig = { maxPerdidaDiaria:50, maxPerdidaSemanal:150, maxPerdidaMensual:400, objetivoDiario:30, objetivoSemanal:100, objetivoMensual:300 };
const KEY = 'st_risk_config';

function RuleRow({ label, actual, limit, tipo, sub }: { label: string; actual: number; limit: number; tipo: 'loss'|'profit'; sub?: string }) {
  const pct = limit > 0 ? Math.min(Math.abs(actual) / limit * 100, 100) : 0;
  const breached = tipo==='loss' ? actual <= -limit : false;
  const achieved = tipo==='profit' ? actual >= limit : false;
  const color = breached ? G.red : achieved ? G.green : pct > 70 ? (tipo==='loss'?G.red:G.green) : pct > 40 ? G.gold : tipo==='profit' ? G.muted2 : G.green;
  const icon = breached ? '✕' : achieved ? '✓' : '–';
  const iconColor = breached ? G.red : achieved ? G.green : G.muted;
  return (
    <div style={{ padding:'13px 18px', borderBottom:`1px solid ${G.border}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:500, color:G.text, fontFamily:G.fontUi }}>{label}</div>
          {sub && <div style={{ fontSize:10, color:G.muted, marginTop:1, fontFamily:G.fontUi }}>{sub}</div>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontFamily:G.fontData, fontSize:12, fontWeight:700, color }}>
            {tipo==='loss'
              ? `${actual.toFixed(2)}€ / -${limit.toFixed(2)}€`
              : `${actual>=0?'+':''}${actual.toFixed(2)}€ / +${limit.toFixed(2)}€`}
          </div>
          <div style={{ width:22, height:22, borderRadius:5, background:`${iconColor}18`, border:`1px solid ${iconColor}40`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:G.fontData, fontSize:12, fontWeight:700, color:iconColor, flexShrink:0 }}>{icon}</div>
        </div>
      </div>
      <div style={{ height:3, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:2, transition:'width 0.8s ease' }} />
      </div>
    </div>
  );
}

export default function ObjetivosRiesgo({ trades }: { trades: Trade[] }) {
  const [config, setConfig] = useState<RiskConfig>(DEFAULT);
  const [editando, setEditando] = useState(false);
  const [draft, setDraft] = useState<RiskConfig>(DEFAULT);

  useEffect(() => { const s = localStorage.getItem(KEY); if (s) { const c=JSON.parse(s); setConfig(c); setDraft(c); } }, []);
  function save() { setConfig(draft); localStorage.setItem(KEY, JSON.stringify(draft)); setEditando(false); }

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7);
  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth()-1);
  const pnlDia = trades.filter(t=>t.date===today).reduce((s,t)=>s+t.pnl,0);
  const pnlSem = trades.filter(t=>new Date(t.date)>=weekAgo).reduce((s,t)=>s+t.pnl,0);
  const pnlMes = trades.filter(t=>new Date(t.date)>=monthAgo).reduce((s,t)=>s+t.pnl,0);
  const pnlTotal = trades.reduce((s,t)=>s+t.pnl,0);

  const alerts = [
    pnlDia<=-config.maxPerdidaDiaria && { msg:`🚨 Límite pérdida DIARIA alcanzado (${pnlDia.toFixed(2)}€) — Para de operar hoy`, c:G.red },
    pnlSem<=-config.maxPerdidaSemanal && { msg:`🚨 Límite pérdida SEMANAL alcanzado (${pnlSem.toFixed(2)}€)`, c:G.red },
    pnlMes<=-config.maxPerdidaMensual && { msg:`🚨 Límite pérdida MENSUAL alcanzado (${pnlMes.toFixed(2)}€)`, c:G.red },
    pnlDia>=config.objetivoDiario && { msg:`✅ Objetivo diario conseguido (+${pnlDia.toFixed(2)}€) — Considera parar`, c:G.green },
    pnlSem>=config.objetivoSemanal && { msg:`✅ Objetivo semanal conseguido (+${pnlSem.toFixed(2)}€)`, c:G.green },
  ].filter(Boolean) as {msg:string;c:string}[];

  const inp: React.CSSProperties = { background:G.card2, border:`1px solid ${G.border}`, borderRadius:6, padding:'8px 10px', color:G.text, fontFamily:G.fontData, fontSize:13, width:'100%', outline:'none' };
  const lbl: React.CSSProperties = { fontFamily:G.fontData, fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase' as const, color:G.muted, display:'block', marginBottom:4 };

  return (
    <div>
      {alerts.map((a,i) => <div key={i} style={{ background:`${a.c}10`, border:`1px solid ${a.c}30`, borderRadius:10, padding:'12px 16px', marginBottom:10, fontSize:13, color:a.c, fontFamily:G.fontUi, fontWeight:600 }}>{a.msg}</div>)}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, flex:1, marginRight:12 }}>
          {[{l:'Hoy',v:pnlDia},{l:'Semana',v:pnlSem},{l:'Mes',v:pnlMes},{l:'Total',v:pnlTotal}].map(s=>(
            <div key={s.l} style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:9, padding:'11px 13px' }}>
              <div style={{ fontFamily:G.fontData, fontSize:8, color:G.muted, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:5 }}>{s.l}</div>
              <div style={{ fontFamily:G.fontData, fontSize:16, fontWeight:700, color:s.v>=0?G.green:G.red }}>{s.v>=0?'+':''}{s.v.toFixed(2)}€</div>
            </div>
          ))}
        </div>
        <button onClick={()=>{setDraft(config);setEditando(!editando);}} style={{ padding:'8px 14px', background:editando?`${G.cyan}15`:'transparent', border:`1px solid ${G.border2}`, borderRadius:7, color:editando?G.cyan:G.muted2, fontSize:11, cursor:'pointer', fontFamily:G.fontUi, whiteSpace:'nowrap' }}>
          {editando?'✕ Cancelar':'⚙ Configurar'}
        </button>
      </div>

      {editando && (
        <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:12, padding:18, marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:600, fontFamily:G.fontUi, marginBottom:14 }}>Configurar límites de riesgo y objetivos</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
            {[
              {l:'MÁX. PÉRDIDA DÍA (€)',k:'maxPerdidaDiaria'},{l:'MÁX. PÉRDIDA SEM. (€)',k:'maxPerdidaSemanal'},{l:'MÁX. PÉRDIDA MES (€)',k:'maxPerdidaMensual'},
              {l:'OBJETIVO DÍA (€)',k:'objetivoDiario'},{l:'OBJETIVO SEMANA (€)',k:'objetivoSemanal'},{l:'OBJETIVO MES (€)',k:'objetivoMensual'},
            ].map(f=>(
              <div key={f.k}><label style={lbl}>{f.l}</label><input type="number" value={draft[f.k as keyof RiskConfig]} onChange={e=>setDraft(p=>({...p,[f.k]:parseFloat(e.target.value)||0}))} style={inp}/></div>
            ))}
          </div>
          <button onClick={save} style={{ padding:'10px 20px', background:'linear-gradient(135deg,#0055cc,#00d4ff)', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:G.fontUi }}>Guardar</button>
        </div>
      )}

      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:12, overflow:'hidden', marginBottom:12 }}>
        <div style={{ padding:'11px 18px', borderBottom:`1px solid ${G.border}`, fontFamily:G.fontData, fontSize:9, color:G.muted, letterSpacing:'0.15em', textTransform:'uppercase' }}>LÍMITES DE PÉRDIDA</div>
        <RuleRow label="Pérdida máxima diaria" actual={pnlDia} limit={config.maxPerdidaDiaria} tipo="loss" sub={`Hoy: ${trades.filter(t=>t.date===today).length} operaciones`} />
        <RuleRow label="Pérdida máxima semanal" actual={pnlSem} limit={config.maxPerdidaSemanal} tipo="loss" sub="Últimos 7 días" />
        <RuleRow label="Pérdida máxima mensual" actual={pnlMes} limit={config.maxPerdidaMensual} tipo="loss" sub="Últimos 30 días" />
      </div>

      <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'11px 18px', borderBottom:`1px solid ${G.border}`, fontFamily:G.fontData, fontSize:9, color:G.muted, letterSpacing:'0.15em', textTransform:'uppercase' }}>OBJETIVOS DE BENEFICIO</div>
        <RuleRow label="Objetivo diario" actual={pnlDia} limit={config.objetivoDiario} tipo="profit" />
        <RuleRow label="Objetivo semanal" actual={pnlSem} limit={config.objetivoSemanal} tipo="profit" />
        <RuleRow label="Objetivo mensual" actual={pnlMes} limit={config.objetivoMensual} tipo="profit" />
      </div>
    </div>
  );
}
