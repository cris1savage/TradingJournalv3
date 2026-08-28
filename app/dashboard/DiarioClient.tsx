'use client';
import { useState, useEffect } from 'react';

const G = {
  bg:'#050a12', card:'#0c1628', card2:'#0f1e38', border:'rgba(0,180,255,0.1)',
  accent:'#0066dd', cyan:'#00d4ff', green:'#00e676', red:'#ff3366', gold:'#f5a623',
  purple:'#7c4dff', text:'#e8f0fe', muted:'#4a6a8a', muted2:'#8ba0bf',
};

type DiarioEntry = {
  date: string;
  hora: string;
  // Checklist
  dormidoBien: boolean;
  sinEstres: boolean;
  planClaro: boolean;
  mercadoFavorable: boolean;
  emocionNeutral: boolean;
  // Estado
  energia: number; // 1-5
  confianza: number; // 1-5
  foco: number; // 1-5
  emocion: string;
  notas: string;
  // Decision
  decision: 'operar' | 'reducir' | 'no-operar' | null;
  riesgoRecomendado: number; // %
};

const EMOCIONES = ['😌 Tranquilo','💪 Motivado','😐 Neutro','😰 Ansioso','😤 Frustrado','🎲 FOMO','😴 Cansado','😡 Enfadado'];

function StarRating({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(i => (
        <button key={i} onClick={() => onChange(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, opacity: i <= value ? 1 : 0.2, filter: i <= value ? `drop-shadow(0 0 4px ${color})` : 'none', transition: 'all 0.15s', padding: '2px' }}>●</button>
      ))}
    </div>
  );
}

function calcularSemaforo(entry: DiarioEntry): { color: 'green' | 'yellow' | 'red'; label: string; riesgo: number; mensaje: string; ops: number } {
  const checks = [entry.dormidoBien, entry.sinEstres, entry.planClaro, entry.mercadoFavorable, entry.emocionNeutral];
  const checksOk = checks.filter(Boolean).length;
  const avgScore = (entry.energia + entry.confianza + entry.foco) / 3;
  const badEmos = ['😰 Ansioso','😤 Frustrado','🎲 FOMO','😡 Enfadado','😴 Cansado'];
  const badEmo = badEmos.some(e => entry.emocion.includes(e.split(' ')[1]));

  const score = checksOk * 10 + avgScore * 10 + (badEmo ? -20 : 10);

  if (score >= 60 && !badEmo && checksOk >= 4) {
    return { color: 'green', label: '✅ OPERAR NORMAL', riesgo: 100, mensaje: 'Estás en condiciones óptimas. Opera con tu riesgo habitual y sigue el plan.', ops: 3 };
  } else if (score >= 35 || (checksOk >= 3 && !badEmo)) {
    return { color: 'yellow', label: '⚠️ REDUCIR RIESGO', riesgo: 50, mensaje: 'Condiciones parciales. Opera solo 1 trade con la mitad del riesgo habitual. Sé muy selectivo.', ops: 1 };
  } else {
    return { color: 'red', label: '🚫 NO OPERAR HOY', riesgo: 0, mensaje: 'Las condiciones no son favorables. El mercado siempre estará mañana. Protege tu capital.', ops: 0 };
  }
}

const KEY = 'st_diario';

function getToday() { return new Date().toISOString().split('T')[0]; }
function getHora() { return new Date().toTimeString().slice(0,5); }

export default function DiarioClient() {
  const today = getToday();
  const [entries, setEntries] = useState<Record<string, DiarioEntry>>({});
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  function save(updated: Record<string, DiarioEntry>) {
    setEntries(updated);
    localStorage.setItem(KEY, JSON.stringify(updated));
  }

  const entry: DiarioEntry = entries[today] || {
    date: today, hora: getHora(),
    dormidoBien: false, sinEstres: false, planClaro: false, mercadoFavorable: false, emocionNeutral: false,
    energia: 3, confianza: 3, foco: 3,
    emocion: '', notas: '', decision: null, riesgoRecomendado: 100,
  };

  function update(field: keyof DiarioEntry, value: unknown) {
    const updated = { ...entries, [today]: { ...entry, [field]: value, hora: getHora() } };
    save(updated);
  }

  const semaforo = calcularSemaforo(entry);
  const hasEntry = !!entries[today];
  const historyEntries = Object.values(entries).filter(e => e.date !== today).sort((a,b) => b.date.localeCompare(a.date)).slice(0,14);

  const semaforoColor = semaforo.color === 'green' ? G.green : semaforo.color === 'yellow' ? G.gold : G.red;
  const semaforoGlow = semaforo.color === 'green' ? `0 0 30px ${G.green}30` : semaforo.color === 'yellow' ? `0 0 30px ${G.gold}30` : `0 0 30px ${G.red}30`;

  const inp: React.CSSProperties = { background: G.card2, border: `1px solid ${G.border}`, borderRadius: 8, padding: '9px 12px', color: G.text, fontFamily: "'Inter',sans-serif", fontSize: 13, width: '100%', outline: 'none' };
  const lbl: React.CSSProperties = { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: G.muted, display: 'block', marginBottom: 5 };

  return (
    <div>
      {/* SEMÁFORO - resultado principal */}
      <div style={{ background: `${semaforoColor}10`, border: `2px solid ${semaforoColor}40`, borderRadius: 16, padding: '22px 24px', marginBottom: 20, boxShadow: semaforoGlow, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: semaforoColor }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: G.muted, letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>SEMÁFORO DE HOY · {today}</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 22, fontWeight: 800, color: semaforoColor, marginBottom: 8 }}>{semaforo.label}</div>
            <div style={{ fontSize: 13, color: G.muted2, lineHeight: 1.6, maxWidth: 420 }}>{semaforo.mensaje}</div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
            <div style={{ textAlign: 'center', background: G.card, borderRadius: 12, padding: '14px 20px', border: `1px solid ${G.border}` }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: G.muted, letterSpacing: '0.12em', marginBottom: 6, textTransform: 'uppercase' }}>RIESGO MAX</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 28, fontWeight: 900, color: semaforoColor, lineHeight: 1 }}>{semaforo.riesgo}%</div>
              <div style={{ fontSize: 10, color: G.muted, marginTop: 4 }}>del normal</div>
            </div>
            <div style={{ textAlign: 'center', background: G.card, borderRadius: 12, padding: '14px 20px', border: `1px solid ${G.border}` }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: G.muted, letterSpacing: '0.12em', marginBottom: 6, textTransform: 'uppercase' }}>MAX TRADES</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 28, fontWeight: 900, color: semaforoColor, lineHeight: 1 }}>{semaforo.ops}</div>
              <div style={{ fontSize: 10, color: G.muted, marginTop: 4 }}>hoy</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* CHECKLIST */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, fontFamily: "'Inter',sans-serif" }}>✅ Checklist de Trading</div>
          {[
            { key: 'dormidoBien' as const, label: 'He dormido bien (+6h)', icon: '😴' },
            { key: 'sinEstres' as const, label: 'Sin estrés externo relevante', icon: '🧘' },
            { key: 'planClaro' as const, label: 'Tengo el plan claro para hoy', icon: '📋' },
            { key: 'mercadoFavorable' as const, label: 'El mercado tiene setup válido', icon: '📊' },
            { key: 'emocionNeutral' as const, label: 'Me siento emocionalmente neutro', icon: '⚖️' },
          ].map(item => (
            <div key={item.key} onClick={() => update(item.key, !entry[item.key])} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 9, cursor: 'pointer', marginBottom: 5, background: entry[item.key] ? `${G.green}10` : 'transparent', border: `1px solid ${entry[item.key] ? `${G.green}30` : 'transparent'}`, transition: 'all 0.15s' }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${entry[item.key] ? G.green : G.muted}`, background: entry[item.key] ? G.green : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                {entry[item.key] && <span style={{ color: '#05111e', fontSize: 12, fontWeight: 900 }}>✓</span>}
              </div>
              <span style={{ fontSize: 12 }}>{item.icon}</span>
              <span style={{ fontSize: 12, color: entry[item.key] ? G.text : G.muted2, fontFamily: "'Inter',sans-serif" }}>{item.label}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, padding: '8px 10px', background: G.card2, borderRadius: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: G.muted2 }}>
            {[entry.dormidoBien, entry.sinEstres, entry.planClaro, entry.mercadoFavorable, entry.emocionNeutral].filter(Boolean).length}/5 criterios ✓
          </div>
        </div>

        {/* ESTADO MENTAL */}
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, fontFamily: "'Inter',sans-serif" }}>🧠 Estado Mental</div>

          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>EMOCIÓN DOMINANTE</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {EMOCIONES.map(e => (
                <button key={e} onClick={() => update('emocion', entry.emocion === e ? '' : e)} style={{ padding: '5px 10px', borderRadius: 20, border: `1px solid ${entry.emocion === e ? G.purple : G.border}`, background: entry.emocion === e ? `${G.purple}18` : 'transparent', color: entry.emocion === e ? G.purple : G.muted, fontSize: 11, cursor: 'pointer', fontFamily: "'Inter',sans-serif", transition: 'all 0.12s' }}>{e}</button>
              ))}
            </div>
          </div>

          {[
            { key: 'energia' as const, label: 'Energía', color: G.green },
            { key: 'confianza' as const, label: 'Confianza', color: G.accent },
            { key: 'foco' as const, label: 'Foco', color: G.cyan },
          ].map(item => (
            <div key={item.key} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <label style={{ ...lbl, display: 'inline' }}>{item.label}</label>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: item.color }}>{entry[item.key]}/5</span>
              </div>
              <StarRating value={entry[item.key]} onChange={v => update(item.key, v)} color={item.color} />
            </div>
          ))}
        </div>
      </div>

      {/* NOTAS */}
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
        <label style={{ ...lbl, marginBottom: 8 }}>📝 NOTAS DEL DÍA</label>
        <textarea value={entry.notas} onChange={e => update('notas', e.target.value)} placeholder="¿Cómo te sientes hoy? ¿Hay algo que te preocupe? ¿Qué esperas del mercado?..." style={{ ...inp, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} />
      </div>

      {/* HISTORIAL */}
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px', borderBottom: `1px solid ${G.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>📅 Historial del Diario</div>
          <button onClick={() => setShowHistory(!showHistory)} style={{ fontSize: 11, color: G.accent, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace" }}>{showHistory ? 'Ocultar ↑' : 'Ver historial ↓'}</button>
        </div>
        {showHistory && (
          historyEntries.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: G.muted, fontSize: 12 }}>Sin entradas anteriores</div>
          ) : (
            historyEntries.map(e => {
              const sem = calcularSemaforo(e);
              const c = sem.color === 'green' ? G.green : sem.color === 'yellow' ? G.gold : G.red;
              const checks = [e.dormidoBien, e.sinEstres, e.planClaro, e.mercadoFavorable, e.emocionNeutral].filter(Boolean).length;
              return (
                <div key={e.date} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px', gap: 12, padding: '11px 18px', borderBottom: `1px solid ${G.border}`, alignItems: 'center' }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: G.muted }}>{e.date}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: c }}>{sem.label}</div>
                    {e.emocion && <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>{e.emocion}</div>}
                    {e.notas && <div style={{ fontSize: 10, color: G.muted2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{e.notas}</div>}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: G.muted }}>{checks}/5 checks</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: c }}>{sem.riesgo}% riesgo</div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
