import { useState, useRef, useEffect } from 'react';
import { adviceAPI } from '../services/api';

interface Msg {
  id: number;
  role: 'user' | 'ai';
  text?: string;
  ai?: any;
}

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [msgs, loading, isOpen]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input;
    setMsgs(p => [...p, { id: Date.now(), role: 'user', text }]);
    setInput('');
    setLoading(true);

    try {
      const r = await adviceAPI.ask(text);
      const advice = r.data?.data?.advice;
      setMsgs(p => [...p, { id: Date.now() + 1, role: 'ai', ai: advice?.ai_response || advice }]);
    } catch (e: any) {
      setMsgs(p => [...p, { id: Date.now() + 1, role: 'ai', text: e.response?.data?.message || 'Something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110"
        style={{ background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)', boxShadow: '0 8px 30px rgba(124,58,237,0.4)' }}
      >
        <span className="text-2xl">⚖️</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
         style={{ height: '500px', background: 'rgba(9, 15, 31, 0.95)', border: '1px solid rgba(79, 110, 247, 0.2)', backdropFilter: 'blur(20px)' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(79,110,247,0.2), rgba(124,58,237,0.2))', borderBottom: '1px solid rgba(79, 110, 247, 0.1)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)' }}>🤖</div>
          <div>
            <h3 className="text-white text-sm font-bold m-0 leading-tight">Legal AI</h3>
            <p className="text-xs text-indigo-200 m-0 leading-tight opacity-80">Laws & Sections Advice</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1 text-lg">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: 'rgba(6, 11, 24, 0.4)' }}>
        {msgs.length === 0 && (
          <div className="text-center mt-8 animate-fade-in">
            <span className="text-4xl block mb-2">⚖️</span>
            <p className="text-sm text-slate-300 font-medium">Hello! I can advise you about specific laws and sections.</p>
            <p className="text-xs text-slate-500 mt-2">Ask a legal question below.</p>
          </div>
        )}
        {msgs.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${m.role === 'user' ? 'text-white' : 'text-slate-200'}`}
                 style={m.role === 'user' ? { background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)', borderBottomRightRadius: 4 } : { background: 'rgba(15, 29, 58, 0.7)', border: '1px solid rgba(79, 110, 247, 0.15)', borderBottomLeftRadius: 4 }}>
              {m.text && <p className="m-0">{m.text}</p>}
              {m.ai && (
                <div className="space-y-2">
                  {(m.ai.constitution_reference || m.ai.applicable_law) && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {m.ai.constitution_reference && <span className="text-[10px] px-2 py-0.5 rounded border font-medium" style={{ background: 'rgba(79,110,247,0.1)', color: '#818cf8', borderColor: 'rgba(79,110,247,0.3)' }}>{m.ai.constitution_reference}</span>}
                      {m.ai.applicable_law && <span className="text-[10px] px-2 py-0.5 rounded border font-medium" style={{ background: 'rgba(168,85,247,0.1)', color: '#c084fc', borderColor: 'rgba(168,85,247,0.3)' }}>{m.ai.applicable_law}</span>}
                    </div>
                  )}
                  {m.ai.steps_to_take?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 m-0 mb-1">Steps:</p>
                      <ul className="pl-4 m-0 space-y-1">
                        {m.ai.steps_to_take.slice(0, 3).map((s: string, i: number) => <li key={i} className="text-xs text-slate-300">{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {m.ai.where_to_file && <p className="text-xs text-slate-300 m-0 mt-2"><strong className="text-slate-400">Where:</strong> {m.ai.where_to_file}</p>}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-slide-up">
            <div className="rounded-2xl p-3" style={{ background: 'rgba(15, 29, 58, 0.7)', border: '1px solid rgba(79, 110, 247, 0.15)', borderBottomLeftRadius: 4 }}>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400" style={{ animation: `pulse-dot 1s ease-in-out ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 flex gap-2 flex-shrink-0" style={{ background: 'rgba(6, 11, 24, 0.85)', borderTop: '1px solid rgba(79, 110, 247, 0.1)' }}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={loading}
          placeholder="Ask about laws..." 
          className="flex-1 bg-transparent text-sm text-white px-3 py-2 rounded-xl outline-none" 
          style={{ border: '1px solid rgba(79, 110, 247, 0.2)', background: 'rgba(15, 29, 58, 0.5)' }} 
        />
        <button 
          onClick={send} 
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-50 transition-colors"
          style={{ background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)' }}
        >
          ➤
        </button>
      </div>
    </div>
  );
};
