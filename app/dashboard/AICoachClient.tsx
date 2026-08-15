'use client';
import { useState, useRef, useEffect } from 'react';

type Trade = { id: number; date: string; time: string; pair: string; dir: string; res: string; plan: string | null; pnl: number; emo: string; conf: string[]; notes: string; rr: string; rreal: string; };
type Capital = { initial: number; aportaciones: { amount: number }[] };

const G = {
  bg:'#0b1a2e',card:'#112240',card2:'#162d4a',border:'rgba(100,160,255,0.12)',
  accent:'#4d9fff',cyan:'#00e5ff',green:'#00e676',text:'#e8f4ff',muted:'#4a7a9b',muted2:'#6b9cc7',
};

type Msg = { role: 'user' | 'assistant'; text: string };

const QUICK = [
  '¿Cuál es mi mayor error de trading?',
  '¿Cuándo rindo mejor — horario y estado?',
  '¿Qué debo mejorar esta semana?',
  '¿Debería seguir operando hoy?',
  '¿Cuál es mi ventaja real?',
  '¿Qué activo me da más beneficio?',
];

export default function AICoachClient({ trades, capital }: { trades: Trade[]; capital: Capital }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', text: `¡Hola Cristian! 👋 Soy tu entrenador de trading personal. Tengo acceso a tus ${trades.length} operaciones registradas y puedo analizar tus patrones reales.\n\n¿Sobre qué quieres que te dé feedback?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  async function send(question?: string) {
    const q = question || input.trim();
    if (!q || loading) return;
    setInput('');
    setMsgs(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, trades, capital })
      });
      const data = await res.json();
      setMsgs(prev => [...prev, { role: 'assistant', text: data.answer }]);
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', text: 'Error de conexión. Inténtalo de nuevo.' }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 500 }}>
      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'assistant' && (
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${G.accent},${G.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginRight: 8, marginTop: 2 }}>🤖</div>
            )}
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: m.role === 'user' ? `linear-gradient(135deg,${G.accent},${G.cyan})` : G.card,
              border: m.role === 'assistant' ? `1px solid ${G.border}` : 'none',
              color: m.role === 'user' ? '#05111e' : G.text,
              fontSize: 13, lineHeight: 1.6, fontFamily: 'Outfit, sans-serif', whiteSpace: 'pre-line',
              fontWeight: m.role === 'user' ? 600 : 400,
            }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,${G.accent},${G.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
            <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: '14px 14px 14px 4px', padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: G.accent, animation: `bounce 1s ease infinite ${i*0.15}s` }}/>)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick questions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)} disabled={loading} style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${G.border}`, background: 'transparent', color: G.muted2, fontSize: 11, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'all 0.12s', opacity: loading ? 0.5 : 1 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = G.accent; (e.currentTarget as HTMLButtonElement).style.color = G.accent; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = G.border; (e.currentTarget as HTMLButtonElement).style.color = G.muted2; }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Pregunta algo sobre tu trading..."
          disabled={loading}
          style={{ flex: 1, background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, padding: '11px 14px', color: G.text, fontFamily: 'Outfit, sans-serif', fontSize: 13, outline: 'none' }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} style={{ padding: '11px 18px', background: `linear-gradient(135deg,${G.accent},${G.cyan})`, border: 'none', borderRadius: 10, color: '#05111e', fontSize: 13, fontWeight: 700, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', fontFamily: 'Outfit, sans-serif', opacity: loading || !input.trim() ? 0.6 : 1, flexShrink: 0 }}>
          {loading ? '...' : '→'}
        </button>
      </div>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
    </div>
  );
}
