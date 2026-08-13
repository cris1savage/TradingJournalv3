'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      router.push('/dashboard');
    } else {
      setError('Contraseña incorrecta');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080810',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: '#0f0f1a', border: '1px solid #1e1e30',
        borderRadius: 16, padding: '40px 36px', width: '100%', maxWidth: 380,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
      }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em', color: '#7c6dfa', marginBottom: 8 }}>TRADING JOURNAL</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e2f0' }}>Acceso privado</div>
          <div style={{ fontSize: 13, color: '#4a4a6a', marginTop: 6 }}>Solo para uso personal</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4a4a6a', display: 'block', marginBottom: 6 }}>Contraseña</label>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••••"
            style={{
              width: '100%', background: '#151522', border: '1px solid #262638',
              borderRadius: 8, padding: '11px 14px', color: '#e2e2f0',
              fontSize: 14, outline: 'none', fontFamily: 'monospace'
            }}
            autoFocus
          />
        </div>

        {error && <div style={{ color: '#f43f5e', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>{error}</div>}

        <button
          onClick={handleLogin}
          disabled={loading || !pw}
          style={{
            width: '100%', padding: 12, background: '#7c6dfa',
            border: 'none', borderRadius: 9, color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: loading || !pw ? 'not-allowed' : 'pointer',
            opacity: loading || !pw ? 0.6 : 1, fontFamily: "'Inter', sans-serif",
            transition: 'opacity 0.15s'
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  );
}
