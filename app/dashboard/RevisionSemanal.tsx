'use client';
import { useState, useEffect } from 'react';

const G = {
  card:'#0c1628', card2:'#0f1e38', border:'rgba(0,180,255,0.1)',
  accent:'#0066dd', cyan:'#00d4ff', green:'#00e676', red:'#ff3366', gold:'#f5a623',
  purple:'#7c4dff', text:'#e8f0fe', muted:'#4a6a8a', muted2:'#8ba0bf',
};

type Trade = { date: string; res: string; plan: string|null; pnl: number; emo: string; pair: string; };

type Revision = {
  week: string;
  fecha: string;
  q1: string; // Qué funcionó
  q2: string; // Qué no funcionó
  q3: string; // Mejor trade
  q4: string; // Peor trade
  q5: string; // Qué cambias
  q6: string; // Objetivo próxima semana
  nota: number; // 1-10
  completada: boolean;
};

const KEY = 'st_revisiones';
const getWeek = () => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return d.getUTCFullYear() + '-W' + Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7).toString().padStart(2,'0');
};

const inp: React.CSSProperties = { background: G.card2, border: `1px solid ${G.border}`, borderRadius: 8, padding: '10px 13px', color: G.text, fontFamily: "'Inter',sans-serif", fontSize: 13, width: '100%', outline: 'none', resize: 'vertical' as const, minHeight: 70, lineHeight: 1.6 };
const lbl: React.CSSProperties = { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: G.muted, display: 'block', marginBottom: 6 };

export default function RevisionSemanal({ trades }: { trades: Trade[] }) {
  const [revisiones, setRevisiones] = useState<Record<string, Revision>>({});
  const [showHistory, setShowHistory] = useState(false);
  const week = getWeek();

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) setRevisiones(JSON.parse(saved));
  }, []);

  function save(updated: Record<string, Revision>) {
    setRevisiones(updated);
    localStorage.setItem(KEY, JSON.stringify(updated));
  }

  const rev: Revision = revisiones[week] || {
    week, fecha: new Date().toISOString().split('T')[0],
    q1:'', q2:'', q3:'', q4:'', q5:'', q6:'', nota: 5, completada: false,
  };

  function update(field: keyof Revision, value: unknown) {
    save({ ...revisiones, [week]: { ...rev, [field]: value } });
  }

  function completar() {
    save({ ...revisiones, [week]: { ...rev, completada: true } });
  }

  // Week stats
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekTrades = trades.filter(t => t.date >= weekStartStr);
  const weekPnl = weekTrades.reduce((s,t)=>s+t.pnl,0);
  const weekWr = weekTrades.length ? Math.round(weekTrades.filter(t=>t.res==='win').length/weekTrades.length*100) : 0;
  const bestTrade = weekTrades.reduce((best, t) => t.pnl > (best?.pnl||-Infinity) ? t : best, null as Trade|null);
  const worstTrade = weekTrades.reduce((worst, t) => t.pnl < (worst?.pnl||Infinity) ? t : worst, null as Trade|null);
  const sinPlan = weekTrades.filter(t=>t.plan==='no').length;

  const historyEntries = Object.values(revisiones).filter(r=>r.week!==week).sort((a,b)=>b.week.localeCompare(a.week)).slice(0,8);

  const PREGUNTAS = [
    { key: 'q1' as const, label: '✅ ¿Qué funcionó bien esta semana?', color: G.green, placeholder: 'Setups que cumplieron el plan, buenas ejecuciones, momentos de disciplina...' },
    { key: 'q2' as const, label: '❌ ¿Qué no funcionó o puedes mejorar?', color: G.red, placeholder: 'Errores repetidos, trades fuera del plan, gestión emocional...' },
    { key: 'q3' as const, label: '🏆 ¿Cuál fue tu mejor trade y por qué?', color: G.gold, placeholder: 'Describe el setup, por qué entraste, qué salió bien...' },
    { key: 'q4' as const, label: '📉 ¿Cuál fue tu peor trade y qué aprendes?', color: G.red, placeholder: 'Qué falló, si seguiste el plan, qué cambiarías...' },
    { key: 'q5' as const, label: '🔄 ¿Qué cambias o ajustas la próxima semana?', color: G.accent, placeholder: 'Una cosa concreta y específica que vas a hacer diferente...' },
    { key: 'q6' as const, label: '🎯 ¿Cuál es tu objetivo principal la próxima semana?', color: G.purple, placeholder: 'Un objetivo de proceso (no de resultado). Ej: "Respetar el plan en el 100% de los trades"' },
  ];

  return (
    <div>
      {/* Week summary auto */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { l: 'Trades esta semana', v: String(weekTrades.length), c: G.muted2 },
          { l: 'P&L semanal', v: (weekPnl>=0?'+':'')+weekPnl.toFixed(2)+'€', c: weekPnl>=0?G.green:G.red },
          { l: 'Win Rate', v: weekTrades.length?weekWr+'%':'—', c: weekWr>=50?G.green:G.red },
          { l: 'Sin plan', v: sinPlan>0?`${sinPlan} trade${sinPlan>1?'s':''}✕`:'✓ Todos con plan', c: sinPlan>0?G.red:G.green },
        ].map(s=>(
          <div key={s.l} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>{s.l}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 700, color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {rev.completada ? (
        <div style={{ background: `${G.green}10`, border: `1px solid ${G.green}30`, borderRadius: 14, padding: '24px', textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: G.green, fontFamily: "'Inter',sans-serif", marginBottom: 4 }}>Revisión completada esta semana</div>
          <div style={{ fontSize: 12, color: G.muted }}>Tu nota: <strong style={{color:G.gold}}>{rev.nota}/10</strong></div>
          <button onClick={() => update('completada', false)} style={{ marginTop: 12, padding: '7px 14px', background: 'transparent', border: `1px solid ${G.border}`, borderRadius: 7, color: G.muted, fontSize: 11, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Editar revisión</button>
        </div>
      ) : (
        <div>
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Inter',sans-serif", marginBottom: 4 }}>📝 Revisión Semanal — {week}</div>
            <div style={{ fontSize: 11, color: G.muted, marginBottom: 18 }}>Dedica 10 minutos. Es la herramienta de mejora más poderosa que existe en trading.</div>

            {PREGUNTAS.map(q => (
              <div key={q.key} style={{ marginBottom: 16 }}>
                <label style={{ ...lbl, color: q.color }}>{q.label}</label>
                <textarea value={rev[q.key]} onChange={e=>update(q.key, e.target.value)} placeholder={q.placeholder} style={{ ...inp, borderColor: rev[q.key] ? `${q.color}30` : G.border }} />
              </div>
            ))}

            {/* Nota */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={lbl}>NOTA A TU SEMANA</label>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: rev.nota >= 7 ? G.green : rev.nota >= 5 ? G.gold : G.red }}>{rev.nota}/10</span>
              </div>
              <input type="range" min="1" max="10" value={rev.nota} onChange={e=>update('nota', parseInt(e.target.value))} style={{ width: '100%', accentColor: G.accent }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 10, color: G.muted }}>1 — Muy mala semana</span>
                <span style={{ fontSize: 10, color: G.muted }}>10 — Semana perfecta</span>
              </div>
            </div>

            <button onClick={completar} disabled={!rev.q1 || !rev.q5} style={{ width: '100%', padding: '13px', background: rev.q1 && rev.q5 ? `linear-gradient(135deg,${G.accent},${G.cyan})` : G.card2, border: 'none', borderRadius: 10, color: rev.q1 && rev.q5 ? '#05111e' : G.muted, fontSize: 14, fontWeight: 700, cursor: rev.q1 && rev.q5 ? 'pointer' : 'not-allowed', fontFamily: "'Inter',sans-serif", transition: 'all 0.2s' }}>
              {!rev.q1 ? 'Rellena al menos la primera pregunta para completar' : !rev.q5 ? 'Añade qué vas a cambiar para completar' : '✓ Marcar revisión como completada'}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {historyEntries.length > 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: `1px solid ${G.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>📚 Revisiones anteriores</div>
            <button onClick={()=>setShowHistory(!showHistory)} style={{ fontSize: 11, color: G.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace" }}>{showHistory?'Ocultar ↑':'Ver ↓'}</button>
          </div>
          {showHistory && historyEntries.map(r => (
            <div key={r.week} style={{ padding: '13px 18px', borderBottom: `1px solid ${G.border}`, display: 'grid', gridTemplateColumns: '100px 1fr 50px', gap: 12, alignItems: 'start' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: G.muted }}>{r.week}</div>
              <div>
                {r.q1 && <div style={{ fontSize: 11, color: G.muted2, marginBottom: 2 }}>✅ {r.q1.slice(0,80)}{r.q1.length>80?'...':''}</div>}
                {r.q5 && <div style={{ fontSize: 11, color: G.muted2 }}>🔄 {r.q5.slice(0,80)}{r.q5.length>80?'...':''}</div>}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 700, color: r.nota>=7?G.green:r.nota>=5?G.gold:G.red }}>{r.nota}</div>
                <div style={{ fontSize: 9, color: G.muted }}>/10</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
