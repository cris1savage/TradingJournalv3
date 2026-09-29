'use client';
import Link from 'next/link';

const C = {
  blue: '#3B82F6', blue2: '#60a5fa', text: '#ffffff', text2: '#94a3b8',
};

export default function ProfessionalAccessLink() {
  return (
    <Link href="/professional" style={{ textDecoration: 'none' }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.blue}20, ${C.blue2}10)`,
        border: `2px solid ${C.blue}40`, borderRadius: 12, padding: '16px',
        cursor: 'pointer', transition: 'all 0.3s', textAlign: 'center',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `${C.blue}80`;
        el.style.background = `linear-gradient(135deg, ${C.blue}30, ${C.blue2}20)`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = `${C.blue}40`;
        el.style.background = `linear-gradient(135deg, ${C.blue}20, ${C.blue2}10)`;
      }}>
        <div style={{ fontSize: 24, marginBottom: '8px' }}>🚀</div>
        <div style={{ color: C.text, fontWeight: 600, marginBottom: '4px' }}>
          Professional Dashboard
        </div>
        <div style={{ color: C.text2, fontSize: 12 }}>
          Multi-account management, team monitoring & advanced analytics
        </div>
      </div>
    </Link>
  );
}
