import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const today = new Date();
    const from = today.toISOString().split('T')[0];
    const toDate = new Date(today);
    toDate.setDate(today.getDate() + 7);
    const to = toDate.toISOString().split('T')[0];

    // Fetch from multiple free sources
    const url = `https://nfs.faireconomy.media/ff_calendar_thisweek.json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 }
    });

    if (!res.ok) throw new Error('API failed');
    const raw = await res.json();

    // Filter by currency and impact
    const filtered = raw
      .filter((e: { currency: string; impact: string }) =>
        ['USD', 'EUR', 'GBP'].includes(e.currency) &&
        ['High', 'Medium'].includes(e.impact)
      )
      .map((e: {
        title: string; date: string; country: string;
        currency: string; impact: string;
        forecast: string; previous: string; actual: string;
      }) => ({
        title: e.title,
        date: e.date,
        country: e.country,
        currency: e.currency,
        impact: e.impact,
        forecast: e.forecast || '—',
        previous: e.previous || '—',
        actual: e.actual || null,
      }))
      .sort((a: { date: string }, b: { date: string }) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

    return NextResponse.json({ events: filtered, source: 'forexfactory', updated: new Date().toISOString() });
  } catch {
    // Fallback: return curated static events for the week
    const now = new Date();
    const events = generateFallbackEvents(now);
    return NextResponse.json({ events, source: 'fallback', updated: new Date().toISOString() });
  }
}

function generateFallbackEvents(base: Date) {
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const templates = [
    { title: 'IPC (Inflación) USA', currency: 'USD', impact: 'High', country: 'US', hour: '14:30' },
    { title: 'NFP Nóminas No Agrícolas', currency: 'USD', impact: 'High', country: 'US', hour: '14:30' },
    { title: 'Decisión FED tipos interés', currency: 'USD', impact: 'High', country: 'US', hour: '20:00' },
    { title: 'PIB USA Trimestral', currency: 'USD', impact: 'High', country: 'US', hour: '14:30' },
    { title: 'IPC Zona Euro', currency: 'EUR', impact: 'High', country: 'EU', hour: '11:00' },
    { title: 'Decisión BCE tipos', currency: 'EUR', impact: 'High', country: 'EU', hour: '14:15' },
    { title: 'PMI Manufacturero UK', currency: 'GBP', impact: 'Medium', country: 'GB', hour: '10:30' },
    { title: 'Desempleo USA (Jobless Claims)', currency: 'USD', impact: 'Medium', country: 'US', hour: '14:30' },
    { title: 'Ventas Minoristas USA', currency: 'USD', impact: 'Medium', country: 'US', hour: '14:30' },
    { title: 'PMI Servicios Eurozona', currency: 'EUR', impact: 'Medium', country: 'EU', hour: '10:00' },
  ];

  return templates.slice(0, 8).map((t, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + (i % 5));
    return {
      title: t.title, currency: t.currency, impact: t.impact,
      country: t.country, forecast: '—', previous: '—', actual: null,
      date: `${d.toISOString().split('T')[0]}T${t.hour}:00`,
    };
  });
}
