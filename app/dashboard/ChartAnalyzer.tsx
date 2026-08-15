'use client';
import { useState, useRef } from 'react';

const G = {
  card:'#112240',card2:'#162d4a',border:'rgba(100,160,255,0.12)',border2:'rgba(0,229,255,0.3)',
  accent:'#4d9fff',cyan:'#00e5ff',green:'#00e676',red:'#ff4081',gold:'#ffb300',purple:'#7c4dff',
  text:'#e8f4ff',muted:'#4a7a9b',muted2:'#6b9cc7',
};

const CHECKLIST = [
  { id: 'trend4h', label: 'Tendencia en 4H confirmada', cat: 'estructura' },
  { id: 'trend1h', label: 'Tendencia en 1H alineada con 4H', cat: 'estructura' },
  { id: 'liquidez', label: 'Zona de liquidez clara identificada', cat: 'entrada' },
  { id: 'fibo', label: 'Retroceso Fibonacci 0.5-0.618 activo', cat: 'entrada' },
  { id: 'redondo', label: 'Número redondo o nivel clave cercano', cat: 'entrada' },
  { id: 'sl_claro', label: 'Stop Loss por encima/debajo de estructura', cat: 'gestion' },
  { id: 'rr2', label: 'R:R mínimo 1:2', cat: 'gestion' },
  { id: 'sesion', label: 'En horario de sesión NY (14:30-17:00)', cat: 'timing' },
  { id: 'noticias', label: 'Sin noticias de alto impacto en 30 min', cat: 'timing' },
  { id: 'emo', label: 'Estado emocional neutro o positivo', cat: 'psicologia' },
  { id: 'plan', label: 'Setup coincide con mi plan de trading', cat: 'psicologia' },
];

const CATS: Record<string, { label: string; color: string }> = {
  estructura: { label: '📊 Estructura', color: G.accent },
  entrada: { label: '🎯 Entrada', color: G.cyan },
  gestion: { label: '⚖️ Gestión', color: G.green },
  timing: { label: '🕐 Timing', color: G.gold },
  psicologia: { label: '🧠 Psicología', color: G.purple },
};

export default function ChartAnalyzer() {
  const [image, setImage] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [decision, setDecision] = useState<'enter' | 'wait' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function processFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  const totalChecked = Object.values(checked).filter(Boolean).length;
  const score = Math.round(totalChecked / CHECKLIST.length * 100);
  const scoreColor = score >= 80 ? G.green : score >= 60 ? G.gold : G.red;
  const recommendation = score >= 80 ? '✅ Setup sólido — puedes considerar entrar' : score >= 60 ? '⚠️ Setup parcial — espera confirmación' : '❌ Setup débil — mejor esperar';

  const byCategory = CHECKLIST.reduce((acc, item) => {
    if (!acc[item.cat]) acc[item.cat] = [];
    acc[item.cat].push(item);
    return acc;
  }, {} as Record<string, typeof CHECKLIST>);

  function reset() {
    setImage(null); setChecked({}); setNotes(''); setDecision(null);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
      {/* Left — image + score */}
      <div>
        <div onClick={() => fileRef.current?.click()} onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          style={{ border: `2px dashed ${image ? G.green : G.border}`, borderRadius: 14, padding: 16, cursor: 'pointer', textAlign: 'center', background: image ? `${G.green}05` : G.card, marginBottom: 14, minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
          {image ? (
            <div style={{ width: '100%' }}>
              <img src={image} alt="Chart" style={{ width: '100%', borderRadius: 10, maxHeight: 260, objectFit: 'contain' }} />
              <div style={{ fontSize: 11, color: G.green, marginTop: 8, fontFamily: 'Outfit, sans-serif' }}>✓ Captura cargada · Haz clic para cambiar</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: G.text, fontFamily: 'Outfit, sans-serif', marginBottom: 4 }}>Sube tu captura del gráfico</div>
              <div style={{ fontSize: 11, color: G.muted }}>Arrastra o haz clic · PNG, JPG, WEBP</div>
            </>
          )}
        </div>

        {/* Score */}
        <div style={{ background: G.card, border: `1px solid ${scoreColor}40`, borderRadius: 12, padding: 16, marginBottom: 14, textAlign: 'center', boxShadow: `0 0 20px ${scoreColor}10` }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, color: G.muted, letterSpacing: '0.15em', marginBottom: 8, textTransform: 'uppercase' }}>Puntuación del Setup</div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 48, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score}%</div>
          <div style={{ fontSize: 13, color: scoreColor, marginTop: 8, fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>{recommendation}</div>
          <div style={{ fontSize: 11, color: G.muted, marginTop: 4 }}>{totalChecked} de {CHECKLIST.length} criterios cumplidos</div>
        </div>

        {/* Decision */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <button onClick={() => setDecision('enter')} style={{ padding: '11px', borderRadius: 10, border: `1px solid ${decision==='enter'?G.green:G.border}`, background: decision==='enter'?`${G.green}18`:G.card2, color: decision==='enter'?G.green:G.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'all 0.15s' }}>✅ ENTRO</button>
          <button onClick={() => setDecision('wait')} style={{ padding: '11px', borderRadius: 10, border: `1px solid ${decision==='wait'?G.red:G.border}`, background: decision==='wait'?`${G.red}18`:G.card2, color: decision==='wait'?G.red:G.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'all 0.15s' }}>⏳ ESPERO</button>
        </div>

        <div>
          <label style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.muted, display: 'block', marginBottom: 5 }}>Notas del análisis</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="¿Qué ves? Dirección, zona clave, confluencias..." style={{ width: '100%', background: G.card2, border: `1px solid ${G.border}`, borderRadius: 8, padding: '9px 12px', color: G.text, fontFamily: 'Outfit, sans-serif', fontSize: 12, minHeight: 80, resize: 'vertical', outline: 'none' }} />
        </div>

        <button onClick={reset} style={{ width: '100%', marginTop: 10, padding: '9px', background: 'transparent', border: `1px solid ${G.border}`, borderRadius: 8, color: G.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>↺ Nuevo análisis</button>
      </div>

      {/* Right — checklist */}
      <div>
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Outfit, sans-serif', marginBottom: 4 }}>✅ Checklist de Setup</div>
          <div style={{ fontSize: 11, color: G.muted, marginBottom: 16 }}>Marca cada criterio que se cumpla en tu gráfico</div>

          {Object.entries(byCategory).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: CATS[cat].color, fontFamily: 'Outfit, sans-serif', marginBottom: 8, paddingBottom: 5, borderBottom: `1px solid ${G.border}` }}>{CATS[cat].label}</div>
              {items.map(item => (
                <div key={item.id} onClick={() => setChecked(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: checked[item.id] ? `${CATS[cat].color}10` : 'transparent', border: `1px solid ${checked[item.id] ? CATS[cat].color + '40' : 'transparent'}`, transition: 'all 0.12s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked[item.id] ? CATS[cat].color : G.muted}`, background: checked[item.id] ? CATS[cat].color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                    {checked[item.id] && <span style={{ color: '#05111e', fontSize: 11, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 12, color: checked[item.id] ? G.text : G.muted2, fontFamily: 'Outfit, sans-serif' }}>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ background: `${G.accent}08`, border: `1px solid ${G.accent}25`, borderRadius: 12, padding: 14, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: G.accent, fontFamily: 'Outfit, sans-serif', marginBottom: 6 }}>💡 Cómo usarlo</div>
          <div style={{ fontSize: 11, color: G.muted2, lineHeight: 1.6, fontFamily: 'Outfit, sans-serif' }}>Sube tu captura de TradingView, marca los criterios que se cumplen y deja que la puntuación te ayude a decidir si el setup vale la pena. Por encima de 80% es un setup sólido.</div>
        </div>
      </div>
    </div>
  );
}
