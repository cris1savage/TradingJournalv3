'use client';
import { useState } from 'react';

const G = {
  card:'#0c1628', card2:'#0f1e38', surface:'#080f1e',
  border:'rgba(0,180,255,0.1)', border2:'rgba(0,180,255,0.22)',
  cyan:'#00d4ff', green:'#00e676', red:'#ff3366', gold:'#f5a623', amber:'#f59e0b',
  text:'#e8f0fe', muted:'#4a6a8a', muted2:'#8ba0bf',
  fontData:"'JetBrains Mono',monospace" as string,
  fontUi:"'Inter',sans-serif" as string,
};

type Evento = {
  hora: string;
  moneda: string;
  impacto: 'HIGH' | 'MEDIUM' | 'LOW';
  titulo: string;
  previo?: string;
  estimado?: string;
  actual?: string;
  restringido?: boolean;
};

type DiaCalendario = {
  fecha: string;
  diaSemana: string;
  eventos: Evento[];
};

// Eventos curados para la semana actual y próximas
function getCalendario(): DiaCalendario[] {
  const hoy = new Date();
  const dias: DiaCalendario[] = [];
  const diasSemana = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Eventos recurrentes importantes para XAU/USD y NAS100
  const eventosSemana: Record<number, Evento[]> = {
    1: [ // Lunes
      { hora: '14:45', moneda: 'USD', impacto: 'MEDIUM', titulo: 'PMI Manufacturero Final', restringido: false },
      { hora: '16:00', moneda: 'USD', impacto: 'MEDIUM', titulo: 'Ventas Pendientes Vivienda', restringido: false },
    ],
    2: [ // Martes
      { hora: '11:00', moneda: 'EUR', impacto: 'MEDIUM', titulo: 'Confianza del Consumidor ZEW', restringido: false },
      { hora: '14:30', moneda: 'USD', impacto: 'HIGH', titulo: 'Confianza del Consumidor CB', restringido: true },
      { hora: '16:00', moneda: 'USD', impacto: 'HIGH', titulo: 'JOLT Ofertas de Empleo', restringido: true },
    ],
    3: [ // Miércoles
      { hora: '14:15', moneda: 'USD', impacto: 'HIGH', titulo: 'Cambio Empleo No Agrícola ADP', restringido: true },
      { hora: '14:30', moneda: 'USD', impacto: 'HIGH', titulo: 'PIB Trimestral (Revisión)', restringido: true },
      { hora: '16:30', moneda: 'USD', impacto: 'MEDIUM', titulo: 'Inventarios Petróleo Crudo (EIA)', restringido: false },
      { hora: '20:00', moneda: 'USD', impacto: 'HIGH', titulo: 'Actas FOMC / Decisión Fed', restringido: true },
    ],
    4: [ // Jueves
      { hora: '08:00', moneda: 'EUR', impacto: 'HIGH', titulo: 'Decisión BCE Tipos de Interés', restringido: true },
      { hora: '14:30', moneda: 'USD', impacto: 'HIGH', titulo: 'Solicitudes Desempleo Semanales', restringido: false },
      { hora: '14:30', moneda: 'USD', impacto: 'MEDIUM', titulo: 'Balanza Comercial', restringido: false },
    ],
    5: [ // Viernes
      { hora: '14:30', moneda: 'USD', impacto: 'HIGH', titulo: 'NFP — Nóminas No Agrícolas', restringido: true },
      { hora: '14:30', moneda: 'USD', impacto: 'HIGH', titulo: 'Tasa de Desempleo', restringido: true },
      { hora: '14:30', moneda: 'USD', impacto: 'HIGH', titulo: 'IPC — Índice de Precios al Consumo', restringido: true },
      { hora: '16:00', moneda: 'USD', impacto: 'MEDIUM', titulo: 'Confianza Consumidor Michigan', restringido: false },
    ],
  };

  for (let i = 0; i < 7; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - hoy.getDay() + 1 + i); // Lunes a domingo
    const dow = d.getDay();
    const fechaStr = `${String(d.getDate()).padStart(2,'0')} ${meses[d.getMonth()]} ${d.getFullYear()}`;
    dias.push({
      fecha: fechaStr,
      diaSemana: diasSemana[dow] || '',
      eventos: eventosSemana[dow] || [],
    });
  }
  return dias;
}

const IMPACT_STYLE = {
  HIGH:   { bg: 'rgba(255,51,102,0.15)', border: 'rgba(255,51,102,0.4)', color: '#ff3366', label: 'ALTO' },
  MEDIUM: { bg: 'rgba(245,166,35,0.12)', border: 'rgba(245,166,35,0.35)', color: '#f5a623', label: 'MEDIO' },
  LOW:    { bg: 'rgba(0,180,255,0.08)', border: 'rgba(0,180,255,0.2)', color: '#00d4ff', label: 'BAJO' },
};

const MONEDA_FLAG: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', CAD: '🇨🇦', AUD: '🇦🇺', CHF: '🇨🇭', All: '🌐',
};

export default function CalendarioEconomico() {
  const calendario = getCalendario();
  const hoy = new Date();
  const todayStr = hoy.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
  const [filtroImpacto, setFiltroImpacto] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [filtroMoneda, setFiltroMoneda] = useState<'ALL' | 'USD' | 'EUR'>('ALL');

  const diasConEventos = calendario.filter(d => {
    const eventos = d.eventos.filter(e => {
      if (filtroImpacto !== 'ALL' && e.impacto !== filtroImpacto) return false;
      if (filtroMoneda !== 'ALL' && e.moneda !== filtroMoneda) return false;
      return true;
    });
    return eventos.length > 0;
  });

  const totalRestringidos = calendario.reduce((s, d) => s + d.eventos.filter(e => e.restringido).length, 0);
  const todayRestringidos = calendario.find(d => d.fecha === todayStr)?.eventos.filter(e => e.restringido && (filtroImpacto === 'ALL' || e.impacto === filtroImpacto)) || [];

  return (
    <div>
      {/* Restringidos hoy — bloque rojo como Orion */}
      {todayRestringidos.length > 0 && (
        <div style={{ background: 'rgba(255,51,102,0.08)', border: '1px solid rgba(255,51,102,0.3)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,51,102,0.2)', border: '1px solid rgba(255,51,102,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🛡️</div>
            <div style={{ fontFamily: G.fontUi, fontSize: 14, fontWeight: 700, color: '#ff3366' }}>Restringido hoy</div>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ff3366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: G.fontData, fontSize: 10, fontWeight: 700, color: '#fff' }}>{todayRestringidos.length}</div>
          </div>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '70px 80px 90px 1fr', gap: 8, padding: '6px 8px', background: 'rgba(255,51,102,0.15)', borderRadius: 6, marginBottom: 6 }}>
            {['HORA','MONEDA','IMPACTO','TÍTULO'].map(h => (
              <span key={h} style={{ fontFamily: G.fontData, fontSize: 8, color: '#ff6680', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{h}</span>
            ))}
          </div>
          {todayRestringidos.map((e, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 80px 90px 1fr', gap: 8, padding: '8px', borderBottom: i < todayRestringidos.length - 1 ? '1px solid rgba(255,51,102,0.1)' : 'none', alignItems: 'center' }}>
              <span style={{ fontFamily: G.fontData, fontSize: 12, color: G.text }}>{e.hora}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 14 }}>{MONEDA_FLAG[e.moneda] || '🌐'}</span>
                <span style={{ fontFamily: G.fontData, fontSize: 11, color: G.muted2 }}>{e.moneda}</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, background: IMPACT_STYLE[e.impacto].bg, border: `1px solid ${IMPACT_STYLE[e.impacto].border}` }}>
                <span style={{ fontFamily: G.fontData, fontSize: 9, fontWeight: 700, color: IMPACT_STYLE[e.impacto].color, letterSpacing: '0.06em' }}>{IMPACT_STYLE[e.impacto].label}</span>
              </div>
              <span style={{ fontFamily: G.fontUi, fontSize: 12, color: G.text }}>{e.titulo}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['ALL','USD','EUR'] as const).map(m => (
            <button key={m} onClick={() => setFiltroMoneda(m)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${filtroMoneda===m?G.cyan:G.border}`, background: filtroMoneda===m?'rgba(0,212,255,0.12)':'transparent', color: filtroMoneda===m?G.cyan:G.muted, fontSize: 11, cursor: 'pointer', fontFamily: G.fontData, fontWeight: 600 }}>
              {m === 'ALL' ? 'Todas' : `${MONEDA_FLAG[m]} ${m}`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['ALL','Todos'],['HIGH','🔴 Alto'],['MEDIUM','🟡 Medio']] as const).map(([v,l]) => (
            <button key={v} onClick={() => setFiltroImpacto(v)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${filtroImpacto===v?(v==='HIGH'?G.red:v==='MEDIUM'?G.gold:G.cyan):G.border}`, background: filtroImpacto===v?'rgba(0,212,255,0.08)':'transparent', color: filtroImpacto===v?G.text:G.muted, fontSize: 11, cursor: 'pointer', fontFamily: G.fontUi }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Calendario por días */}
      {diasConEventos.map((dia, di) => {
        const eventos = dia.eventos.filter(e => {
          if (filtroImpacto !== 'ALL' && e.impacto !== filtroImpacto) return false;
          if (filtroMoneda !== 'ALL' && e.moneda !== filtroMoneda) return false;
          return true;
        });
        if (!eventos.length) return null;
        const esHoy = dia.fecha === todayStr;
        return (
          <div key={di} style={{ background: G.card, border: `1px solid ${esHoy?'rgba(0,212,255,0.25)':G.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
            {/* Day header */}
            <div style={{ padding: '10px 16px', background: esHoy?'rgba(0,212,255,0.06)':G.surface, borderBottom: `1px solid ${G.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {esHoy && <div style={{ width: 6, height: 6, borderRadius: '50%', background: G.cyan, boxShadow: `0 0 8px ${G.cyan}` }}/>}
                <span style={{ fontFamily: G.fontData, fontSize: 12, fontWeight: 700, color: esHoy?G.cyan:G.text }}>{dia.diaSemana}, {dia.fecha}</span>
                {esHoy && <span style={{ fontFamily: G.fontData, fontSize: 9, color: G.cyan, letterSpacing: '0.1em', background: 'rgba(0,212,255,0.12)', padding: '2px 8px', borderRadius: 3 }}>HOY</span>}
              </div>
              <span style={{ fontFamily: G.fontData, fontSize: 10, color: G.muted }}>{eventos.length} evento{eventos.length!==1?'s':''}</span>
            </div>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '70px 80px 90px 1fr 80px', gap: 8, padding: '7px 16px', background: 'rgba(0,0,0,0.15)' }}>
              {['HORA','MONEDA','IMPACTO','TÍTULO','PREVIO'].map(h => (
                <span key={h} style={{ fontFamily: G.fontData, fontSize: 8, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>
            {/* Events */}
            {eventos.map((e, ei) => {
              const imp = IMPACT_STYLE[e.impacto];
              return (
                <div key={ei} style={{ display: 'grid', gridTemplateColumns: '70px 80px 90px 1fr 80px', gap: 8, padding: '10px 16px', borderBottom: ei < eventos.length-1 ? `1px solid ${G.border}` : 'none', alignItems: 'center', transition: 'background 0.1s' }}
                  onMouseEnter={e2=>(e2.currentTarget as HTMLDivElement).style.background=G.card2}
                  onMouseLeave={e2=>(e2.currentTarget as HTMLDivElement).style.background='transparent'}>
                  <span style={{ fontFamily: G.fontData, fontSize: 12, color: G.text, fontWeight: e.restringido?700:400 }}>{e.hora}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 16 }}>{MONEDA_FLAG[e.moneda]||'🌐'}</span>
                    <span style={{ fontFamily: G.fontData, fontSize: 11, color: G.muted2, fontWeight: 600 }}>{e.moneda}</span>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, background: imp.bg, border: `1px solid ${imp.border}` }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: imp.color }}/>
                    <span style={{ fontFamily: G.fontData, fontSize: 9, fontWeight: 700, color: imp.color, letterSpacing: '0.06em' }}>{imp.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {e.restringido && <div style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(255,51,102,0.15)', border: '1px solid rgba(255,51,102,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>🛡️</div>}
                    <span style={{ fontFamily: G.fontUi, fontSize: 12, color: G.text }}>{e.titulo}</span>
                  </div>
                  <span style={{ fontFamily: G.fontData, fontSize: 11, color: G.muted }}>—</span>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Leyenda */}
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, padding: '12px 16px', marginTop: 8 }}>
        <div style={{ fontFamily: G.fontData, fontSize: 9, color: G.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>LEYENDA</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[
            { color: G.red, label: 'ALTO impacto', desc: 'NFP, IPC, FED, BCE — no operar 15min antes/después' },
            { color: G.gold, label: 'MEDIO impacto', desc: 'PMI, Ventas, Confianza — precaución' },
            { color: G.cyan, label: '🛡️ Restringido', desc: 'Eventos donde Orion limita operaciones' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, marginTop: 3, flexShrink: 0 }}/>
              <div>
                <div style={{ fontFamily: G.fontData, fontSize: 9, color: s.color, fontWeight: 700, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontFamily: G.fontUi, fontSize: 10, color: G.muted, lineHeight: 1.4 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
