'use client';
import { useState, useEffect } from 'react';

const G = {
  card:'#0c1628', card2:'#0f1e38', border:'rgba(0,180,255,0.1)',
  accent:'#0066dd', cyan:'#00d4ff', green:'#00e676', red:'#ff3366', gold:'#f5a623',
  text:'#e8f0fe', muted:'#4a6a8a', muted2:'#8ba0bf',
};

const PARES: Record<string, { pip: number; label: string }> = {
  'XAU/USD': { pip: 0.01, label: 'Oro' },
  'NAS100':  { pip: 1,    label: 'Nasdaq' },
  'EUR/USD': { pip: 0.0001, label: 'EUR/USD' },
  'GBP/USD': { pip: 0.0001, label: 'GBP/USD' },
  'USD/JPY': { pip: 0.01, label: 'USD/JPY' },
  'BTC/USD': { pip: 1,    label: 'Bitcoin' },
};

// Pip value per lot (standard)
const PIP_VALUE: Record<string, number> = {
  'XAU/USD': 10,    // $10 per pip per lot (100oz)
  'NAS100':  10,    // $10 per point per lot
  'EUR/USD': 10,    // $10 per pip per lot
  'GBP/USD': 10,
  'USD/JPY': 9.1,   // approx
  'BTC/USD': 1,
};

const inp: React.CSSProperties = { background: G.card2, border: `1px solid ${G.border}`, borderRadius: 8, padding: '10px 13px', color: G.text, fontFamily: "'Inter',sans-serif", fontSize: 14, width: '100%', outline: 'none' };
const lbl: React.CSSProperties = { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: G.muted, display: 'block', marginBottom: 5 };

export default function CalculadoraClient({ capital }: { capital: number }) {
  const [par, setPar] = useState('XAU/USD');
  const [riesgoPct, setRiesgoPct] = useState('1');
  const [entrada, setEntrada] = useState('');
  const [sl, setSl] = useState('');
  const [dir, setDir] = useState<'buy' | 'sell'>('buy');
  const [tp, setTp] = useState('');

  const pipSize = PARES[par]?.pip || 0.0001;
  const pipVal  = PIP_VALUE[par] || 10;

  const entradaN = parseFloat(entrada) || 0;
  const slN      = parseFloat(sl) || 0;
  const tpN      = parseFloat(tp) || 0;
  const riesgoN  = parseFloat(riesgoPct) || 1;

  const slPips   = Math.abs(entradaN - slN) / pipSize;
  const tpPips   = tpN ? Math.abs(tpN - entradaN) / pipSize : 0;
  const riesroEur = (capital * riesgoN) / 100;
  const lote     = slPips > 0 ? riesroEur / (slPips * pipVal) : 0;
  const rr       = tpPips > 0 && slPips > 0 ? tpPips / slPips : 0;
  const beneficioPotencial = lote * tpPips * pipVal;

  const loteDisplay = lote > 0 ? (lote < 0.01 ? lote.toFixed(4) : lote < 0.1 ? lote.toFixed(3) : lote.toFixed(2)) : '—';

  // Lote recomendado rounded to broker standard
  const loteStandard = lote > 0 ? Math.floor(lote * 100) / 100 : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

      {/* LEFT — Inputs */}
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Inter',sans-serif", marginBottom: 16 }}>⚙️ Parámetros del Trade</div>

        {/* Par */}
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>ACTIVO</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {Object.entries(PARES).map(([k, v]) => (
              <button key={k} onClick={() => setPar(k)} style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${par===k?G.accent:G.border}`, background: par===k?`${G.accent}20`:'transparent', color: par===k?G.accent:G.muted, fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", fontWeight: par===k?700:400 }}>{k}</button>
            ))}
          </div>
        </div>

        {/* Capital */}
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>CAPITAL DE LA CUENTA (€)</label>
          <div style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: 8, padding: '10px 13px', fontFamily: "'JetBrains Mono',monospace", fontSize: 14, color: G.cyan }}>{capital.toFixed(2)}€</div>
        </div>

        {/* Riesgo % */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <label style={{ ...lbl, display: 'inline' }}>RIESGO %</label>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: G.accent }}>{riesgoN}% = {riesroEur.toFixed(2)}€</span>
          </div>
          <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
            {['0.5','1','1.5','2','3'].map(v => (
              <button key={v} onClick={() => setRiesgoPct(v)} style={{ flex: 1, padding: '7px 4px', borderRadius: 7, border: `1px solid ${riesgoPct===v?G.accent:G.border}`, background: riesgoPct===v?`${G.accent}20`:'transparent', color: riesgoPct===v?G.accent:G.muted, fontSize: 11, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace" }}>{v}%</button>
            ))}
          </div>
          <input type="number" value={riesgoPct} onChange={e=>setRiesgoPct(e.target.value)} placeholder="1" style={inp} step="0.1" min="0.1" max="10" />
        </div>

        {/* Dirección */}
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>DIRECCIÓN</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button onClick={() => setDir('buy')} style={{ padding: '9px', borderRadius: 8, border: `1px solid ${dir==='buy'?G.green:G.border}`, background: dir==='buy'?`${G.green}15`:'transparent', color: dir==='buy'?G.green:G.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>▲ LONG</button>
            <button onClick={() => setDir('sell')} style={{ padding: '9px', borderRadius: 8, border: `1px solid ${dir==='sell'?G.red:G.border}`, background: dir==='sell'?`${G.red}15`:'transparent', color: dir==='sell'?G.red:G.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>▼ SHORT</button>
          </div>
        </div>

        {/* Precios */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <label style={lbl}>ENTRADA</label>
            <input type="number" value={entrada} onChange={e=>setEntrada(e.target.value)} placeholder="0.00" style={inp} step={pipSize} />
          </div>
          <div>
            <label style={lbl}>STOP LOSS</label>
            <input type="number" value={sl} onChange={e=>setSl(e.target.value)} placeholder="0.00" style={{ ...inp, borderColor: sl ? `${G.red}60` : G.border }} step={pipSize} />
          </div>
          <div>
            <label style={lbl}>TAKE PROFIT</label>
            <input type="number" value={tp} onChange={e=>setTp(e.target.value)} placeholder="Opcional" style={{ ...inp, borderColor: tp ? `${G.green}60` : G.border }} step={pipSize} />
          </div>
        </div>
      </div>

      {/* RIGHT — Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Main result */}
        <div style={{ background: lote > 0 ? `${G.accent}10` : G.card, border: `2px solid ${lote > 0 ? G.accent : G.border}`, borderRadius: 14, padding: 22, textAlign: 'center', boxShadow: lote > 0 ? `0 0 30px ${G.accent}20` : 'none' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: G.muted, letterSpacing: '0.2em', marginBottom: 10, textTransform: 'uppercase' }}>TAMAÑO DE POSICIÓN</div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 52, fontWeight: 900, color: lote > 0 ? G.accent : G.muted, lineHeight: 1, marginBottom: 6 }}>{loteDisplay}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: G.muted }}>lotes</div>
          {lote > 0 && loteStandard !== lote && (
            <div style={{ marginTop: 10, padding: '7px 14px', background: `${G.gold}15`, border: `1px solid ${G.gold}30`, borderRadius: 8, display: 'inline-block', fontSize: 12, color: G.gold, fontFamily: "'Inter',sans-serif" }}>
              Redondeado: <strong>{loteStandard.toFixed(2)}</strong> lotes
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { l: 'Riesgo máximo', v: riesroEur > 0 ? `-${riesroEur.toFixed(2)}€` : '—', c: G.red },
            { l: 'SL en pips', v: slPips > 0 ? `${slPips.toFixed(1)} pips` : '—', c: G.muted2 },
            { l: 'Beneficio potencial', v: beneficioPotencial > 0 ? `+${beneficioPotencial.toFixed(2)}€` : '—', c: G.green },
            { l: 'TP en pips', v: tpPips > 0 ? `${tpPips.toFixed(1)} pips` : '—', c: G.muted2 },
          ].map(s => (
            <div key={s.l} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>{s.l}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 700, color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* R:R */}
        {rr > 0 && (
          <div style={{ background: rr >= 2 ? `${G.green}10` : rr >= 1.5 ? `${G.gold}10` : `${G.red}10`, border: `1px solid ${rr >= 2 ? G.green : rr >= 1.5 ? G.gold : G.red}30`, borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>RATIO RIESGO:BENEFICIO</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 24, fontWeight: 800, color: rr >= 2 ? G.green : rr >= 1.5 ? G.gold : G.red }}>1 : {rr.toFixed(2)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: rr >= 2 ? G.green : rr >= 1.5 ? G.gold : G.red, fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>
                {rr >= 2 ? '✅ Buen setup' : rr >= 1.5 ? '⚠️ Aceptable' : '❌ R:R bajo'}
              </div>
              <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>{rr < 1.5 ? 'Mínimo recomendado: 1:2' : 'Cumple el estándar'}</div>
            </div>
          </div>
        )}

        {/* Warning */}
        {lote > 0.1 && riesgoN > 2 && (
          <div style={{ background: `${G.red}10`, border: `1px solid ${G.red}30`, borderRadius: 10, padding: '11px 14px', fontSize: 12, color: G.red, fontFamily: "'Inter',sans-serif" }}>
            ⚠️ Estás arriesgando más del 2% del capital. Con tu cuenta en €{capital.toFixed(0)}, perder este trade te supone €{riesroEur.toFixed(2)}.
          </div>
        )}

        {/* Copy button */}
        {lote > 0 && (
          <button onClick={() => { navigator.clipboard?.writeText(`${par} ${dir === 'buy' ? 'BUY' : 'SELL'} | Lote: ${loteDisplay} | SL: ${sl} | TP: ${tp || '—'} | Riesgo: ${riesroEur.toFixed(2)}€`); }} style={{ padding: '11px', background: `${G.accent}15`, border: `1px solid ${G.accent}40`, borderRadius: 10, color: G.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>
            📋 Copiar setup al portapapeles
          </button>
        )}
      </div>
    </div>
  );
}
