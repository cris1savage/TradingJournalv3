'use client';
import { useState } from 'react';

type Trade = { id: number; date: string; time: string; pair: string; tf: string; dir: string; res: string; plan: string | null; entry: number; sl: number; tp: number; risk: number; lot: number; rr: string; pnl: number; rreal: string; conf: string[]; emo: string; notes: string; };

const G = {
  bg:'#0b1a2e',card:'#112240',card2:'#162d4a',border:'rgba(100,160,255,0.12)',border2:'rgba(0,229,255,0.3)',
  accent:'#4d9fff',cyan:'#00e5ff',green:'#00e676',red:'#ff4081',gold:'#ffb300',purple:'#7c4dff',
  text:'#e8f4ff',muted:'#4a7a9b',muted2:'#6b9cc7',
};

const fmt = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(2) + '€';

function StatRow({ label, trades, color }: { label: string; trades: Trade[]; color?: string }) {
  if (!trades.length) return null;
  const wins = trades.filter(t => t.res === 'win').length;
  const pnl = trades.reduce((s, t) => s + t.pnl, 0);
  const wr = Math.round(wins / trades.length * 100);
  const maxPnl = 200;
  const barW = Math.min(Math.abs(pnl) / maxPnl * 100, 100);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px,140px) 1fr 72px 48px 60px', gap: 8, alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${G.border}`, transition: 'background 0.1s', minWidth: 0 }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = G.card2}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Outfit, sans-serif', color: color || G.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', minWidth: 0 }}>
        <div style={{ height: '100%', width: `${barW}%`, background: pnl >= 0 ? G.green : G.red, borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
      <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700, color: pnl >= 0 ? G.green : G.red, textAlign: 'right' }}>{fmt(pnl)}</span>
      <span style={{ fontFamily: 'monospace', fontSize: 11, color: wr >= 50 ? G.green : G.muted, textAlign: 'center' }}>{wr}%</span>
      <span style={{ fontSize: 10, color: G.muted, textAlign: 'right' }}>{trades.length} ops</span>
    </div>
  );
}

function SectionCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${G.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Outfit, sans-serif' }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: G.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ padding: '6px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px,140px) 1fr 72px 48px 60px', gap: 8, padding: '6px 14px 8px', borderBottom: `1px solid ${G.border}` }}>
          {['Categoría', 'P&L visual', 'P&L', 'Win%', 'Trades'].map(h => (
            <span key={h} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.muted }}>{h}</span>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AnalisisClient({ trades }: { trades: Trade[] }) {
  const [tab, setTab] = useState<'ventaja' | 'activo' | 'horario' | 'dia' | 'emocion' | 'puntuacion' | 'estadisticas'>('ventaja');

  if (!trades.length) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: G.muted }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 14, fontFamily: 'Outfit, sans-serif' }}>Sin datos aún</div>
      <div style={{ fontSize: 12, marginTop: 6 }}>Registra trades para ver tu análisis</div>
    </div>
  );

  // Compute all stats
  const byPair: Record<string, Trade[]> = {};
  const byDir: Record<string, Trade[]> = {};
  const byTf: Record<string, Trade[]> = {};
  const byHour: Record<string, Trade[]> = {};
  const byDay: Record<string, Trade[]> = {};
  const byEmo: Record<string, Trade[]> = {};
  const byPlan: Record<string, Trade[]> = {};
  const byConf: Record<string, Trade[]> = {};

  trades.forEach(t => {
    // pair
    if (!byPair[t.pair]) byPair[t.pair] = [];
    byPair[t.pair].push(t);
    // dir
    const dk = t.dir === 'buy' ? '▲ LONG' : '▼ SHORT';
    if (!byDir[dk]) byDir[dk] = [];
    byDir[dk].push(t);
    // tf
    if (!byTf[t.tf]) byTf[t.tf] = [];
    byTf[t.tf].push(t);
    // hour
    const h = t.time ? parseInt(t.time.split(':')[0]) : 14;
    const hk = h < 10 ? '08-10h' : h < 12 ? '10-12h' : h < 14 ? '12-14h' : h < 16 ? '14-16h' : h < 18 ? '16-18h' : '18-21h';
    if (!byHour[hk]) byHour[hk] = [];
    byHour[hk].push(t);
    // day
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dk2 = days[new Date(t.date).getDay()];
    if (!byDay[dk2]) byDay[dk2] = [];
    byDay[dk2].push(t);
    // emo
    const ek = t.emo || '— Sin registrar';
    if (!byEmo[ek]) byEmo[ek] = [];
    byEmo[ek].push(t);
    // plan
    const pk = t.plan === 'yes' ? '✓ Con plan' : t.plan === 'no' ? '✕ Sin plan' : '— Sin registrar';
    if (!byPlan[pk]) byPlan[pk] = [];
    byPlan[pk].push(t);
    // confluencias
    (t.conf || []).forEach(c => {
      if (!byConf[c]) byConf[c] = [];
      byConf[c].push(t);
    });
  });

  // Trading score
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const wins = trades.filter(t => t.res === 'win').length;
  const wr = Math.round(wins / trades.length * 100);
  const conPlan = trades.filter(t => t.plan === 'yes');
  const sinPlan = trades.filter(t => t.plan === 'no');
  const conPlanWr = conPlan.length ? Math.round(conPlan.filter(t => t.res === 'win').length / conPlan.length * 100) : 0;
  const pnlConPlan = conPlan.reduce((s, t) => s + t.pnl, 0);
  const pnlSinPlan = sinPlan.reduce((s, t) => s + t.pnl, 0);

  // Score calculation (0-100)
  const scoreWr = Math.min(wr, 70) / 70 * 25; // max 25pts
  const scorePnl = totalPnl > 0 ? Math.min(totalPnl / 200, 1) * 25 : 0; // max 25pts
  const scorePlan = trades.length > 0 ? (conPlan.length / trades.length) * 20 : 0; // max 20pts
  const scoreConsistency = (() => { // max 15pts
    const byD: Record<string, number> = {};
    trades.forEach(t => { byD[t.date] = (byD[t.date] || 0) + 1; });
    const avg = trades.length / Math.max(Object.keys(byD).length, 1);
    return avg <= 3 ? 15 : avg <= 5 ? 10 : 5;
  })();
  const scoreEmo = (() => { // max 15pts
    const badEmos = ['😤 Frustrado', '🎲 FOMO', '😡 Revenge', '😰 Ansioso'];
    const badCount = trades.filter(t => badEmos.some(e => t.emo?.includes(e.split(' ')[1]))).length;
    const ratio = badCount / Math.max(trades.length, 1);
    return Math.round((1 - ratio) * 15);
  })();
  const totalScore = Math.round(scoreWr + scorePnl + scorePlan + scoreConsistency + scoreEmo);

  const scoreColor = totalScore >= 75 ? G.green : totalScore >= 50 ? G.gold : G.red;
  const scoreLabel = totalScore >= 75 ? 'Excelente' : totalScore >= 50 ? 'En progreso' : 'Necesita mejorar';

  // Best conditions (tu ventaja)
  const sortedPairs = Object.entries(byPair).sort(([, a], [, b]) => b.reduce((s, t) => s + t.pnl, 0) - a.reduce((s, t) => s + t.pnl, 0));
  const sortedHours = Object.entries(byHour).sort(([, a], [, b]) => b.reduce((s, t) => s + t.pnl, 0) - a.reduce((s, t) => s + t.pnl, 0));
  const sortedDays = Object.entries(byDay).sort(([, a], [, b]) => b.reduce((s, t) => s + t.pnl, 0) - a.reduce((s, t) => s + t.pnl, 0));
  const sortedEmos = Object.entries(byEmo).sort(([, a], [, b]) => b.reduce((s, t) => s + t.pnl, 0) - a.reduce((s, t) => s + t.pnl, 0));

  const bestPair = sortedPairs[0];
  const bestHour = sortedHours[0];
  const bestDay = sortedDays[0];
  const bestEmo = sortedEmos[0];
  const worstEmo = sortedEmos[sortedEmos.length - 1];

  const tabs = [
    { id: 'ventaja', label: '⚡ Tu Ventaja' },
    { id: 'puntuacion', label: '🏆 Puntuación' },
    { id: 'estadisticas', label: '📐 Estadísticas' },
    { id: 'activo', label: '📊 Por Activo' },
    { id: 'horario', label: '🕐 Por Horario' },
    { id: 'dia', label: '📅 Por Día' },
    { id: 'emocion', label: '🧠 Psicología' },
  ] as const;

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${tab === t.id ? G.accent : G.border}`, background: tab === t.id ? `${G.accent}18` : 'transparent', color: tab === t.id ? G.accent : G.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: tab === t.id ? 600 : 400, transition: 'all 0.15s', boxShadow: tab === t.id ? `0 0 10px ${G.accent}30` : 'none' }}>{t.label}</button>
        ))}
      </div>

      {/* TU VENTAJA */}
      {tab === 'ventaja' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 14 }}>
            {[
              { icon: '📈', label: 'Mejor activo', val: bestPair ? bestPair[0] : '—', sub: bestPair ? `${fmt(bestPair[1].reduce((s,t)=>s+t.pnl,0))} · ${Math.round(bestPair[1].filter(t=>t.res==='win').length/bestPair[1].length*100)}% WR` : '—', color: G.cyan },
              { icon: '🕐', label: 'Mejor horario', val: bestHour ? bestHour[0] : '—', sub: bestHour ? `${fmt(bestHour[1].reduce((s,t)=>s+t.pnl,0))} · ${Math.round(bestHour[1].filter(t=>t.res==='win').length/bestHour[1].length*100)}% WR` : '—', color: G.green },
              { icon: '📅', label: 'Mejor día', val: bestDay ? bestDay[0] : '—', sub: bestDay ? `${fmt(bestDay[1].reduce((s,t)=>s+t.pnl,0))} · ${Math.round(bestDay[1].filter(t=>t.res==='win').length/bestDay[1].length*100)}% WR` : '—', color: G.gold },
              { icon: '🧠', label: 'Mejor estado mental', val: bestEmo ? bestEmo[0].replace(/😐|😌|💪|😰|😤|🎲|😡/,'').trim() || bestEmo[0] : '—', sub: bestEmo ? `${fmt(bestEmo[1].reduce((s,t)=>s+t.pnl,0))} · ${Math.round(bestEmo[1].filter(t=>t.res==='win').length/bestEmo[1].length*100)}% WR` : '—', color: G.purple },
            ].map(s => (
              <div key={s.label} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: '14px 16px', borderTop: `2px solid ${s.color}` }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Plan analysis */}
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginBottom: 12 }}>📋 Con plan vs Sin plan</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: `${G.green}12`, border: `1px solid ${G.green}30`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, color: G.muted, fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 6 }}>CON PLAN ✓</div>
                <div style={{ fontFamily: 'Outfit', fontSize: 22, fontWeight: 800, color: pnlConPlan >= 0 ? G.green : G.red }}>{fmt(pnlConPlan)}</div>
                <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>{conPlan.length} ops · {conPlanWr}% WR</div>
              </div>
              <div style={{ background: `${G.red}12`, border: `1px solid ${G.red}30`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, color: G.muted, fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 6 }}>SIN PLAN ✕</div>
                <div style={{ fontFamily: 'Outfit', fontSize: 22, fontWeight: 800, color: pnlSinPlan >= 0 ? G.green : G.red }}>{fmt(pnlSinPlan)}</div>
                <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>{sinPlan.length} ops · {sinPlan.length ? Math.round(sinPlan.filter(t => t.res === 'win').length / sinPlan.length * 100) : 0}% WR</div>
              </div>
            </div>
          </div>

          {/* Worst emo warning */}
          {worstEmo && worstEmo[1].reduce((s, t) => s + t.pnl, 0) < 0 && (
            <div style={{ background: `${G.red}08`, border: `1px solid ${G.red}30`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.red, fontFamily: 'Outfit', marginBottom: 6 }}>⚠️ Estado a evitar</div>
              <div style={{ fontSize: 12, color: G.muted2 }}>
                Cuando operas en estado <strong style={{ color: G.text }}>{worstEmo[0]}</strong> pierdes {fmt(worstEmo[1].reduce((s, t) => s + t.pnl, 0))} en {worstEmo[1].length} operaciones. Considera parar el día cuando estés en ese estado.
              </div>
            </div>
          )}
        </div>
      )}

      {/* PUNTUACIÓN */}
      {tab === 'puntuacion' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {/* Main score */}
            <div style={{ background: G.card, border: `1px solid ${scoreColor}40`, borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px ${scoreColor}15` }}>
              <div style={{ position: 'relative', width: 130, height: 130, marginBottom: 12 }}>
                <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="65" cy="65" r="56" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  <circle cx="65" cy="65" r="56" fill="none" stroke={scoreColor} strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 56 * totalScore / 100} ${2 * Math.PI * 56}`}
                    strokeLinecap="round" style={{ filter: `drop-shadow(0 0 8px ${scoreColor})`, transition: 'stroke-dasharray 1.5s ease' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontFamily: 'Outfit', fontSize: 36, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{totalScore}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: G.muted, letterSpacing: '0.1em' }}>/100</div>
                </div>
              </div>
              <div style={{ fontFamily: 'Outfit', fontSize: 18, fontWeight: 700, color: scoreColor }}>{scoreLabel}</div>
              <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>Puntuación de trading</div>
            </div>

            {/* Score breakdown */}
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Outfit', marginBottom: 14 }}>Desglose</div>
              {[
                { label: 'Win Rate', pts: Math.round(scoreWr), max: 25, color: G.cyan },
                { label: 'Rentabilidad', pts: Math.round(scorePnl), max: 25, color: G.green },
                { label: 'Disciplina (plan)', pts: Math.round(scorePlan), max: 20, color: G.accent },
                { label: 'Consistencia', pts: scoreConsistency, max: 15, color: G.gold },
                { label: 'Gestión emocional', pts: scoreEmo, max: 15, color: G.purple },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: G.text, fontFamily: 'Outfit' }}>{s.label}</span>
                    <span style={{ fontFamily: 'Space Mono', fontSize: 11, color: s.color }}>{s.pts}<span style={{ color: G.muted }}>/{s.max}</span></span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.pts / s.max * 100}%`, background: s.color, borderRadius: 3, boxShadow: `0 0 6px ${s.color}60`, transition: 'width 1s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Outfit', marginBottom: 12 }}>💡 Para mejorar tu puntuación</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                wr < 50 && '📊 Tu win rate está por debajo del 50%. Sé más selectivo con los setups.',
                conPlan.length < trades.length * 0.7 && '📋 Más del 30% de tus trades son sin plan. La disciplina mejora los resultados.',
                scoreEmo < 10 && '🧠 Detectamos estados emocionales negativos frecuentes. Para cuando estés frustrado.',
                scoreConsistency < 10 && '📅 Operas demasiados trades por día. La calidad supera a la cantidad.',
                totalScore < 50 && '🎯 Define objetivos mensuales claros y sígue tu plan al 100%.',
                totalScore >= 75 && '✅ Excelente trading. Mantén la consistencia y aumenta el capital gradualmente.',
              ].filter(Boolean).slice(0, 4).map((tip, i) => (
                <div key={i} style={{ background: G.card2, borderRadius: 8, padding: '10px 12px', fontSize: 12, color: G.muted2, lineHeight: 1.5, border: `1px solid ${G.border}`, fontFamily: 'Outfit' }}>{tip}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* POR ACTIVO */}
      {tab === 'activo' && (
        <div>
          <SectionCard title="Rendimiento por Activo" sub="P&L, Win Rate y operaciones por par">
            {Object.entries(byPair).sort(([,a],[,b]) => b.reduce((s,t)=>s+t.pnl,0) - a.reduce((s,t)=>s+t.pnl,0)).map(([pair, ts]) => (
              <StatRow key={pair} label={pair} trades={ts} color={G.cyan} />
            ))}
          </SectionCard>
          <SectionCard title="Rendimiento por Dirección" sub="LONG vs SHORT">
            {Object.entries(byDir).sort(([,a],[,b]) => b.reduce((s,t)=>s+t.pnl,0) - a.reduce((s,t)=>s+t.pnl,0)).map(([dir, ts]) => (
              <StatRow key={dir} label={dir} trades={ts} color={dir.includes('LONG') ? G.green : G.red} />
            ))}
          </SectionCard>
          <SectionCard title="Rendimiento por Timeframe" sub="Disparo en 15M, 1H o 4H">
            {Object.entries(byTf).sort(([,a],[,b]) => b.reduce((s,t)=>s+t.pnl,0) - a.reduce((s,t)=>s+t.pnl,0)).map(([tf, ts]) => (
              <StatRow key={tf} label={tf} trades={ts} color={G.gold} />
            ))}
          </SectionCard>
          <SectionCard title="Confluencias más rentables" sub="Qué confluencias generan más P&L">
            {Object.entries(byConf).sort(([,a],[,b]) => b.reduce((s,t)=>s+t.pnl,0) - a.reduce((s,t)=>s+t.pnl,0)).slice(0,8).map(([conf, ts]) => (
              <StatRow key={conf} label={conf} trades={ts} color={G.purple} />
            ))}
            {Object.keys(byConf).length === 0 && <div style={{ padding: '20px', color: G.muted, fontSize: 12, textAlign: 'center' }}>Sin confluencias registradas</div>}
          </SectionCard>
        </div>
      )}

      {/* POR HORARIO */}
      {tab === 'horario' && (
        <div>
          <SectionCard title="Rendimiento por Horario" sub="En qué franja horaria ganas más · Hora España">
            {['08-10h','10-12h','12-14h','14-16h','16-18h','18-21h'].filter(h => byHour[h]).map(h => (
              <StatRow key={h} label={h} trades={byHour[h]} color={G.gold} />
            ))}
          </SectionCard>
          <div style={{ background: `${G.accent}08`, border: `1px solid ${G.accent}30`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: G.accent, fontFamily: 'Outfit', marginBottom: 6 }}>💡 Interpretación</div>
            <div style={{ fontSize: 12, color: G.muted2, lineHeight: 1.6 }}>
              Las franjas 14-17h (apertura NY) suelen ser las más volátiles para XAU/USD y Nasdaq. Los mejores setups aparecen cuando el mercado asienta dirección tras la apertura americana.
            </div>
          </div>
        </div>
      )}

      {/* POR DÍA */}
      {tab === 'dia' && (
        <div>
          <SectionCard title="Rendimiento por Día de la semana" sub="Qué días son más rentables para ti">
            {['Lun','Mar','Mié','Jue','Vie'].filter(d => byDay[d]).map(d => (
              <StatRow key={d} label={d} trades={byDay[d]} color={G.cyan} />
            ))}
            {['Sáb','Dom'].filter(d => byDay[d]).map(d => (
              <StatRow key={d} label={`${d} ⚠`} trades={byDay[d]} color={G.red} />
            ))}
          </SectionCard>
          {(byDay['Sáb'] || byDay['Dom']) && (
            <div style={{ background: `${G.red}08`, border: `1px solid ${G.red}30`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 12, color: G.red, fontWeight: 600, marginBottom: 4, fontFamily: 'Outfit' }}>⚠️ Operando en fin de semana</div>
              <div style={{ fontSize: 12, color: G.muted2, lineHeight: 1.5 }}>Los mercados tienen menor liquidez en fin de semana. Los resultados suelen ser menos predecibles.</div>
            </div>
          )}
        </div>
      )}

      {/* ESTADÍSTICAS AVANZADAS */}
      {tab === 'estadisticas' && (() => {
        const winsArr = trades.filter(t=>t.res==='win');
        const lossArr = trades.filter(t=>t.res==='loss');
        const avgWin = winsArr.length ? winsArr.reduce((s,t)=>s+t.pnl,0)/winsArr.length : 0;
        const avgLoss = lossArr.length ? Math.abs(lossArr.reduce((s,t)=>s+t.pnl,0)/lossArr.length) : 0;
        const profitFactor = avgLoss > 0 ? (avgWin * winsArr.length) / (avgLoss * lossArr.length) : 0;
        const expectativa = (wr/100 * avgWin) - ((1-wr/100) * avgLoss);

        // Max drawdown
        let peak = 0, maxDD = 0, running = 0;
        trades.forEach(t => { running += t.pnl; if (running > peak) peak = running; const dd = peak - running; if (dd > maxDD) maxDD = dd; });

        // Max loss streak
        let maxStreak = 0, curStreak = 0;
        trades.forEach(t => { if (t.res==='loss') { curStreak++; if (curStreak>maxStreak) maxStreak=curStreak; } else curStreak=0; });

        // Best/worst month
        const byMonth: Record<string,number> = {};
        trades.forEach(t => { const m=t.date.slice(0,7); byMonth[m]=(byMonth[m]||0)+t.pnl; });
        const months = Object.entries(byMonth).sort(([a],[b])=>a.localeCompare(b));
        const bestMonth = months.reduce((b,m)=>m[1]>b[1]?m:b, ['—',0]);
        const worstMonth = months.reduce((b,m)=>m[1]<b[1]?m:b, ['—',0]);

        const stats = [
          { l: 'Profit Factor', v: profitFactor > 0 ? profitFactor.toFixed(2) : '—', c: profitFactor > 1.5 ? G.green : profitFactor > 1 ? G.gold : G.red, info: 'Ratio ganancias/pérdidas. >1.5 es bueno' },
          { l: 'Expectativa por trade', v: expectativa !== 0 ? (expectativa>=0?'+':'')+expectativa.toFixed(2)+'€' : '—', c: expectativa>=0?G.green:G.red, info: 'Cuánto ganas en promedio por operación' },
          { l: 'Media de wins', v: avgWin > 0 ? '+'+avgWin.toFixed(2)+'€' : '—', c: G.green, info: 'Promedio de ganancia en trades ganadores' },
          { l: 'Media de losses', v: avgLoss > 0 ? '-'+avgLoss.toFixed(2)+'€' : '—', c: G.red, info: 'Promedio de pérdida en trades perdedores' },
          { l: 'Max drawdown', v: maxDD > 0 ? '-'+maxDD.toFixed(2)+'€' : '—', c: G.red, info: 'Máxima caída desde un máximo histórico' },
          { l: 'Racha pérdidas max', v: maxStreak > 0 ? maxStreak+' seguidas' : '—', c: maxStreak >= 3 ? G.red : G.muted2, info: 'Mayor racha de pérdidas consecutivas' },
          { l: 'Mejor mes', v: bestMonth[0] !== '—' ? bestMonth[0]+' (+'+bestMonth[1].toFixed(2)+'€)' : '—', c: G.green, info: '' },
          { l: 'Peor mes', v: worstMonth[0] !== '—' ? worstMonth[0]+' ('+worstMonth[1].toFixed(2)+'€)' : '—', c: G.red, info: '' },
        ];

        return (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 14 }}>
              {stats.map(s => (
                <div key={s.l} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: '14px 16px', borderTop: `2px solid ${s.c}` }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 8, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{s.l}</div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                  {s.info && <div style={{ fontSize: 10, color: G.muted, marginTop: 4 }}>{s.info}</div>}
                </div>
              ))}
            </div>
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginBottom: 10 }}>💡 Cómo interpretar</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Profit Factor >2', 'Sistema muy rentable'],
                  ['Profit Factor 1-2', 'Rentable pero mejorable'],
                  ['Expectativa >0', 'Tu sistema tiene edge positivo'],
                  ['Win Rate + Expectativa', 'Los dos deben ser positivos'],
                ].map(([k,v]) => (
                  <div key={k} style={{ background: G.card2, borderRadius: 8, padding: '9px 12px', border: `1px solid ${G.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: G.text, fontFamily: 'Outfit, sans-serif' }}>{k}</div>
                    <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* PSICOLOGÍA */}
      {tab === 'emocion' && (
        <div>
          <SectionCard title="Rendimiento por Estado Emocional" sub="Cómo afecta tu estado mental a los resultados">
            {Object.entries(byEmo).sort(([,a],[,b]) => b.reduce((s,t)=>s+t.pnl,0) - a.reduce((s,t)=>s+t.pnl,0)).map(([emo, ts]) => (
              <StatRow key={emo} label={emo.length > 16 ? emo.slice(0, 16) + '…' : emo} trades={ts} color={G.purple} />
            ))}
          </SectionCard>
          <SectionCard title="Con plan vs Sin plan" sub="Impacto de la disciplina en los resultados">
            {Object.entries(byPlan).sort(([,a],[,b]) => b.reduce((s,t)=>s+t.pnl,0) - a.reduce((s,t)=>s+t.pnl,0)).map(([plan, ts]) => (
              <StatRow key={plan} label={plan} trades={ts} color={plan.includes('✓') ? G.green : G.red} />
            ))}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
