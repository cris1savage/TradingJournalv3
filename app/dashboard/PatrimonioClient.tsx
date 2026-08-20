'use client';
import { useState, useEffect, useCallback } from 'react';

// Institutional color palette — more serious, Bloomberg-style
const P = {
  bg: '#070d17',
  surface: '#0c1420',
  card: '#101c2e',
  card2: '#152338',
  border: 'rgba(60,120,200,0.15)',
  border2: 'rgba(60,120,200,0.3)',
  accent: '#2d7dd2',
  accentLight: '#4a9eff',
  green: '#00c896',
  red: '#e53e5a',
  gold: '#f0b429',
  cyan: '#00d4ff',
  purple: '#8b5cf6',
  text: '#d8e8f8',
  muted: '#4a6a8a',
  muted2: '#7a9ab8',
  white: '#f0f8ff',
};

type Posicion = { id: number; activo: string; simbolo: string; cantidad: number; precioCompra: number; precioActual: number; fecha: string; notas: string; };
type Cartera = { id: string; nombre: string; tipo: string; color: string; posiciones: Posicion[]; };
type AportacionProgramada = { id: number; nombre: string; importe: number; dia: number; cartera: string; activo: string; activa: boolean; };
type PatrimonioData = { carteras: Cartera[]; aportaciones: AportacionProgramada[]; };

const TIPOS = [
  { id: 'cripto', label: 'Cripto', icon: '₿', color: P.gold },
  { id: 'acciones', label: 'Acciones', icon: '📈', color: P.accentLight },
  { id: 'etf', label: 'ETFs', icon: '🏦', color: P.green },
  { id: 'opciones', label: 'Opciones', icon: '⚡', color: P.purple },
  { id: 'otro', label: 'Otro', icon: '◈', color: P.muted2 },
];

const CRIPTO_IDS: Record<string, string> = {
  'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'BNB': 'binancecoin',
  'ADA': 'cardano', 'XRP': 'ripple', 'DOT': 'polkadot', 'MATIC': 'matic-network',
  'AVAX': 'avalanche-2', 'LINK': 'chainlink', 'UNI': 'uniswap', 'ATOM': 'cosmos',
};

const fmtE = (n: number) => n.toFixed(2) + '€';
const fmtPct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
const fmtN = (n: number) => n >= 1000 ? n.toFixed(2) : n >= 1 ? n.toFixed(4) : n.toFixed(6);

export default function PatrimonioClient({ tradingBalance }: { tradingBalance: number }) {
  const [data, setData] = useState<PatrimonioData>({ carteras: [], aportaciones: [] });
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'carteras' | 'aportaciones' | 'resumen'>('resumen');
  const [selectedCartera, setSelectedCartera] = useState<string | null>(null);
  const [showAddCartera, setShowAddCartera] = useState(false);
  const [showAddPosicion, setShowAddPosicion] = useState(false);
  const [showAddAportacion, setShowAddAportacion] = useState(false);

  // Add cartera form
  const [cNombre, setCNombre] = useState('');
  const [cTipo, setCTipo] = useState('cripto');
  const [cColor, setCColor] = useState(P.gold);

  // Add posicion form
  const [pActivo, setPActivo] = useState('Bitcoin');
  const [pSimbolo, setPSimbolo] = useState('BTC');
  const [pCantidad, setPCantidad] = useState('');
  const [pPrecioCompra, setPPrecioCompra] = useState('');
  const [pPrecioActual, setPPrecioActual] = useState('');
  const [pFecha, setPFecha] = useState(new Date().toISOString().split('T')[0]);
  const [pNotas, setPNotas] = useState('');

  // Add aportacion form
  const [aNombre, setANombre] = useState('');
  const [aImporte, setAImporte] = useState('');
  const [aDia, setADia] = useState('1');
  const [aCartera, setACartera] = useState('');
  const [aActivo, setAActivo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/patrimonio');
    if (r.ok) setData(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function fetchCryptoPrices() {
    setPricesLoading(true);
    try {
      const allSymbols = new Set<string>();
      data.carteras.forEach(c => c.posiciones.forEach(p => { if (CRIPTO_IDS[p.simbolo]) allSymbols.add(p.simbolo); }));
      if (!allSymbols.size) { setPricesLoading(false); return; }
      const ids = [...allSymbols].map(s => CRIPTO_IDS[s]).join(',');
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur`);
      if (!r.ok) throw new Error('API error');
      const prices = await r.json();
      const precios = [...allSymbols].map(s => ({ simbolo: s, precio: prices[CRIPTO_IDS[s]]?.eur || 0 })).filter(p => p.precio > 0);
      if (precios.length) {
        await fetch('/api/patrimonio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updatePrecios', precios }) });
        await load();
      }
    } catch { alert('Error obteniendo precios. Inténtalo de nuevo.'); }
    setPricesLoading(false);
  }

  async function addCartera() {
    if (!cNombre.trim()) return;
    await fetch('/api/patrimonio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addCartera', nombre: cNombre, tipo: cTipo, color: cColor }) });
    setCNombre(''); setShowAddCartera(false); await load();
  }

  async function addPosicion() {
    if (!selectedCartera || !pActivo || !pCantidad || !pPrecioCompra) { alert('Rellena activo, cantidad y precio de compra'); return; }
    await fetch('/api/patrimonio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addPosicion', carteraId: selectedCartera, activo: pActivo, simbolo: pSimbolo, cantidad: parseFloat(pCantidad), precioCompra: parseFloat(pPrecioCompra), precioActual: parseFloat(pPrecioActual) || parseFloat(pPrecioCompra), fecha: pFecha, notas: pNotas }) });
    setPActivo('Bitcoin'); setPSimbolo('BTC'); setPCantidad(''); setPPrecioCompra(''); setPPrecioActual(''); setPNotas('');
    setShowAddPosicion(false); await load();
  }

  async function deletePosicion(carteraId: string, posicionId: number) {
    if (!confirm('¿Eliminar posición?')) return;
    await fetch('/api/patrimonio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deletePosicion', carteraId, posicionId }) });
    await load();
  }

  async function addAportacion() {
    if (!aNombre || !aImporte || !aDia) { alert('Rellena todos los campos'); return; }
    await fetch('/api/patrimonio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addAportacion', nombre: aNombre, importe: parseFloat(aImporte), dia: parseInt(aDia), cartera: aCartera, activo: aActivo }) });
    setANombre(''); setAImporte(''); setADia('1'); setACartera(''); setAActivo('');
    setShowAddAportacion(false); await load();
  }

  async function deleteAportacion(id: number) {
    await fetch('/api/patrimonio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteAportacion', id }) });
    await load();
  }

  // Computed values
  const totalInversiones = data.carteras.reduce((s, c) => s + c.posiciones.reduce((s2, p) => s2 + p.cantidad * p.precioActual, 0), 0);
  const totalCosto = data.carteras.reduce((s, c) => s + c.posiciones.reduce((s2, p) => s2 + p.cantidad * p.precioCompra, 0), 0);
  const totalPnlInv = totalInversiones - totalCosto;
  const totalPnlPct = totalCosto > 0 ? (totalPnlInv / totalCosto) * 100 : 0;
  const patrimonioTotal = tradingBalance + totalInversiones;

  // Today's scheduled contributions
  const today = new Date().getDate();
  const hoyAportaciones = data.aportaciones.filter(a => a.activa && a.dia === today);

  const inp: React.CSSProperties = { background: '#0c1420', border: `1px solid ${P.border}`, borderRadius: 8, padding: '9px 12px', color: P.text, fontFamily: 'Outfit, sans-serif', fontSize: 13, width: '100%', outline: 'none' };
  const lbl: React.CSSProperties = { fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: P.muted, display: 'block', marginBottom: 5 };

  if (loading) return <div style={{ textAlign: 'center', padding: '60px 0', color: P.muted, fontFamily: 'Outfit, sans-serif' }}>Cargando patrimonio...</div>;

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif', color: P.text, maxWidth: '100%' }}>

      {/* Alert for today's contributions */}
      {hoyAportaciones.length > 0 && (
        <div style={{ background: `${P.gold}10`, border: `1px solid ${P.gold}40`, borderRadius: 12, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🔔</span>
          <div>
            <div style={{ fontWeight: 700, color: P.gold, marginBottom: 3 }}>Hoy toca aportación programada</div>
            {hoyAportaciones.map(a => (
              <div key={a.id} style={{ fontSize: 12, color: P.muted2 }}>{a.nombre} — <strong style={{ color: P.text }}>{fmtE(a.importe)}</strong>{a.cartera ? ` → ${a.cartera}` : ''}</div>
            ))}
          </div>
        </div>
      )}

      {/* TABS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: `1px solid ${P.border}`, paddingBottom: 0 }}>
        {([['resumen','📊 Resumen'],['carteras','💼 Carteras'],['aportaciones','📅 Aportaciones']] as const).map(([t,l]) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab===t?P.accentLight:'transparent'}`, color: activeTab===t?P.accentLight:P.muted, fontSize: 13, fontWeight: activeTab===t?700:400, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'all 0.15s', marginBottom: -1 }}>{l}</button>
        ))}
      </div>

      {/* ── RESUMEN ── */}
      {activeTab==='resumen'&&(
        <div>
          {/* Patrimonio total */}
          <div style={{ background: `linear-gradient(135deg,${P.surface},${P.card})`, border: `1px solid ${P.border2}`, borderRadius: 14, padding: '24px 28px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${P.accent},${P.accentLight},${P.cyan})` }} />
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: P.muted, letterSpacing: '0.2em', marginBottom: 8, textTransform: 'uppercase' }}>PATRIMONIO NETO TOTAL</div>
            <div style={{ fontFamily: 'monospace', fontSize: 38, fontWeight: 900, color: P.white, letterSpacing: '-0.02em', lineHeight: 1 }}>{fmtE(patrimonioTotal)}</div>
            <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
              {[
                { l: 'Trading', v: fmtE(tradingBalance), c: P.accentLight, pct: patrimonioTotal > 0 ? tradingBalance/patrimonioTotal*100 : 0 },
                { l: 'Inversiones', v: fmtE(totalInversiones), c: P.gold, pct: patrimonioTotal > 0 ? totalInversiones/patrimonioTotal*100 : 0 },
              ].map(s => (
                <div key={s.l}>
                  <div style={{ fontSize: 10, color: P.muted, fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 3, textTransform: 'uppercase' }}>{s.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: P.muted, marginTop: 1 }}>{s.pct.toFixed(1)}% del total</div>
                </div>
              ))}
            </div>
            {/* Distribution bar */}
            {patrimonioTotal > 0 && (
              <div style={{ marginTop: 16, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${tradingBalance/patrimonioTotal*100}%`, background: P.accentLight, borderRadius: 2, display: 'inline-block' }} />
                <div style={{ height: '100%', width: `${totalInversiones/patrimonioTotal*100}%`, background: P.gold, display: 'inline-block' }} />
              </div>
            )}
          </div>

          {/* Investment summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { l: 'Invertido total', v: fmtE(totalCosto), c: P.muted2 },
              { l: 'Valor actual', v: fmtE(totalInversiones), c: P.accentLight },
              { l: 'P&L inversiones', v: (totalPnlInv>=0?'+':'')+fmtE(totalPnlInv), c: totalPnlInv>=0?P.green:P.red },
            ].map(s=>(
              <div key={s.l} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: P.muted, letterSpacing: '0.15em', marginBottom: 6, textTransform: 'uppercase' }}>{s.l}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 700, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Per cartera breakdown */}
          {data.carteras.length > 0 && (
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px', borderBottom: `1px solid ${P.border}`, fontSize: 12, fontWeight: 600, color: P.muted2, fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>DESGLOSE POR CARTERA</div>
              {data.carteras.map(c => {
                const valor = c.posiciones.reduce((s,p)=>s+p.cantidad*p.precioActual,0);
                const costo = c.posiciones.reduce((s,p)=>s+p.cantidad*p.precioCompra,0);
                const pnl = valor - costo;
                const pct = costo > 0 ? pnl/costo*100 : 0;
                const tipo = TIPOS.find(t=>t.id===c.tipo);
                return (
                  <div key={c.id} onClick={()=>{setSelectedCartera(c.id);setActiveTab('carteras');}} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 100px 90px 80px', gap: 12, padding: '13px 18px', borderBottom: `1px solid ${P.border}`, cursor: 'pointer', transition: 'background 0.1s', alignItems: 'center' }}
                    onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=P.card2}
                    onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                    <span style={{ fontSize: 18 }}>{tipo?.icon || '◈'}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.nombre}</div>
                      <div style={{ fontSize: 10, color: P.muted }}>{c.posiciones.length} posiciones</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: P.text }}>{fmtE(valor)}</div>
                      <div style={{ fontSize: 10, color: P.muted }}>cost. {fmtE(costo)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: pnl>=0?P.green:P.red }}>{pnl>=0?'+':''}{fmtE(pnl)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: pct>=0?P.green:P.red }}>{fmtPct(pct)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {data.carteras.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: P.muted }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>💼</div>
              <div style={{ fontSize: 14, marginBottom: 6 }}>Sin carteras aún</div>
              <button onClick={()=>setActiveTab('carteras')} style={{ padding: '9px 18px', background: `${P.accent}20`, border: `1px solid ${P.accent}`, borderRadius: 8, color: P.accentLight, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Crear primera cartera →</button>
            </div>
          )}
        </div>
      )}

      {/* ── CARTERAS ── */}
      {activeTab==='carteras'&&(
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={()=>setSelectedCartera(null)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${!selectedCartera?P.accentLight:P.border}`, background: !selectedCartera?`${P.accent}20`:'transparent', color: !selectedCartera?P.accentLight:P.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Todas</button>
              {data.carteras.map(c=>(
                <button key={c.id} onClick={()=>setSelectedCartera(c.id)} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${selectedCartera===c.id?c.color:P.border}`, background: selectedCartera===c.id?`${c.color}20`:'transparent', color: selectedCartera===c.id?c.color:P.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>{c.nombre}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={fetchCryptoPrices} disabled={pricesLoading} style={{ padding: '8px 14px', background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, color: P.muted2, fontSize: 11, cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                {pricesLoading ? '⟳ Actualizando...' : '↻ Precios cripto'}
              </button>
              {selectedCartera && <button onClick={()=>setShowAddPosicion(true)} style={{ padding: '8px 16px', background: `linear-gradient(135deg,${P.accent},${P.accentLight})`, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>+ Posición</button>}
              <button onClick={()=>setShowAddCartera(true)} style={{ padding: '8px 16px', background: P.card2, border: `1px solid ${P.border}`, borderRadius: 8, color: P.muted2, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>+ Cartera</button>
            </div>
          </div>

          {(selectedCartera ? data.carteras.filter(c=>c.id===selectedCartera) : data.carteras).map(c => {
            const tipo = TIPOS.find(t=>t.id===c.tipo);
            return (
              <div key={c.id} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${c.color}20`, border: `1px solid ${c.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{tipo?.icon||'◈'}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{c.nombre}</div>
                      <div style={{ fontSize: 10, color: P.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace' }}>{tipo?.label||'Otro'} · {c.posiciones.length} posiciones</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: P.white }}>{fmtE(c.posiciones.reduce((s,p)=>s+p.cantidad*p.precioActual,0))}</div>
                    {(() => { const v=c.posiciones.reduce((s,p)=>s+p.cantidad*p.precioActual,0),co=c.posiciones.reduce((s,p)=>s+p.cantidad*p.precioCompra,0),pnl=v-co,pct=co>0?pnl/co*100:0; return <div style={{fontFamily:'monospace',fontSize:11,color:pnl>=0?P.green:P.red}}>{pnl>=0?'+':''}{fmtE(pnl)} ({fmtPct(pct)})</div>; })()}
                  </div>
                </div>

                {c.posiciones.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: P.muted, fontSize: 12 }}>Sin posiciones · Añade tu primera inversión</div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px 90px 90px 80px 32px', gap: 8, padding: '8px 18px', background: P.bg }}>
                      {['SÍMBOLO','ACTIVO','CANTIDAD','COMPRA','ACTUAL','P&L',''].map(h=><span key={h} style={{fontFamily:'monospace',fontSize:8,letterSpacing:'0.12em',color:P.muted,textTransform:'uppercase'}}>{h}</span>)}
                    </div>
                    {c.posiciones.map(p => {
                      const valorActual = p.cantidad * p.precioActual;
                      const costo = p.cantidad * p.precioCompra;
                      const pnl = valorActual - costo;
                      const pct = costo > 0 ? pnl/costo*100 : 0;
                      return (
                        <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px 90px 90px 80px 32px', gap: 8, padding: '12px 18px', borderBottom: `1px solid ${P.border}`, alignItems: 'center', transition: 'background 0.1s' }}
                          onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.background=P.card2}
                          onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.background='transparent'}>
                          <div style={{ background: `${c.color}18`, border: `1px solid ${c.color}30`, borderRadius: 5, padding: '3px 6px', textAlign: 'center', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: c.color }}>{p.simbolo}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.activo}</div>
                            <div style={{ fontSize: 10, color: P.muted }}>{p.fecha}</div>
                          </div>
                          <div style={{ fontFamily: 'monospace', fontSize: 11, color: P.text }}>{fmtN(p.cantidad)}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 11, color: P.muted2 }}>{fmtE(p.precioCompra)}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 11, color: P.text }}>{fmtE(p.precioActual)}</div>
                          <div>
                            <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: pnl>=0?P.green:P.red }}>{pnl>=0?'+':''}{fmtE(pnl)}</div>
                            <div style={{ fontFamily: 'monospace', fontSize: 9, color: pct>=0?P.green:P.red }}>{fmtPct(pct)}</div>
                          </div>
                          <button onClick={()=>deletePosicion(c.id,p.id)} style={{ width: 28, height: 28, borderRadius: 6, background: `${P.red}15`, border: `1px solid ${P.red}40`, color: P.red, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                      );
                    })}
                    {/* Cartera totals */}
                    {(() => { const v=c.posiciones.reduce((s,p)=>s+p.cantidad*p.precioActual,0),co=c.posiciones.reduce((s,p)=>s+p.cantidad*p.precioCompra,0),pnl=v-co,pct=co>0?pnl/co*100:0;
                    return <div style={{display:'grid',gridTemplateColumns:'60px 1fr 80px 90px 90px 80px 32px',gap:8,padding:'10px 18px',background:P.card2}}>
                      <span/><span style={{fontSize:11,fontWeight:600,color:P.muted2}}>TOTAL</span><span/>
                      <span style={{fontFamily:'monospace',fontSize:11,color:P.muted2}}>{fmtE(co)}</span>
                      <span style={{fontFamily:'monospace',fontSize:11,color:P.text}}>{fmtE(v)}</span>
                      <div><div style={{fontFamily:'monospace',fontSize:11,fontWeight:700,color:pnl>=0?P.green:P.red}}>{pnl>=0?'+':''}{fmtE(pnl)}</div><div style={{fontFamily:'monospace',fontSize:9,color:pct>=0?P.green:P.red}}>{fmtPct(pct)}</div></div>
                      <span/>
                    </div>; })()}
                  </>
                )}
              </div>
            );
          })}

          {data.carteras.length === 0 && <div style={{textAlign:'center',padding:'60px 0',color:P.muted}}><div style={{fontSize:40,marginBottom:12}}>💼</div><div>Crea tu primera cartera para empezar</div></div>}
        </div>
      )}

      {/* ── APORTACIONES ── */}
      {activeTab==='aportaciones'&&(
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div><div style={{ fontSize: 14, fontWeight: 600 }}>Aportaciones Programadas</div><div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>Recordatorios automáticos el día que configures</div></div>
            <button onClick={()=>setShowAddAportacion(true)} style={{ padding: '9px 16px', background: `linear-gradient(135deg,${P.accent},${P.accentLight})`, border: 'none', borderRadius: 9, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>+ Nueva aportación</button>
          </div>

          {data.aportaciones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: P.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
              <div style={{ fontSize: 14, marginBottom: 6 }}>Sin aportaciones programadas</div>
              <div style={{ fontSize: 12, marginBottom: 16 }}>Configura un recordatorio mensual para reinvertir</div>
              <button onClick={()=>setShowAddAportacion(true)} style={{ padding: '9px 18px', background: `${P.accent}20`, border: `1px solid ${P.accent}`, borderRadius: 8, color: P.accentLight, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Crear recordatorio →</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.aportaciones.map(a => {
                const daysUntil = (() => { const now = new Date(), target = new Date(now.getFullYear(), now.getMonth(), a.dia); if (target < now) target.setMonth(target.getMonth()+1); return Math.ceil((target.getTime()-now.getTime())/(1000*60*60*24)); })();
                const isToday = a.dia === today;
                return (
                  <div key={a.id} style={{ background: isToday?`${P.gold}10`:P.card, border: `1px solid ${isToday?`${P.gold}40`:P.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: isToday?`0 0 16px ${P.gold}15`:'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: isToday?`${P.gold}20`:`${P.accent}15`, border: `1px solid ${isToday?`${P.gold}40`:`${P.accent}30`}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, color: isToday?P.gold:P.accentLight, lineHeight: 1 }}>{a.dia}</div>
                        <div style={{ fontSize: 7, color: P.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>día</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{a.nombre}</div>
                        <div style={{ fontSize: 11, color: P.muted }}>{a.cartera && `→ ${a.cartera}`}{a.activo && ` · ${a.activo}`}</div>
                        <div style={{ fontSize: 10, color: isToday?P.gold:P.muted, marginTop: 2, fontFamily: 'monospace' }}>
                          {isToday ? '🔔 HOY' : `En ${daysUntil} día${daysUntil!==1?'s':''}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: P.green }}>+{fmtE(a.importe)}</div>
                        <div style={{ fontSize: 10, color: P.muted }}>mensual</div>
                      </div>
                      <button onClick={()=>deleteAportacion(a.id)} style={{ width: 28, height: 28, borderRadius: 6, background: `${P.red}15`, border: `1px solid ${P.red}40`, color: P.red, cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ background: `${P.accent}08`, border: `1px solid ${P.accent}25`, borderRadius: 12, padding: 16, marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: P.accentLight, marginBottom: 8 }}>💡 Para hacerlo automático de verdad</div>
            <div style={{ fontSize: 12, color: P.muted2, lineHeight: 1.7 }}>
              Este recordatorio te avisa el día que configures. Para que sea 100% automático, configura también una <strong style={{color:P.text}}>transferencia periódica en tu banco</strong> el mismo día. La combinación de ambos es lo que realmente funciona a largo plazo.
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Add cartera */}
      {showAddCartera&&(
        <div onClick={e=>e.target===e.currentTarget&&setShowAddCartera(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'}}>
          <div style={{background:P.card,border:`1px solid ${P.border2}`,borderRadius:16,padding:24,width:'100%',maxWidth:380}}>
            <div style={{fontSize:16,fontWeight:700,marginBottom:18}}>Nueva Cartera</div>
            <label style={lbl}>NOMBRE</label>
            <input value={cNombre} onChange={e=>setCNombre(e.target.value)} placeholder="Ej: Mi Cartera Cripto" style={{...inp,marginBottom:14}}/>
            <label style={lbl}>TIPO</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
              {TIPOS.map(t=>(
                <button key={t.id} onClick={()=>{setCTipo(t.id);setCColor(t.color);}} style={{padding:'7px 12px',borderRadius:8,border:`1px solid ${cTipo===t.id?t.color:P.border}`,background:cTipo===t.id?`${t.color}20`:'transparent',color:cTipo===t.id?t.color:P.muted,fontSize:12,cursor:'pointer',fontFamily:'Outfit, sans-serif'}}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button onClick={()=>setShowAddCartera(false)} style={{padding:11,background:'transparent',border:`1px solid ${P.border}`,borderRadius:9,color:P.muted,fontSize:13,cursor:'pointer',fontFamily:'Outfit, sans-serif'}}>Cancelar</button>
              <button onClick={addCartera} style={{padding:11,background:`linear-gradient(135deg,${P.accent},${P.accentLight})`,border:'none',borderRadius:9,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Outfit, sans-serif'}}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Add posicion */}
      {showAddPosicion&&(
        <div onClick={e=>e.target===e.currentTarget&&setShowAddPosicion(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'}}>
          <div style={{background:P.card,border:`1px solid ${P.border2}`,borderRadius:16,padding:24,width:'100%',maxWidth:440,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{fontSize:16,fontWeight:700,marginBottom:18}}>Nueva Posición</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              <div><label style={lbl}>NOMBRE DEL ACTIVO</label><input value={pActivo} onChange={e=>setPActivo(e.target.value)} placeholder="Bitcoin" style={inp}/></div>
              <div><label style={lbl}>SÍMBOLO (TICKER)</label><input value={pSimbolo} onChange={e=>setPSimbolo(e.target.value.toUpperCase())} placeholder="BTC" style={inp}/></div>
            </div>
            {/* Quick crypto buttons */}
            <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:12}}>
              {[['BTC','Bitcoin'],['ETH','Ethereum'],['SOL','Solana'],['BNB','BNB'],['XRP','Ripple']].map(([s,n])=>(
                <button key={s} onClick={()=>{setPSimbolo(s);setPActivo(n);}} style={{padding:'4px 10px',borderRadius:6,border:`1px solid ${P.border}`,background:pSimbolo===s?`${P.gold}20`:'transparent',color:pSimbolo===s?P.gold:P.muted,fontSize:10,cursor:'pointer',fontFamily:'monospace'}}>{s}</button>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div><label style={lbl}>CANTIDAD</label><input type="number" value={pCantidad} onChange={e=>setPCantidad(e.target.value)} placeholder="0.005" style={inp}/></div>
              <div><label style={lbl}>FECHA COMPRA</label><input type="date" value={pFecha} onChange={e=>setPFecha(e.target.value)} style={inp}/></div>
              <div><label style={lbl}>PRECIO COMPRA (€)</label><input type="number" value={pPrecioCompra} onChange={e=>setPPrecioCompra(e.target.value)} placeholder="0.00" style={inp}/></div>
              <div><label style={lbl}>PRECIO ACTUAL (€)</label><input type="number" value={pPrecioActual} onChange={e=>setPPrecioActual(e.target.value)} placeholder="Opcional" style={inp}/></div>
            </div>
            <label style={lbl}>NOTAS</label>
            <input value={pNotas} onChange={e=>setPNotas(e.target.value)} placeholder="Notas opcionales..." style={{...inp,marginBottom:16}}/>
            {/* Preview */}
            {pCantidad && pPrecioCompra && (
              <div style={{background:P.card2,borderRadius:8,padding:'10px 14px',marginBottom:14,border:`1px solid ${P.border}`}}>
                <div style={{fontSize:11,color:P.muted,marginBottom:4,fontFamily:'monospace',letterSpacing:'0.1em',textTransform:'uppercase'}}>Resumen de la posición</div>
                <div style={{fontFamily:'monospace',fontSize:13,color:P.text}}>
                  {pCantidad} {pSimbolo} × {parseFloat(pPrecioCompra||'0').toFixed(2)}€ = <strong style={{color:P.accentLight}}>{(parseFloat(pCantidad||'0')*parseFloat(pPrecioCompra||'0')).toFixed(2)}€</strong>
                </div>
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button onClick={()=>setShowAddPosicion(false)} style={{padding:11,background:'transparent',border:`1px solid ${P.border}`,borderRadius:9,color:P.muted,fontSize:13,cursor:'pointer',fontFamily:'Outfit, sans-serif'}}>Cancelar</button>
              <button onClick={addPosicion} style={{padding:11,background:`linear-gradient(135deg,${P.accent},${P.accentLight})`,border:'none',borderRadius:9,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Outfit, sans-serif'}}>Añadir</button>
            </div>
          </div>
        </div>
      )}

      {/* Add aportacion */}
      {showAddAportacion&&(
        <div onClick={e=>e.target===e.currentTarget&&setShowAddAportacion(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'}}>
          <div style={{background:P.card,border:`1px solid ${P.border2}`,borderRadius:16,padding:24,width:'100%',maxWidth:380}}>
            <div style={{fontSize:16,fontWeight:700,marginBottom:18}}>Nueva Aportación Programada</div>
            <label style={lbl}>NOMBRE</label>
            <input value={aNombre} onChange={e=>setANombre(e.target.value)} placeholder="Ej: Compra mensual BTC" style={{...inp,marginBottom:10}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div><label style={lbl}>IMPORTE (€)</label><input type="number" value={aImporte} onChange={e=>setAImporte(e.target.value)} placeholder="200.00" style={inp}/></div>
              <div><label style={lbl}>DÍA DEL MES</label>
                <select value={aDia} onChange={e=>setADia(e.target.value)} style={inp}>
                  {Array.from({length:28},(_,i)=>i+1).map(d=><option key={d} value={d}>Día {d}</option>)}
                </select>
              </div>
            </div>
            <label style={lbl}>CARTERA (opcional)</label>
            <select value={aCartera} onChange={e=>setACartera(e.target.value)} style={{...inp,marginBottom:10}}>
              <option value="">Sin asignar</option>
              {data.carteras.map(c=><option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
            <label style={lbl}>ACTIVO (opcional)</label>
            <input value={aActivo} onChange={e=>setAActivo(e.target.value)} placeholder="BTC, ETH, etc." style={{...inp,marginBottom:18}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button onClick={()=>setShowAddAportacion(false)} style={{padding:11,background:'transparent',border:`1px solid ${P.border}`,borderRadius:9,color:P.muted,fontSize:13,cursor:'pointer',fontFamily:'Outfit, sans-serif'}}>Cancelar</button>
              <button onClick={addAportacion} style={{padding:11,background:`linear-gradient(135deg,${P.accent},${P.accentLight})`,border:'none',borderRadius:9,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'Outfit, sans-serif'}}>Programar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
