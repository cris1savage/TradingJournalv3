'use client';
import React, { useState, useEffect } from 'react';
import { Account, AccountType, RiskProfile } from '@/lib/types';

const C = {
  bg: '#0a0f1e', bg2: '#0d1526', bg3: '#111d35', card: '#0f1d35', card2: '#142040',
  border: 'rgba(255,255,255,0.07)', blue: '#3B82F6', blue2: '#60a5fa', green: '#22c55e',
  red: '#ef4444', amber: '#f59e0b', text: '#ffffff', text2: '#94a3b8', text3: '#475569',
};

const ACCOUNT_TYPE_ICONS = {
  forex: '💱', crypto: '₿', stocks: '📈',
};

interface AccountsManagerProps {
  onAccountSelect?: (id: string) => void;
  selectedAccount?: string;
}

export default function AccountsManager({ onAccountSelect, selectedAccount = 'propia' }: AccountsManagerProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: '', type: 'forex', broker: '', initialCapital: 5000, riskProfile: 'moderate',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      setAccounts(data);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching accounts:', e);
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...formData }),
      });
      const result = await res.json();
      if (result.ok) {
        fetchAccounts();
        setShowForm(false);
        setFormData({ name: '', type: 'forex', broker: '', initialCapital: 5000, riskProfile: 'moderate' });
      }
    } catch (e) {
      console.error('Error creating account:', e);
    }
  };

  if (loading) return <div style={{ color: C.text2 }}>Cargando cuentas...</div>;

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ color: C.text, fontSize: '18px', fontWeight: 600, margin: 0 }}>Tus Cuentas</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: C.blue, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px',
            cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}
        >
          {showForm ? 'Cancelar' : '+ Nueva Cuenta'}
        </button>
      </div>

      {showForm && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px', marginBottom: '20px',
        }}>
          <h4 style={{ color: C.text, margin: '0 0 15px 0', fontSize: 14 }}>Crear Nueva Cuenta</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <input
              placeholder="Nombre de la cuenta"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                gridColumn: '1 / -1', background: '#080d1a', border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '10px', color: C.text, fontSize: 13,
              }}
            />
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{
                background: '#080d1a', border: `1px solid ${C.border}`, borderRadius: 6,
                padding: '10px', color: C.text, fontSize: 13,
              }}
            >
              <option value="forex">Forex</option>
              <option value="crypto">Crypto</option>
              <option value="stocks">Stocks</option>
            </select>
            <input
              placeholder="Broker"
              value={formData.broker}
              onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
              style={{
                background: '#080d1a', border: `1px solid ${C.border}`, borderRadius: 6,
                padding: '10px', color: C.text, fontSize: 13,
              }}
            />
            <input
              placeholder="Capital inicial (€)"
              type="number"
              value={formData.initialCapital}
              onChange={(e) => setFormData({ ...formData, initialCapital: parseFloat(e.target.value) })}
              style={{
                background: '#080d1a', border: `1px solid ${C.border}`, borderRadius: 6,
                padding: '10px', color: C.text, fontSize: 13,
              }}
            />
            <select
              value={formData.riskProfile}
              onChange={(e) => setFormData({ ...formData, riskProfile: e.target.value })}
              style={{
                gridColumn: '1 / -1', background: '#080d1a', border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '10px', color: C.text, fontSize: 13,
              }}
            >
              <option value="conservative">Conservador</option>
              <option value="moderate">Moderado</option>
              <option value="aggressive">Agresivo</option>
            </select>
            <button
              onClick={handleCreateAccount}
              style={{
                gridColumn: '1 / -1', background: C.green, color: '#fff', border: 'none',
                borderRadius: 6, padding: '10px', cursor: 'pointer', fontWeight: 500, fontSize: 13,
              }}
            >
              Crear Cuenta
            </button>
          </div>
        </div>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px',
      }}>
        {accounts.map(account => (
          <div
            key={account.id}
            onClick={() => onAccountSelect?.(account.id)}
            style={{
              background: selectedAccount === account.id ? C.card2 : C.card,
              border: `2px solid ${selectedAccount === account.id ? C.blue : C.border}`,
              borderRadius: 12, padding: '16px', cursor: 'pointer',
              transition: 'all 0.2s', transform: selectedAccount === account.id ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: 24 }}>
                  {ACCOUNT_TYPE_ICONS[account.type as AccountType] || '💼'}
                </div>
              </div>
              <span style={{
                background: account.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: account.status === 'active' ? C.green : C.red, fontSize: 11, fontWeight: 600,
                padding: '4px 8px', borderRadius: 4, textTransform: 'uppercase',
              }}>
                {account.status}
              </span>
            </div>
            <h4 style={{ color: C.text, margin: '0 0 8px 0', fontSize: 15, fontWeight: 600 }}>
              {account.name}
            </h4>
            <p style={{ color: C.text2, margin: '0 0 12px 0', fontSize: 12 }}>
              {account.broker} · {account.type === 'forex' ? 'Forex' : account.type === 'crypto' ? 'Crypto' : 'Stocks'}
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px',
            }}>
              <div style={{ background: C.bg3, borderRadius: 6, padding: '8px' }}>
                <div style={{ color: C.text2, fontSize: 10, textTransform: 'uppercase' }}>Capital</div>
                <div style={{ color: C.text, fontSize: 14, fontWeight: 600, marginTop: '4px' }}>
                  €{account.currentCapital.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ background: C.bg3, borderRadius: 6, padding: '8px' }}>
                <div style={{ color: C.text2, fontSize: 10, textTransform: 'uppercase' }}>RoI</div>
                <div style={{
                  color: account.currentCapital >= account.initialCapital ? C.green : C.red,
                  fontSize: 14, fontWeight: 600, marginTop: '4px',
                }}>
                  {(((account.currentCapital - account.initialCapital) / account.initialCapital) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.text3 }}>
              Risk Profile: <span style={{ color: C.text2, fontWeight: 500 }}>{account.riskProfile}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
