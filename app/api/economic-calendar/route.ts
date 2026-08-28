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
    const raw = await res.json() as Record<string,unknown>[];

    // FMP uses different country/currency codes — map them all
    const currencyMap: Record<string,string> = {
      'US':'USD','United States':'USD','EUR':'EUR','EU':'EUR','European Union':'EUR',
      'UK':'GBP','GB':'GBP','United Kingdom':'GBP','JP':'JPY','Japan':'JPY',
      'CA':'CAD','Canada':'CAD','CH':'CHF','Switzerland':'CHF','AU':'AUD','Australia':'AUD',
      'USD':'USD','EUR':'EUR','GBP':'GBP','JPY':'JPY','CAD':'CAD','CHF':'CHF','AUD':'AUD',
    };

    const filtered = raw
      .map(e => {
        const country = String(e.country || e.currency || '');
        const moneda = currencyMap[country] || country.toUpperCase().slice(0,3);
        const impact = String(e.impact || e.importance || '');
        const impacto = impact === 'High' || impact === 'high' || impact === '3' ? 'HIGH'
          : impact === 'Medium' || impact === 'medium' || impact === '2' ? 'MEDIUM' : 'LOW';
        const dateStr = String(e.date || '');
        return {
          fecha: dateStr.split(' ')[0] || dateStr.split('T')[0] || '',
          hora: dateStr.includes(' ') ? dateStr.split(' ')[1]?.slice(0,5) || '00:00'
            : dateStr.includes('T') ? dateStr.split('T')[1]?.slice(0,5) || '00:00' : '00:00',
          moneda,
          impacto,
          titulo: String(e.event || e.name || e.title || ''),
          actual: e.actual != null ? String(e.actual) : null,
          estimado: e.estimate != null ? String(e.estimate) : null,
          previo: e.previous != null ? String(e.previous) : null,
          restringido: impacto === 'HIGH',
        };
      })
      .filter(e => e.titulo && e.fecha)
      .sort((a,b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));

    return NextResponse.json(filtered);
  } catch(e) {
    console.error('Economic calendar error:', e);
    return NextResponse.json([]);
  }
}
