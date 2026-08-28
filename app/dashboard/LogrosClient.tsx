'use client';
import { useState, useEffect } from 'react';

type Trade = { date: string; res: string; plan: string|null; pnl: number; };

type RetoPersonalizado = {
  id: string;
  titulo: string;
  descripcion: string;
  meta: number;
  tipo: 'pnl' | 'trades' | 'wr' | 'streak';
  icono: string;
  completado: boolean;
  creado: string;
};

type LogroFijo = {
  id: string; titulo: string; descripcion: string; icono: string;
  tipo: 'oro' | 'plata' | 'cyan';
  condicion: (trades: Trade[], totalPnl: number) => boolean;
  progreso?: (trades: Trade[], totalPnl: number) => { actual: number; meta: number; label: string };
};

const LOGROS_FIJOS: LogroFijo[] = [
  { id:'primer-trade', titulo:'Primer Disparo', descripcion:'Registraste tu primera operación', icono:'🎯', tipo:'cyan', condicion:(t)=>t.length>=1 },
  { id:'racha-3', titulo:'En Racha', descripcion:'3 operaciones ganadoras consecutivas', icono:'🔥', tipo:'plata',
    condicion:(t)=>{ let max=0,cur=0; t.forEach(tr=>{if(tr.res==='win'){cur++;max=Math.max(max,cur);}else cur=0;}); return max>=3; },
    progreso:(t)=>{ let max=0,cur=0; t.forEach(tr=>{if(tr.res==='win'){cur++;max=Math.max(max,cur);}else cur=0;}); return {actual:Math.min(max,3),meta:3,label:'wins consecutivos'}; }},
  { id:'disciplina-10', titulo:'Disciplina Total', descripcion:'10 operaciones seguidas con plan', icono:'📋', tipo:'plata',
    condicion:(t)=>{ let max=0,cur=0; t.forEach(tr=>{if(tr.plan==='yes'){cur++;max=Math.max(max,cur);}else cur=0;}); return max>=10; },
    progreso:(t)=>{ let max=0,cur=0; t.forEach(tr=>{if(tr.plan==='yes'){cur++;max=Math.max(max,cur);}else cur=0;}); return {actual:Math.min(max,10),meta:10,label:'con plan seguidos'}; }},
  { id:'mes-positivo', titulo:'Mes Ganador', descripcion:'Primer mes con P&L positivo', icono:'📈', tipo:'plata',
    condicion:(t)=>{ const m:Record<string,number>={}; t.forEach(tr=>{const k=tr.date.slice(0,7);m[k]=(m[k]||0)+tr.pnl;}); return Object.values(m).some(v=>v>0); }},
  { id:'wr50', titulo:'Win Rate 50%', descripcion:'Win rate ≥ 50% con 20+ trades', icono:'🏆', tipo:'plata',
    condicion:(t)=>t.length>=20&&t.filter(tr=>tr.res==='win').length/t.length>=0.5,
    progreso:(t)=>({actual:t.length,meta:20,label:`trades · WR actual: ${t.length?Math.round(t.filter(tr=>tr.res==='win').length/t.length*100):0}%`})},
  { id:'beneficio-100', titulo:'+100€ Generados', descripcion:'P&L acumulado superior a 100€', icono:'💰', tipo:'plata',
    condicion:(_,pnl)=>pnl>=100, progreso:(_,pnl)=>({actual:Math.max(0,pnl),meta:100,label:'€ de beneficio'})},
  { id:'consistencia-30', titulo:'Consistente', descripcion:'30 operaciones registradas', icono:'📊', tipo:'plata',
    condicion:(t)=>t.length>=30, progreso:(t)=>({actual:t.length,meta:30,label:'operaciones'})},
  { id:'beneficio-500', titulo:'+500€ Elite', descripcion:'P&L acumulado superior a 500€', icono:'💎', tipo:'oro',
    condicion:(_,pnl)=>pnl>=500, progreso:(_,pnl)=>({actual:Math.max(0,pnl),meta:500,label:'€ de beneficio'})},
  { id:'wr60', titulo:'Élite Win Rate', descripcion:'Win rate ≥ 60% con 50+ trades', icono:'⭐', tipo:'oro',
    condicion:(t)=>t.length>=50&&t.filter(tr=>tr.res==='win').length/t.length>=0.6,
    progreso:(t)=>({actual:t.length,meta:50,label:'trades necesarios'})},
  { id:'racha-5', titulo:'Máquina de Wins', descripcion:'5 operaciones ganadoras consecutivas', icono:'🚀', tipo:'oro',
    condicion:(t)=>{ let max=0,cur=0; t.forEach(tr=>{if(tr.res==='win'){cur++;max=Math.max(max,cur);}else cur=0;}); return max>=5; },
    progreso:(t)=>{ let max=0,cur=0; t.forEach(tr=>{if(tr.res==='win'){cur++;max=Math.max(max,cur);}else cur=0;}); return {actual:Math.min(max,5),meta:5,label:'wins consecutivos'}; }},
];

const TIPO_STYLES = {
  oro:   { border:'rgba(245,166,35,0.4)',  bg:'rgba(245,166,35,0.06)',  accent:'#f5a623', glow:'rgba(245,166,35,0.25)', label:'ORO' },
  plata: { border:'rgba(160,174,192,0.4)', bg:'rgba(160,174,192,0.06)', accent:'#a0aec0', glow:'rgba(160,174,192,0.15)', label:'PLATA' },
  cyan:  { border:'rgba(0,212,255,0.4)',   bg:'rgba(0,212,255,0.06)',   accent:'#00d4ff', glow:'rgba(0,212,255,0.25)', label:'BRONCE' },
};

const KEY_RETOS = 'st_retos_personalizados';

export default function LogrosClient({ trades, totalPnl }: { trades: Trade[]; totalPnl: number }) {
  const [tab, setTab] = useState<'logros'|'retos'>('logros');
  const [selected, setSelected] = useState<string|null>(null);
  const [retos, setRetos] = useState<RetoPersonalizado[]>([]);
  const [showNewReto, setShowNewReto] = useState(false);
  const [generating, setGenerating] = useState(false);

  // New reto form
  const [rTitulo, setRTitulo] = useState('');
  const [rDesc, setRDesc] = useState('');
  const [rMeta, setRMeta] = useState('');
  const [rTipo, setRTipo] = useState<'pnl'|'trades'|'wr'|'streak'>('pnl');
  const [rIcono, setRIcono] = useState('🎯');

  useEffect(() => {
    const s = localStorage.getItem(KEY_RETOS);
    if (s) setRetos(JSON.parse(s));
  }, []);

  function saveRetos(r: RetoPersonalizado[]) { setRetos(r); localStorage.setItem(KEY_RETOS, JSON.stringify(r)); }

  function addReto() {
    if (!rTitulo.trim() || !rMeta) return;
    const r: RetoPersonalizado = { id: Date.now().toString(), titulo: rTitulo, descripcion: rDesc, meta: parseFloat(rMeta), tipo: rTipo, icono: rIcono, completado: false, creado: new Date().toISOString().split('T')[0] };
    saveRetos([...retos, r]);
    setRTitulo(''); setRDesc(''); setRMeta(''); setShowNewReto(false);
  }

  function deleteReto(id: string) {
    if (!confirm('¿Eliminar este reto?')) return;
    saveRetos(retos.filter(r=>r.id!==id));
  }

  function toggleReto(id: string) {
    saveRetos(retos.map(r=>r.id===id?{...r,completado:!r.completado}:r));
  }

  // Compute logros
  const logrosConEstado = LOGROS_FIJOS.map(l=>({
    ...l, conseguido: l.condicion(trades, totalPnl),
    prog: l.progreso ? l.progreso(trades, totalPnl) : null,
  }));
  const conseguidos = logrosConEstado.filter(l=>l.conseguido).length;
  const selectedLogro = selected ? logrosConEstado.find(l=>l.id===selected) : null;

  // PDF diploma generation
  async function downloadDiploma(titulo: string, descripcion: string, icono: string, tipo: string) {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297, H = 210;

      // Background
      doc.setFillColor(5, 10, 18);
      doc.rect(0, 0, W, H, 'F');

      // Border lines
      doc.setDrawColor(0, 212, 255);
      doc.setLineWidth(0.5);
      doc.rect(8, 8, W-16, H-16);
      doc.rect(12, 12, W-24, H-24);

      // Corner accents
      const corners = [[8,8],[W-8,8],[8,H-8],[W-8,H-8]];
      corners.forEach(([x,y]) => {
        doc.setLineWidth(2);
        const sx = x === 8 ? 1 : -1, sy = y === 8 ? 1 : -1;
        doc.line(x, y, x+sx*15, y);
        doc.line(x, y, x, y+sy*15);
      });

      // Header
      doc.setFontSize(9);
      doc.setTextColor(74, 106, 138);
      doc.setFont('helvetica', 'normal');
      doc.text('SAVAGE TRADING JOURNAL PRO', W/2, 28, { align: 'center' });

      // Divider
      doc.setDrawColor(0, 212, 255);
      doc.setLineWidth(0.3);
      doc.line(40, 33, W-40, 33);

      // Achievement text
      doc.setFontSize(11);
      doc.setTextColor(138, 160, 191);
      doc.text('LOGRO DESBLOQUEADO', W/2, 44, { align: 'center' });

      // Tipo badge
      const tipoColor = tipo === 'oro' ? [245,166,35] : tipo === 'plata' ? [160,174,192] : [0,212,255];
      doc.setFontSize(10);
      doc.setTextColor(tipoColor[0], tipoColor[1], tipoColor[2]);
      doc.text(`— ${tipo.toUpperCase()} —`, W/2, 53, { align: 'center' });

      // Icon + Title
      doc.setFontSize(38);
      doc.setTextColor(tipoColor[0], tipoColor[1], tipoColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(titulo.toUpperCase(), W/2, 90, { align: 'center' });

      // Description
      doc.setFontSize(14);
      doc.setTextColor(138, 160, 191);
      doc.setFont('helvetica', 'normal');
      doc.text(descripcion, W/2, 108, { align: 'center' });

      // Divider
      doc.setDrawColor(tipoColor[0], tipoColor[1], tipoColor[2]);
      doc.setLineWidth(0.5);
      doc.line(60, 118, W-60, 118);

      // Presented to
      doc.setFontSize(11);
      doc.setTextColor(74, 106, 138);
      doc.text('PRESENTADO A', W/2, 130, { align: 'center' });

      doc.setFontSize(22);
      doc.setTextColor(tipoColor[0], tipoColor[1], tipoColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Cristian Fandos', W/2, 145, { align: 'center' });

      // Date and signature
      doc.setFontSize(9);
      doc.setTextColor(74, 106, 138);
      doc.setFont('helvetica', 'normal');
      const fecha = new Date().toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric' });
      doc.text(fecha, 50, 175);
      doc.text('Savage Trading Journal Pro', W-50, 175, { align: 'right' });

      // Bottom line
      doc.setDrawColor(0, 212, 255);
      doc.setLineWidth(0.3);
      doc.line(40, 165, 100, 165);
      doc.line(W-100, 165, W-40, 165);

      doc.save(`diploma-${titulo.toLowerCase().replace(/\s/g,'-')}.pdf`);
    } catch(e) { console.error(e); alert('Error generando PDF'); }
    setGenerating(false);
  }

  // Reto progress computation
  function getRetoProgress(r: RetoPersonalizado): { actual: number; pct: number } {
    if (r.completado) return { actual: r.meta, pct: 100 };
    let actual = 0;
    if (r.tipo === 'pnl') actual = Math.max(0, totalPnl);
    else if (r.tipo === 'trades') actual = trades.length;
    else if (r.tipo === 'wr') actual = trades.length ? Math.round(trades.filter(t=>t.res==='win').length/trades.length*100) : 0;
    else if (r.tipo === 'streak') { let max=0,cur=0; trades.forEach(t=>{if(t.res==='win'){cur++;max=Math.max(max,cur);}else cur=0;}); actual=max; }
    return { actual, pct: Math.min(actual/r.meta*100, 100) };
  }

  const inp: React.CSSProperties = { background:'#0f1e38', border:'1px solid rgba(0,180,255,0.1)', borderRadius:6, padding:'9px 12px', color:'#e8f0fe', fontFamily:"'Inter',sans-serif", fontSize:13, width:'100%', outline:'none' };
  const lbl: React.CSSProperties = { fontFamily:"'JetBrains Mono',monospace", fontSize:9, letterSpacing:'0.15em', textTransform:'uppercase' as const, color:'#4a6a8a', display:'block', marginBottom:4 };

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid rgba(0,180,255,0.1)', marginBottom:20 }}>
        {([['logros','🏆 Logros'],['retos','⚡ Mis Retos']] as const).map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'9px 20px', background:'none', border:'none', borderBottom:`2px solid ${tab===t?'#00d4ff':'transparent'}`, color:tab===t?'#00d4ff':'#4a6a8a', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:"'Inter',sans-serif", marginBottom:-1, transition:'all 0.15s' }}>{l}</button>
        ))}
      </div>

      {/* LOGROS */}
      {tab==='logros'&&(
        <div>
          {/* Progress */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
            {[{l:'Conseguidos',v:`${conseguidos}/${LOGROS_FIJOS.length}`,c:'#00d4ff'},{l:'Completado',v:`${Math.round(conseguidos/LOGROS_FIJOS.length*100)}%`,c:'#00e676'},{l:'Pendientes',v:String(LOGROS_FIJOS.length-conseguidos),c:'#f5a623'}].map(s=>(
              <div key={s.l} style={{ background:'#0c1628', border:'1px solid rgba(0,180,255,0.1)', borderRadius:10, padding:'13px 15px' }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:'#4a6a8a', letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:6 }}>{s.l}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:700, color:s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
          <div style={{ height:3, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden', marginBottom:16 }}>
            <div style={{ height:'100%', width:`${conseguidos/LOGROS_FIJOS.length*100}%`, background:'linear-gradient(90deg,#0066dd,#00d4ff)', borderRadius:2, transition:'width 1s ease' }}/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:10 }}>
            {logrosConEstado.map(l=>{
              const s = TIPO_STYLES[l.tipo];
              const pct = l.prog ? Math.min(l.prog.actual/l.prog.meta*100,100) : l.conseguido?100:0;
              return (
                <div key={l.id} onClick={()=>setSelected(l.id===selected?null:l.id)}
                  style={{ background:l.conseguido?s.bg:'rgba(255,255,255,0.02)', border:`1px solid ${l.conseguido?s.border:'rgba(255,255,255,0.06)'}`, borderRadius:12, padding:16, cursor:'pointer', opacity:l.conseguido?1:0.55, position:'relative', overflow:'hidden', boxShadow:l.conseguido?`0 0 20px ${s.glow}`:'none', transition:'all 0.2s' }}>
                  {l.conseguido && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${s.accent},transparent)` }}/>}
                  <div style={{ fontSize:26, marginBottom:8 }}>{l.icono}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:l.conseguido?'#e8f0fe':'#4a6a8a', fontFamily:"'Inter',sans-serif" }}>{l.titulo}</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:7, color:s.accent, letterSpacing:'0.1em', marginLeft:6, flexShrink:0 }}>{s.label}</div>
                  </div>
                  <div style={{ fontSize:11, color:'#4a6a8a', lineHeight:1.5, marginBottom:10, fontFamily:"'Inter',sans-serif" }}>{l.descripcion}</div>
                  {l.prog && !l.conseguido && (
                    <div>
                      <div style={{ height:3, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden', marginBottom:4 }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:s.accent, borderRadius:2, transition:'width 0.8s ease' }}/>
                      </div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:'#4a6a8a' }}>{l.prog.actual.toFixed(0)}/{l.prog.meta} {l.prog.label}</div>
                    </div>
                  )}
                  {l.conseguido && (
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:`${s.accent}18`, border:`1px solid ${s.accent}40`, borderRadius:4, padding:'3px 8px', fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:s.accent, fontWeight:700 }}>✓ DESBLOQUEADO</div>
                      <button onClick={e=>{e.stopPropagation();downloadDiploma(l.titulo,l.descripcion,l.icono,l.tipo);}} disabled={generating} style={{ padding:'3px 8px', background:`${s.accent}12`, border:`1px solid ${s.accent}30`, borderRadius:4, color:s.accent, fontSize:9, cursor:'pointer', fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>
                        {generating?'...':'⬇ PDF'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RETOS PERSONALIZADOS */}
      {tab==='retos'&&(
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:600, fontFamily:"'Inter',sans-serif", color:'#e8f0fe' }}>Tus retos personalizados</div>
              <div style={{ fontSize:11, color:'#4a6a8a', marginTop:2, fontFamily:"'Inter',sans-serif" }}>Crea y gestiona tus propios desafíos de trading</div>
            </div>
            <button onClick={()=>setShowNewReto(!showNewReto)} style={{ padding:'8px 16px', background:'linear-gradient(135deg,#0055cc,#00d4ff)', border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>+ Nuevo reto</button>
          </div>

          {/* New reto form */}
          {showNewReto && (
            <div style={{ background:'#0c1628', border:'1px solid rgba(0,180,255,0.2)', borderRadius:12, padding:18, marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:600, fontFamily:"'Inter',sans-serif", marginBottom:14 }}>Crear nuevo reto</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                <div><label style={lbl}>NOMBRE DEL RETO</label><input value={rTitulo} onChange={e=>setRTitulo(e.target.value)} placeholder="Ej: Alcanzar 500€" style={inp}/></div>
                <div><label style={lbl}>TIPO DE META</label>
                  <select value={rTipo} onChange={e=>setRTipo(e.target.value as typeof rTipo)} style={inp}>
                    <option value="pnl">P&L en €</option>
                    <option value="trades">Nº de operaciones</option>
                    <option value="wr">Win Rate %</option>
                    <option value="streak">Racha de wins</option>
                  </select>
                </div>
                <div><label style={lbl}>DESCRIPCIÓN</label><input value={rDesc} onChange={e=>setRDesc(e.target.value)} placeholder="Breve descripción..." style={inp}/></div>
                <div><label style={lbl}>META ({rTipo==='pnl'?'€':rTipo==='wr'?'%':'número'})</label><input type="number" value={rMeta} onChange={e=>setRMeta(e.target.value)} placeholder="0" style={inp}/></div>
                <div><label style={lbl}>ICONO</label>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {['🎯','🔥','💰','⭐','🚀','💎','🏆','📈','⚡','🛡️'].map(ic=>(
                      <button key={ic} onClick={()=>setRIcono(ic)} style={{ width:34,height:34, borderRadius:7, border:`1px solid ${rIcono===ic?'#00d4ff':'rgba(0,180,255,0.1)'}`, background:rIcono===ic?'rgba(0,212,255,0.12)':'transparent', fontSize:18, cursor:'pointer' }}>{ic}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <button onClick={()=>setShowNewReto(false)} style={{ padding:11, background:'transparent', border:'1px solid rgba(0,180,255,0.1)', borderRadius:8, color:'#4a6a8a', fontSize:13, cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>Cancelar</button>
                <button onClick={addReto} disabled={!rTitulo||!rMeta} style={{ padding:11, background:'linear-gradient(135deg,#0055cc,#00d4ff)', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Inter',sans-serif", opacity:(!rTitulo||!rMeta)?0.5:1 }}>Crear reto</button>
              </div>
            </div>
          )}

          {retos.length===0 ? (
            <div style={{ textAlign:'center', padding:'50px 20px', color:'#4a6a8a' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>⚡</div>
              <div style={{ fontSize:14, fontFamily:"'Inter',sans-serif", marginBottom:6, color:'#8ba0bf' }}>Sin retos personalizados aún</div>
              <div style={{ fontSize:12, fontFamily:"'Inter',sans-serif" }}>Crea tu primer reto para empezar a medir tu progreso</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {retos.map(r=>{
                const {actual, pct} = getRetoProgress(r);
                const tipoLabel = {pnl:'€',trades:'ops',wr:'% WR',streak:'wins seguidos'}[r.tipo];
                return (
                  <div key={r.id} style={{ background:'#0c1628', border:`1px solid ${r.completado?'rgba(0,230,118,0.3)':'rgba(0,180,255,0.1)'}`, borderRadius:12, padding:'14px 18px', position:'relative', overflow:'hidden' }}>
                    {r.completado && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#00e676,transparent)' }}/>}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:22 }}>{r.icono}</span>
                        <div>
                          <div style={{ fontSize:14, fontWeight:600, color:'#e8f0fe', fontFamily:"'Inter',sans-serif" }}>{r.titulo}</div>
                          {r.descripcion && <div style={{ fontSize:11, color:'#4a6a8a', marginTop:2, fontFamily:"'Inter',sans-serif" }}>{r.descripcion}</div>}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        {r.completado && (
                          <button onClick={()=>downloadDiploma(r.titulo,r.descripcion||r.titulo,r.icono,'cyan')} disabled={generating} style={{ padding:'4px 10px', background:'rgba(0,230,118,0.1)', border:'1px solid rgba(0,230,118,0.3)', borderRadius:5, color:'#00e676', fontSize:9, cursor:'pointer', fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>⬇ PDF</button>
                        )}
                        <button onClick={()=>toggleReto(r.id)} style={{ padding:'4px 10px', background:r.completado?'rgba(0,230,118,0.1)':'rgba(0,212,255,0.1)', border:`1px solid ${r.completado?'rgba(0,230,118,0.3)':'rgba(0,212,255,0.2)'}`, borderRadius:5, color:r.completado?'#00e676':'#00d4ff', fontSize:9, cursor:'pointer', fontFamily:"'JetBrains Mono',monospace", fontWeight:700 }}>
                          {r.completado?'✓ LISTO':'Marcar ✓'}
                        </button>
                        <button onClick={()=>deleteReto(r.id)} style={{ width:26,height:26, borderRadius:6, background:'rgba(255,51,102,0.1)', border:'1px solid rgba(255,51,102,0.3)', color:'#ff3366', cursor:'pointer', fontSize:12 }}>✕</button>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ flex:1, height:4, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:r.completado?'#00e676':'#00d4ff', borderRadius:2, transition:'width 0.8s ease' }}/>
                      </div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:r.completado?'#00e676':'#8ba0bf', whiteSpace:'nowrap' }}>
                        {actual.toFixed(actual%1?2:0)} / {r.meta} {tipoLabel}
                      </div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:700, color:r.completado?'#00e676':'#00d4ff' }}>{Math.round(pct)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Diploma modal */}
      {selectedLogro && selectedLogro.conseguido && (
        <div onClick={()=>setSelected(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(6px)' }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:480, background:'linear-gradient(135deg,#0c1628,#0f2040)', border:`1px solid ${TIPO_STYLES[selectedLogro.tipo].border}`, borderRadius:16, padding:32, textAlign:'center', position:'relative', overflow:'hidden', boxShadow:`0 0 60px ${TIPO_STYLES[selectedLogro.tipo].glow}` }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${TIPO_STYLES[selectedLogro.tipo].accent},transparent)` }}/>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:'#4a6a8a', letterSpacing:'0.3em', marginBottom:20 }}>SAVAGE TRADING JOURNAL PRO</div>
            <div style={{ fontSize:50, marginBottom:12 }}>{selectedLogro.icono}</div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:TIPO_STYLES[selectedLogro.tipo].accent, letterSpacing:'0.2em', marginBottom:8 }}>LOGRO DESBLOQUEADO · {TIPO_STYLES[selectedLogro.tipo].label}</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:24, fontWeight:800, color:'#e8f0fe', marginBottom:8 }}>{selectedLogro.titulo}</div>
            <div style={{ fontSize:13, color:'#8ba0bf', marginBottom:24, fontFamily:"'Inter',sans-serif" }}>{selectedLogro.descripcion}</div>
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:16, display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'#4a6a8a' }}>Cristian Fandos</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'#4a6a8a' }}>{new Date().toLocaleDateString('es-ES')}</div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button onClick={()=>downloadDiploma(selectedLogro.titulo,selectedLogro.descripcion,selectedLogro.icono,selectedLogro.tipo)} disabled={generating} style={{ padding:'9px 20px', background:`linear-gradient(135deg,#0055cc,${TIPO_STYLES[selectedLogro.tipo].accent})`, border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>
                {generating?'Generando...':'⬇ Descargar Diploma PDF'}
              </button>
              <button onClick={()=>setSelected(null)} style={{ padding:'9px 16px', background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#4a6a8a', fontSize:12, cursor:'pointer', fontFamily:"'Inter',sans-serif" }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
