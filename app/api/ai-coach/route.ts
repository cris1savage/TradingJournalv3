import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { question, trades, capital } = await req.json();

  if (!trades || trades.length === 0) {
    return NextResponse.json({ answer: 'Aún no tienes operaciones registradas. Añade tus primeros trades para que pueda analizarlos y darte feedback personalizado.' });
  }

  // Build stats context from real data
  const totalPnl = trades.reduce((s: number, t: any) => s + t.pnl, 0);
  const wins = trades.filter((t: any) => t.res === 'win');
  const losses = trades.filter((t: any) => t.res === 'loss');
  const wr = Math.round(wins.length / trades.length * 100);
  const byPair: Record<string, any[]> = {};
  const byDir: Record<string, any[]> = {};
  const byPlan: Record<string, any[]> = {};
  const byEmo: Record<string, any[]> = {};
  const byHour: Record<string, any[]> = {};
  const byDay: Record<string, any[]> = {};
  const byDate: Record<string, any[]> = {};

  trades.forEach((t: any) => {
    if (!byPair[t.pair]) byPair[t.pair] = [];
    byPair[t.pair].push(t);
    if (!byDir[t.dir]) byDir[t.dir] = [];
    byDir[t.dir].push(t);
    const planKey = t.plan || 'unknown';
    if (!byPlan[planKey]) byPlan[planKey] = [];
    byPlan[planKey].push(t);
    const emo = t.emo || 'Sin registrar';
    if (!byEmo[emo]) byEmo[emo] = [];
    byEmo[emo].push(t);
    const hour = t.time ? parseInt(t.time.split(':')[0]) : 12;
    const hk = hour < 10 ? '08-10h' : hour < 12 ? '10-12h' : hour < 14 ? '12-14h' : hour < 16 ? '14-16h' : hour < 18 ? '16-18h' : '18-20h';
    if (!byHour[hk]) byHour[hk] = [];
    byHour[hk].push(t);
    const d = new Date(t.date);
    const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const dk = days[d.getDay()];
    if (!byDay[dk]) byDay[dk] = [];
    byDay[dk].push(t);
    if (!byDate[t.date]) byDate[t.date] = [];
    byDate[t.date].push(t);
  });

  const statsContext = `
DATOS REALES DEL TRADER:
- Total operaciones: ${trades.length}
- P&L total: ${totalPnl.toFixed(2)}€
- Win rate: ${wr}%
- Wins: ${wins.length} | Losses: ${losses.length} | BE: ${trades.filter((t:any)=>t.res==='be').length}
- Con plan: ${trades.filter((t:any)=>t.plan==='yes').length} | Sin plan: ${trades.filter((t:any)=>t.plan==='no').length}
- P&L con plan: ${trades.filter((t:any)=>t.plan==='yes').reduce((s:number,t:any)=>s+t.pnl,0).toFixed(2)}€
- P&L sin plan: ${trades.filter((t:any)=>t.plan==='no').reduce((s:number,t:any)=>s+t.pnl,0).toFixed(2)}€

POR ACTIVO:
${Object.entries(byPair).map(([pair, ts]) => {
  const w = ts.filter((t:any)=>t.res==='win').length;
  const pnl = ts.reduce((s:number,t:any)=>s+t.pnl,0);
  return `  ${pair}: ${ts.length} ops, WR ${Math.round(w/ts.length*100)}%, P&L ${pnl.toFixed(2)}€`;
}).join('\n')}

POR DIRECCIÓN:
${Object.entries(byDir).map(([dir, ts]) => {
  const w = ts.filter((t:any)=>t.res==='win').length;
  const pnl = ts.reduce((s:number,t:any)=>s+t.pnl,0);
  return `  ${dir==='buy'?'LONG':'SHORT'}: ${ts.length} ops, WR ${Math.round(w/ts.length*100)}%, P&L ${pnl.toFixed(2)}€`;
}).join('\n')}

POR HORARIO:
${Object.entries(byHour).map(([h, ts]) => {
  const w = ts.filter((t:any)=>t.res==='win').length;
  const pnl = ts.reduce((s:number,t:any)=>s+t.pnl,0);
  return `  ${h}: ${ts.length} ops, WR ${Math.round(w/ts.length*100)}%, P&L ${pnl.toFixed(2)}€`;
}).join('\n')}

POR DÍA:
${Object.entries(byDay).map(([day, ts]) => {
  const w = ts.filter((t:any)=>t.res==='win').length;
  const pnl = ts.reduce((s:number,t:any)=>s+t.pnl,0);
  return `  ${day}: ${ts.length} ops, WR ${Math.round(w/ts.length*100)}%, P&L ${pnl.toFixed(2)}€`;
}).join('\n')}

ESTADO EMOCIONAL:
${Object.entries(byEmo).map(([emo, ts]) => {
  const w = ts.filter((t:any)=>t.res==='win').length;
  const pnl = ts.reduce((s:number,t:any)=>s+t.pnl,0);
  return `  ${emo}: ${ts.length} ops, WR ${Math.round(w/ts.length*100)}%, P&L ${pnl.toFixed(2)}€`;
}).join('\n')}

ESTA SEMANA (últimos 7 días):
${(() => {
  const week = new Date(); week.setDate(week.getDate()-7);
  const wt = trades.filter((t:any)=>new Date(t.date)>=week);
  if (!wt.length) return '  Sin operaciones esta semana';
  const wp = wt.reduce((s:number,t:any)=>s+t.pnl,0);
  const ww = wt.filter((t:any)=>t.res==='win').length;
  return `  ${wt.length} ops, WR ${Math.round(ww/wt.length*100)}%, P&L ${wp.toFixed(2)}€`;
})()}

MEDIA DIARIA DE OPERACIONES: ${(trades.length / Math.max(Object.keys(byDate).length, 1)).toFixed(1)}
`;

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ answer: '❌ ANTHROPIC_API_KEY no está configurada en Vercel Environment Variables.' });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: `Eres un entrenador de trading profesional integrado en la plataforma Savage Trading de Cristian. 
Tienes acceso a los datos REALES de trading de Cristian. 
Responde SIEMPRE en español, de forma directa, honesta y constructiva.
Usa SOLO los datos proporcionados. NUNCA inventes estadísticas.
Si los datos no son suficientes para responder, dilo claramente.
Sé conciso pero útil. Máximo 4-5 frases.
Menciona números concretos de los datos cuando sea relevante.`,
        messages: [{ role: 'user', content: `${statsContext}\n\nPREGUNTA DE CRISTIAN: ${question}` }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic error:', response.status, errText);
      return NextResponse.json({ answer: `❌ Error API ${response.status}: ${errText.slice(0, 200)}` });
    }
    const data = await response.json();
    const answer = data.content?.[0]?.text || 'No pude procesar la respuesta.';
    return NextResponse.json({ answer });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Coach error:', msg);
    return NextResponse.json({ answer: `❌ Error: ${msg}` });
  }
}
