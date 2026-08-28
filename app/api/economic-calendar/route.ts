import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const today = new Date();
    const from = today.toISOString().split('T')[0];
    const to = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) throw new Error(`FMP error: ${res.status}`);
    const raw = await res.json() as {date:string;country:string;event:string;impact:string;actual:string|null;estimate:string|null;previous:string|null}[];

    const relevant = ['USD','EUR','GBP','JPY','CAD'];
    const filtered = raw
      .filter(e => relevant.includes((e.country||'').toUpperCase()))
      .map(e => ({
        fecha: (e.date||'').split(' ')[0],
        hora: (e.date||'').split(' ')[1]?.slice(0,5) || '00:00',
        moneda: (e.country||'USD').toUpperCase(),
        impacto: e.impact === 'High' ? 'HIGH' : e.impact === 'Medium' ? 'MEDIUM' : 'LOW',
        titulo: e.event || '',
        actual: e.actual || null,
        estimado: e.estimate || null,
        previo: e.previous || null,
        restringido: e.impact === 'High',
      }))
      .sort((a,b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));

    return NextResponse.json(filtered);
  } catch(e) {
    console.error(e);
    return NextResponse.json([]);
  }
}
