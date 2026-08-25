'use client';
import { useState, useRef } from 'react';

const G = {
  card:'#112240', card2:'#162d4a', border:'rgba(100,160,255,0.12)',
  accent:'#4d9fff', cyan:'#00e5ff', green:'#00e676', red:'#ff4081', gold:'#ffb300',
  text:'#e8f4ff', muted:'#4a7a9b', muted2:'#6b9cc7',
};

type ParsedTrade = {
  date: string; time: string; pair: string; dir: string;
  lot: number; entry: number; sl: number; tp: number;
  pnl: number; swap: number; commission: number;
};

function parseMT5CSV(text: string): ParsedTrade[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const trades: ParsedTrade[] = [];

  for (const line of lines) {
    // Skip headers
    if (line.startsWith('#') || line.toLowerCase().includes('ticket') || line.toLowerCase().includes('deal')) continue;

    // Try tab-separated and semicolon-separated
    const cols = line.includes('\t') ? line.split('\t') : line.split(';');
    if (cols.length < 8) continue;

    // MT5 format: Time, Deal, Symbol, Type, Direction, Volume, Price, Order, Commission, Swap, Profit, Balance, Comment
    // Or: Ticket, Open Time, Type, Size, Symbol, Price, S/L, T/P, Close Time, Close Price, Swap, Profit
    try {
      let date = '', time = '', pair = '', dir = '', lot = 0, entry = 0, slPrice = 0, tpPrice = 0, pnl = 0, swap = 0, commission = 0;

      // Detect format by checking if column 2 looks like a symbol
      if (cols.length >= 13 && cols[2]?.match(/[A-Z]{3,8}/)) {
        // MT5 deals format
        const [timeStr, , symbol, type, direction, volume, price, , comm, sw, profit] = cols;
        if (!timeStr || !symbol || type?.toLowerCase() === 'balance') continue;
        const [datePart, timePart] = (timeStr || '').split(' ');
        date = datePart?.replace(/\./g, '-') || '';
        time = timePart?.slice(0, 5) || '';
        pair = symbol.replace('/', '').replace('XAUUSD', 'XAU/USD').replace('USTEC', 'NAS100').replace('NAS100', 'NAS100') || '';
        dir = (direction || type || '').toLowerCase().includes('buy') ? 'buy' : 'sell';
        lot = parseFloat(volume || '0') || 0;
        entry = parseFloat(price || '0') || 0;
        pnl = parseFloat(profit || '0') || 0;
        swap = parseFloat(sw || '0') || 0;
        commission = parseFloat(comm || '0') || 0;
      } else if (cols.length >= 12) {
        // MT4/MT5 history report format
        const [ticket, openTime, type, size, symbol, price, slP, tpP, , closePrice, sw, profit] = cols;
        if (!openTime || !symbol) continue;
        const [datePart, timePart] = (openTime || '').split(' ');
        date = datePart?.replace(/\./g, '-') || '';
        time = timePart?.slice(0, 5) || '';
        pair = (symbol || '').replace('XAUUSD', 'XAU/USD').replace('USTEC', 'NAS100');
        dir = (type || '').toLowerCase().includes('buy') ? 'buy' : 'sell';
        lot = parseFloat(size || '0') || 0;
        entry = parseFloat(price || '0') || 0;
        slPrice = parseFloat(slP || '0') || 0;
        tpPrice = parseFloat(tpP || '0') || 0;
        pnl = parseFloat(profit || '0') || 0;
        swap = parseFloat(sw || '0') || 0;
      }

      if (!date || !pair || lot <= 0) continue;
      if (Math.abs(pnl) > 100000) continue; // sanity check

      trades.push({ date, time, pair, dir, lot, entry, sl: slPrice, tp: tpPrice, pnl: Math.round(pnl * 100) / 100, swap, commission });
    } catch { continue; }
  }
  return trades;
}

export default function ImportadorMT5({ onImport }: { onImport: (trades: ParsedTrade[]) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedTrade[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function processFile(f: File) {
    setFile(f); setError(''); setParsed([]); setDone(false);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const trades = parseMT5CSV(text);
      if (trades.length === 0) {
        setError('No se encontraron operaciones en el archivo. Asegúrate de exportar el historial como CSV desde MT5.');
      } else {
        setParsed(trades);
      }
    };
    reader.readAsText(f, 'utf-8');
  }

  async function doImport() {
    setImporting(true);
    await onImport(parsed);
    setImporting(false);
    setDone(true);
  }

  return (
    <div>
      {/* Instructions */}
      <div style={{ background: `${G.accent}08`, border: `1px solid ${G.accent}25`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: G.accent, fontFamily: 'Outfit,sans-serif', marginBottom: 10 }}>📖 Cómo exportar desde MT5</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { n: '1', t: 'Abre MetaTrader 5' },
            { n: '2', t: 'Ve a Ver → Terminal (Ctrl+T)' },
            { n: '3', t: 'Pestaña "Historial"' },
            { n: '4', t: 'Clic derecho → Guardar como informe → CSV' },
          ].map(s => (
            <div key={s.n} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${G.accent}25`, border: `1px solid ${G.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: G.accent, flexShrink: 0 }}>{s.n}</div>
              <span style={{ fontSize: 12, color: G.muted2, fontFamily: 'Outfit,sans-serif', lineHeight: 1.5 }}>{s.t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      {!parsed.length && !done && (
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          style={{ border: `2px dashed ${dragOver ? G.cyan : G.border}`, borderRadius: 14, padding: '40px 20px', cursor: 'pointer', textAlign: 'center', background: dragOver ? `${G.cyan}08` : G.card, transition: 'all 0.2s', marginBottom: 14 }}>
          <input ref={fileRef} type="file" accept=".csv,.htm,.html" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
          <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: G.text, fontFamily: 'Outfit,sans-serif', marginBottom: 4 }}>Arrastra el CSV de MT5 aquí</div>
          <div style={{ fontSize: 12, color: G.muted }}>O haz clic para seleccionar · .csv o .htm</div>
        </div>
      )}

      {error && (
        <div style={{ background: `${G.red}10`, border: `1px solid ${G.red}30`, borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 12, color: G.red, fontFamily: 'Outfit,sans-serif' }}>⚠️ {error}</div>
      )}

      {/* Preview */}
      {parsed.length > 0 && !done && (
        <div>
          <div style={{ background: `${G.green}10`, border: `1px solid ${G.green}30`, borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: G.green, fontFamily: 'Outfit,sans-serif', fontWeight: 600 }}>✓ {parsed.length} operaciones encontradas</div>
            <div style={{ fontSize: 11, color: G.muted }}>P&L total: <span style={{ color: parsed.reduce((s,t)=>s+t.pnl,0) >= 0 ? G.green : G.red, fontWeight: 700 }}>{parsed.reduce((s,t)=>s+t.pnl,0) >= 0?'+':''}{parsed.reduce((s,t)=>s+t.pnl,0).toFixed(2)}€</span></div>
          </div>

          {/* Preview table */}
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '90px 80px 60px 50px 90px 80px', gap: 8, padding: '8px 14px', background: '#070d17' }}>
              {['FECHA','PAR','DIR','LOTE','ENTRADA','P&L'].map(h => <span key={h} style={{ fontFamily: 'monospace', fontSize: 8, letterSpacing: '0.1em', color: G.muted, textTransform: 'uppercase' }}>{h}</span>)}
            </div>
            {parsed.slice(0, 10).map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 80px 60px 50px 90px 80px', gap: 8, padding: '9px 14px', borderBottom: `1px solid ${G.border}`, alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: G.muted }}>{t.date}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: G.cyan }}>{t.pair}</span>
                <span style={{ fontSize: 11, color: t.dir==='buy'?G.green:G.red, fontWeight: 600 }}>{t.dir==='buy'?'▲ L':'▼ S'}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: G.muted2 }}>{t.lot}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: G.text }}>{t.entry.toFixed(2)}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: t.pnl>=0?G.green:G.red }}>{t.pnl>=0?'+':''}{t.pnl.toFixed(2)}€</span>
              </div>
            ))}
            {parsed.length > 10 && (
              <div style={{ padding: '10px 14px', fontSize: 11, color: G.muted, fontFamily: 'Outfit,sans-serif' }}>...y {parsed.length - 10} operaciones más</div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => { setParsed([]); setFile(null); }} style={{ padding: '12px', background: 'transparent', border: `1px solid ${G.border}`, borderRadius: 10, color: G.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>Cancelar</button>
            <button onClick={doImport} disabled={importing} style={{ padding: '12px', background: `linear-gradient(135deg,${G.accent},${G.cyan})`, border: 'none', borderRadius: 10, color: '#05111e', fontSize: 13, fontWeight: 700, cursor: importing?'not-allowed':'pointer', fontFamily: 'Outfit,sans-serif', opacity: importing?0.7:1 }}>
              {importing ? '⟳ Importando...' : `✓ Importar ${parsed.length} trades`}
            </button>
          </div>
        </div>
      )}

      {done && (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: `${G.green}10`, border: `1px solid ${G.green}30`, borderRadius: 14 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: G.green, fontFamily: 'Outfit,sans-serif', marginBottom: 6 }}>{parsed.length} trades importados</div>
          <div style={{ fontSize: 12, color: G.muted }}>Ya están en tu historial. Ve al Dashboard para verlos.</div>
          <button onClick={() => { setParsed([]); setFile(null); setDone(false); }} style={{ marginTop: 16, padding: '9px 18px', background: 'transparent', border: `1px solid ${G.border}`, borderRadius: 8, color: G.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit,sans-serif' }}>Importar otro archivo</button>
        </div>
      )}
    </div>
  );
}
