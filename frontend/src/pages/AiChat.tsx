import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar, Toast, useToast, Modal } from '../components/index';
import NotificationBell from '../components/NotificationBell';
import { adviceAPI, emailAPI } from '../services/api';

const SUGGESTIONS = [
  { icon:'🏠', text:'What are my rights as a tenant in India?' },
  { icon:'🛒', text:'How to file a consumer complaint?' },
  { icon:'🏛️', text:'Legal steps for property dispute resolution' },
  { icon:'💸', text:'What to do if a cheque bounces?' },
  { icon:'⚠️', text:'Workplace harassment laws in India' },
  { icon:'👨‍👩‍👧', text:'Divorce and custody laws in India' },
];

interface Msg { id:number; role:'user'|'ai'; text?:string; ai?:any; }

export default function AiChat() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { toast, showToast, clearToast } = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailModal, setEmailModal] = useState<any>(null);
  const [emailAddr, setEmailAddr] = useState('');
  const [emailError, setEmailError] = useState('');
  const [attachPdf, setAttachPdf] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sidebar = [
    { label:'Dashboard', path:user?.role==='advocate'?'/advocate/dashboard':'/dashboard', icon:'🏠' },
    { label:'AI Chat', path:'/chat', icon:'💬' },
    { label:'Documents', path:'/documents', icon:'📄' },
    { label:'Settings', path:'/settings', icon:'⚙️' },
  ];

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:'smooth' }); },[msgs,loading]);

  const send = async (text:string) => {
    if (!text.trim()||loading) return;
    setMsgs(p=>[...p,{ id:Date.now(), role:'user', text }]);
    setInput(''); setLoading(true);
    try {
      const r = await adviceAPI.ask(text);
      const advice = r.data?.data?.advice;
      setMsgs(p=>[...p,{ id:Date.now()+1, role:'ai', ai:advice?.ai_response||advice }]);
      showToast('Saved to MongoDB','success');
    } catch(e:any) {
      setMsgs(p=>[...p,{ id:Date.now()+1, role:'ai', text:e.response?.data?.message||'Something went wrong.' }]);
    } finally { setLoading(false); }
  };

  const handleEmail = async () => {
    setEmailError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddr)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setSending(true);
    try {
      await emailAPI.send({
        to_email:   emailAddr,
        email_type: 'advice',
        content:    { ...emailModal },
        attach_pdf: attachPdf,
      });
      setEmailModal(null);
      setEmailAddr('');
      showToast('Email sent successfully ✓', 'success');
    } catch {
      showToast('Email failed to send. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const AiBubble = ({ msg }: { msg:Msg }) => {
    const ai = msg.ai;
    if (!ai) return <p className="text-slate-300 text-sm">{msg.text}</p>;
    return (
      <div className="space-y-3">
        {(ai.constitution_reference||ai.applicable_law) && (
          <div className="flex flex-wrap gap-2">
            {ai.constitution_reference && <span className="text-xs px-2.5 py-1 rounded-full" style={{ background:'rgba(79,110,247,.15)', color:'#818cf8', border:'1px solid rgba(79,110,247,.3)' }}>{ai.constitution_reference}</span>}
            {ai.applicable_law && <span className="text-xs px-2.5 py-1 rounded-full" style={{ background:'rgba(168,85,247,.15)', color:'#c084fc', border:'1px solid rgba(168,85,247,.3)' }}>{ai.applicable_law}</span>}
          </div>
        )}
        {ai.steps_to_take?.length>0 && (
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-2 font-semibold">Steps to Take</p>
            <ol className="space-y-2">
              {ai.steps_to_take.map((s:string,i:number)=>(
                <li key={i} className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5"
                    style={{ background:'linear-gradient(135deg,#4f6ef7,#7c3aed)' }}>{i+1}</span>
                  <span className="text-slate-300 text-sm">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {ai.documents_required?.length>0 && (
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-2 font-semibold">Documents</p>
            <div className="flex flex-wrap gap-2">
              {ai.documents_required.map((d:string,i:number)=>(
                <span key={i} className="text-xs px-2.5 py-1 rounded-lg" style={{ background:'rgba(5,205,153,.08)', color:'#34d399', border:'1px solid rgba(5,205,153,.2)' }}>📎 {d}</span>
              ))}
            </div>
          </div>
        )}
        {ai.where_to_file && <p className="text-slate-300 text-sm"><span className="font-semibold text-slate-200">Where to file:</span> {ai.where_to_file}</p>}
        {ai.disclaimer && <p className="text-slate-500 text-xs italic pt-2" style={{ borderTop:'1px solid rgba(79,110,247,.1)' }}>{ai.disclaimer}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={()=>setEmailModal({ ai })} className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background:'rgba(5,205,153,.1)', color:'#34d399', border:'1px solid rgba(5,205,153,.25)' }}>📧 Email</button>
          <a href="/documents" className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{ background:'rgba(79,110,247,.1)', color:'#818cf8', border:'1px solid rgba(79,110,247,.25)' }}>📄 Generate Doc</a>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen" style={{ background:'#060b18' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast}/>}
      <Sidebar items={sidebar} userName={user?.full_name||''} userRole={user?.role||''} onLogout={logout} currentPath={location.pathname}/>

      <main className="flex-1 flex flex-col">
        {/* Topbar */}
        <div className="px-6 py-4 flex-shrink-0" style={{ background:'rgba(6,11,24,.85)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(79,110,247,.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl btn-glow flex items-center justify-center flex-shrink-0"><span>🤖</span></div>
            <div>
              <p className="text-white font-bold text-sm">AI Legal Chat</p>
              <p className="text-slate-500 text-xs">All conversations saved to MongoDB</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
              <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow:'0 0 6px #34d399' }} />
              <span className="text-slate-400 text-xs">Online</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {msgs.length===0 && (
            <div className="max-w-2xl mx-auto pt-6 animate-fade-in">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-3xl btn-glow flex items-center justify-center mx-auto mb-4 animate-float">
                  <span className="text-3xl">⚖️</span>
                </div>
                <h2 className="text-white text-xl font-bold mb-2">How can I help you legally?</h2>
                <p className="text-slate-400 text-sm">Ask any question about Indian law, rights, or procedures</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SUGGESTIONS.map(s=>(
                  <button key={s.text} onClick={()=>send(s.text)}
                    className="glass card-hover text-left p-4 rounded-2xl group">
                    <span className="text-xl block mb-2">{s.icon}</span>
                    <p className="text-slate-300 text-sm group-hover:text-white transition-colors">{s.text}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {msgs.map(m=>(
            <div key={m.id} className={`flex gap-3 animate-slide-up ${m.role==='user'?'justify-end':''}`}>
              {m.role==='ai' && (
                <div className="w-8 h-8 rounded-xl btn-glow flex items-center justify-center flex-shrink-0 mt-1"><span className="text-sm">🤖</span></div>
              )}
              <div className={`max-w-2xl ${m.role==='user' ? 'order-1' : ''}`}
                style={m.role==='user' ? {
                  background:'linear-gradient(135deg,rgba(79,110,247,.25),rgba(124,58,237,.2))',
                  border:'1px solid rgba(79,110,247,.35)', borderRadius:20, padding:'12px 16px'
                } : {
                  background:'rgba(15,29,58,.7)', border:'1px solid rgba(79,110,247,.12)', borderRadius:20, padding:'16px 20px'
                }}>
                {m.role==='user' ? <p className="text-slate-100 text-sm">{m.text}</p> : <AiBubble msg={m} />}
              </div>
              {m.role==='user' && (
                user?.profile_picture ? (
                  <img src={user.profile_picture} alt={user?.full_name} className="w-8 h-8 rounded-xl object-cover flex-shrink-0 mt-1" />
                ) : (
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1"
                    style={{ background:'linear-gradient(135deg,#4f6ef7,#7c3aed)' }}>
                    {user?.full_name?.charAt(0)||'U'}
                  </div>
                )
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 animate-slide-up">
              <div className="w-8 h-8 rounded-xl btn-glow flex items-center justify-center flex-shrink-0"><span className="text-sm">🤖</span></div>
              <div className="p-4 rounded-2xl" style={{ background:'rgba(15,29,58,.7)', border:'1px solid rgba(79,110,247,.12)' }}>
                <div className="flex gap-1.5 items-center">
                  {[0,1,2].map(i=>(
                    <div key={i} className="w-2 h-2 rounded-full bg-indigo-400"
                      style={{ animation:`pulse-dot 1.2s ease-in-out ${i*0.2}s infinite` }} />
                  ))}
                  <span className="text-slate-500 text-xs ml-2">Consulting legal database…</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick suggests */}
        {msgs.length>0 && !loading && (
          <div className="px-6 pb-2 flex flex-wrap gap-2">
            {SUGGESTIONS.slice(0,3).map(s=>(
              <button key={s.text} onClick={()=>send(s.text)} className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{ background:'rgba(79,110,247,.08)', border:'1px solid rgba(79,110,247,.15)', color:'#94a3b8' }}>
                {s.icon} {s.text.slice(0,30)}…
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-6 py-4 flex-shrink-0" style={{ borderTop:'1px solid rgba(79,110,247,.1)', background:'rgba(6,11,24,.6)', backdropFilter:'blur(12px)' }}>
          <div className="flex gap-3">
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send(input)}
              className="input-field flex-1" placeholder="Ask a legal question… (Enter to send)" disabled={loading} />
            <button onClick={()=>send(input)} disabled={loading||!input.trim()}
              className="btn-glow text-white px-5 py-2.5 rounded-xl text-sm font-medium flex-shrink-0 disabled:opacity-50">
              Send →
            </button>
          </div>
        </div>
      </main>

      {emailModal && (
        <Modal title="" onClose={()=>setEmailModal(null)}>
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

          <div className="mb-4">
            <span className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ background:'rgba(79,110,247,.15)', color:'#818cf8', border:'1px solid rgba(79,110,247,.3)' }}>
              Legal Advice Payload
            </span>
          </div>

          <label className="block text-slate-300 text-xs font-semibold mb-1.5">Recipient Email</label>
          <input 
            value={emailAddr} 
            onChange={e=>{
              setEmailAddr(e.target.value);
              if (emailError) setEmailError('');
            }} 
            type="email"
            className="input-field" 
            placeholder="recipient@example.com"
            style={{ 
              marginBottom: emailError ? 4 : 16,
              borderColor: emailError ? '#ef4444' : 'rgba(79,110,247,0.3)' 
            }}
          />
          {emailError && (
            <p className="text-red-400 text-[10px] mb-4 ml-1 animate-fade-in">{emailError}</p>
          )}

          <div className="flex items-center justify-between p-4 rounded-xl mb-5"
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

          <div className="flex gap-3">
            <button onClick={()=>setEmailModal(null)} className="flex-1 py-2.5 rounded-xl text-sm text-slate-300 transition-all"
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
