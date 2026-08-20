import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';

export type Posicion = {
  id: number;
  activo: string;
  simbolo: string;
  cantidad: number;
  precioCompra: number;
  precioActual: number;
  fecha: string;
  notas: string;
};

export type Cartera = {
  id: string;
  nombre: string;
  tipo: 'cripto' | 'acciones' | 'opciones' | 'etf' | 'otro';
  color: string;
  posiciones: Posicion[];
};

export type AportacionProgramada = {
  id: number;
  nombre: string;
  importe: number;
  dia: number; // day of month
  cartera: string;
  activo: string;
  activa: boolean;
};

export type PatrimonioData = {
  carteras: Cartera[];
  aportaciones: AportacionProgramada[];
};

const DEFAULT: PatrimonioData = { carteras: [], aportaciones: [] };

export async function GET() {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await readData<PatrimonioData>('patrimonio', DEFAULT));
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const data = await readData<PatrimonioData>('patrimonio', DEFAULT);

  if (body.action === 'addCartera') {
    const c: Cartera = { id: Date.now().toString(), nombre: body.nombre, tipo: body.tipo, color: body.color, posiciones: [] };
    data.carteras.push(c);
  } else if (body.action === 'deleteCartera') {
    data.carteras = data.carteras.filter(c => c.id !== body.id);
  } else if (body.action === 'addPosicion') {
    const c = data.carteras.find(c => c.id === body.carteraId);
    if (c) {
      const p: Posicion = { id: Date.now(), activo: body.activo, simbolo: body.simbolo?.toUpperCase() || body.activo.toUpperCase(), cantidad: body.cantidad, precioCompra: body.precioCompra, precioActual: body.precioActual || body.precioCompra, fecha: body.fecha, notas: body.notas || '' };
      c.posiciones.push(p);
    }
  } else if (body.action === 'updatePrecio') {
    const c = data.carteras.find(c => c.id === body.carteraId);
    if (c) { const p = c.posiciones.find(p => p.id === body.posicionId); if (p) p.precioActual = body.precio; }
  } else if (body.action === 'deletePosicion') {
    const c = data.carteras.find(c => c.id === body.carteraId);
    if (c) c.posiciones = c.posiciones.filter(p => p.id !== body.posicionId);
  } else if (body.action === 'addAportacion') {
    data.aportaciones.push({ id: Date.now(), nombre: body.nombre, importe: body.importe, dia: body.dia, cartera: body.cartera, activo: body.activo, activa: true });
  } else if (body.action === 'deleteAportacion') {
    data.aportaciones = data.aportaciones.filter(a => a.id !== body.id);
  } else if (body.action === 'updatePrecios') {
    // Batch update prices from CoinGecko
    body.precios.forEach(({ simbolo, precio }: { simbolo: string; precio: number }) => {
      data.carteras.forEach(c => {
        c.posiciones.forEach(p => { if (p.simbolo === simbolo) p.precioActual = precio; });
      });
    });
  }

  await writeData('patrimonio', data);
  return NextResponse.json({ ok: true });
}
