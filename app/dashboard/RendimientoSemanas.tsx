'use client';
import { useState } from 'react';

const G = {
  card:'#1a1a1a', card2:'#202020', surface:'#0f0f0f',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.1)',
  cyan:'#00ff88', green:'#00ff88', red:'#ff4444', gold:'#ffaa00',
  text:'#ffffff', muted:'#666666', muted2:'#aaaaaa',
  fontData:"'JetBrains Mono',monospace" as string,
  fontUi:"'Inter',sans-serif" as string,
};

type Trade = { date: string; pnl: number; res: string; };

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

type WeekData = {
  key: string; // "2026-W32"
  mesLabel: string;
  semanaNum: number;
  pnl: number;
  pct: number;
  trades: number;
  wins: number;
  fechaInicio: string;
  fechaFin: string;
};

type MonthData = {
  key: string; // "2026-08"
  label: string;
  pnl: number;
  pct: number;
  trades: number;
  wins: number;
  semanas: WeekData[];
};

export default function RendimientoSemanas({ trades, capitalInicial }: { trades: Trade[]; capitalInicial: number }) {
  const [vista, setVista] = useState<'meses' | 'semanas'>('meses');
  const [mesSeleccionado, setMesSeleccionado] = useState<string | null>(null);

  // Build weekly data
  const weekMap: Record<string, { trades: Trade[]; inicio: Date; fin: Date }> = {};
  trades.forEach(t => {
    const d = new Date(t.date);
    const year = d.getFullYear();
    const week = getWeekNumber(d);
    const key = `${year}-W${String(week).padStart(2,'0')}`;
    if (!weekMap[key]) {
      // Monday of this week
      const mon = new Date(d);
      mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      weekMap[key] = { trades: [], inicio: mon, fin: sun };
    }
    weekMap[key].trades.push(t);
  });

  // Build monthly data
  const monthMap: Record<string, Trade[]> = {};
  trades.forEach(t => {
    const key = t.date.slice(0, 7); // "2026-08"
    if (!monthMap[key]) monthMap[key] = [];
    monthMap[key].push(t);
  });

  const meses: MonthData[] = Object.entries(monthMap).sort(([a],[b])=>a.localeCompare(b)).map(([key, ts]) => {
    const [year, month] = key.split('-');
    const label = new Date(parseInt(year), parseInt(month)-1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const pnl = ts.reduce((s,t)=>s+t.pnl,0);
    const wins = ts.filter(t=>t.res==='win').length;
    // Semanas de este mes
    const semanasDelMes = Object.entries(weekMap)
      .filter(([,w]) => {
        const wMonth = `${w.inicio.getFullYear()}-${String(w.inicio.getMonth()+1).padStart(2,'0')}`;
        return wMonth === key;
      })
      .map(([wkey, w]) => {
        const wpnl = w.trades.reduce((s,t)=>s+t.pnl,0);
        const wwins = w.trades.filter(t=>t.res==='win').length;
        const semNum = parseInt(wkey.split('W')[1]);
        return {
          key: wkey,
          mesLabel: label,
          semanaNum: semNum,
          pnl: wpnl,
          pct: capitalInicial > 0 ? wpnl/capitalInicial*100 : 0,
          trades: w.trades.length,
          wins: wwins,
          fechaInicio: w.inicio.toLocaleDateString('es-ES',{day:'2-digit',month:'short'}),
          fechaFin: w.fin.toLocaleDateString('es-ES',{day:'2-digit',month:'short'}),
        };
      }).sort((a,b)=>a.semanaNum-b.semanaNum);

    return {
      key, label: label.charAt(0).toUpperCase()+label.slice(1),
      pnl, pct: capitalInicial > 0 ? pnl/capitalInicial*100 : 0,
      trades: ts.length, wins, semanas: semanasDelMes,
    };
  });

  const mejorMes = meses.length ? meses.reduce((b,m)=>m.pnl>b.pnl?m:b) : null;
  const peorMes = meses.length ? meses.reduce((b,m)=>m.pnl<b.pnl?m:b) : null;
  const mediaMsg = meses.length ? meses.reduce((s,m)=>s+m.pnl,0)/meses.length : 0;

  const todasSemanas = Object.entries(weekMap).sort(([a],[b])=>a.localeCompare(b)).map(([key,w])=>{
    const wpnl = w.trades.reduce((s,t)=>s+t.pnl,0);
    const wwins = w.trades.filter(t=>t.res==='win').length;
    const d = w.inicio;
    const mesLabel = d.toLocaleDateString('es-ES',{month:'short',year:'numeric'});
    return {
      key, mesLabel, semanaNum: parseInt(key.split('W')[1]),
      pnl: wpnl, pct: capitalInicial>0?wpnl/capitalInicial*100:0,
      trades: w.trades.length, wins: wwins,
      fechaInicio: w.inicio.toLocaleDateString('es-ES',{day:'2-digit',month:'short'}),
      fechaFin: w.fin.toLocaleDateString('es-ES',{day:'2-digit',month:'short'}),
    };
  });

  const mejorSemana = todasSemanas.length ? todasSemanas.reduce((b,s)=>s.pnl>b.pnl?s:b) : null;

  function WeekRow({ s, showMes }: { s: WeekData; showMes?: boolean }) {
    const wr = s.trades > 0 ? Math.round(s.wins/s.trades*100) : 0;
    const maxPnl = Math.max(...todasSemanas.map(w=>Math.abs(w.pnl)),1);
    const barW = Math.min(Math.abs(s.pnl)/maxPnl*100,100);
    return (
      <div style={{ display:'grid', gridTemplateColumns: showMes?'90px 120px 1fr 80px 60px 70px 55px':'120px 1fr 80px 60px 70px 55px', gap:8, padding:'11px 16px', borderBottom:`1px solid ${G.border}`, alignItems:'center', transition:'background 0.1s' }}
        onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=G.card2}
        onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
        {showMes && <span style={{ fontFamily:G.fontData, fontSize:10, color:G.muted }}>{s.mesLabel}</span>}
        <div>
          <div style={{ fontFamily:G.fontData, fontSize:11, color:G.text, fontWeight:600 }}>Sem {s.semanaNum}</div>
          <div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted, marginTop:2 }}>{s.fechaInicio} – {s.fechaFin}</div>
        </div>
        <div style={{ height:4, background:'rgba(255,255,255,0.04)', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${barW}%`, background:s.pnl>=0?G.green:G.red, borderRadius:2, transition:'width 0.6s ease' }}/>
        </div>
        <span style={{ fontFamily:G.fontData, fontSize:12, fontWeight:700, color:s.pnl>=0?G.green:G.red, textAlign:'right' }}>{s.pnl>=0?'+':''}{s.pnl.toFixed(2)}€</span>
        <span style={{ fontFamily:G.fontData, fontSize:11, color:s.pct>=0?G.green:G.red, textAlign:'right' }}>{s.pct>=0?'+':''}{s.pct.toFixed(2)}%</span>
        <span style={{ fontFamily:G.fontData, fontSize:10, color:wr>=50?G.green:G.red, textAlign:'center' }}>{s.trades>0?`${wr}%`:'-'}</span>
        <span style={{ fontFamily:G.fontData, fontSize:10, color:G.muted, textAlign:'right' }}>{s.trades} ops</span>
      </div>
    );
  }

  return (
    <div>
      {/* Summary stats */}
      {meses.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
          {[
            { l:'Mejor mes', v:mejorMes?`+${mejorMes.pnl.toFixed(2)}€`:'—', sub:mejorMes?.label, c:G.green },
            { l:'Media mensual', v:mediaMsg>0?`+${mediaMsg.toFixed(2)}€`:mediaMsg<0?`${mediaMsg.toFixed(2)}€`:'—', sub:`${meses.length} meses`, c:mediaMsg>=0?G.green:G.red },
            { l:'Peor mes', v:peorMes?`${peorMes.pnl.toFixed(2)}€`:'—', sub:peorMes?.label, c:G.red },
          ].map(s=>(
            <div key={s.l} style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:10, padding:'12px 14px', borderTop:`2px solid ${s.c}30` }}>
              <div style={{ fontFamily:G.fontData, fontSize:8, color:G.muted, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:6 }}>{s.l}</div>
              <div style={{ fontFamily:G.fontData, fontSize:18, fontWeight:700, color:s.c }}>{s.v}</div>
              <div style={{ fontFamily:G.fontUi, fontSize:10, color:G.muted, marginTop:3 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Vista tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:`1px solid ${G.border}`, marginBottom:16 }}>
        {([['meses','Por mes'],['semanas','Todas las semanas']] as const).map(([v,l])=>(
          <button key={v} onClick={()=>{setVista(v);setMesSeleccionado(null);}} style={{ padding:'8px 16px', background:'none', border:'none', borderBottom:`2px solid ${vista===v?G.cyan:'transparent'}`, color:vista===v?G.cyan:G.muted, fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:G.fontUi, marginBottom:-1, transition:'all 0.15s' }}>{l}</button>
        ))}
      </div>

      {/* VISTA MESES */}
      {vista==='meses'&&(
        <div>
          {meses.length===0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:G.muted, fontFamily:G.fontUi, fontSize:13 }}>Sin operaciones registradas aún</div>
          ) : (
            meses.map(mes=>(
              <div key={mes.key} style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:12, overflow:'hidden', marginBottom:10 }}>
                {/* Month header */}
                <div onClick={()=>setMesSeleccionado(mesSeleccionado===mes.key?null:mes.key)}
                  style={{ display:'grid', gridTemplateColumns:'1fr 100px 80px 70px 60px 36px', gap:8, padding:'13px 16px', cursor:'pointer', alignItems:'center', background:mesSeleccionado===mes.key?G.card2:'transparent', transition:'background 0.1s', borderBottom:mesSeleccionado===mes.key?`1px solid ${G.border}`:'none' }}>
                  <div>
                    <div style={{ fontFamily:G.fontUi, fontSize:14, fontWeight:700, color:G.text }}>{mes.label}</div>
                    <div style={{ fontFamily:G.fontData, fontSize:9, color:G.muted, marginTop:2 }}>{mes.trades} operaciones · {mes.semanas.length} semanas</div>
                  </div>
                  <div style={{ height:4, background:'rgba(255,255,255,0.04)', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.min(Math.abs(mes.pct)*3,100)}%`, background:mes.pnl>=0?G.green:G.red, borderRadius:2 }}/>
                  </div>
                  <span style={{ fontFamily:G.fontData, fontSize:14, fontWeight:700, color:mes.pnl>=0?G.green:G.red }}>{mes.pnl>=0?'+':''}{mes.pnl.toFixed(2)}€</span>
                  <span style={{ fontFamily:G.fontData, fontSize:12, color:mes.pct>=0?G.green:G.red }}>{mes.pct>=0?'+':''}{mes.pct.toFixed(2)}%</span>
                  <span style={{ fontFamily:G.fontData, fontSize:11, color:G.muted }}>{mes.trades>0?Math.round(mes.wins/mes.trades*100)+'%':'-'}</span>
                  <span style={{ fontFamily:G.fontData, fontSize:12, color:G.muted }}>{mesSeleccionado===mes.key?'▲':'▼'}</span>
                </div>
                {/* Semanas del mes */}
                {mesSeleccionado===mes.key&&(
                  <div>
                    <div style={{ display:'grid', gridTemplateColumns:'120px 1fr 80px 60px 70px 55px', gap:8, padding:'7px 16px', background:G.surface }}>
                      {['SEMANA','P&L VISUAL','P&L','%','WIN%','OPS'].map(h=>(
                        <span key={h} style={{ fontFamily:G.fontData, fontSize:8, color:G.muted, letterSpacing:'0.1em', textTransform:'uppercase' }}>{h}</span>
                      ))}
                    </div>
                    {mes.semanas.length===0 ? (
                      <div style={{ padding:'16px', color:G.muted, fontSize:12, fontFamily:G.fontUi }}>Sin semanas completas este mes</div>
                    ) : (
                      mes.semanas.map(s=><WeekRow key={s.key} s={s}/>)
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* VISTA TODAS LAS SEMANAS */}
      {vista==='semanas'&&(
        <div style={{ background:G.card, border:`1px solid ${G.border}`, borderRadius:12, overflow:'hidden' }}>
          {todasSemanas.length===0 ? (
            <div style={{ padding:'40px', textAlign:'center', color:G.muted, fontFamily:G.fontUi, fontSize:13 }}>Sin operaciones registradas aún</div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'90px 120px 1fr 80px 60px 70px 55px', gap:8, padding:'7px 16px', background:G.surface }}>
                {['MES','SEMANA','P&L VISUAL','P&L','%','WIN%','OPS'].map(h=>(
                  <span key={h} style={{ fontFamily:G.fontData, fontSize:8, color:G.muted, letterSpacing:'0.1em', textTransform:'uppercase' }}>{h}</span>
                ))}
              </div>
              {todasSemanas.map(s=><WeekRow key={s.key} s={s} showMes/>)}
              {mejorSemana && (
                <div style={{ padding:'10px 16px', background:`${G.green}08`, borderTop:`1px solid ${G.border}`, fontFamily:G.fontData, fontSize:10, color:G.green }}>
                  🏆 Mejor semana: Sem {mejorSemana.semanaNum} — +{mejorSemana.pnl.toFixed(2)}€ ({mejorSemana.pct.toFixed(2)}%)
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
