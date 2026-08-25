import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { adviceAPI, youtubeAPI } from '../api';
import EmailModal from '../components/EmailModal';

const CHIPS = ['Property Issue','Consumer Rights','FIR / Police','Family Law','Cyber Crime'];

function TypingDots() {
  return (
    <div style={{ display:'flex', gap:6, padding:'14px 16px', background:'var(--bg-card)', border: '1px solid var(--border)', borderRadius:12, width:'fit-content', alignItems: 'center' }}>
      <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginRight: '8px' }}>AI Legal Advisor is typing</span>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width:6, height:6, borderRadius:'50%', background:'var(--primary)',
          animation:'bounce 1.2s infinite', animationDelay:`${i*0.2}s`
        }} />
      ))}
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}`}</style>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef(null);
  const fileInputRef            = useRef(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [currentAdviceData, setCurrentAdviceData] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [videoMap, setVideoMap] = useState({});   // msgIndex -> videos[]

  const firstName = user?.full_name?.split(' ')[0] || 'Rahul';

  useEffect(() => {
    // If arriving from the Dashboard with a prefilled query, send it automatically
    if (location.state?.prefilledQuery) {
      sendMessage(location.state.prefilledQuery);
      // Clear state so it doesn't resend on refresh
      window.history.replaceState({}, document.title);
    }
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, loading]);

  const sendMessage = async (text) => {
    const q = text || input.trim();
    if (!q && !attachedFile) return;
    setInput('');
    const userMessageContent = q + (attachedFile ? ` (Attached: ${attachedFile.name})` : '');
    setMessages(prev => [...prev, { role:'user', content:userMessageContent, time: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) }]);
    setLoading(true);
    try {
      let res;
      if (attachedFile) {
        const formData = new FormData();
        formData.append('query', q || 'Please analyze this document.');
        formData.append('file', attachedFile);
        res = await adviceAPI.ask(formData);
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        res = await adviceAPI.ask({ query: q });
      }
      // API shape: { success, data: { advice: { id, query, ai_response, ... }, queries_remaining } }
      const adviceData = res.data?.data?.advice;
      const aiResponse = adviceData?.ai_response ?? res.data?.data ?? res.data;
      const parsedAdvice = typeof aiResponse === 'string' ? JSON.parse(aiResponse) : aiResponse;
      const adviceToStore = { id: adviceData?.id, ...parsedAdvice };
      const newMsgIndex = messages.length + 1;  // +1 for the user msg already added
      setMessages(prev => {
        const updated = [...prev, { role:'ai', advice: adviceToStore, time: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) }];
        return updated;
      });
      // Fetch YouTube videos in background using the applicable law or query
      const ytQuery = parsedAdvice?.applicable_law || parsedAdvice?.constitution_reference || q;
      youtubeAPI.search(ytQuery, 3)
        .then(ytRes => {
          const vids = ytRes.data?.data?.videos || [];
          if (vids.length > 0) {
            setVideoMap(prev => ({ ...prev, [newMsgIndex]: vids }));
          }
        })
        .catch(() => { /* silently ignore YouTube failures */ });
    } catch (err) {
      console.error('AI advice error:', err?.response?.data || err.message);
      const serverErrMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Sorry, something went wrong. Please check your connection and try again.';
      setMessages(prev => [...prev, { role:'ai', isError: true, content: serverErrMsg, originalQuery: q, time: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) }]);
    } finally { setLoading(false); }
  };

  const handleDownloadPDF = async (adviceId) => {
    if (!adviceId) {
      alert("Cannot download: Advice ID is missing. Please try a new query.");
      return;
    }
    try {
      const res = await adviceAPI.pdf(adviceId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Legal_Advice_${adviceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download PDF', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content" style={{ 
        height:'100vh', 
        display:'flex', 
        flexDirection:'column', 
        backgroundImage: 'linear-gradient(rgba(17, 17, 17, 0.85), rgba(17, 17, 17, 0.95)), url("https://www.almawave.com/wp-content/uploads/2024/10/BLOG-CONVERSATION-STUDIO-3.webp")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}>
        
        {/* Top Header */}
        <div style={{ padding: '24px 32px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px', backdropFilter: 'blur(10px)', background: 'rgba(17, 17, 17, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-heading)', margin: '0 0 4px 0' }}>AI Legal Advisor</h2>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Powered by Indian Constitution data + Gemini AI</div>
            </div>
            <button style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer' }} onClick={() => setMessages([])}>
              Clear chat
            </button>
          </div>
          
          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {CHIPS.map(c => (
              <span key={c} style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '6px 16px', borderRadius: '50px', fontSize: '13px', cursor: 'pointer' }} onClick={() => sendMessage(c)}>
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: 'transparent' }}>
          
          {messages.length === 0 && !loading && (
             <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '15px' }}>Start a conversation to get legal advice.</div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: msg.role === 'user' ? '60%' : '80%' }}>
              
              {msg.role === 'user' ? (
                <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--primary)', borderRadius: '12px', padding: '16px', borderTopRightRadius: '4px' }}>
                  <div style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '8px' }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{msg.time} · {firstName}</div>
                </div>
              ) : msg.isError ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: '3px solid #ef4444', borderRadius: '12px', padding: '24px', borderTopLeftRadius: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{color: '#ef4444', fontSize: '14px', fontWeight: 'bold'}}>!</span>
                    </div>
                    <strong style={{ fontSize: '15px', color: '#ef4444' }}>AI Legal Advisor</strong>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '16px' }}>
                    {msg.content}
                  </div>
                  <button onClick={() => sendMessage(msg.originalQuery)} style={{ background: 'transparent', border: '1px solid #ef4444', padding: '8px 16px', borderRadius: '8px', color: '#ef4444', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>
                    Retry
                  </button>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '12px', padding: '24px', borderTopLeftRadius: '4px' }}>
                  
                  {/* AI Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid var(--bg-card)' }}></div>
                    </div>
                    <strong style={{ fontSize: '15px', color: 'var(--primary)' }}>AI Legal Advisor</strong>
                  </div>

                  {msg.advice?.constitution_reference && (
                    <div style={{ display: 'inline-block', background: 'var(--light-blue)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '50px', fontSize: '13px', marginBottom: '20px' }}>
                      {msg.advice.constitution_reference}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {msg.advice?.applicable_law && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.5px' }}>APPLICABLE LAW</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>{msg.advice.applicable_law}</div>
                      </div>
                    )}

                    {msg.advice?.steps_to_take?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.5px' }}>STEPS TO TAKE</div>
                        <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                          {msg.advice.steps_to_take.map((s, idx) => <li key={idx} style={{ paddingBottom: '4px' }}>{s}</li>)}
                        </ol>
                      </div>
                    )}

                    {msg.advice?.documents_required?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.5px' }}>DOCUMENTS NEEDED</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                          {msg.advice.documents_required.join(' · ')}
                        </div>
                      </div>
                    )}

                    {msg.advice?.possible_outcomes?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.5px' }}>POSSIBLE OUTCOMES</div>
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                          {msg.advice.possible_outcomes.map((o, idx) => <li key={idx} style={{ paddingBottom: '4px' }}>{o}</li>)}
                        </ul>
                      </div>
                    )}

                    {msg.advice?.where_to_file && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.5px' }}>WHERE TO FILE</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>{msg.advice.where_to_file}</div>
                      </div>
                    )}

                    {msg.advice?.disclaimer && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        {msg.advice.disclaimer}
                      </div>
                    )}

                  </div>

                  {/* YouTube Video Recommendations */}
                  {videoMap[i] && videoMap[i].length > 0 && (
                    <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="14" height="14" fill="#ff0000" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        RELATED LEGAL VIDEOS
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                        {videoMap[i].map((video, vi) => (
                          <a
                            key={vi}
                            href={video.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', transition: 'transform 0.15s, border-color 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#ff0000'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                          >
                            {video.thumbnail_url ? (
                              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#000' }}>
                                <img src={video.thumbnail_url} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ff0000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="12" height="12" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div style={{ width: '100%', aspectRatio: '16/9', background: 'rgba(255,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="28" height="28" fill="#ff0000" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                              </div>
                            )}
                            <div style={{ padding: '10px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {video.title}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{video.channel_title}</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                    <button 
                      disabled={!msg.advice?.id}
                      onClick={() => handleDownloadPDF(msg.advice?.id)} 
                      style={{ background: 'transparent', border: '1px solid var(--border)', padding: '10px 20px', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 500, cursor: msg.advice?.id ? 'pointer' : 'not-allowed', opacity: msg.advice?.id ? 1 : 0.5 }}>
                      <span style={{ color: 'var(--text-primary)' }}>Download PDF</span>
                    </button>
                    <button 
                      disabled={!msg.advice?.id}
                      onClick={() => { setCurrentAdviceData(msg.advice); setIsEmailModalOpen(true); }} 
                      style={{ background: 'transparent', border: '1px solid var(--primary)', padding: '10px 20px', borderRadius: '8px', color: 'var(--primary)', fontSize: '14px', fontWeight: 500, cursor: msg.advice?.id ? 'pointer' : 'not-allowed', opacity: msg.advice?.id ? 1 : 0.5 }}>
                      Email this advice
                    </button>
                    {(msg.advice?.applicable_law || msg.advice?.constitution_reference) && (
                      <a 
                        href={`https://www.youtube.com/channel/UCSPxe7HCUMrdKRFLX20b4JA/search?query=${encodeURIComponent((msg.advice.applicable_law || msg.advice.constitution_reference) + " in hindi")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ff0000', color: '#ffffff', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                        Watch in Hindi
                      </a>
                    )}
                  </div>

                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ alignSelf: 'flex-start' }}>
              <TypingDots />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Footer */}
        <div style={{ padding: '24px 32px', borderTop: '1px solid var(--border)', background: 'rgba(17, 17, 17, 0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          
          <svg onClick={() => fileInputRef.current?.click()} style={{ cursor: 'pointer', color: attachedFile ? 'var(--primary)' : 'var(--text-muted)' }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
          </svg>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => setAttachedFile(e.target.files[0])} accept="application/pdf" />
          
          <div style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', flexDirection: 'column', padding: '8px 16px' }}>
            {attachedFile && (
              <div style={{ fontSize: '12px', color: 'var(--primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                {attachedFile.name}
                <button onClick={() => { setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
              </div>
            )}
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Describe your legal issue..." 
              style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '15px', outline: 'none', fontFamily: 'Inter, sans-serif', padding: '4px 0' }}
            />
          </div>

          <svg style={{ cursor: 'pointer' }} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>

          <button onClick={() => sendMessage()} disabled={(!input.trim() && !attachedFile) || loading} style={{ width: '45px', height: '45px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (input.trim() || attachedFile) ? 'pointer' : 'default' }}>
            {/* Blank placeholder icon matching mockup, or a subtle arrow */}
          </button>
        </div>

      </div>
      <EmailModal 
        isOpen={isEmailModalOpen} 
        onClose={() => setIsEmailModalOpen(false)} 
        adviceData={currentAdviceData} 
        emailType="advice" 
      />
    </div>
  );
}
