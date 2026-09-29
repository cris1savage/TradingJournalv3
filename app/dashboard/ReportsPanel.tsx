'use client';
import React, { useState, useEffect } from 'react';
import { Report, ReportFrequency } from '@/lib/types';

const C = {
  bg: '#0a0f1e', card: '#0f1d35', border: 'rgba(255,255,255,0.07)',
  blue: '#3B82F6', green: '#22c55e', red: '#ef4444', text: '#ffffff', text2: '#94a3b8',
};

export default function ReportsPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [period, setPeriod] = useState<ReportFrequency>('weekly');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/reports?period=${period}`);
      const data = await res.json();
      setReports(data);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching reports:', e);
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', period }),
      });

      if (res.ok) {
        fetchReports();
      }
    } catch (e) {
      console.error('Error generating report:', e);
    }
  };

  const downloadReport = (report: Report) => {
    const html = generateHTML(report);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trading_Report_${report.period}_${new Date(report.endDate).toISOString().slice(0, 10)}.html`;
    a.click();
  };

  const generateHTML = (report: Report) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Trading Report - ${report.period}</title>
          <style>
            body { font-family: Arial, sans-serif; background: #0a0f1e; color: #fff; padding: 20px; }
            h1, h2 { color: #3B82F6; }
            .metric { background: #0f1d35; padding: 16px; border-radius: 8px; margin: 10px 0; }
            .positive { color: #22c55e; }
            .negative { color: #ef4444; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #111d35; }
          </style>
        </head>
        <body>
          <h1>Trading Report - ${report.period.toUpperCase()}</h1>
          <p>Generated: ${new Date(report.generatedAt).toLocaleString('es-ES')}</p>
          <p>Period: ${new Date(report.startDate).toLocaleDateString('es-ES')} to ${new Date(report.endDate).toLocaleDateString('es-ES')}</p>

          <h2>Consolidated Metrics</h2>
          <div class="metric">
            <strong>Total P&L:</strong> <span class="${report.consolidatedMetrics.totalPnL >= 0 ? 'positive' : 'negative'}">
              ${report.consolidatedMetrics.totalPnL >= 0 ? '+' : '-'}€${Math.abs(report.consolidatedMetrics.totalPnL).toFixed(2)}
            </span>
          </div>
          <div class="metric">
            <strong>Win Rate:</strong> ${report.consolidatedMetrics.winRate.toFixed(2)}%
          </div>
          <div class="metric">
            <strong>Profit Factor:</strong> ${report.consolidatedMetrics.profitFactor.toFixed(2)}
          </div>
          <div class="metric">
            <strong>Total Trades:</strong> ${report.consolidatedMetrics.trades}
          </div>

          <h2>Analysis</h2>
          <div class="metric">
            <h3>Highlights</h3>
            <ul>${report.analysis.highlights.map(h => `<li>${h}</li>`).join('')}</ul>
          </div>
          <div class="metric">
            <h3>Concerns</h3>
            <ul>${report.analysis.concerns.map(c => `<li>${c}</li>`).join('')}</ul>
          </div>
          <div class="metric">
            <h3>Recommendations</h3>
            <ul>${report.analysis.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
          </div>
        </body>
      </html>
    `;
  };

  if (loading) return <div style={{ color: C.text2 }}>Cargando reportes...</div>;

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: 0 }}>
          📊 Reportes Profesionales
        </h2>
        <button
          onClick={generateReport}
          style={{
            background: C.blue, color: '#fff', border: 'none', borderRadius: 6,
            padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}
        >
          Generar Reporte
        </button>
      </div>

      {/* Period Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['daily', 'weekly', 'monthly', 'quarterly'] as ReportFrequency[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '8px 14px', borderRadius: 6,
              border: `1px solid ${period === p ? C.blue : C.border}`,
              background: period === p ? `${C.blue}20` : 'transparent',
              color: period === p ? C.blue : C.text2,
              fontWeight: period === p ? 600 : 400, fontSize: 12,
              cursor: 'pointer', textTransform: 'capitalize',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {selectedReport ? (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setSelectedReport(null)}
            style={{
              background: 'transparent', color: C.blue, border: 'none',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: '16px',
            }}
          >
            ← Volver a Reportes
          </button>

          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: 0 }}>
                  Reporte {selectedReport.period.toUpperCase()}
                </h3>
                <p style={{ color: C.text2, fontSize: 12, margin: '8px 0 0 0' }}>
                  {new Date(selectedReport.startDate).toLocaleDateString('es-ES')} - {new Date(selectedReport.endDate).toLocaleDateString('es-ES')}
                </p>
              </div>
              <button
                onClick={() => downloadReport(selectedReport)}
                style={{
                  background: C.green, color: '#fff', border: 'none', borderRadius: 6,
                  padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                📥 Descargar HTML
              </button>
            </div>

            {/* Metrics Grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px',
            }}>
              <div style={{ background: '#080d1a', borderRadius: 8, padding: '12px' }}>
                <div style={{ color: C.text2, fontSize: 10, textTransform: 'uppercase', marginBottom: '4px' }}>P&L Total</div>
                <div style={{
                  color: selectedReport.consolidatedMetrics.totalPnL >= 0 ? C.green : C.red,
                  fontSize: 16, fontWeight: 700,
                }}>
                  {selectedReport.consolidatedMetrics.totalPnL >= 0 ? '+' : '-'}€{Math.abs(selectedReport.consolidatedMetrics.totalPnL).toFixed(2)}
                </div>
              </div>
              <div style={{ background: '#080d1a', borderRadius: 8, padding: '12px' }}>
                <div style={{ color: C.text2, fontSize: 10, textTransform: 'uppercase', marginBottom: '4px' }}>Win Rate</div>
                <div style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>
                  {selectedReport.consolidatedMetrics.winRate.toFixed(1)}%
                </div>
              </div>
              <div style={{ background: '#080d1a', borderRadius: 8, padding: '12px' }}>
                <div style={{ color: C.text2, fontSize: 10, textTransform: 'uppercase', marginBottom: '4px' }}>Profit Factor</div>
                <div style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>
                  {selectedReport.consolidatedMetrics.profitFactor.toFixed(2)}
                </div>
              </div>
              <div style={{ background: '#080d1a', borderRadius: 8, padding: '12px' }}>
                <div style={{ color: C.text2, fontSize: 10, textTransform: 'uppercase', marginBottom: '4px' }}>Trades</div>
                <div style={{ color: C.text, fontSize: 16, fontWeight: 700 }}>
                  {selectedReport.consolidatedMetrics.trades}
                </div>
              </div>
            </div>

            {/* Analysis */}
            <div style={{ display: 'grid', gap: '12px' }}>
              {selectedReport.analysis.highlights.length > 0 && (
                <div style={{ background: `${C.green}15`, border: `1px solid ${C.green}40`, borderRadius: 8, padding: '12px' }}>
                  <h4 style={{ color: C.green, margin: '0 0 8px 0', fontSize: 12 }}>✨ Highlights</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: C.text2, fontSize: 12 }}>
                    {selectedReport.analysis.highlights.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                </div>
              )}
              {selectedReport.analysis.concerns.length > 0 && (
                <div style={{ background: `${C.red}15`, border: `1px solid ${C.red}40`, borderRadius: 8, padding: '12px' }}>
                  <h4 style={{ color: C.red, margin: '0 0 8px 0', fontSize: 12 }}>⚠️ Concerns</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: C.text2, fontSize: 12 }}>
                    {selectedReport.analysis.concerns.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {reports.length === 0 ? (
            <div style={{
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: '40px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: '12px' }}>📋</div>
              <p style={{ color: C.text2, fontSize: 14 }}>
                No hay reportes {period}s aún. Genera uno para empezar.
              </p>
            </div>
          ) : (
            reports.map(report => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                  padding: '16px', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3 style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: '0 0 8px 0' }}>
                      Reporte {report.period.toUpperCase()}
                    </h3>
                    <p style={{ color: C.text2, fontSize: 12, margin: 0 }}>
                      {new Date(report.startDate).toLocaleDateString('es-ES')} - {new Date(report.endDate).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div style={{
                    color: report.consolidatedMetrics.totalPnL >= 0 ? C.green : C.red,
                    fontSize: 16, fontWeight: 700,
                  }}>
                    {report.consolidatedMetrics.totalPnL >= 0 ? '+' : '-'}€{Math.abs(report.consolidatedMetrics.totalPnL).toFixed(2)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
