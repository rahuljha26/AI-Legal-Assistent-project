import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar, Toast, useToast, Modal } from '../components/index';
import NotificationBell from '../components/NotificationBell';
import { adviceAPI, emailAPI } from '../services/api';

const QUICK = ['Tenant rights in India','Consumer complaint procedure','Cheque bounce legal action','Workplace harassment laws','Property dispute resolution'];

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { toast, showToast, clearToast } = useToast();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<any>(null);
  const [remaining, setRemaining] = useState(20);
  const [history, setHistory] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(true);
  const [emailModal, setEmailModal] = useState(false);
  const [emailAddr, setEmailAddr] = useState('');
  const [attachPdf, setAttachPdf] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);

  const sidebar = [
    { label:'Dashboard', path:'/dashboard', icon:'🏠' },
    { label:'AI Chat', path:'/chat', icon:'💬' },
    { label:'Documents', path:'/documents', icon:'📄' },
    { label:'Settings', path:'/settings', icon:'⚙️' },
  ];

  useEffect(() => {
    adviceAPI.history(1).then(r => setHistory(r.data?.data?.results || [])).catch(()=>{}).finally(()=>setHistLoading(false));
  }, []);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true); setAdvice(null);
    try {
      const res = await adviceAPI.ask(query);
      const d = res.data?.data;
      setAdvice(d?.advice);
      setRemaining(d?.queries_remaining ?? remaining - 1);
      setHistory(prev => [d?.advice, ...prev].slice(0, 20));
      showToast('Advice saved to MongoDB', 'success');
    } catch (e:any) { showToast(e.response?.data?.message || 'Query failed', 'error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id:number) => {
    await adviceAPI.delete(id).then(()=>{
      setHistory(prev=>prev.filter(h=>h?.id!==id));
      showToast('Deleted from MongoDB','success');
    }).catch(()=>showToast('Delete failed','error'));
  };

  const handleEmail = async () => {
    setSending(true);
    try {
      const content = advice?.ai_response
        ? { query: advice.query, ...advice.ai_response }
        : { query: advice?.query };
      await emailAPI.send({
        to_email:   emailAddr,
        email_type: 'advice',
        content,
        attach_pdf: attachPdf,
        attachment,
      });
      setEmailModal(false);
      setAttachment(null);
      showToast('Email sent ✓', 'success');
    } catch { showToast('Email failed', 'error'); } finally { setSending(false); }
  };

  const ai = advice?.ai_response || advice;
  const pct = Math.round((remaining/20)*100);

  return (
    <div className="flex min-h-screen" style={{ background:'#060b18' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
      <Sidebar items={sidebar} userName={user?.full_name||''} userRole={user?.role||''} onLogout={logout} currentPath={location.pathname} />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile logo bar — hidden on md+ since sidebar shows logo there */}
        <div className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3"
          style={{ background:'rgba(6,11,24,.95)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(79,110,247,.12)' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#4f6ef7,#7c3aed)' }}>
              <span className="text-base">⚖️</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">LexAI</p>
              <p className="text-xs leading-tight" style={{ color:'rgba(129,140,248,.7)' }}>Legal Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{ background:'rgba(79,110,247,.08)', border:'1px solid rgba(79,110,247,.18)' }}>
              <span className="text-indigo-300 text-xs font-semibold">{remaining}/20</span>
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Top bar — desktop only */}
        <div className="hidden md:flex sticky top-0 z-10 px-8 py-4 items-center justify-between"
          style={{ background:'rgba(6,11,24,.85)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(79,110,247,.1)' }}>
          <div>
            <h1 className="text-lg font-bold text-white">Legal Assistant</h1>
            <p className="text-slate-400 text-xs">AI-powered guidance based on Indian law</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Queries gauge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background:'rgba(79,110,247,.08)', border:'1px solid rgba(79,110,247,.18)' }}>
              <div className="w-20 h-1.5 rounded-full" style={{ background:'rgba(79,110,247,.2)' }}>
                <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:'linear-gradient(90deg,#4f6ef7,#7c3aed)' }} />
              </div>
              <span className="text-indigo-300 text-xs font-medium">{remaining}/20</span>
              <span className="text-slate-500 text-xs">today</span>
            </div>
            <NotificationBell />
          </div>
        </div>

        <div className="p-8 max-w-5xl mx-auto">
          {/* Query box */}
          <div className="glass rounded-3xl p-6 mb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK.map(q=>(
                <button key={q} onClick={()=>setQuery(q)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all text-slate-300 hover:text-white"
                  style={{ background:'rgba(79,110,247,.08)', border:'1px solid rgba(79,110,247,.15)' }}>
                  {q}
                </button>
              ))}
            </div>
            <div className="relative">
              <textarea value={query} onChange={e=>setQuery(e.target.value)}
                className="input-field resize-none mb-4" rows={4}
                placeholder="Describe your legal situation in detail…" />
            </div>
            <button onClick={handleAsk} disabled={loading||!query.trim()}
              className="btn-glow text-white px-6 py-3 rounded-xl font-semibold text-sm w-full">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Consulting AI Legal Expert…
                </span>
              ) : '⚖️  Get Legal Advice'}
            </button>
          </div>

          {/* AI Response */}
          {ai && (
            <div className="glass rounded-3xl p-6 mb-6 animate-slide-up">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center btn-glow"><span className="text-sm">🤖</span></div>
                <p className="text-white font-semibold text-sm">AI Legal Advice</p>
                <div className="ml-auto flex gap-2">
                  {ai.constitution_reference && (
                    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background:'rgba(79,110,247,.15)', color:'#818cf8', border:'1px solid rgba(79,110,247,.3)' }}>{ai.constitution_reference}</span>
                  )}
                  {ai.applicable_law && (
                    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background:'rgba(168,85,247,.15)', color:'#c084fc', border:'1px solid rgba(168,85,247,.3)' }}>{ai.applicable_law}</span>
                  )}
                </div>
              </div>
              {ai.steps_to_take?.length>0 && (
                <div className="mb-4">
                  <p className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3">Steps to Take</p>
                  <div className="space-y-2">
                    {ai.steps_to_take.map((s:string,i:number)=>(
                      <div key={i} className="flex gap-3 items-start p-3 rounded-xl" style={{ background:'rgba(79,110,247,.05)' }}>
                        <span className="w-5 h-5 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ background:'linear-gradient(135deg,#4f6ef7,#7c3aed)' }}>{i+1}</span>
                        <p className="text-slate-300 text-sm">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ai.documents_required?.length>0 && (
                <div className="mb-4">
                  <p className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Documents Required</p>
                  <div className="flex flex-wrap gap-2">
                    {ai.documents_required.map((d:string,i:number)=>(
                      <span key={i} className="text-xs px-3 py-1.5 rounded-lg" style={{ background:'rgba(5,205,153,.08)', color:'#34d399', border:'1px solid rgba(5,205,153,.2)' }}>📎 {d}</span>
                    ))}
                  </div>
                </div>
              )}
              {ai.where_to_file && <p className="text-slate-400 text-sm mb-3"><span className="text-slate-200 font-medium">Where to file: </span>{ai.where_to_file}</p>}
              {ai.disclaimer && <p className="text-slate-500 text-xs italic border-t pt-3" style={{ borderColor:'rgba(79,110,247,.1)' }}>{ai.disclaimer}</p>}
              <button onClick={()=>setEmailModal(true)} className="mt-4 text-xs px-4 py-2 rounded-lg transition-all"
                style={{ background:'rgba(5,205,153,.1)', color:'#34d399', border:'1px solid rgba(5,205,153,.25)' }}>
                📧 Email this advice
              </button>
            </div>
          )}

          {/* History */}
          <div className="glass rounded-3xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid rgba(79,110,247,.1)' }}>
              <p className="text-white font-semibold">Recent Queries</p>
              <span className="text-slate-500 text-xs">{history.length} saved</span>
            </div>
            {histLoading ? (
              <div className="px-6 py-8 text-center"><span className="text-slate-600 text-sm">Loading from MongoDB…</span></div>
            ) : history.length===0 ? (
              <div className="px-6 py-10 text-center">
                <span className="text-4xl block mb-3">💬</span>
                <p className="text-slate-500 text-sm">No queries yet. Ask your first legal question above.</p>
              </div>
            ) : (
              <div>
                {history.map((h:any,i:number)=>(
                  <div key={h?.id||i} className="table-row px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background:'rgba(79,110,247,.1)' }}>
                        <span className="text-xs">💬</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-slate-200 text-sm truncate">{h?.query||'—'}</p>
                        <p className="text-slate-600 text-xs mt-0.5">{h?.created_at?new Date(h.created_at).toLocaleString():''}</p>
                      </div>
                    </div>
                    <button onClick={()=>handleDelete(h?.id)} className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0 transition-all"
                      style={{ color:'#f87171', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)' }}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Email modal */}
      {emailModal && (
        <Modal title="" onClose={()=>{ setEmailModal(false); setShowPreview(false); }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background:'linear-gradient(135deg,#4f6ef7,#7c3aed)' }}>
              <span className="text-lg">📧</span>
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Email this Legal Advice</h3>
              <p className="text-slate-400 text-xs mt-0.5">Send to any email address</p>
            </div>
          </div>

          {/* Content type badge */}
          <div className="mb-4">
            <span className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ background:'rgba(79,110,247,.15)', color:'#818cf8', border:'1px solid rgba(79,110,247,.3)' }}>
              Legal Advice Payload
            </span>
          </div>

          {/* Recipient */}
          <label className="block text-slate-300 text-xs font-semibold mb-1.5">Recipient Email</label>
          <input value={emailAddr} onChange={e=>setEmailAddr(e.target.value)} type="email"
            className="input-field mb-4" placeholder="recipient@example.com" />

          {/* Attach PDF toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl mb-4"
            style={{ background:'rgba(79,110,247,.05)', border:'1px solid rgba(79,110,247,.15)' }}>
            <div>
              <p className="text-slate-200 text-sm font-medium">Attach as PDF</p>
              <p className="text-slate-500 text-xs mt-0.5">A PDF copy will be attached</p>
            </div>
            <button onClick={()=>setAttachPdf(p=>!p)}
              className="relative w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0"
              style={{ background: attachPdf ? 'linear-gradient(90deg,#4f6ef7,#7c3aed)' : 'rgba(100,116,139,.3)' }}>
              <span className="absolute top-0.5 transition-all duration-200 w-5 h-5 rounded-full bg-white shadow"
                style={{ left: attachPdf ? '26px' : '2px' }} />
            </button>
          </div>

          {/* Local Attachment */}
          <div className="p-4 rounded-xl mb-4"
            style={{ background:'rgba(79,110,247,.05)', border:'1px solid rgba(79,110,247,.15)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-200 text-sm font-medium">Local Attachment</p>
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                onChange={e => setAttachment(e.target.files?.[0] || null)} 
              />
              <label 
                htmlFor="file-upload"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20"
              >
                {attachment ? 'Change File' : 'Select File'}
              </label>
            </div>
            {attachment ? (
              <div className="flex items-center justify-between bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-lg">📄</span>
                  <div className="overflow-hidden">
                    <p className="text-slate-200 text-[10px] font-medium truncate">{attachment.name}</p>
                    <p className="text-slate-500 text-[9px]">{(attachment.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={()=>setAttachment(null)} className="text-slate-400 hover:text-red-400 transition-colors">
                  <span className="text-base">✕</span>
                </button>
              </div>
            ) : (
              <p className="text-slate-500 text-[10px]">Attach extra files from your computer</p>
            )}
          </div>

          {/* Content preview */}
          <button onClick={()=>setShowPreview(p=>!p)}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mb-4 flex items-center gap-1">
            <span>{showPreview ? '▾' : '▸'}</span>
            {showPreview ? 'Hide' : 'Preview'} content
          </button>

          {showPreview && ai && (
            <div className="mb-4 p-3 rounded-xl text-xs space-y-2 max-h-40 overflow-y-auto"
              style={{ background:'rgba(15,23,42,.6)', border:'1px solid rgba(79,110,247,.15)' }}>
              {ai.constitution_reference && <p className="text-slate-300"><span className="text-indigo-400 font-semibold">Law: </span>{ai.constitution_reference}</p>}
              {ai.applicable_law        && <p className="text-slate-300"><span className="text-indigo-400 font-semibold">Act: </span>{ai.applicable_law}</p>}
              {ai.steps_to_take?.slice(0,3).map((s:string,i:number)=>(
                <p key={i} className="text-slate-400">• {s}</p>
              ))}
              {(ai.steps_to_take?.length||0)>3 && <p className="text-slate-500">…and {ai.steps_to_take.length-3} more steps</p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={()=>{ setEmailModal(false); setShowPreview(false); }}
              className="flex-1 py-2.5 rounded-xl text-sm text-slate-300 transition-all"
              style={{ border:'1px solid rgba(79,110,247,.2)', background:'rgba(15,29,58,.5)' }}>Cancel</button>
            <button onClick={handleEmail} disabled={sending||!emailAddr}
              className="flex-1 btn-glow text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              {sending
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</>
                : <>{attachPdf ? '📎' : '📧'} Send Email</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
