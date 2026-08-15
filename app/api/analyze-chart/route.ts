import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { imageBase64, question } = await req.json();
  if (!imageBase64) return NextResponse.json({ error: 'No image' }, { status: 400 });

  const prompt = question || 'Analiza este gráfico de trading. Identifica: tendencia principal, zonas de liquidez/soporte/resistencia clave, niveles Fibonacci relevantes, y si hay un setup válido ahora mismo. Sé directo y específico. Indica claramente si operarías o esperarías.';

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key no configurada en Vercel.' }, { status: 500 });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        system: `Eres un analista de trading profesional experto en price action, zonas de liquidez y Fibonacci. 
Cristian opera XAU/USD y NAS100 en day trading con timeframes 4H/1H/15M.
Responde siempre en español. Sé directo y concreto. Máximo 5-6 puntos clave.`,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return NextResponse.json({ analysis: data.content?.[0]?.text || 'No se pudo analizar.' });
  } catch {
    return NextResponse.json({ error: 'Error al analizar' }, { status: 500 });
  }
}
