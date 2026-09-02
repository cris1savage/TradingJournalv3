'use client';
import { useState, useEffect } from 'react';

type Trade = { id: number; date: string; time: string; pair: string; res: string; plan: string | null; pnl: number; emo: string; };

const G = {
  card:'#1a1a1a',card2:'#202020',border:'rgba(255,255,255,0.06)',
  accent:'#0066dd',cyan:'#00ff88',green:'#00ff88',red:'#ff4444',gold:'#ffaa00',purple:'#7c4dff',
  text:'#ffffff',muted:'#666666',muted2:'#aaaaaa',
};

type Alert = { id: string; type: 'danger' | 'warning' | 'success' | 'info'; title: string; body: string; action?: string; };
type AlertConfig = { maxDailyLoss: number; maxDailyTrades: number; maxLossStreak: number; dailyLossLimit: number; };

const DEFAULT_CONFIG: AlertConfig = { maxDailyLoss: 3, maxDailyTrades: 2, maxLossStreak: 2, dailyLossLimit: 50 };

export default function AlertasClient({ trades }: { trades: Trade[] }) {
  const [config, setConfig] = useState<AlertConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    const saved = localStorage.getItem('st_alert_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  const [showConfig, setShowConfig] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => { localStorage.setItem('st_alert_config', JSON.stringify(config)); }, [config]);

  // Generate alerts based on real data
  const alerts: Alert[] = [];
  const today = new Date().toISOString().split('T')[0];
  const todayTrades = trades.filter(t => t.date === today);
  const todayPnl = todayTrades.reduce((s, t) => s + t.pnl, 0);
  const todayLosses = todayTrades.filter(t => t.res === 'loss').length;

  // 1. Daily loss limit
  if (todayPnl <= -config.dailyLossLimit) {
    alerts.push({ id: 'daily-loss', type: 'danger', title: '🚨 Límite de pérdida diaria alcanzado', body: `Has perdido ${Math.abs(todayPnl).toFixed(2)}€ hoy, superando tu límite de ${config.dailyLossLimit}€. Para el día y protege tu capital.`, action: 'PARAR DE OPERAR HOY' });
  }

  // 2. Max daily trades
  if (todayTrades.length >= config.maxDailyTrades) {
    alerts.push({ id: 'max-trades', type: 'warning', title: '⚠️ Máximo de operaciones diarias', body: `Llevas ${todayTrades.length} operaciones hoy. Tu límite configurado es ${config.maxDailyTrades}. Cualquier trade adicional es fuera del plan.`, action: 'VER HISTORIAL DE HOY' });
  }

  // 3. Loss streak
  const recent = [...trades].reverse().slice(0, 10);
  let streak = 0;
  for (const t of recent) { if (t.res === 'loss') streak++; else break; }
  if (streak >= config.maxLossStreak) {
    alerts.push({ id: 'loss-streak', type: 'danger', title: `🔴 ${streak} pérdidas consecutivas`, body: `Llevas ${streak} operaciones perdedoras seguidas. Esto es una señal clara de que el mercado no está alineado con tu análisis o estás operando emocionalmente. Para.`, action: 'VER ÚLTIMAS OPERACIONES' });
  }

  // 4. Emotional state warning
  const badEmos = ['Frustrado', 'FOMO', 'Revenge', 'Ansioso'];
  const recentBadEmo = todayTrades.filter(t => badEmos.some(e => t.emo?.includes(e)));
  if (recentBadEmo.length >= 2) {
    alerts.push({ id: 'bad-emo', type: 'warning', title: '🧠 Estado emocional de riesgo', body: `${recentBadEmo.length} de tus operaciones de hoy se hicieron en estado emocional negativo. Los datos muestran que rindes peor en esas condiciones.`, });
  }

  // 5. No plan trades today
  const sinPlanHoy = todayTrades.filter(t => t.plan === 'no');
  if (sinPlanHoy.length > 0) {
    alerts.push({ id: 'no-plan', type: 'warning', title: '📋 Operaciones sin plan detectadas', body: `Hoy tienes ${sinPlanHoy.length} operación(es) sin seguir el plan. P&L de esas operaciones: ${sinPlanHoy.reduce((s, t) => s + t.pnl, 0).toFixed(2)}€.` });
  }

  // 6. Good day — positive
  if (todayPnl > 0 && todayTrades.length > 0 && todayLosses === 0) {
    alerts.push({ id: 'great-day', type: 'success', title: '✅ Día perfecto hasta ahora', body: `Llevas +${todayPnl.toFixed(2)}€ hoy sin ninguna pérdida. ${todayTrades.length >= config.maxDailyTrades ? 'Has completado tu cuota diaria. Considera parar y asegurar el beneficio.' : 'Sigue el plan y no te confíes.'}` });
  }

  // 7. Good week
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekTrades = trades.filter(t => new Date(t.date) >= weekAgo);
  const weekPnl = weekTrades.reduce((s, t) => s + t.pnl, 0);
  const weekWr = weekTrades.length ? Math.round(weekTrades.filter(t => t.res === 'win').length / weekTrades.length * 100) : 0;
  if (weekPnl > 30 && weekWr >= 60) {
    alerts.push({ id: 'great-week', type: 'success', title: '🏆 Semana sólida', body: `Esta semana llevas +${weekPnl.toFixed(2)}€ con ${weekWr}% de win rate en ${weekTrades.length} operaciones. Buen trabajo.` });
  }

  // 8. Inactive warning
  const lastTrade = [...trades].reverse()[0];
  if (lastTrade) {
    const daysSinceLastTrade = Math.floor((new Date().getTime() - new Date(lastTrade.date).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastTrade > 7) {
      alerts.push({ id: 'inactive', type: 'info', title: '📅 Sin operar desde hace ' + daysSinceLastTrade + ' días', body: `Tu último trade fue el ${lastTrade.date}. Si es pausa planificada, bien. Si no, revisa si hay mercado alineado con tu plan.` });
    }
  }

  const visibleAlerts = alerts.filter(a => !dismissed.includes(a.id));
  const alertColors = { danger: G.red, warning: G.gold, success: G.green, info: G.accent };

  return (
    <div>
      {/* Config button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: G.muted2, fontFamily: "'Inter',sans-serif" }}>{visibleAlerts.length} alerta{visibleAlerts.length !== 1 ? 's' : ''} activa{visibleAlerts.length !== 1 ? 's' : ''}</div>
        <button onClick={() => setShowConfig(!showConfig)} style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${G.border}`, borderRadius: 8, color: G.muted2, fontSize: 11, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>⚙️ Configurar límites</button>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Inter',sans-serif", marginBottom: 14 }}>⚙️ Límites de alerta</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Pérdida máxima diaria (€)', key: 'dailyLossLimit' as keyof AlertConfig },
              { label: 'Máx. operaciones por día', key: 'maxDailyTrades' as keyof AlertConfig },
              { label: 'Alerta racha de pérdidas', key: 'maxLossStreak' as keyof AlertConfig },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.muted, display: 'block', marginBottom: 5 }}>{f.label}</label>
                <input type="number" value={config[f.key]} onChange={e => setConfig(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                  style={{ width: '100%', background: G.card2, border: `1px solid ${G.border}`, borderRadius: 8, padding: '8px 12px', color: G.text, fontFamily: "'Inter',sans-serif", fontSize: 13, outline: 'none' }} />
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: G.muted, marginTop: 10, fontFamily: "'Inter',sans-serif" }}>Los límites se guardan automáticamente en tu dispositivo.</div>
        </div>
      )}

      {/* Alerts */}
      {visibleAlerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: G.muted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Inter',sans-serif", color: G.green, marginBottom: 6 }}>Todo bajo control</div>
          <div style={{ fontSize: 13, fontFamily: "'Inter',sans-serif" }}>No hay alertas activas. Sigue el plan.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visibleAlerts.map(a => {
            const c = alertColors[a.type];
            return (
              <div key={a.id} style={{ background: `${c}08`, border: `1px solid ${c}40`, borderRadius: 12, padding: '14px 16px', position: 'relative', boxShadow: a.type === 'danger' ? `0 0 20px ${c}20` : 'none' }}>
                <button onClick={() => setDismissed(prev => [...prev, a.id])} style={{ position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: G.muted, cursor: 'pointer', fontSize: 14 }}>✕</button>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Inter',sans-serif", color: c, marginBottom: 6, paddingRight: 20 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: G.muted2, fontFamily: "'Inter',sans-serif", lineHeight: 1.6 }}>{a.body}</div>
                {a.action && (
                  <div style={{ marginTop: 10, padding: '6px 12px', background: `${c}20`, border: `1px solid ${c}50`, borderRadius: 7, display: 'inline-block', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: c, letterSpacing: '0.08em', fontWeight: 700 }}>{a.action}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Today summary */}
      <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 12, padding: 16, marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Inter',sans-serif", marginBottom: 12 }}>📅 Resumen de hoy</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {[
            { l: 'Operaciones', v: String(todayTrades.length) + '/' + config.maxDailyTrades, c: todayTrades.length >= config.maxDailyTrades ? G.red : G.green },
            { l: 'P&L hoy', v: (todayPnl >= 0 ? '+' : '') + todayPnl.toFixed(2) + '€', c: todayPnl >= 0 ? G.green : G.red },
            { l: 'Pérdidas hoy', v: String(todayLosses), c: todayLosses >= 2 ? G.red : G.muted2 },
            { l: 'Racha actual', v: streak > 0 ? `-${streak}` : streak === 0 && todayTrades.filter(t=>t.res==='win').length > 0 ? `+${[...trades].reverse().findIndex(t => t.res !== 'win')}` : '—', c: streak > 0 ? G.red : G.green },
          ].map(s => (
            <div key={s.l} style={{ background: G.card2, borderRadius: 9, padding: '10px 12px', border: `1px solid ${G.border}` }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: G.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.l}</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 700, color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
