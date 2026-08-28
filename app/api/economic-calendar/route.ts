import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || new Date().toISOString().split('T')[0];
    const toDate = new Date(from);
    toDate.setDate(toDate.getDate() + 7);
    const to = toDate.toISOString().split('T')[0];

    const url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${from}&to=${to}&apikey=${process.env.FMP_API_KEY}`;
    const res = await fetch(url, { cache: 'no-store' });
    const raw = await res.json();

    if (!Array.isArray(raw)) return NextResponse.json([]);

    const currencyMap: Record<string,string> = {
      'US':'USD','United States':'USD',
      'EU':'EUR','European Union':'EUR','DE':'EUR','FR':'EUR','IT':'EUR','ES':'EUR',
      'UK':'GBP','GB':'GBP','United Kingdom':'GBP',
      'JP':'JPY','Japan':'JPY',
      'CA':'CAD','Canada':'CAD',
      'CH':'CHF','Switzerland':'CHF',
      'AU':'AUD','Australia':'AUD',
      'NZ':'NZD','CN':'CNY','China':'CNY',
    };

    const filtered = (raw as Record<string,unknown>[])
      .map(e => {
        const country = String(e.country || e.currency || '');
        const moneda = currencyMap[country] || (country.length <= 4 ? country.toUpperCase() : null);
        if (!moneda) return null;
        const impact = String(e.impact || '');
        const impacto = impact === 'High' ? 'HIGH' : impact === 'Medium' ? 'MEDIUM' : 'LOW';
        const dateStr = String(e.date || '');
        const sep = dateStr.includes('T') ? 'T' : ' ';
        const [datePart, timePart] = dateStr.split(sep);
        return {
          fecha: datePart || '',
          hora: (timePart || '00:00').slice(0,5),
          moneda,
          impacto,
          titulo: String(e.event || ''),
          actual: e.actual != null ? String(e.actual) : null,
          estimado: e.estimate != null ? String(e.estimate) : null,
          previo: e.previous != null ? String(e.previous) : null,
          restringido: impacto === 'HIGH',
        };
      })
      .filter(Boolean)
      .sort((a: unknown,b: unknown) => {
        const ea = a as {fecha:string;hora:string};
        const eb = b as {fecha:string;hora:string};
        return ea.fecha.localeCompare(eb.fecha) || ea.hora.localeCompare(eb.hora);
      });

    return NextResponse.json(filtered);
  } catch(e) {
    console.error('Calendar error:', e);
    return NextResponse.json([]);
  }
}
