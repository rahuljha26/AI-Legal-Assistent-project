import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const STATS = [
  { value: '12', label: 'Active Cases', color: '#1D4ED8' },
  { value: '3', label: 'Upcoming Hearings', color: '#D97706' },
  { value: '28', label: 'Total Clients', color: '#16A34A' },
  { value: '47', label: 'Documents Created', color: '#7C3AED' },
];

const CASES = [
  { client: 'Ramesh Kumar', type: 'Property dispute', status: 'Active', hearing: '25 Mar 2025' },
  { client: 'Sunita Devi', type: 'Consumer case', status: 'Pending', hearing: '28 Mar 2025' },
  { client: 'Vikram Patel', type: 'Cyber crime', status: 'Adjourned', hearing: '02 Apr 2025' },
  { client: 'Meera Singh', type: 'Family dispute', status: 'Closed', hearing: '—' },
];

const RESEARCH_RESULTS = [
  { title: 'Article 21 — Right to life', desc: 'Fundamental Rights • Part III' },
  { title: 'IPC Section 420 — Cheating', desc: 'Indian Penal Code • Criminal' },
  { title: 'Consumer Protection Act 2019', desc: 'Consumer Law • Civil' },
];

export default function AdvocateDashboard() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const initials = user?.full_name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'PS';
  const firstName = user?.full_name?.split(' ')[0] || 'Priya';

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return { bg: '#F0FDF4', color: '#16A34A' };
      case 'Pending': return { bg: '#FFFBEB', color: '#D97706' };
      case 'Adjourned': return { bg: '#FEF2F2', color: '#DC2626' };
      case 'Closed': return { bg: '#F1F5F9', color: '#64748B' };
      default: return { bg: '#F1F5F9', color: '#64748B' };
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <h2>Good morning, Adv. {firstName}</h2>
          <div className="topbar-right">
            <svg width="22" height="22" fill="none" stroke="#64748B" strokeWidth="2" viewBox="0 0 24 24" style={{ cursor:'pointer' }}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            <button className="btn" style={{ border: '1px solid #E2E8F0', background: '#fff', color: '#E2E8F0', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '14px' }}>
              + New Case
            </button>
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt={user?.full_name} referrerPolicy="no-referrer" className="avatar avatar-md" style={{ borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="avatar avatar-md" style={{ background: '#7C3AED', color: '#fff', borderRadius: '50%', fontWeight: 600, fontSize: '15px' }}>{initials}</div>
            )}
          </div>
        </header>

        <div className="page-body" style={{ maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
          
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {STATS.map(s => (
              <div key={s.label} className="card" style={{ padding: '24px', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#fff' }}>
                <div style={{ fontSize: '36px', fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: '8px' }}>{s.value}</div>
                <div style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Cases & Research Split */}
          <div style={{ display: 'grid', gridTemplateColumns: '60fr 40fr', gap: '24px' }}>
            
            {/* Cases Table */}
            <div className="card" style={{ padding: '0', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#fff', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', letterSpacing: '1px' }}>CLIENT</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', letterSpacing: '1px' }}>CASE TYPE</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', letterSpacing: '1px' }}>STATUS</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', letterSpacing: '1px' }}>HEARING</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 600, color: '#64748B', width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {CASES.map((c, i) => {
                    const statusColor = getStatusColor(c.status);
                    return (
                      <tr key={i} style={{ borderBottom: i !== CASES.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#334155' }}>{c.client}</td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#1E293B' }}>{c.type}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ background: statusColor.bg, color: statusColor.color, padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#334155' }}>
                          {c.hearing.split(' ').map((part, idx) => (
                            <span key={idx} style={{ display: 'block', lineHeight: 1.2 }}>{part}</span>
                          ))}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <svg width="18" height="18" fill="none" stroke="#64748B" strokeWidth="2" viewBox="0 0 24 24" style={{ cursor: 'pointer' }}>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* AI Research */}
            <div className="card" style={{ padding: '24px', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#fff', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px 0' }}>AI Legal Research</h3>
              
              <div style={{ background: '#333333', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
                <input 
                  type="text" 
                  placeholder="Search IPC sections, articles" 
                  style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '16px', width: '100%', outline: 'none' }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {RESEARCH_RESULTS.map((res, i) => (
                  <div key={i} style={{ background: '#F8FAFC', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B' }}>{res.title}</div>
                    <div style={{ fontSize: '13px', color: '#64748B' }}>{res.desc}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
