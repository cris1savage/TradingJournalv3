import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || new Date().toISOString().split('T')[0];
    const toDate = new Date(from + 'T12:00:00');
    toDate.setDate(toDate.getDate() + 7);
    const to = toDate.toISOString().split('T')[0];

    // Investing.com economic calendar - server side fetch bypasses CORS
    const res = await fetch(
      `https://economic-calendar.investing.com/economic-calendar/Service/getCalendarFilteredData`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://es.investing.com/economic-calendar/',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'es-ES,es;q=0.9',
          'Origin': 'https://es.investing.com',
        },
        body: new URLSearchParams({
          'country[]': ['5', '22', '6', '25', '32', '17'].join('&country[]='),
          dateFrom: from,
          dateTo: to,
          timeZone: '18',
          timeFilter: 'timeRemain',
          currentTab: 'custom',
          limit_from: '0',
        }).toString(),
        cache: 'no-store',
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    // Try to parse - Investing returns HTML rows
    const events: {fecha:string;hora:string;moneda:string;impacto:string;titulo:string;actual:string|null;estimado:string|null;previo:string|null;restringido:boolean}[] = [];

    // Parse the HTML table rows
    const rowRegex = /<tr[^>]*id="eventRowId_(\d+)"[^>]*data-importance="(\d+)"[^>]*>([\s\S]*?)<\/tr>/g;
    const tdRegex = /<td[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/td>/g;

    let match;
    while ((match = rowRegex.exec(text)) !== null) {
      const importance = parseInt(match[2]);
      const rowHtml = match[3];
      
      // Extract cells
      const cells: string[] = [];
      let tdMatch;
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/g;
      while ((tdMatch = tdRe.exec(rowHtml)) !== null) {
        cells.push(tdMatch[1].replace(/<[^>]+>/g, '').trim());
      }

      if (cells.length >= 4) {
        const impacto = importance >= 3 ? 'HIGH' : importance >= 2 ? 'MEDIUM' : 'LOW';
        events.push({
          fecha: from, // approximate - would need date parsing
          hora: cells[0] || '00:00',
          moneda: cells[1] || 'USD',
          impacto,
          titulo: cells[3] || '',
          actual: cells[4] || null,
          estimado: cells[5] || null,
          previo: cells[6] || null,
          restringido: importance >= 3,
        });
      }
    }

    if (events.length > 0) return NextResponse.json(events);

    // Fallback: try JSON response
    try {
      const json = JSON.parse(text);
      if (json.data) return NextResponse.json(json.data);
    } catch { /* not JSON */ }

    return NextResponse.json([]);
  } catch(e) {
    console.error('Calendar error:', e);
    return NextResponse.json([]);
  }
}
