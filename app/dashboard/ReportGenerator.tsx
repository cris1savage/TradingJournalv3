'use client';
import { useState } from 'react';

type Trade = { id: number; date: string; time: string; pair: string; tf: string; dir: string; res: string; plan: string | null; entry: number; sl: number; tp: number; risk: number; lot: number; rr: string; pnl: number; rreal: string; conf: string[]; emo: string; notes: string; };
type Capital = { initial: number; aportaciones: { id: number; date: string; amount: number; desc: string }[]; };

const G = {
  card:'#112240',card2:'#162d4a',border:'rgba(100,160,255,0.12)',
  accent:'#4d9fff',cyan:'#00e5ff',green:'#00e676',red:'#ff4081',gold:'#ffb300',purple:'#7c4dff',
  text:'#e8f4ff',muted:'#4a7a9b',muted2:'#6b9cc7',
};

const fmt = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '€';
const fmtA = (n: number) => n.toFixed(2) + '€';

export default function ReportGenerator({ trades, capital }: { trades: Trade[]; capital: Capital }) {
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [generating, setGenerating] = useState(false);

  const now = new Date();
  const getPeriodTrades = () => {
    if (period === 'all') return trades;
    const cutoff = new Date();
    if (period === 'week') cutoff.setDate(now.getDate() - 7);
    if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
    if (period === 'year') cutoff.setFullYear(now.getFullYear() - 1);
    return trades.filter(t => new Date(t.date) >= cutoff);
  };

  const pt = getPeriodTrades();
  const totalPnl = pt.reduce((s, t) => s + t.pnl, 0);
  const wins = pt.filter(t => t.res === 'win').length;
  const losses = pt.filter(t => t.res === 'loss').length;
  const bes = pt.filter(t => t.res === 'be').length;
  const wr = pt.length ? Math.round(wins / pt.length * 100) : 0;
  const balance = capital.initial + capital.aportaciones.reduce((s, a) => s + a.amount, 0) + trades.reduce((s, t) => s + t.pnl, 0);
  const byPair: Record<string, Trade[]> = {};
  pt.forEach(t => { if (!byPair[t.pair]) byPair[t.pair] = []; byPair[t.pair].push(t); });

  const periodLabel = { week: 'Última semana', month: 'Último mes', year: 'Último año', all: 'Histórico completo' }[period];

  async function generatePDF() {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210, margin = 20;

      // Background
      doc.setFillColor(6, 14, 31);
      doc.rect(0, 0, W, 297, 'F');

      // Header gradient bar
      doc.setFillColor(13, 31, 56);
      doc.rect(0, 0, W, 40, 'F');
      doc.setFillColor(77, 159, 255);
      doc.rect(0, 0, W, 2, 'F');

      // Logo area
      doc.setFillColor(6, 14, 31);
      doc.roundedRect(margin, 8, 24, 24, 4, 4, 'F');
      doc.setFontSize(14);
      doc.setTextColor(0, 229, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('ST', margin + 12, 23, { align: 'center' });

      // Title
      doc.setFontSize(18);
      doc.setTextColor(232, 244, 255);
      doc.text('SAVAGE TRADING', margin + 28, 18);
      doc.setFontSize(9);
      doc.setTextColor(74, 122, 155);
      doc.setFont('helvetica', 'normal');
      doc.text('JOURNAL PRO — INFORME DE RENDIMIENTO', margin + 28, 25);
      doc.setFontSize(8);
      doc.setTextColor(77, 159, 255);
      doc.text(`${periodLabel.toUpperCase()} · Generado ${now.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin + 28, 32);

      let y = 52;

      // SUMMARY CARDS
      const cards = [
        { label: 'BALANCE', val: fmtA(balance), col: [0, 229, 255] as [number,number,number] },
        { label: 'P&L PERIODO', val: fmt(totalPnl), col: totalPnl >= 0 ? [0, 230, 118] as [number,number,number] : [255, 64, 129] as [number,number,number] },
        { label: 'WIN RATE', val: wr + '%', col: wr >= 50 ? [0, 230, 118] as [number,number,number] : [255, 64, 129] as [number,number,number] },
        { label: 'OPERACIONES', val: String(pt.length), col: [255, 179, 0] as [number,number,number] },
      ];
      const cardW = (W - margin * 2 - 9) / 4;
      cards.forEach((c, i) => {
        const x = margin + i * (cardW + 3);
        doc.setFillColor(17, 34, 64);
        doc.roundedRect(x, y, cardW, 22, 3, 3, 'F');
        doc.setDrawColor(...c.col);
        doc.setLineWidth(0.5);
        doc.line(x, y, x + cardW, y);
        doc.setFontSize(7);
        doc.setTextColor(74, 122, 155);
        doc.setFont('helvetica', 'normal');
        doc.text(c.label, x + cardW / 2, y + 7, { align: 'center' });
        doc.setFontSize(13);
        doc.setTextColor(...c.col);
        doc.setFont('helvetica', 'bold');
        doc.text(c.val, x + cardW / 2, y + 17, { align: 'center' });
      });
      y += 30;

      // W/L/BE
      doc.setFillColor(17, 34, 64);
      doc.roundedRect(margin, y, W - margin * 2, 14, 3, 3, 'F');
      doc.setFontSize(8);
      [
        { l: `✓ WINS: ${wins}`, c: [0, 230, 118] as [number,number,number] },
        { l: `✕ LOSSES: ${losses}`, c: [255, 64, 129] as [number,number,number] },
        { l: `— BREAKEVEN: ${bes}`, c: [107, 156, 199] as [number,number,number] },
        { l: `DÍAS OPERADOS: ${[...new Set(pt.map(t => t.date))].length}`, c: [255, 179, 0] as [number,number,number] },
      ].forEach((item, i) => {
        doc.setTextColor(...item.c);
        doc.setFont('helvetica', 'bold');
        doc.text(item.l, margin + 8 + i * 43, y + 9);
      });
      y += 22;

      // BY PAIR section
      if (Object.keys(byPair).length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(77, 159, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('RENDIMIENTO POR ACTIVO', margin, y);
        doc.setDrawColor(77, 159, 255, 0.3);
        doc.setLineWidth(0.3);
        doc.line(margin, y + 2, W - margin, y + 2);
        y += 8;

        // Table header
        doc.setFillColor(22, 45, 74);
        doc.rect(margin, y, W - margin * 2, 8, 'F');
        doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        [['ACTIVO', margin + 5], ['TRADES', margin + 45], ['WINS', margin + 70], ['WR%', margin + 95], ['P&L', margin + 120], ['MEJOR', margin + 145]].forEach(([h, x]) => {
          doc.setTextColor(74, 122, 155);
          doc.text(String(h), Number(x), y + 5.5);
        });
        y += 8;

        Object.entries(byPair).forEach(([pair, ts], idx) => {
          const pw = ts.filter(t => t.res === 'win').length;
          const ppnl = ts.reduce((s, t) => s + t.pnl, 0);
          const pwr = Math.round(pw / ts.length * 100);
          const best = Math.max(...ts.map(t => t.pnl));
          doc.setFillColor(idx % 2 === 0 ? 17 : 13, idx % 2 === 0 ? 34 : 27, idx % 2 === 0 ? 64 : 51);
          doc.rect(margin, y, W - margin * 2, 7, 'F');
          doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
          [
            [pair, margin + 5, [0, 229, 255]],
            [String(ts.length), margin + 45, [232, 244, 255]],
            [String(pw), margin + 70, [0, 230, 118]],
            [pwr + '%', margin + 95, pwr >= 50 ? [0, 230, 118] : [255, 64, 129]],
            [fmt(ppnl), margin + 120, ppnl >= 0 ? [0, 230, 118] : [255, 64, 129]],
            [fmt(best), margin + 145, [255, 179, 0]],
          ].forEach(([val, x, col]) => {
            doc.setTextColor(...(col as [number,number,number]));
            doc.text(String(val), Number(x), y + 5);
          });
          y += 7;
        });
        y += 8;
      }

      // TRADE LIST
      if (pt.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(77, 159, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('DETALLE DE OPERACIONES', margin, y);
        doc.setLineWidth(0.3);
        doc.line(margin, y + 2, W - margin, y + 2);
        y += 8;

        // Header
        doc.setFillColor(22, 45, 74);
        doc.rect(margin, y, W - margin * 2, 8, 'F');
        doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(74, 122, 155);
        [['FECHA', margin + 3], ['ACTIVO', margin + 28], ['DIR', margin + 55], ['RESULTADO', margin + 72], ['P&L', margin + 102], ['R:R', margin + 127], ['PLAN', margin + 148], ['EMO', margin + 163]].forEach(([h, x]) => doc.text(String(h), Number(x), y + 5.5));
        y += 8;

        const displayTrades = pt.slice(-30); // last 30
        displayTrades.forEach((t, idx) => {
          if (y > 270) { doc.addPage(); doc.setFillColor(6, 14, 31); doc.rect(0, 0, W, 297, 'F'); y = 20; }
          doc.setFillColor(idx % 2 === 0 ? 17 : 13, idx % 2 === 0 ? 34 : 27, idx % 2 === 0 ? 64 : 51);
          doc.rect(margin, y, W - margin * 2, 6.5, 'F');
          doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
          const resColor: [number,number,number] = t.res === 'win' ? [0, 230, 118] : t.res === 'loss' ? [255, 64, 129] : [107, 156, 199];
          [
            [t.date, margin + 3, [107, 156, 199]],
            [t.pair, margin + 28, [0, 229, 255]],
            [t.dir === 'buy' ? '▲ L' : '▼ S', margin + 55, t.dir === 'buy' ? [0, 230, 118] : [255, 64, 129]],
            [t.res.toUpperCase(), margin + 72, resColor],
            [fmt(t.pnl), margin + 102, t.pnl >= 0 ? [0, 230, 118] : [255, 64, 129]],
            [t.rr || '—', margin + 127, [255, 179, 0]],
            [t.plan === 'yes' ? '✓' : t.plan === 'no' ? '✕' : '—', margin + 148, t.plan === 'yes' ? [0, 230, 118] : [255, 64, 129]],
            [(t.emo || '—').slice(0, 10), margin + 163, [107, 156, 199]],
          ].forEach(([val, x, col]) => { doc.setTextColor(...(col as [number,number,number])); doc.text(String(val), Number(x), y + 4.5); });
          y += 6.5;
        });
        if (pt.length > 30) {
          doc.setFontSize(7); doc.setTextColor(74, 122, 155);
          doc.text(`... y ${pt.length - 30} operaciones más`, margin, y + 5);
        }
      }

      // Footer
      const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(13, 31, 56);
        doc.rect(0, 285, W, 12, 'F');
        doc.setFontSize(7); doc.setTextColor(74, 122, 155);
        doc.text('SAVAGE TRADING JOURNAL PRO · Informe privado · No compartir', margin, 292);
        doc.text(`Pág. ${i}/${pageCount}`, W - margin, 292, { align: 'right' });
      }

      const filename = `savage-trading-informe-${period}-${now.toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
    } catch (e) {
      console.error(e);
      alert('Error generando el PDF. Inténtalo de nuevo.');
    }
    setGenerating(false);
  }

  return (
    <div>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {([['week', 'Última semana'], ['month', 'Último mes'], ['year', 'Último año'], ['all', 'Histórico completo']] as const).map(([p, l]) => (
          <button key={p} onClick={() => setPeriod(p)} style={{ padding: '8px 18px', borderRadius: 20, border: `1px solid ${period === p ? G.accent : G.border}`, background: period === p ? `${G.accent}18` : 'transparent', color: period === p ? G.accent : G.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: period === p ? 600 : 400, transition: 'all 0.15s' }}>{l}</button>
        ))}
      </div>

      {/* Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { l: 'P&L', v: fmt(totalPnl), c: totalPnl >= 0 ? G.green : G.red },
          { l: 'Win Rate', v: wr + '%', c: wr >= 50 ? G.green : G.red },
          { l: 'Operaciones', v: String(pt.length), c: G.gold },
          { l: 'Balance actual', v: fmtA(balance), c: G.accent },
        ].map(s => (
          <div key={s.l} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: '14px 16px', borderTop: `2px solid ${s.c}` }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: G.muted, marginBottom: 6, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{s.l}</div>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Generate button */}
      <button onClick={generatePDF} disabled={generating || pt.length === 0} style={{ width: '100%', padding: '14px', background: generating || pt.length === 0 ? G.muted : `linear-gradient(135deg,${G.accent},${G.cyan})`, border: 'none', borderRadius: 12, color: '#05111e', fontSize: 15, fontWeight: 700, cursor: generating || pt.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Outfit, sans-serif', opacity: generating || pt.length === 0 ? 0.6 : 1, transition: 'all 0.2s', boxShadow: generating || pt.length === 0 ? 'none' : `0 0 24px ${G.accent}40`, letterSpacing: '0.02em' }}>
        {generating ? '⟳ Generando PDF...' : pt.length === 0 ? 'Sin operaciones en este periodo' : `📄 Descargar informe — ${periodLabel}`}
      </button>

      {pt.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px', color: G.muted, fontSize: 13, marginTop: 10 }}>
          No hay operaciones en el período seleccionado.
        </div>
      )}

      <div style={{ background: `${G.accent}08`, border: `1px solid ${G.accent}25`, borderRadius: 12, padding: 14, marginTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: G.accent, fontFamily: 'Outfit', marginBottom: 6 }}>📄 El informe incluye</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {['Balance y P&L del período', 'Wins / Losses / Breakeven', 'Rendimiento por activo', 'Detalle de operaciones (últimas 30)', 'Marca Savage Trading', 'Diseño profesional en PDF'].map(i => (
            <div key={i} style={{ fontSize: 11, color: G.muted2, fontFamily: 'Outfit' }}>✓ {i}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
