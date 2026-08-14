import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { question, trades, capital } = await req.json();
  
  // Build context from real data
  const totalPnl = trades.reduce((s: number, t: { pnl: number }) => s + t.pnl, 0);
  const wins = trades.filter((t: { res: string }) => t.res === 'win').length;
  const losses = trades.filter((t: { res: string }) => t.res === 'loss').length;
  const wr = trades.length ? Math.round(wins / trades.length * 100) : 0;
  
  const byPair: Record<string, { pnl: number; trades: number; wins: number }> = {};
  trades.forEach((t: { pair: string; pnl: number; res: string }) => {
    if (!byPair[t.pair]) byPair[t.pair] = { pnl: 0, trades: 0, wins: 0 };
    byPair[t.pair].pnl += t.pnl;
    byPair[t.pair].trades++;
    if (t.res === 'win') byPair[t.pair].wins++;
  });

  const byDay: Record<string, { pnl: number; trades: number }> = {};
  trades.forEach((t: { date: string; pnl: number }) => {
    const day = new Date(t.date).toLocaleDateString('es-ES', { weekday: 'long' });
    if (!byDay[day]) byDay[day] = { pnl: 0, trades: 0 };
    byDay[day].pnl += t.pnl; byDay[day].trades++;
  });

  const recentTrades = [...trades].reverse().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthTrades = trades.filter((t: { date: string }) => t.date.startsWith(thisMonth));
  const monthPnl = monthTrades.reduce((s: number, t: { pnl: number }) => s + t.pnl, 0);

  const systemPrompt = `Eres el entrenador de trading personal de Cristian. Analizas sus datos reales y le das feedback honesto y específico.

DATOS REALES DEL TRADER:
- Total operaciones: ${trades.length}
- Win rate global: ${wr}%
- P&L total: ${totalPnl.toFixed(2)}€
- P&L este mes: ${monthPnl.toFixed(2)}€ (${monthTrades.length} ops)
- Wins: ${wins} | Losses: ${losses} | BE: ${trades.filter((t: { res: string }) => t.res === 'be').length}
- Capital inicial: ${capital.initial}€
- Balance actual: ${(capital.initial + capital.aportaciones?.reduce((s: number, a: { amount: number }) => s + a.amount, 0) + totalPnl).toFixed(2)}€

RENDIMIENTO POR ACTIVO:
${Object.entries(byPair).map(([pair, s]) => `  ${pair}: ${s.trades} ops, ${Math.round(s.wins/s.trades*100)}% WR, ${s.pnl.toFixed(2)}€`).join('\n')}

RENDIMIENTO POR DÍA:
${Object.entries(byDay).map(([day, s]) => `  ${day}: ${s.trades} ops, ${s.pnl.toFixed(2)}€`).join('\n')}

ÚLTIMAS 10 OPERACIONES:
${recentTrades.map((t: { date: string; pair: string; res: string; pnl: number; plan: string | null }) => `  ${t.date} | ${t.pair} | ${t.res.toUpperCase()} | ${t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}€ | Plan: ${t.plan === 'yes' ? 'Sí' : t.plan === 'no' ? 'No' : '—'}`).join('\n')}

REGLAS:
- Solo usa los datos reales proporcionados
- Si no hay suficientes datos, dilo claramente
- Sé directo y específico, no genérico
- Máximo 150 palabras por respuesta
- Responde en español`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }]
      })
    });
    const data = await response.json();
    return NextResponse.json({ answer: data.content?.[0]?.text || 'Sin respuesta' });
  } catch {
    return NextResponse.json({ answer: 'Error conectando con el coach. Inténtalo de nuevo.' });
  }
}
