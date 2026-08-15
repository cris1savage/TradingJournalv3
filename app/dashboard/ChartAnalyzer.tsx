'use client';
import { useState, useRef } from 'react';

const G = {
  bg:'#0b1a2e',card:'#112240',card2:'#162d4a',border:'rgba(100,160,255,0.12)',border2:'rgba(0,229,255,0.3)',
  accent:'#4d9fff',cyan:'#00e5ff',green:'#00e676',red:'#ff4081',gold:'#ffb300',
  text:'#e8f4ff',muted:'#4a7a9b',muted2:'#6b9cc7',
};

export default function ChartAnalyzer() {
  const [image, setImage] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const QUICK_QUESTIONS = [
    '¿Hay un setup válido ahora mismo?',
    '¿Cuáles son las zonas de liquidez clave?',
    '¿Cuál es la dirección del mercado en este TF?',
    '¿Dónde están los niveles Fibonacci relevantes?',
    '¿Operarías LONG o SHORT y por qué?',
  ];

  function processFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      // Remove data URL prefix to get base64
      const base64 = result.split(',')[1];
      setImage(result); // keep full for display
      sessionStorage.setItem('chart_b64', base64);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  async function analyze(q?: string) {
    const b64 = sessionStorage.getItem('chart_b64');
    if (!b64) { alert('Sube primero una captura de pantalla'); return; }
    setLoading(true); setAnalysis('');
    const finalQ = q || question || undefined;
    try {
      const res = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64, question: finalQ })
      });
      const data = await res.json();
      setAnalysis(data.analysis || data.error || 'Error al analizar');
    } catch {
      setAnalysis('Error de conexión. Inténtalo de nuevo.');
    }
    setLoading(false);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
      {/* Left — upload */}
      <div>
        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          style={{
            border: `2px dashed ${dragOver ? G.cyan : image ? G.green : G.border}`,
            borderRadius: 14, padding: 20, cursor: 'pointer', textAlign: 'center',
            background: dragOver ? `${G.cyan}08` : image ? `${G.green}05` : G.card,
            transition: 'all 0.2s', marginBottom: 12, minHeight: 200,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: dragOver ? `0 0 20px ${G.cyan}30` : 'none'
          }}>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
          {image ? (
            <div style={{ width: '100%' }}>
              <img src={image} alt="Chart" style={{ width: '100%', borderRadius: 10, maxHeight: 280, objectFit: 'contain' }} />
              <div style={{ fontSize: 11, color: G.green, marginTop: 8, fontFamily: 'Outfit, sans-serif' }}>✓ Captura cargada · Haz clic para cambiar</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: G.text, fontFamily: 'Outfit, sans-serif', marginBottom: 4 }}>Sube tu captura de pantalla</div>
              <div style={{ fontSize: 12, color: G.muted }}>Arrastra aquí o haz clic · PNG, JPG, WEBP</div>
              <div style={{ fontSize: 11, color: G.muted, marginTop: 6 }}>TradingView, MT4, MT5, cualquier plataforma</div>
            </>
          )}
        </div>

        {/* Custom question */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: G.muted, display: 'block', marginBottom: 5 }}>PREGUNTA PERSONALIZADA (opcional)</label>
          <input
            value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && analyze()}
            placeholder="¿Qué quieres que analice específicamente?"
            style={{ width: '100%', background: G.card2, border: `1px solid ${G.border}`, borderRadius: 8, padding: '9px 12px', color: G.text, fontFamily: 'Outfit, sans-serif', fontSize: 13, outline: 'none' }}
          />
        </div>

        <button onClick={() => analyze()} disabled={loading || !image} style={{ width: '100%', padding: '12px', background: loading || !image ? G.muted : `linear-gradient(135deg,${G.accent},${G.cyan})`, border: 'none', borderRadius: 10, color: '#05111e', fontSize: 14, fontWeight: 700, cursor: loading || !image ? 'not-allowed' : 'pointer', fontFamily: 'Outfit, sans-serif', opacity: loading || !image ? 0.6 : 1, marginBottom: 14, transition: 'all 0.2s' }}>
          {loading ? '⟳ Analizando con IA...' : '🔍 Analizar gráfico'}
        </button>

        {/* Quick questions */}
        <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.muted, marginBottom: 8 }}>PREGUNTAS RÁPIDAS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {QUICK_QUESTIONS.map(q => (
            <button key={q} onClick={() => analyze(q)} disabled={loading || !image} style={{ padding: '8px 12px', textAlign: 'left', background: G.card2, border: `1px solid ${G.border}`, borderRadius: 8, color: G.muted2, fontSize: 12, cursor: loading || !image ? 'not-allowed' : 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'all 0.12s', opacity: loading || !image ? 0.5 : 1 }}
              onMouseEnter={e => { if (!loading && image) { (e.currentTarget as HTMLButtonElement).style.borderColor = G.accent; (e.currentTarget as HTMLButtonElement).style.color = G.accent; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = G.border; (e.currentTarget as HTMLButtonElement).style.color = G.muted2; }}>
              → {q}
            </button>
          ))}
        </div>
      </div>

      {/* Right — analysis */}
      <div>
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 14, padding: 20, minHeight: 400 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: G.accent, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${G.border}` }}>ANÁLISIS DE IA</div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 14 }}>
              <div style={{ width: 44, height: 44, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, border: `2px solid ${G.border}`, borderTop: `2px solid ${G.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ position: 'absolute', inset: 7, border: `2px solid ${G.border}`, borderBottom: `2px solid ${G.cyan}`, borderRadius: '50%', animation: 'spin 1.2s linear infinite reverse' }} />
              </div>
              <div style={{ fontSize: 13, color: G.muted, fontFamily: 'Outfit, sans-serif' }}>Claude está analizando tu gráfico...</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : analysis ? (
            <div style={{ fontSize: 13, color: G.text, lineHeight: 1.8, fontFamily: 'Outfit, sans-serif', whiteSpace: 'pre-line' }}>
              {analysis.split('\n').map((line, i) => {
                const isBold = line.startsWith('**') || line.match(/^\d+\.|^[-•]/);
                const cleaned = line.replace(/\*\*/g, '');
                return (
                  <div key={i} style={{ marginBottom: cleaned.trim() ? 6 : 3, color: isBold ? G.text : G.muted2, fontWeight: line.startsWith('**') ? 600 : 400 }}>
                    {cleaned}
                  </div>
                );
              })}
              <button onClick={() => { setAnalysis(''); setQuestion(''); }} style={{ marginTop: 16, padding: '7px 14px', background: 'transparent', border: `1px solid ${G.border}`, borderRadius: 8, color: G.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Nuevo análisis</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: G.muted, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>🤖</div>
              <div style={{ fontSize: 14, fontFamily: 'Outfit, sans-serif', marginBottom: 6 }}>Sube una captura para empezar</div>
              <div style={{ fontSize: 12 }}>La IA analizará tu gráfico en segundos</div>
            </div>
          )}
        </div>

        {/* Tips */}
        <div style={{ background: `${G.accent}08`, border: `1px solid ${G.accent}25`, borderRadius: 12, padding: 14, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: G.accent, fontFamily: 'Outfit, sans-serif', marginBottom: 6 }}>💡 Mejores resultados</div>
          <div style={{ fontSize: 11, color: G.muted2, lineHeight: 1.6 }}>Usa capturas de TradingView con el par visible, el timeframe y las zonas que ya tienes marcadas. La IA ve todo lo que hay en el gráfico.</div>
        </div>
      </div>
    </div>
  );
}
