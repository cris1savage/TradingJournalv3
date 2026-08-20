'use client';
import { useState, useEffect, useCallback } from 'react';

const P = {
  bg: '#070d17', surface: '#0c1420', card: '#101c2e', card2: '#152338',
  border: 'rgba(60,120,200,0.15)', border2: 'rgba(60,120,200,0.3)',
  accent: '#2d7dd2', accentLight: '#4a9eff',
  green: '#00c896', red: '#e53e5a', gold: '#f0b429', cyan: '#00d4ff',
  text: '#d8e8f8', muted: '#4a6a8a', muted2: '#7a9ab8', white: '#f0f8ff',
};

type Posicion = { id: number; activo: string; simbolo: string; cantidad: number; precioCompra: number; precioActual: number; fecha: string; };
type Cartera = { id: string; nombre: string; tipo: string; color: string; posiciones: Posicion[]; };
type Aportacion = { id: number; nombre: string; importe: number; dia: number; activo: string; };
type PatrimonioData = { carteras: Cartera[]; aportaciones: Aportacion[]; };

const CRIPTO_IDS: Record<string, string> = {
  'BTC':'bitcoin','ETH':'ethereum','SOL':'solana','BNB':'binancecoin',
  'ADA':'cardano','XRP':'ripple','MATIC':'matic-network','AVAX':'avalanche-2',
};

const fmtE = (n: number) => n.toFixed(2) + '€';
const fmtPct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
const fmtN = (n: number) => n >= 1 ? n.toFixed(4) : n.toFixed(6);
const inp: React.CSSProperties = { background: '#0c1420', border: `1px solid rgba(60,120,200,0.2)`, borderRadius: 8, padding: '10px 12px', color: '#d8e8f8', fontFamily: 'Outfit, sans-serif', fontSize: 14, width: '100%', outline: 'none' };
const lbl: React.CSSProperties = { fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4a6a8a', display: 'block', marginBottom: 6 };

export default function PatrimonioClient({ tradingBalance }: { tradingBalance: number }) {
  const [data, setData] = useState<PatrimonioData>({ carteras: [], aportaciones: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'overview' | 'add-posicion' | 'add-aportacion'>('overview');
  const [selectedCartera, setSelectedCartera] = useState<string | null>(null);

  // Form: nueva posición
  const [pSimbolo, setPSimbolo] = useState('BTC');
  const [pActivo, setPActivo] = useState('Bitcoin');
  const [pCantidad, setPCantidad] = useState('');
  const [pPrecio, setPPrecio] = useState('');
  const [pFecha, setPFecha] = useState(new Date().toISOString().split('T')[0]);

  // Form: nueva aportación
  const [aNombre, setANombre] = useState('');
  const [aImporte, setAImporte] = useState('');
  const [aDia, setADia] = useState('1');
  const [aActivo, setAActivo] = useState('BTC');

  // Form: nueva cartera (inline)
  const [showNewCartera, setShowNewCartera] = useState(false);
  const [cNombre, setCNombre] = useState('');
  const [cTipo, setCTipo] = useState('cripto');

  const COLORES: Record<string, string> = { cripto: P.gold, acciones: P.accentLight, etf: P.green, otro: P.muted2 };
  const ICONS: Record<string, string> = { cripto: '₿', acciones: '📈', etf: '🏦', otro: '◈' };

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/patrimonio');
    if (r.ok) setData(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Ensure default BTC cartera exists
  useEffect(() => {
    if (!loading && data.carteras.length === 0) {
      fetch('/api/patrimonio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addCartera', nombre: 'Cripto', tipo: 'cripto', color: P.gold }) }).then(load);
    }
    if (!loading && data.carteras.length > 0 && !selectedCartera) setSelectedCartera(data.carteras[0].id);
  }, [loading, data.carteras.length]);

  async function refreshPrices() {
    setRefreshing(true);
    try {
      const syms = new Set<string>();
      data.carteras.forEach(c => c.posiciones.forEach(p => { if (CRIPTO_IDS[p.simbolo]) syms.add(p.simbolo); }));
      if (!syms.size) { setRefreshing(false); return; }
      const ids = [...syms].map(s => CRIPTO_IDS[s]).join(',');
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur`);
      if (!r.ok) throw new Error();
      const prices = await r.json();
      const precios = [...syms].map(s => ({ simbolo: s, precio: prices[CRIPTO_IDS[s]]?.eur || 0 })).filter(p => p.precio > 0);
      if (precios.length) {
        await fetch('/api/patrimonio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updatePrecios', precios }) });
        await load();
      }
    } catch { alert('Error actualizando precios'); }
    setRefreshing(false);
  }

  async function addCartera() {
    if (!cNombre.trim()) return;
    await fetch('/api/patrimonio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addCartera', nombre: cNombre, tipo: cTipo, color: COLORES[cTipo] }) });
    setCNombre(''); setShowNewCartera(false); await load();
  }

  async function addPosicion() {
    if (!selectedCartera || !pCantidad || !pPrecio) { alert('Rellena cantidad y precio'); return; }
    await fetch('/api/patrimonio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addPosicion', carteraId: selectedCartera, activo: pActivo, simbolo: pSimbolo, cantidad: parseFloat(pCantidad), precioCompra: parseFloat(pPrecio), precioActual: parseFloat(pPrecio), fecha: pFecha, notas: '' }) });
    setPCantidad(''); setPPrecio(''); setView('overview'); await load();
  }

  async function deletePosicion(carteraId: string, posicionId: number) {
    if (!confirm('¿Eliminar posición?')) return;
    await fetch('/api/patrimonio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deletePosicion', carteraId, posicionId }) });
    await load();
  }

  async function addAportacion() {
    if (!aNombre || !aImporte) { alert('Rellena nombre e importe'); return; }
    await fetch('/api/patrimonio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addAportacion', nombre: aNombre, importe: parseFloat(aImporte), dia: parseInt(aDia), cartera: '', activo: aActivo }) });
    setANombre(''); setAImporte(''); setView('overview'); await load();
  }

  async function deleteAportacion(id: number) {
    await fetch('/api/patrimonio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteAportacion', id }) });
    await load();
  }

  const totalInv = data.carteras.reduce((s,c)=>s+c.posiciones.reduce((s2,p)=>s2+p.cantidad*p.precioActual,0),0);
  const totalCost = data.carteras.reduce((s,c)=>s+c.posiciones.reduce((s2,p)=>s2+p.cantidad*p.precioCompra,0),0);
  const pnlInv = totalInv - totalCost;
  const patrimonioTotal = tradingBalance + totalInv;
  const today = new Date().getDate();
  const todayAlert = data.aportaciones.filter(a => a.dia === today);
  const carteraActual = data.carteras.find(c => c.id === selectedCartera);

  if (loading) return <div style={{textAlign:'center',padding:'60px',color:P.muted}}>Cargando...</div>;

  // ── ADD POSICION VIEW ──
  if (view === 'add-posicion') return (
    <div style={{maxWidth:440}}>
      <button onClick={()=>setView('overview')} style={{background:'none',border:'none',color:P.muted2,cursor:'pointer',fontSize:13,marginBottom:16,fontFamily:'Outfit,sans-serif',display:'flex',alignItems:'center',gap:6}}>← Volver</button>
      <div style={{fontSize:18,fontWeight:700,marginBottom:20}}>Añadir posición a <span style={{color:P.gold}}>{carteraActual?.nombre}</span></div>

      <div style={{marginBottom:12}}>
        <label style={lbl}>ACTIVO RÁPIDO</label>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {[['BTC','Bitcoin'],['ETH','Ethereum'],['SOL','Solana'],['BNB','BNB'],['ADA','Cardano']].map(([s,n])=>(
            <button key={s} onClick={()=>{setPSimbolo(s);setPActivo(n);}} style={{padding:'6px 12px',borderRadius:7,border:`1px solid ${pSimbolo===s?P.gold:P.border}`,background:pSimbolo===s?`${P.gold}20`:'transparent',color:pSimbolo===s?P.gold:P.muted2,fontSize:12,cursor:'pointer',fontFamily:'monospace',fontWeight:700}}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
        <div><label style={lbl}>SÍMBOLO</label><input value={pSimbolo} onChange={e=>setPSimbolo(e.target.value.toUpperCase())} style={inp}/></div>
        <div><label style={lbl}>NOMBRE</label><input value={pActivo} onChange={e=>setPActivo(e.target.value)} style={inp}/></div>
        <div><label style={lbl}>CANTIDAD</label><input type="number" value={pCantidad} onChange={e=>setPCantidad(e.target.value)} placeholder="0.005" style={inp}/></div>
        <div><label style={lbl}>PRECIO COMPRA (€)</label><input type="number" value={pPrecio} onChange={e=>setPPrecio(e.target.value)} placeholder="0.00" style={inp}/></div>
        <div style={{gridColumn:'1/-1'}}><label style={lbl}>FECHA</label><input type="date" value={pFecha} onChange={e=>setPFecha(e.target.value)} style={inp}/></div>
      </div>

      {pCantidad && pPrecio && (
        <div style={{background:P.card2,borderRadius:9,padding:'12px 16px',marginBottom:14,border:`1px solid ${P.border}`}}>
          <span style={{fontFamily:'monospace',fontSize:13,color:P.muted2}}>Total invertido: </span>
          <span style={{fontFamily:'monospace',fontSize:15,fontWeight:700,color:P.accentLight}}>{fmtE(parseFloat(pCantidad||'0')*parseFloat(pPrecio||'0'))}</span>
        </div>
      )}

      <button onClick={addPosicion} style={{width:'100%',padding:13,background:`linear-gradient(135deg,${P.accent},${P.accentLight})`,border:'none',borderRadius:10,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Outfit,sans-serif'}}>
        Añadir posición
      </button>
    </div>
  );

  // ── ADD APORTACION VIEW ──
  if (view === 'add-aportacion') return (
    <div style={{maxWidth:400}}>
      <button onClick={()=>setView('overview')} style={{background:'none',border:'none',color:P.muted2,cursor:'pointer',fontSize:13,marginBottom:16,fontFamily:'Outfit,sans-serif',display:'flex',alignItems:'center',gap:6}}>← Volver</button>
      <div style={{fontSize:18,fontWeight:700,marginBottom:20}}>Nueva aportación programada</div>
      <div style={{marginBottom:10}}><label style={lbl}>NOMBRE</label><input value={aNombre} onChange={e=>setANombre(e.target.value)} placeholder="Compra mensual BTC" style={inp}/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
        <div><label style={lbl}>IMPORTE (€)</label><input type="number" value={aImporte} onChange={e=>setAImporte(e.target.value)} placeholder="200.00" style={inp}/></div>
        <div><label style={lbl}>DÍA DEL MES</label>
          <select value={aDia} onChange={e=>setADia(e.target.value)} style={inp}>
            {Array.from({length:28},(_,i)=>i+1).map(d=><option key={d} value={d}>Día {d}</option>)}
          </select>
        </div>
        <div style={{gridColumn:'1/-1'}}><label style={lbl}>ACTIVO (opcional)</label><input value={aActivo} onChange={e=>setAActivo(e.target.value)} placeholder="BTC, ETH..." style={inp}/></div>
      </div>
      <button onClick={addAportacion} style={{width:'100%',padding:13,background:`linear-gradient(135deg,${P.accent},${P.accentLight})`,border:'none',borderRadius:10,color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Outfit,sans-serif'}}>
        Programar recordatorio
      </button>
    </div>
  );

  // ── MAIN OVERVIEW ──
  return (
    <div>
      {/* Today alert */}
      {todayAlert.length > 0 && (
        <div style={{background:`${P.gold}12`,border:`1px solid ${P.gold}40`,borderRadius:12,padding:'14px 18px',marginBottom:18,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:22}}>🔔</span>
          <div>
            <div style={{fontWeight:700,color:P.gold,marginBottom:2}}>Hoy toca aportación programada</div>
            {todayAlert.map(a=><div key={a.id} style={{fontSize:12,color:P.muted2}}>{a.nombre} — <strong style={{color:P.white}}>{fmtE(a.importe)}</strong>{a.activo?` en ${a.activo}`:''}</div>)}
          </div>
        </div>
      )}

      {/* PATRIMONIO TOTAL */}
      <div style={{background:`linear-gradient(135deg,${P.surface},${P.card})`,border:`1px solid ${P.border2}`,borderRadius:14,padding:'22px 24px',marginBottom:14,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${P.accent},${P.accentLight},${P.cyan})`}}/>
        <div style={{fontFamily:'monospace',fontSize:8,color:P.muted,letterSpacing:'0.2em',marginBottom:6,textTransform:'uppercase'}}>PATRIMONIO NETO TOTAL</div>
        <div style={{fontFamily:'monospace',fontSize:36,fontWeight:900,color:P.white,lineHeight:1,marginBottom:14}}>{fmtE(patrimonioTotal)}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
          {[
            {l:'Trading',v:fmtE(tradingBalance),c:P.accentLight},
            {l:'Inversiones',v:fmtE(totalInv),c:P.gold},
            {l:'P&L inversiones',v:(pnlInv>=0?'+':'')+fmtE(pnlInv),c:pnlInv>=0?P.green:P.red},
          ].map(s=>(
            <div key={s.l}>
              <div style={{fontSize:9,color:P.muted,fontFamily:'monospace',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:4}}>{s.l}</div>
              <div style={{fontFamily:'monospace',fontSize:16,fontWeight:700,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>
        {patrimonioTotal > 0 && (
          <div style={{marginTop:14,height:4,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden',display:'flex'}}>
            <div style={{height:'100%',width:`${tradingBalance/patrimonioTotal*100}%`,background:P.accentLight}}/>
            <div style={{height:'100%',width:`${totalInv/patrimonioTotal*100}%`,background:P.gold}}/>
          </div>
        )}
        <div style={{display:'flex',gap:16,marginTop:8}}>
          <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:8,height:8,borderRadius:2,background:P.accentLight}}/><span style={{fontSize:10,color:P.muted}}>Trading {patrimonioTotal>0?(tradingBalance/patrimonioTotal*100).toFixed(0):0}%</span></div>
          <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:8,height:8,borderRadius:2,background:P.gold}}/><span style={{fontSize:10,color:P.muted}}>Inversiones {patrimonioTotal>0?(totalInv/patrimonioTotal*100).toFixed(0):0}%</span></div>
        </div>
      </div>

      {/* CARTERAS */}
      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:14,overflow:'hidden',marginBottom:14}}>
        {/* Header */}
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${P.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:13,fontWeight:700}}>Mis Carteras</div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={refreshPrices} disabled={refreshing} style={{padding:'6px 12px',background:P.card2,border:`1px solid ${P.border}`,borderRadius:7,color:P.muted2,fontSize:11,cursor:'pointer',fontFamily:'monospace',letterSpacing:'0.05em'}}>
              {refreshing?'⟳ ...':'↻ Precios'}
            </button>
          </div>
        </div>

        {/* Cartera selector tabs */}
        <div style={{display:'flex',gap:0,borderBottom:`1px solid ${P.border}`,overflowX:'auto'}}>
          {data.carteras.map(c=>{
            const val=c.posiciones.reduce((s,p)=>s+p.cantidad*p.precioActual,0);
            const cost=c.posiciones.reduce((s,p)=>s+p.cantidad*p.precioCompra,0);
            const pnl=val-cost;
            return(
              <button key={c.id} onClick={()=>setSelectedCartera(c.id)} style={{padding:'10px 18px',background:'none',border:'none',borderBottom:`2px solid ${selectedCartera===c.id?c.color:'transparent'}`,color:selectedCartera===c.id?c.color:P.muted,fontSize:12,fontWeight:selectedCartera===c.id?700:400,cursor:'pointer',fontFamily:'Outfit,sans-serif',whiteSpace:'nowrap',transition:'all 0.15s',flexShrink:0}}>
                {ICONS[c.tipo]||'◈'} {c.nombre}
                <span style={{marginLeft:8,fontFamily:'monospace',fontSize:10,color:pnl>=0?P.green:P.red}}>{fmtE(val)}</span>
              </button>
            );
          })}
          <button onClick={()=>setShowNewCartera(!showNewCartera)} style={{padding:'10px 14px',background:'none',border:'none',borderBottom:'2px solid transparent',color:P.muted,fontSize:12,cursor:'pointer',fontFamily:'Outfit,sans-serif',whiteSpace:'nowrap',flexShrink:0}}>+ Cartera</button>
        </div>

        {/* New cartera inline */}
        {showNewCartera && (
          <div style={{padding:'14px 18px',background:P.card2,borderBottom:`1px solid ${P.border}`,display:'flex',gap:8,alignItems:'flex-end',flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:140}}>
              <label style={lbl}>NOMBRE</label>
              <input value={cNombre} onChange={e=>setCNombre(e.target.value)} placeholder="Mi cartera" style={inp}/>
            </div>
            <div>
              <label style={lbl}>TIPO</label>
              <select value={cTipo} onChange={e=>setCTipo(e.target.value)} style={{...inp,width:'auto'}}>
                <option value="cripto">₿ Cripto</option>
                <option value="acciones">📈 Acciones</option>
                <option value="etf">🏦 ETFs</option>
                <option value="otro">◈ Otro</option>
              </select>
            </div>
            <button onClick={addCartera} style={{padding:'10px 16px',background:`linear-gradient(135deg,${P.accent},${P.accentLight})`,border:'none',borderRadius:8,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'Outfit,sans-serif',whiteSpace:'nowrap'}}>Crear</button>
            <button onClick={()=>setShowNewCartera(false)} style={{padding:'10px 12px',background:'transparent',border:`1px solid ${P.border}`,borderRadius:8,color:P.muted,fontSize:12,cursor:'pointer'}}>✕</button>
          </div>
        )}

        {/* Posiciones de la cartera seleccionada */}
        {carteraActual && (
          <>
            {carteraActual.posiciones.length === 0 ? (
              <div style={{padding:'32px',textAlign:'center',color:P.muted}}>
                <div style={{fontSize:32,marginBottom:8}}>📭</div>
                <div style={{fontSize:13,marginBottom:12}}>Sin posiciones en {carteraActual.nombre}</div>
                <button onClick={()=>setView('add-posicion')} style={{padding:'9px 18px',background:`${P.accent}20`,border:`1px solid ${P.accent}`,borderRadius:8,color:P.accentLight,fontSize:12,cursor:'pointer',fontFamily:'Outfit,sans-serif'}}>+ Añadir primera posición</button>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div style={{display:'grid',gridTemplateColumns:'64px 1fr 90px 90px 90px 80px 32px',gap:8,padding:'8px 18px',background:P.bg}}>
                  {['','ACTIVO','CANTIDAD','COMPRA','ACTUAL','P&L',''].map((h,i)=><span key={i} style={{fontFamily:'monospace',fontSize:8,letterSpacing:'0.1em',color:P.muted,textTransform:'uppercase'}}>{h}</span>)}
                </div>
                {carteraActual.posiciones.map(p=>{
                  const val=p.cantidad*p.precioActual, cost=p.cantidad*p.precioCompra, pnl=val-cost, pct=cost>0?pnl/cost*100:0;
                  return(
                    <div key={p.id} style={{display:'grid',gridTemplateColumns:'64px 1fr 90px 90px 90px 80px 32px',gap:8,padding:'12px 18px',borderBottom:`1px solid ${P.border}`,alignItems:'center',transition:'background 0.1s'}}
                      onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=P.card2}
                      onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                      <div style={{background:`${carteraActual.color}18`,border:`1px solid ${carteraActual.color}30`,borderRadius:6,padding:'4px 6px',textAlign:'center',fontFamily:'monospace',fontSize:10,fontWeight:700,color:carteraActual.color}}>{p.simbolo}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{p.activo}</div>
                        <div style={{fontSize:10,color:P.muted}}>{p.fecha}</div>
                      </div>
                      <div style={{fontFamily:'monospace',fontSize:11,color:P.text}}>{fmtN(p.cantidad)}</div>
                      <div style={{fontFamily:'monospace',fontSize:11,color:P.muted2}}>{fmtE(p.precioCompra)}</div>
                      <div style={{fontFamily:'monospace',fontSize:11,color:P.text}}>{fmtE(p.precioActual)}</div>
                      <div>
                        <div style={{fontFamily:'monospace',fontSize:11,fontWeight:700,color:pnl>=0?P.green:P.red}}>{pnl>=0?'+':''}{fmtE(pnl)}</div>
                        <div style={{fontFamily:'monospace',fontSize:9,color:pct>=0?P.green:P.red}}>{fmtPct(pct)}</div>
                      </div>
                      <button onClick={()=>deletePosicion(carteraActual.id,p.id)} style={{width:28,height:28,borderRadius:6,background:`${P.red}15`,border:`1px solid ${P.red}40`,color:P.red,cursor:'pointer',fontSize:12}}>✕</button>
                    </div>
                  );
                })}
                {/* Totals row */}
                {(()=>{ const v=carteraActual.posiciones.reduce((s,p)=>s+p.cantidad*p.precioActual,0), co=carteraActual.posiciones.reduce((s,p)=>s+p.cantidad*p.precioCompra,0), pnl=v-co, pct=co>0?pnl/co*100:0;
                  return <div style={{display:'grid',gridTemplateColumns:'64px 1fr 90px 90px 90px 80px 32px',gap:8,padding:'10px 18px',background:P.card2}}>
                    <span/><span style={{fontSize:11,fontWeight:600,color:P.muted2,fontFamily:'monospace'}}>TOTAL</span><span/>
                    <span style={{fontFamily:'monospace',fontSize:11,color:P.muted2}}>{fmtE(co)}</span>
                    <span style={{fontFamily:'monospace',fontSize:11,color:P.text}}>{fmtE(v)}</span>
                    <div><div style={{fontFamily:'monospace',fontSize:11,fontWeight:700,color:pnl>=0?P.green:P.red}}>{pnl>=0?'+':''}{fmtE(pnl)}</div><div style={{fontFamily:'monospace',fontSize:9,color:pct>=0?P.green:P.red}}>{fmtPct(pct)}</div></div>
                    <span/>
                  </div>;
                })()}
                <div style={{padding:'12px 18px'}}>
                  <button onClick={()=>setView('add-posicion')} style={{padding:'8px 16px',background:`${P.accent}18`,border:`1px solid ${P.accent}40`,borderRadius:8,color:P.accentLight,fontSize:12,cursor:'pointer',fontFamily:'Outfit,sans-serif',fontWeight:600}}>+ Añadir posición a {carteraActual.nombre}</button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* APORTACIONES PROGRAMADAS */}
      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:14,overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${P.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:13,fontWeight:700}}>📅 Aportaciones Programadas</div>
            <div style={{fontSize:11,color:P.muted,marginTop:2}}>Recordatorios mensuales automáticos</div>
          </div>
          <button onClick={()=>setView('add-aportacion')} style={{padding:'7px 14px',background:`${P.accent}18`,border:`1px solid ${P.accent}40`,borderRadius:8,color:P.accentLight,fontSize:11,cursor:'pointer',fontFamily:'Outfit,sans-serif',fontWeight:600}}>+ Nueva</button>
        </div>
        {data.aportaciones.length === 0 ? (
          <div style={{padding:'24px',textAlign:'center',color:P.muted}}>
            <div style={{fontSize:12,marginBottom:8}}>Sin recordatorios configurados</div>
            <button onClick={()=>setView('add-aportacion')} style={{padding:'7px 14px',background:`${P.accent}15`,border:`1px solid ${P.accent}`,borderRadius:7,color:P.accentLight,fontSize:11,cursor:'pointer',fontFamily:'Outfit,sans-serif'}}>Crear recordatorio mensual →</button>
          </div>
        ):(
          <div>
            {data.aportaciones.map(a=>{
              const isToday = a.dia===today;
              const daysUntil = (()=>{const now=new Date(),t=new Date(now.getFullYear(),now.getMonth(),a.dia);if(t<now)t.setMonth(t.getMonth()+1);return Math.ceil((t.getTime()-now.getTime())/(1000*60*60*24));})();
              return(
                <div key={a.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 18px',borderBottom:`1px solid ${P.border}`,background:isToday?`${P.gold}08`:'transparent'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:36,height:36,borderRadius:8,background:isToday?`${P.gold}20`:`${P.accent}12`,border:`1px solid ${isToday?`${P.gold}40`:`${P.accent}25`}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                      <div style={{fontFamily:'monospace',fontSize:14,fontWeight:900,color:isToday?P.gold:P.accentLight,lineHeight:1}}>{a.dia}</div>
                    </div>
                    <div>
                      <div style={{fontSize:12,fontWeight:600}}>{a.nombre}</div>
                      <div style={{fontSize:10,color:isToday?P.gold:P.muted}}>{isToday?'🔔 HOY':`En ${daysUntil} días`}{a.activo?` · ${a.activo}`:''}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{fontFamily:'monospace',fontSize:16,fontWeight:700,color:P.green}}>+{fmtE(a.importe)}</div>
                    <button onClick={()=>deleteAportacion(a.id)} style={{width:26,height:26,borderRadius:6,background:`${P.red}15`,border:`1px solid ${P.red}40`,color:P.red,cursor:'pointer',fontSize:11}}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
