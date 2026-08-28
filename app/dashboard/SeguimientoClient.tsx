'use client';
import { useState } from 'react';

const G = {
  card:'#0c1628', card2:'#0f1e38', surface:'#080f1e',
  border:'rgba(0,180,255,0.1)', border2:'rgba(0,180,255,0.22)',
  cyan:'#00d4ff', green:'#00e676', red:'#ff3366', gold:'#f5a623', purple:'#a78bfa',
  text:'#e8f0fe', muted:'#4a6a8a', muted2:'#8ba0bf',
  fontData:"'JetBrains Mono',monospace" as string,
  fontUi:"'Inter',sans-serif" as string,
};

type Trade = { id: number; date: string; time: string; pair: string; dir: string; res: string; pnl: number; lot: number; entry: number; sl: number; tp: number; rr: string; plan: string|null; emo: string; };

function Heatmap({ trades }: { trades: Trade[] }) {
  const days = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const hours = ['00–04','04–08','08–12','12–16','16–20','20–24'];
  const grid: Record<string, Trade[]> = {};
  days.forEach(d => hours.forEach(h => { grid[`${d}|${h}`] = []; }));
  trades.forEach(t => {
    const dow = new Date(t.date).getDay();
    const d = days[[6,0,1,2,3,4,5][dow]];
    const h = t.time ? parseInt(t.time.split(':')[0]) : 14;
    const hk = h<4?'00–04':h<8?'04–08':h<12?'08–12':h<16?'12–16':h<20?'16–20':'20–24';
    if (d) grid[`${d}|${hk}`].push(t);
  });
  const allPnls = Object.values(grid).map(ts=>ts.reduce((s,t)=>s+t.pnl,0)).filter(v=>v!==0);
  const maxAbs = allPnls.length ? Math.max(...allPnls.map(Math.abs)) : 1;
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'38px repeat(6,1fr)', gap:3 }}>
        <div/>
        {hours.map(h=><div key={h} style={{ fontFamily:G.fontData, fontSize:8, color:G.muted, textAlign:'center', paddingBottom:4 }}>{h}</div>)}
        {days.map(d=>(
          <div key={d} style={{ display:'contents' }}>
            <div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted, display:'flex', alignItems:'center' }}>{d}</div>
            {hours.map(h=>{
              const ts = grid[`${d}|${h}`];
              const pnl = ts.reduce((s,t)=>s+t.pnl,0);
              const intensity = maxAbs > 0 ? Math.abs(pnl)/maxAbs : 0;
              const bg = ts.length===0 ? 'rgba(255,255,255,0.03)' : pnl>0 ? `rgba(0,230,118,${0.1+intensity*0.55})` : pnl<0 ? `rgba(255,51,102,${0.1+intensity*0.55})` : 'rgba(255,255,255,0.04)';
              return (
                <div key={h} title={ts.length?`${ts.length} trades · ${pnl>=0?'+':''}${pnl.toFixed(2)}€`:'Sin trades'} style={{ height:34, borderRadius:4, background:bg, border:`1px solid ${ts.length?(pnl>0?'rgba(0,230,118,0.18)':'rgba(255,51,102,0.18)'):G.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:ts.length?'pointer':'default' }}>
                  {ts.length>0 && <span style={{ fontFamily:G.fontData, fontSize:8, color:pnl>=0?G.green:G.red, fontWeight:700 }}>{ts.length}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:16, marginTop:10, justifyContent:'flex-end' }}>
        {[['Ganador',G.green],['Sin trades','rgba(255,255,255,0.08)'],['Perdedor',G.red]].map(([l,c])=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:c }}/>
            <span style={{ fontFamily:G.fontData, fontSize:9, color:G.muted }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarioPnL({ trades }: { trades: Trade[] }) {
  const [mes, setMes] = useState(new Date());
  const byDate: Record<string,number> = {};
  trades.forEach(t => { byDate[t.date]=(byDate[t.date]||0)+t.pnl; });
  const y=mes.getFullYear(), m=mes.getMonth();
  const firstDow = (new Date(y,m,1).getDay()+6)%7;
  const daysInM = new Date(y,m+1,0).getDate();
  const cells: number[] = [...Array(firstDow).fill(0), ...Array.from({length:daysInM},(_,i)=>i+1)];
  while (cells.length%7) cells.push(0);
  const weeks: number[][] = [];
  for (let i=0;i<cells.length;i+=7) weeks.push(cells.slice(i,i+7));
  const mesLabel = mes.toLocaleDateString('es-ES',{month:'long',year:'numeric'});
  const today = new Date().toISOString().split('T')[0];
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:15, fontWeight:600, fontFamily:G.fontUi, textTransform:'capitalize' }}>{mesLabel}</div>
        <div style={{ display:'flex', gap:6 }}>
          {['‹','›'].map((a,i)=>(
            <button key={a} onClick={()=>{const d=new Date(mes);d.setMonth(d.getMonth()+(i?1:-1));setMes(d);}} style={{ width:28, height:28, borderRadius:6, background:G.card2, border:`1px solid ${G.border}`, color:G.muted2, cursor:'pointer', fontSize:14 }}>{a}</button>
          ))}
        </div>
      </div>
      {/* Week summaries */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
        {weeks.map((w,i)=>{
          const ds = w.filter(d=>d>0);
          const pnl = ds.reduce((s,d)=>{const dk=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;return s+(byDate[dk]||0);},0);
          const hasTrades = ds.some(d=>byDate[`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`]!==undefined);
          return (
            <div key={i} style={{ background:pnl>0?'rgba(0,230,118,0.07)':pnl<0?'rgba(255,51,102,0.07)':G.card2, border:`1px solid ${pnl>0?'rgba(0,230,118,0.2)':pnl<0?'rgba(255,51,102,0.2)':G.border}`, borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted, marginBottom:4 }}>Semana {i+1}</div>
              <div style={{ fontFamily:G.fontData, fontSize:15, fontWeight:700, color:pnl>0?G.green:pnl<0?G.red:G.muted }}>{hasTrades?(pnl>=0?'+':'')+pnl.toFixed(2)+'€':'$0.00'}</div>
            </div>
          );
        })}
      </div>
      {/* Day grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3, marginBottom:4 }}>
        {['L','M','X','J','V','S','D'].map(d=><div key={d} style={{ textAlign:'center', fontFamily:G.fontData, fontSize:9, color:G.muted, padding:'2px 0' }}>{d}</div>)}
        {weeks.flat().map((d,i)=>{
          if (!d) return <div key={i}/>;
          const dk=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const pnl=byDate[dk];
          const isToday=dk===today;
          return (
            <div key={i} style={{ aspectRatio:'1', borderRadius:5, background:pnl!==undefined?(pnl>0?'rgba(0,230,118,0.1)':pnl<0?'rgba(255,51,102,0.1)':'rgba(255,255,255,0.04)'):'transparent', border:`1px solid ${isToday?G.cyan:pnl!==undefined?(pnl>0?'rgba(0,230,118,0.25)':'rgba(255,51,102,0.25)'):'transparent'}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:2 }}>
              <div style={{ fontFamily:G.fontData, fontSize:9, color:isToday?G.cyan:G.muted, fontWeight:isToday?700:400 }}>{d}</div>
              {pnl!==undefined && <div style={{ fontFamily:G.fontData, fontSize:7, color:pnl>0?G.green:G.red, marginTop:1 }}>{pnl>0?'+':''}{pnl.toFixed(0)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SeguimientoClient({ trades }: { trades: Trade[] }) {
  const [tab, setTab] = useState<'resumen'|'instrumentos'|'horario'|'calendario'>('resumen');

  const wins = trades.filter(t=>t.res==='win');
  const losses = trades.filter(t=>t.res==='loss');
  const avgWin = wins.length ? wins.reduce((s,t)=>s+t.pnl,0)/wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s,t)=>s+t.pnl,0)/losses.length) : 0;
  const bestTrade = trades.length ? trades.reduce((b,t)=>t.pnl>b.pnl?t:b) : null;
  const worstTrade = trades.length ? trades.reduce((b,t)=>t.pnl<b.pnl?t:b) : null;
  const rr = avgLoss > 0 ? avgWin/avgLoss : 0;
  const firstTrade = [...trades].sort((a,b)=>a.date.localeCompare(b.date))[0];
  const daysSince = firstTrade ? Math.floor((Date.now()-new Date(firstTrade.date).getTime())/(1000*60*60*24)) : 0;
  const totalPnl = trades.reduce((s,t)=>s+t.pnl,0);
  const wr = trades.length ? Math.round(wins.length/trades.length*100) : 0;

  const byPair: Record<string,Trade[]> = {};
  trades.forEach(t=>{if(!byPair[t.pair])byPair[t.pair]=[];byPair[t.pair].push(t);});
  const maxPairPnl = Math.max(...Object.values(byPair).map(ts=>Math.abs(ts.reduce((s,t)=>s+t.pnl,0))),1);

  const TABS = [['resumen','Resumen'],['instrumentos','Instrumento'],['horario','Horario'],['calendario','Calendario']] as const;

  return (
    <div>
      <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${G.border}`, marginBottom:20 }}>
        {TABS.map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:'9px 16px', background:'none', border:'none', borderBottom:`2px solid ${tab===t?G.cyan:'transparent'}`, color:tab===t?G.cyan:G.muted, fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:G.fontUi, whiteSpace:'nowrap', marginBottom:-1, transition:'all 0.15s' }}>{l}</button>
        ))}
      </div>

      {/* RESUMEN */}
      {tab==='resumen'&&(
        <div>
          {firstTrade && (
            <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:12, padding:'16px 20px', marginBottom:14 }}>
              <div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:12 }}>TIEMPO DESDE LA PRIMERA OPERACIÓN</div>
              <div style={{ display:'flex', gap:28 }}>
                {[{v:String(daysSince),l:'días'},{v:String(trades.length),l:'operaciones'},{v:String(Math.floor(daysSince/7)),l:'semanas'},{v:String(Math.floor(daysSince/30)),l:'meses'}].map(s=>(
                  <div key={s.l}><div style={{ fontFamily:G.fontData, fontSize:30, fontWeight:800, color:G.text, lineHeight:1 }}>{s.v}</div><div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted, marginTop:4 }}>{s.l}</div></div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:14 }}>
            {[
              {l:'Mejor operación', v:bestTrade?`+${bestTrade.pnl.toFixed(2)}€`:'—', sub:bestTrade?.pair, c:G.green},
              {l:'Peor operación', v:worstTrade?`${worstTrade.pnl.toFixed(2)}€`:'—', sub:worstTrade?.pair, c:G.red},
              {l:'Riesgo / Recompensa', v:rr>0?`1 : ${rr.toFixed(2)}`:'—', sub:rr>=2?'Excelente ✓':rr>=1.5?'Bueno':rr>0?'Mejorable':'—', c:rr>=2?G.green:rr>=1.5?G.gold:G.red},
              {l:'Ganancia media', v:avgWin>0?`+${avgWin.toFixed(2)}€`:'—', sub:`${wins.length} wins`, c:G.green},
              {l:'Pérdida media', v:avgLoss>0?`-${avgLoss.toFixed(2)}€`:'—', sub:`${losses.length} losses`, c:G.red},
              {l:'Win Rate', v:trades.length?`${wr}%`:'—', sub:`${trades.length} trades`, c:wr>=50?G.green:G.red},
            ].map(s=>(
              <div key={s.l} style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:10, padding:'14px 16px', borderTop:`2px solid ${s.c}25` }}>
                <div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:7 }}>{s.l}</div>
                <div style={{ fontFamily:G.fontData, fontSize:21, fontWeight:700, color:s.c, lineHeight:1, marginBottom:4 }}>{s.v}</div>
                {s.sub&&<div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted }}>{s.sub}</div>}
              </div>
            ))}
          </div>
          <div style={{ background:`linear-gradient(135deg,${G.card},${G.card2})`, border:`1px solid ${totalPnl>=0?'rgba(0,230,118,0.2)':'rgba(255,51,102,0.2)'}`, borderRadius:12, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:totalPnl>=0?G.green:G.red }}/>
            <div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:8 }}>P&L ACUMULADO NETO</div>
            <div style={{ fontFamily:G.fontData, fontSize:38, fontWeight:900, color:totalPnl>=0?G.green:G.red }}>{totalPnl>=0?'+':''}{totalPnl.toFixed(2)}€</div>
          </div>
        </div>
      )}

      {/* POR INSTRUMENTO */}
      {tab==='instrumentos'&&(
        <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'11px 18px', borderBottom:`1px solid ${G.border}` }}>
            <div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted, letterSpacing:'0.15em', textTransform:'uppercase' }}>RESULTADOS POR INSTRUMENTO</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'90px 1fr 80px 60px 70px 65px', gap:8, padding:'7px 18px', background:G.surface }}>
            {['INSTRUMENTO','P&L VISUAL','P&L NETO','Nº OPS','TASA AC.','MEJOR'].map(h=><span key={h} style={{ fontFamily:G.fontData, fontSize:8, letterSpacing:'0.1em', color:G.muted, textTransform:'uppercase' }}>{h}</span>)}
          </div>
          {Object.entries(byPair).sort(([,a],[,b])=>b.reduce((s,t)=>s+t.pnl,0)-a.reduce((s,t)=>s+t.pnl,0)).map(([pair,ts])=>{
            const pnl=ts.reduce((s,t)=>s+t.pnl,0);
            const pairWr=Math.round(ts.filter(t=>t.res==='win').length/ts.length*100);
            const best=Math.max(...ts.map(t=>t.pnl));
            const barW=Math.abs(pnl)/maxPairPnl*100;
            return (
              <div key={pair} style={{ display:'grid', gridTemplateColumns:'90px 1fr 80px 60px 70px 65px', gap:8, padding:'12px 18px', borderBottom:`1px solid ${G.border}`, alignItems:'center', transition:'background 0.1s' }}
                onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=G.card2}
                onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                <span style={{ fontFamily:G.fontData, fontSize:12, fontWeight:700, color:G.cyan }}>{pair}</span>
                <div style={{ height:4, background:'rgba(255,255,255,0.04)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${barW}%`, background:pnl>=0?G.green:G.red, borderRadius:2 }}/>
                </div>
                <span style={{ fontFamily:G.fontData, fontSize:11, fontWeight:700, color:pnl>=0?G.green:G.red }}>{pnl>=0?'+':''}{pnl.toFixed(2)}€</span>
                <span style={{ fontFamily:G.fontData, fontSize:11, color:G.muted2 }}>{ts.length}</span>
                <span style={{ fontFamily:G.fontData, fontSize:11, color:pairWr>=50?G.green:G.red }}>{pairWr}%</span>
                <span style={{ fontFamily:G.fontData, fontSize:10, color:G.gold }}>+{best.toFixed(2)}</span>
              </div>
            );
          })}
          {Object.keys(byPair).length===0&&<div style={{ padding:'30px', textAlign:'center', color:G.muted, fontSize:12, fontFamily:G.fontUi }}>Sin operaciones registradas</div>}
        </div>
      )}

      {/* HORARIO */}
      {tab==='horario'&&(
        <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:12, padding:18 }}>
          <div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:16 }}>HEATMAP POR HORARIO Y DÍA</div>
          <Heatmap trades={trades}/>
          <div style={{ marginTop:16, background:G.card2, borderRadius:9, padding:'12px 14px', fontSize:12, color:G.muted2, fontFamily:G.fontUi, lineHeight:1.6 }}>
            El número en cada celda indica las operaciones realizadas en ese horario. El color indica si el resultado neto fue positivo (verde) o negativo (rojo). Más intenso = mayor impacto.
          </div>
        </div>
      )}

      {/* CALENDARIO */}
      {tab==='calendario'&&(
        <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:12, padding:18 }}>
          <CalendarioPnL trades={trades}/>
        </div>
      )}
    </div>
  );
}
