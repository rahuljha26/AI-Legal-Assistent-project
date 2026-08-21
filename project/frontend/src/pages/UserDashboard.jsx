import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import EmailModal from '../components/EmailModal';

const CHIPS = ['Property Issue','Consumer Rights','FIR / Police','Family Law','Cyber Crime'];

const RECENT_QUERIES = [
  { query: "My landlord won't return security deposit", time: "Today" },
  { query: "How to file a consumer complaint online", time: "Yesterday" },
  { query: "What is Section 498A IPC?", time: "2 days ago" },
];

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailAdviceData] = useState({
    constitution_reference: 'Latest AI legal advice',
    applicable_law: 'Indian Law',
    steps_to_take: ['Please ask a legal question first to get advice'],
    documents_required: [],
    where_to_file: 'N/A',
    possible_outcomes: [],
    disclaimer: 'This is for informational purposes only. Consult a licensed advocate.'
  });

  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'RJ';
  const firstName = user?.full_name?.split(' ')[0] || 'Rahul';

  const handleAsk = () => {
    if (!query.trim()) return;
    // In a real app we might pass the query via context or state manager to ChatPage
    navigate('/dashboard/chat', { state: { prefilledQuery: query } });
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content" style={{ 
        backgroundImage: 'linear-gradient(rgba(17, 17, 17, 0.85), rgba(17, 17, 17, 0.85)), url(https://www.sisainfosec.com/wp-content/uploads/elementor/thumbs/blog-understanding-data-protection-and-privacy-laws-in-india-2025-ra33mw5m4gxjngq5n46nla8fk9gow7ut4owaig3j56.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        <header className="topbar" style={{ background: 'rgba(24, 24, 27, 0.8)', backdropFilter: 'blur(10px)' }}>
          <h2>Welcome back, {firstName}</h2>
          <div className="topbar-right">
            <svg width="22" height="22" fill="none" stroke="var(--text-muted)" strokeWidth="2" viewBox="0 0 24 24" style={{ cursor:'pointer' }}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {user?.profile_picture ? (
              <img src={user.profile_picture} alt={user?.full_name} className="avatar avatar-md" style={{ borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="avatar avatar-md" style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', fontWeight: 600, fontSize: '15px' }}>{initials}</div>
            )}
          </div>
        </header>

        <div className="page-body" style={{ maxWidth: '960px', margin: '0 auto', width: '100%' }}>
          
          {/* Query Box */}
          <div className="dashboard-query-box">
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>Describe your legal issue</div>
            <textarea
              className="form-control" rows={3}
              placeholder="e.g. My landlord is not returning my security deposit..."
              value={query} onChange={e => setQuery(e.target.value)}
              style={{ resize:'none', marginBottom:16, border: '1px solid var(--border)', padding: '16px', borderRadius: '8px', fontSize: '16px', color: 'var(--text-primary)', outline: 'none', background: 'var(--bg-input)' }}
            />
            <div style={{ display:'flex', gap: '8px', flexWrap:'wrap', marginBottom: '24px' }}>
              {CHIPS.map(c => (
                <span key={c} className="chip" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', padding: '8px 16px', borderRadius: '50px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }} onClick={() => setQuery(c)}>
                  {c}
                </span>
              ))}
            </div>
            <button className="btn btn-full" onClick={handleAsk} disabled={!query.trim()}
              style={{ background: query.trim() ? 'var(--primary)' : 'var(--bg-card)', color: query.trim() ? '#fff' : 'var(--text-muted)', border: '1.5px solid', borderColor: query.trim() ? 'var(--primary)' : 'var(--border)', padding: '14px', fontSize: '16px', fontWeight: 600, transition: 'all 0.2s', borderRadius: '10px' }}>
              Ask AI Legal Advisor
            </button>
          </div>

          {/* Action Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <Link to="/dashboard/documents" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%', borderTop: '3px solid var(--primary)' }}>
                <div style={{ background: 'var(--light-blue)', color: 'var(--primary)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '8px' }}>Generate Document</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>Legal notice, affidavit</p>
              </div>
            </Link>

            <Link to="/dashboard/constitution" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%', borderTop: '3px solid var(--success)' }}>
                <div style={{ background: 'var(--success-bg)', color: 'var(--success)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '8px' }}>Know Your Rights</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>Constitution articles</p>
              </div>
            </Link>

            <Link to="/dashboard/chat" style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%', borderTop: '3px solid var(--primary)' }}>
                <div style={{ background: 'var(--light-blue)', color: 'var(--primary)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '8px' }}>Ask Legal Question</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>Get instant AI legal advice</p>
              </div>
            </Link>

            <div className="card" onClick={() => setEmailModalOpen(true)} style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%', borderTop: '3px solid var(--warning)', transition: 'box-shadow 0.2s', boxShadow: '0 0 0 0 transparent' }} onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.3)'} onMouseLeave={e => e.currentTarget.style.boxShadow='none'}>
              <div style={{ background: 'var(--warning-bg)', color: 'var(--warning)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '8px' }}>Email My Advice</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>Send to your inbox</p>
            </div>
          </div>

          {/* Recent Queries */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 20px 0' }}>Recent queries</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {RECENT_QUERIES.map((q, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: i !== RECENT_QUERIES.length - 1 ? '16px' : 0, borderBottom: i !== RECENT_QUERIES.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{q.query}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{q.time}</span>
                    <span style={{ fontSize: '14px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>View</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <EmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        adviceData={emailAdviceData}
        emailType="advice"
      />
    </div>
  );
}
