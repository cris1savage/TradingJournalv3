'use client';
import React, { useState, useEffect } from 'react';
import { Portfolio, Account } from '@/lib/types';
import { Line } from 'react-chartjs-2';

const C = {
  bg: '#0a0f1e', bg2: '#0d1526', bg3: '#111d35', card: '#0f1d35', card2: '#142040',
  border: 'rgba(255,255,255,0.07)', blue: '#3B82F6', green: '#22c55e', red: '#ef4444',
  text: '#ffffff', text2: '#94a3b8', text3: '#475569',
};

export default function PortfolioDashboard() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolioData();
    const interval = setInterval(fetchPortfolioData, 30000); // Refresh cada 30s
    return () => clearInterval(interval);
  }, []);

  const fetchPortfolioData = async () => {
    try {
      const [portfolioRes, accountsRes] = await Promise.all([
        fetch('/api/portfolio'),
        fetch('/api/accounts'),
      ]);

      const portfolioData = await portfolioRes.json();
      const accountsData = await accountsRes.json();

      setPortfolio(portfolioData);
      setAccounts(accountsData);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching portfolio:', e);
      setLoading(false);
    }
  };

  if (loading || !portfolio) {
    return <div style={{ color: C.text2 }}>Cargando portfolio...</div>;
  }

  const totalCapital = portfolio.totalCapital;
  const totalPnL = portfolio.totalPnL;
  const isProfit = totalPnL >= 0;

  return (
    <div style={{ padding: '20px 0' }}>
      <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: '0 0 20px 0' }}>
        Mi Portfolio
      </h2>

      {/* KPI Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px',
      }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px' }}>
          <div style={{ color: C.text2, fontSize: 12, textTransform: 'uppercase', marginBottom: '8px' }}>
            Capital Total
          </div>
          <div style={{ color: C.text, fontSize: 24, fontWeight: 700 }}>
            €{totalCapital.toLocaleString('es-ES', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ color: C.text3, fontSize: 11, marginTop: '8px' }}>
            {accounts.length} cuentas activas
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px' }}>
          <div style={{ color: C.text2, fontSize: 12, textTransform: 'uppercase', marginBottom: '8px' }}>
            P&L Consolidado
          </div>
          <div style={{ color: isProfit ? C.green : C.red, fontSize: 24, fontWeight: 700 }}>
            {isProfit ? '+' : '-'}€{Math.abs(totalPnL).toLocaleString('es-ES', { maximumFractionDigits: 2 })}
          </div>
          <div style={{ color: C.text3, fontSize: 11, marginTop: '8px' }}>
            {portfolio.totalPnLPercent.toFixed(2)}% Return
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px' }}>
          <div style={{ color: C.text2, fontSize: 12, textTransform: 'uppercase', marginBottom: '8px' }}>
            Mejor Cuenta
          </div>
          <div style={{ color: C.blue, fontSize: 14, fontWeight: 600, marginTop: '8px' }}>
            {accounts.find(a => a.id === portfolio.bestPerformingAccount)?.name || 'N/A'}
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px' }}>
          <div style={{ color: C.text2, fontSize: 12, textTransform: 'uppercase', marginBottom: '8px' }}>
            Peor Cuenta
          </div>
          <div style={{ color: C.red, fontSize: 14, fontWeight: 600, marginTop: '8px' }}>
            {accounts.find(a => a.id === portfolio.worstPerformingAccount)?.name || 'N/A'}
          </div>
        </div>
      </div>

      {/* Accounts Breakdown */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px',
      }}>
        <h3 style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: '0 0 16px 0' }}>
          Desglose por Cuenta
        </h3>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px',
        }}>
          {accounts.map(account => {
            const accountPercentage = (account.currentCapital / totalCapital) * 100;
            const accountPnL = account.currentCapital - account.initialCapital;
            const accountPnLPercent = (accountPnL / account.initialCapital) * 100;

            return (
              <div key={account.id} style={{
                background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: C.text, fontWeight: 500, fontSize: 13 }}>{account.name}</span>
                  <span style={{ color: C.text2, fontSize: 11 }}>{accountPercentage.toFixed(1)}%</span>
                </div>
                <div style={{
                  background: C.bg, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: '8px',
                }}>
                  <div style={{
                    width: `${accountPercentage}%`, height: '100%', background: C.blue,
                    transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', fontSize: 11,
                }}>
                  <span style={{ color: C.text2 }}>€{account.currentCapital.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</span>
                  <span style={{
                    color: accountPnL >= 0 ? C.green : C.red, fontWeight: 500,
                  }}>
                    {accountPnL >= 0 ? '+' : '-'}€{Math.abs(accountPnL).toFixed(2)} ({accountPnLPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
