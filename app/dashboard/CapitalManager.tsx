'use client';
import React, { useState, useEffect } from 'react';
import { Account, Capital, CapitalMovement } from '@/lib/types';

const C = {
  bg: '#0a0f1e', card: '#0f1d35', border: 'rgba(255,255,255,0.07)',
  blue: '#3B82F6', green: '#22c55e', red: '#ef4444', text: '#ffffff', text2: '#94a3b8',
};

interface CapitalManagerProps {
  selectedAccount?: string;
}

export default function CapitalManager({ selectedAccount = 'propia' }: CapitalManagerProps) {
  const [capital, setCapital] = useState<Capital | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ amount: '', description: '', type: 'deposit' as const });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCapitalData();
  }, [selectedAccount]);

  const fetchCapitalData = async () => {
    try {
      const [capitalRes, accountsRes] = await Promise.all([
        fetch(`/api/capital?account=${selectedAccount}`),
        fetch('/api/accounts'),
      ]);

      const capitalData = await capitalRes.json();
      const accountsData = await accountsRes.json();

      setCapital(capitalData);
      setAccount(accountsData.find((a: Account) => a.id === selectedAccount) || null);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching capital:', e);
      setLoading(false);
    }
  };

  const handleAddMovement = async () => {
    if (!formData.amount) return;

    try {
      const res = await fetch('/api/capital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: selectedAccount,
          action: 'add',
          amount: parseFloat(formData.amount),
          description: formData.description,
          type: formData.type,
          date: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        fetchCapitalData();
        setShowForm(false);
        setFormData({ amount: '', description: '', type: 'deposit' });
      }
    } catch (e) {
      console.error('Error adding capital movement:', e);
    }
  };

  const handleAutoReinvest = async () => {
    if (!account || account.currentCapital <= account.initialCapital) return;

    try {
      const res = await fetch('/api/capital', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account: selectedAccount,
          percentage: 50,
        }),
      });

      if (res.ok) {
        fetchCapitalData();
      }
    } catch (e) {
      console.error('Error reinvesting:', e);
    }
  };

  if (loading || !capital || !account) {
    return <div style={{ color: C.text2 }}>Cargando capital...</div>;
  }

  const profitAmount = account.currentCapital - account.initialCapital;
  const profitPercent = (profitAmount / account.initialCapital) * 100;

  return (
    <div style={{ padding: '20px 0' }}>
      <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: '0 0 20px 0' }}>
        Gestión de Capital - {account.name}
      </h2>

      {/* Capital Summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px',
      }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px' }}>
          <div style={{ color: C.text2, fontSize: 12, textTransform: 'uppercase', marginBottom: '8px' }}>
            Capital Inicial
          </div>
          <div style={{ color: C.text, fontSize: 20, fontWeight: 700 }}>
            €{account.initialCapital.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px' }}>
          <div style={{ color: C.text2, fontSize: 12, textTransform: 'uppercase', marginBottom: '8px' }}>
            Capital Actual
          </div>
          <div style={{ color: C.blue, fontSize: 20, fontWeight: 700 }}>
            €{account.currentCapital.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px' }}>
          <div style={{ color: C.text2, fontSize: 12, textTransform: 'uppercase', marginBottom: '8px' }}>
            Ganancia/Pérdida
          </div>
          <div style={{
            color: profitAmount >= 0 ? C.green : C.red,
            fontSize: 20, fontWeight: 700,
          }}>
            {profitAmount >= 0 ? '+' : '-'}€{Math.abs(profitAmount).toLocaleString('es-ES', { maximumFractionDigits: 2 })}
          </div>
          <div style={{ color: C.text2, fontSize: 11, marginTop: '4px' }}>
            {profitPercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style({
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px',
      }}>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: C.blue, color: '#fff', border: 'none', borderRadius: 8,
            padding: '12px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancelar' : '+ Añadir Capital'}
        </button>
        <button
          onClick={handleAutoReinvest}
          disabled={profitAmount <= 0}
          style={{
            background: profitAmount > 0 ? C.green : '#666', color: '#fff',
            border: 'none', borderRadius: 8, padding: '12px', fontWeight: 600,
            fontSize: 13, cursor: profitAmount > 0 ? 'pointer' : 'not-allowed',
            opacity: profitAmount > 0 ? 1 : 0.5,
          }}
        >
          💰 Reinvertir 50%
        </button>
      </div>

      {/* Add Capital Form */}
      {showForm && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: '20px', marginBottom: '24px',
        }}>
          <h3 style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: '0 0 16px 0' }}>
            Nuevo Movimiento de Capital
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', color: C.text2, fontSize: 11, marginBottom: '6px' }}>
                Tipo
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                style={{
                  width: '100%', background: '#080d1a', border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: '10px', color: C.text, fontSize: 13,
                }}
              >
                <option value="deposit">Depósito</option>
                <option value="withdrawal">Retiro</option>
                <option value="reinvestment">Reinversión</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: C.text2, fontSize: 11, marginBottom: '6px' }}>
                Monto (€)
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                style={{
                  width: '100%', background: '#080d1a', border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: '10px', color: C.text, fontSize: 13,
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: C.text2, fontSize: 11, marginBottom: '6px' }}>
                Descripción
              </label>
              <input
                type="text"
                placeholder="Ej: Reinversión de ganancias"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{
                  width: '100%', background: '#080d1a', border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: '10px', color: C.text, fontSize: 13,
                }}
              />
            </div>
            <button
              onClick={handleAddMovement}
              style={{
                background: C.green, color: '#fff', border: 'none', borderRadius: 8,
                padding: '12px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              Registrar Movimiento
            </button>
          </div>
        </div>
      )}

      {/* Movements History */}
      {capital.movements.length > 0 && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px',
        }}>
          <h3 style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: '0 0 16px 0' }}>
            Historial de Movimientos
          </h3>
          <div style={{
            maxHeight: '300px', overflowY: 'auto',
          }}>
            {capital.movements.map((mov, idx) => (
              <div key={idx} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px', borderBottom: idx < capital.movements.length - 1 ? `1px solid ${C.border}` : 'none',
                fontSize: 13,
              }}>
                <div>
                  <div style={{ color: C.text, fontWeight: 500 }}>
                    {mov.type === 'deposit' && '➕ Depósito'}
                    {mov.type === 'withdrawal' && '➖ Retiro'}
                    {mov.type === 'reinvestment' && '🔄 Reinversión'}
                  </div>
                  <div style={{ color: C.text2, fontSize: 11, marginTop: '4px' }}>
                    {new Date(mov.date).toLocaleDateString('es-ES')}
                  </div>
                </div>
                <div style={{
                  color: mov.type === 'withdrawal' ? C.red : C.green,
                  fontWeight: 600,
                }}>
                  {mov.type === 'withdrawal' ? '-' : '+'}€{Math.abs(mov.amount).toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
