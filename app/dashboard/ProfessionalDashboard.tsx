'use client';
import React, { useState } from 'react';
import AccountsManager from './AccountsManager';
import PortfolioDashboard from './PortfolioDashboard';
import TeamVisualization from './TeamVisualization';
import AlertsPanel from './AlertsPanel';
import CapitalManager from './CapitalManager';
import RecommendationsPanel from './RecommendationsPanel';
import ReportsPanel from './ReportsPanel';
import ExecutiveBoard from './ExecutiveBoard';
import TradingFloor from './TradingFloor';
import Leaderboard from './Leaderboard';
import BrokerCommand3D from './BrokerCommand3D';
import TradingFloor3D from './TradingFloor3D';
import PerformanceHistory from './PerformanceHistory';
import CapitalDeposit from './CapitalDeposit';
import TradingControlPanel from './TradingControlPanel';
import { SimulationEngine } from './SimulationEngine';

const C = {
  bg: '#0a0f1e', bg2: '#0d1526', card: '#0f1d35',
  border: 'rgba(255,255,255,0.07)', blue: '#3B82F6', text: '#ffffff', text2: '#94a3b8',
};

type TabType = 'overview' | 'accounts' | 'portfolio' | 'team' | 'capital' | 'alerts' | 'recommendations' | 'reports' | 'executive' | 'trading-floor' | 'leaderboard' | 'broker-3d' | 'trading-floor-3d' | 'history' | 'deposit' | 'control';

export default function ProfessionalDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedAccount, setSelectedAccount] = useState('propia');

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <SimulationEngine />
      {/* Header */}
      <div style={{
        background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: '16px 20px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ color: C.text, fontSize: 28, fontWeight: 800, margin: 0, marginBottom: '16px' }}>
            🚀 Trading Portfolio Professional Manager
          </h1>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
            {[
              { id: 'overview', label: '📊 Resumen', icon: '📋' },
              { id: 'history', label: '📈 Historial P&L', icon: '📊' },
              { id: 'deposit', label: '💰 Depositar', icon: '💸' },
              { id: 'control', label: '⚙️ Control Trading', icon: '🎛️' },
              { id: 'broker-3d', label: '🎮 Broker 3D', icon: '🎯' },
              { id: 'executive', label: '🏛️ Control', icon: '⚙️' },
              { id: 'trading-floor', label: '🎯 Piso Trading', icon: '📈' },
              { id: 'team', label: '👥 Equipo Iso', icon: '🏢' },
              { id: 'leaderboard', label: '🏆 Ranking', icon: '⭐' },
              { id: 'accounts', label: '💼 Cuentas', icon: '📁' },
              { id: 'portfolio', label: '💰 Portfolio', icon: '📊' },
              { id: 'capital', label: '💵 Capital', icon: '💸' },
              { id: 'alerts', label: '⚠️ Alertas', icon: '🔔' },
              { id: 'recommendations', label: '💡 Ideas', icon: '✨' },
              { id: 'reports', label: '📄 Reportes', icon: '📋' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  padding: '8px 14px', borderRadius: 6, border: '1px solid',
                  borderColor: activeTab === tab.id ? C.blue : C.border,
                  background: activeTab === tab.id ? `${C.blue}20` : 'transparent',
                  color: activeTab === tab.id ? C.blue : C.text2,
                  fontWeight: activeTab === tab.id ? 600 : 400, fontSize: 12,
                  cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 20px' }}>
        {activeTab === 'overview' && (
          <div>
            <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: '20px' }}>
              Resumen Ejecutivo
            </h2>
            <PortfolioDashboard />
          </div>
        )}

        {activeTab === 'accounts' && (
          <div>
            <AccountsManager
              selectedAccount={selectedAccount}
              onAccountSelect={setSelectedAccount}
            />
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div>
            <PortfolioDashboard />
          </div>
        )}

        {activeTab === 'team' && (
          <div>
            <TeamVisualization />
          </div>
        )}

        {activeTab === 'capital' && (
          <div>
            <CapitalManager selectedAccount={selectedAccount} />
          </div>
        )}

        {activeTab === 'alerts' && (
          <div>
            <AlertsPanel />
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div>
            <RecommendationsPanel />
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <ReportsPanel />
          </div>
        )}

        {activeTab === 'executive' && (
          <div>
            <ExecutiveBoard />
          </div>
        )}

        {activeTab === 'trading-floor' && (
          <div>
            <TradingFloor />
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div>
            <Leaderboard />
          </div>
        )}

        {activeTab === 'broker-3d' && (
          <div>
            <BrokerCommand3D />
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <PerformanceHistory />
          </div>
        )}

        {activeTab === 'deposit' && (
          <div>
            <CapitalDeposit />
          </div>
        )}

        {activeTab === 'control' && (
          <div>
            <TradingControlPanel />
          </div>
        )}
      </div>
    </div>
  );
}
