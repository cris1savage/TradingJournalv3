'use client';
import { useState } from 'react';

type Trade = { id: number; date: string; time: string; pair: string; dir: string; res: string; plan: string | null; pnl: number; emo: string; conf: string[]; notes: string; rr: string; rreal: string; };
type Capital = { initial: number; aportaciones: { amount: number }[] };

const G = {
  bg:'#0b1a2e',card:'#112240',card2:'#162d4a',border:'rgba(100,160,255,0.12)',
  accent:'#4d9fff',cyan:'#00e5ff',green:'#00e676',red:'#ff4081',gold:'#ffb300',purple:'#7c4dff',
  text:'#e8f4ff',muted:'#4a7a9b',muted2:'#6b9cc7',
};

const fmt = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '€';

function analyzeLocally(question: string, trades: Trade[], capital: Capital): string {
  if (!trades.length) return 'Aún no tienes operaciones registradas. Añade tus primeros trades para que pueda analizarlos.';

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const wins = trades.filter(t => t.res === 'win');
  const losses = trades.filter(t => t.res === 'loss');
  const wr = Math.round(wins.length / trades.length * 100);
  const conPlan = trades.filter(t => t.plan === 'yes');
  const sinPlan = trades.filter(t => t.plan === 'no');
  const pnlConPlan = conPlan.reduce((s, t) => s + t.pnl, 0);
  const pnlSinPlan = sinPlan.reduce((s, t) => s + t.pnl, 0);

  // By pair
  const byPair: Record<string, Trade[]> = {};
  trades.forEach(t => { if (!byPair[t.pair]) byPair[t.pair] = []; byPair[t.pair].push(t); });
  const bestPair = Object.entries(byPair).sort(([,a],[,b]) => b.reduce((s,t)=>s+t.pnl,0) - a.reduce((s,t)=>s+t.pnl,0))[0];
  const worstPair = Object.entries(byPair).sort(([,a],[,b]) => a.reduce((s,t)=>s+t.pnl,0) - b.reduce((s,t)=>s+t.pnl,0))[0];

  // By hour
  const byHour: Record<string, Trade[]> = {};
  trades.forEach(t => { const h = t.time ? parseInt(t.time.split(':')[0]) : 14; const hk = h < 10 ? '08-10h' : h < 12 ? '10-12h' : h < 14 ? '12-14h' : h < 16 ? '14-16h' : h < 18 ? '16-18h' : '18-21h'; if (!byHour[hk]) byHour[hk] = []; byHour[hk].push(t); });
  const bestHour = Object.entries(byHour).sort(([,a],[,b]) => b.reduce((s,t)=>s+t.pnl,0) - a.reduce((s,t)=>s+t.pnl,0))[0];

  // By day
  const byDay: Record<string, Trade[]> = {};
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  trades.forEach(t => { const dk = days[new Date(t.date).getDay()]; if (!byDay[dk]) byDay[dk] = []; byDay[dk].push(t); });
  const bestDay = Object.entries(byDay).sort(([,a],[,b]) => b.reduce((s,t)=>s+t.pnl,0) - a.reduce((s,t)=>s+t.pnl,0))[0];

  // By emo
  const byEmo: Record<string, Trade[]> = {};
  trades.forEach(t => { const e = t.emo || 'Sin registrar'; if (!byEmo[e]) byEmo[e] = []; byEmo[e].push(t); });
  const worstEmo = Object.entries(byEmo).sort(([,a],[,b]) => a.reduce((s,t)=>s+t.pnl,0) - b.reduce((s,t)=>s+t.pnl,0))[0];

  // Streak
  const recent = [...trades].reverse();
  let lossStreak = 0;
  for (const t of recent) { if (t.res === 'loss') lossStreak++; else break; }

  // Today
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.date === today);
  const todayPnl = todayTrades.reduce((s, t) => s + t.pnl, 0);

  // Week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekTrades = trades.filter(t => new Date(t.date) >= weekAgo);
  const weekPnl = weekTrades.reduce((s, t) => s + t.pnl, 0);
  const weekWr = weekTrades.length ? Math.round(weekTrades.filter(t => t.res === 'win').length / weekTrades.length * 100) : 0;

  // Month
  const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
  const monthTrades = trades.filter(t => new Date(t.date) >= monthAgo);
  const monthPnl = monthTrades.reduce((s, t) => s + t.pnl, 0);

  const q = question.toLowerCase();

  // Route question to right analysis
  if (q.includes('error') || q.includes('fallo') || q.includes('mal') || q.includes('perdiendo')) {
    const mainError = pnlSinPlan < 0 && sinPlan.length > 0
      ? `Tu mayor error es operar sin plan. Tienes ${sinPlan.length} operaciones sin plan con un resultado de ${fmt(pnlSinPlan)}€, mientras que con plan llevas ${fmt(pnlConPlan)}€.`
      : lossStreak >= 2
      ? `Llevas ${lossStreak} pérdidas consecutivas. Esto suele indicar que el mercado no está alineado con tu análisis o que estás operando emocionalmente.`
      : worstEmo && worstEmo[1].reduce((s,t)=>s+t.pnl,0) < -10
      ? `Cuando operas en estado "${worstEmo[0].replace(/[^\w\s]/g,'').trim()}" pierdes ${fmt(worstEmo[1].reduce((s,t)=>s+t.pnl,0))}€. Es tu estado emocional más dañino.`
      : `Con ${trades.length} operaciones y ${wr}% de win rate, tu mayor área de mejora es la consistencia. Sigue el plan en cada trade.`;
    return mainError;
  }

  if (q.includes('horario') || q.includes('hora') || q.includes('cuando') || q.includes('cuándo') || q.includes('estado')) {
    const hourInfo = bestHour ? `Tu mejor franja horaria es ${bestHour[0]} con ${fmt(bestHour[1].reduce((s,t)=>s+t.pnl,0))} y ${Math.round(bestHour[1].filter(t=>t.res==='win').length/bestHour[1].length*100)}% WR en ${bestHour[1].length} ops.` : 'Necesitas más operaciones para detectar tu mejor horario.';
    const emoInfo = worstEmo ? ` Evita operar en estado "${worstEmo[0].replace(/[^\w\s]/g,'').trim()}" — es cuando peor rindes.` : '';
    return hourInfo + emoInfo;
  }

  if (q.includes('semana') || q.includes('esta semana')) {
    if (!weekTrades.length) return 'No tienes operaciones esta semana todavía.';
    return `Esta semana llevas ${fmt(weekPnl)} en ${weekTrades.length} operaciones con ${weekWr}% de win rate. ${weekPnl > 0 ? 'Buena semana, mantén la disciplina.' : 'Semana negativa. Revisa si has respetado el plan en cada trade.'}`;
  }

  if (q.includes('mes') || q.includes('este mes')) {
    if (!monthTrades.length) return 'No tienes operaciones este mes todavía.';
    const mWr = Math.round(monthTrades.filter(t=>t.res==='win').length/monthTrades.length*100);
    return `Este mes llevas ${fmt(monthPnl)} en ${monthTrades.length} operaciones con ${mWr}% de win rate. ${monthPnl > 0 ? 'Mes positivo.' : 'Mes negativo — analiza qué trades podrían haberse evitado.'}`;
  }

  if (q.includes('activo') || q.includes('par') || q.includes('oro') || q.includes('nasdaq') || q.includes('mejor activo')) {
    if (!bestPair) return 'Necesitas más operaciones para analizar por activo.';
    const bpPnl = bestPair[1].reduce((s,t)=>s+t.pnl,0);
    const bpWr = Math.round(bestPair[1].filter(t=>t.res==='win').length/bestPair[1].length*100);
    const wpPnl = worstPair[1].reduce((s,t)=>s+t.pnl,0);
    return `Tu mejor activo es ${bestPair[0]} con ${fmt(bpPnl)} y ${bpWr}% WR en ${bestPair[1].length} ops. ${worstPair[0] !== bestPair[0] ? `El peor es ${worstPair[0]} con ${fmt(wpPnl)}.` : ''}`;
  }

  if (q.includes('sobreoper') || q.includes('muchos trades') || q.includes('demasiado')) {
    const byDate: Record<string, number> = {};
    trades.forEach(t => { byDate[t.date] = (byDate[t.date] || 0) + 1; });
    const avgDaily = (trades.length / Math.max(Object.keys(byDate).length, 1)).toFixed(1);
    const maxDay = Math.max(...Object.values(byDate));
    return `Tu media es ${avgDaily} operaciones por día. El día que más operaste fueron ${maxDay} trades. ${parseFloat(avgDaily) > 3 ? 'Estás operando demasiado — la calidad supera a la cantidad.' : 'Tu volumen diario es razonable.'}`;
  }

  if (q.includes('riesgo') || q.includes('respetando')) {
    const planPct = trades.length ? Math.round(conPlan.length / trades.length * 100) : 0;
    return `Respetas el plan en el ${planPct}% de tus operaciones. Con plan: ${fmt(pnlConPlan)} | Sin plan: ${fmt(pnlSinPlan)}. ${planPct >= 80 ? 'Buena disciplina.' : 'Necesitas mejorar la disciplina — opera solo con plan definido.'}`;
  }

  if (q.includes('ventaja') || q.includes('edge')) {
    const bpInfo = bestPair ? `${bestPair[0]} (${fmt(bestPair[1].reduce((s,t)=>s+t.pnl,0))})` : '—';
    const bhInfo = bestHour ? bestHour[0] : '—';
    const bdInfo = bestDay ? bestDay[0] : '—';
    return `Tu ventaja está en ${bpInfo}, en el horario ${bhInfo}, los ${bdInfo}. Con plan tienes ${fmt(pnlConPlan)} vs ${fmt(pnlSinPlan)} sin plan. Esa diferencia es tu verdadera ventaja.`;
  }

  if (q.includes('mejorar') || q.includes('consejo') || q.includes('semana')) {
    const tips = [];
    if (wr < 50) tips.push('sé más selectivo con los setups');
    if (conPlan.length < trades.length * 0.8) tips.push('opera siempre con plan definido');
    if (lossStreak >= 2) tips.push('para el día después de 2 pérdidas consecutivas');
    if (worstEmo && worstEmo[1].reduce((s,t)=>s+t.pnl,0) < 0) tips.push(`evita operar en estado ${worstEmo[0].replace(/[^\w\s]/g,'').trim()}`);
    return tips.length > 0
      ? `Para mejorar esta semana: ${tips.join(', ')}.`
      : `Llevas ${fmt(totalPnl)} con ${wr}% WR. Mantén la consistencia y sigue el plan.`;
  }

  if (q.includes('hoy') || q.includes('operar hoy') || q.includes('seguir')) {
    if (lossStreak >= 2) return `❌ No recomiendo seguir operando. Llevas ${lossStreak} pérdidas consecutivas. Para el día y revisa tu análisis mañana con la mente fresca.`;
    if (todayTrades.length >= 3) return `⚠️ Ya llevas ${todayTrades.length} trades hoy con ${fmt(todayPnl)}. Considera parar — más operaciones no siempre significa más beneficio.`;
    if (todayPnl > 0 && todayTrades.length > 0) return `✅ Llevas ${fmt(todayPnl)} hoy en ${todayTrades.length} trades. Si has cumplido tu objetivo diario, protege el beneficio y para.`;
    return `Hoy llevas ${todayTrades.length} trades. Opera solo si ves un setup claro que cumpla tu plan.`;
  }

  // Default: general summary
  return `Resumen de tu trading: ${trades.length} operaciones, ${wr}% WR, ${fmt(totalPnl)} P&L total. ${bestPair ? `Mejor activo: ${bestPair[0]}.` : ''} ${bestHour ? `Mejor horario: ${bestHour[0]}.` : ''} ${conPlan.length < trades.length * 0.8 ? 'Área principal de mejora: respetar el plan.' : 'Buena disciplina general.'}`;
}

type Msg = { role: 'user' | 'assistant'; text: string };

const QUICK = [
  '¿Cuál es mi mayor error de trading?',
  '¿Cuándo rindo mejor — horario y estado?',
  '¿Qué debo mejorar esta semana?',
  '¿Debería seguir operando hoy?',
  '¿Cuál es mi ventaja real?',
  '¿Qué activo me da más beneficio?',
];

export default function AICoachClient({ trades, capital }: { trades: Trade[]; capital: Capital }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', text: `¡Hola Cristian! 👋 Soy tu entrenador de trading personal. Tengo acceso a tus ${trades.length} operaciones registradas y analizo tus patrones reales.\n\n¿Sobre qué quieres que te dé feedback?` }
  ]);
  const [input, setInput] = useState('');

  function send(question?: string) {
    const q = question || input.trim();
    if (!q) return;
    setInput('');
    const answer = analyzeLocally(q, trades, capital);
    setMsgs(prev => [...prev,
      { role: 'user', text: q },
      { role: 'assistant', text: answer }
    ]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 500 }}>
      <div style={{ background: `${G.accent}10`, border: `1px solid ${G.accent}30`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <span style={{ fontSize: 12, color: G.muted2, fontFamily: 'Outfit, sans-serif' }}>Análisis local · Usa tus datos reales · Sin límites</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'assistant' && (
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${G.accent},${G.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginRight: 8, marginTop: 2 }}>🤖</div>
            )}
            <div style={{
              maxWidth: '82%', padding: '11px 15px',
              borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: m.role === 'user' ? `linear-gradient(135deg,${G.accent},${G.cyan})` : G.card,
              border: m.role === 'assistant' ? `1px solid ${G.border}` : 'none',
              color: m.role === 'user' ? '#05111e' : G.text,
              fontSize: 13, lineHeight: 1.7, fontFamily: 'Outfit, sans-serif',
              whiteSpace: 'pre-line', fontWeight: m.role === 'user' ? 600 : 400,
            }}>{m.text}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)} style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${G.border}`, background: 'transparent', color: G.muted2, fontSize: 11, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'all 0.12s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = G.accent; (e.currentTarget as HTMLButtonElement).style.color = G.accent; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = G.border; (e.currentTarget as HTMLButtonElement).style.color = G.muted2; }}>
            {q}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Pregunta algo sobre tu trading..."
          style={{ flex: 1, background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, padding: '11px 14px', color: G.text, fontFamily: 'Outfit, sans-serif', fontSize: 13, outline: 'none' }}
        />
        <button onClick={() => send()} disabled={!input.trim()} style={{ padding: '11px 18px', background: `linear-gradient(135deg,${G.accent},${G.cyan})`, border: 'none', borderRadius: 10, color: '#05111e', fontSize: 14, fontWeight: 700, cursor: !input.trim() ? 'not-allowed' : 'pointer', fontFamily: 'Outfit, sans-serif', opacity: !input.trim() ? 0.6 : 1, flexShrink: 0 }}>→</button>
      </div>
    </div>
  );
}
