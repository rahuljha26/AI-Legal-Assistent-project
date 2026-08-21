import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar, Toast, useToast, Modal } from '../components/index';
import NotificationBell from '../components/NotificationBell';
import { caseAPI, adviceAPI } from '../services/api';

const CASE_TYPES = ['Civil','Criminal','Family','Property','Consumer','Labour','Corporate','Other'];
const STATUSES = ['active','pending','adjourned','closed'] as const;

const STATUS_STYLE: Record<string,string> = {
  active:'badge-active', pending:'badge-pending', adjourned:'badge-adjourned', closed:'badge-closed',
};

export default function AdvocateDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { toast, showToast, clearToast } = useToast();
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCase, setEditCase] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number|null>(null);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [form, setForm] = useState({ client_name:'', case_type:'Civil', description:'', status:'pending', hearing_date:'' });
  const [activeTab, setActiveTab] = useState<'cases'|'research'>('cases');

  const sidebar = [
    { label:'Dashboard', path:'/advocate/dashboard', icon:'🏠' },
    { label:'AI Research', path:'/chat', icon:'💬' },
    { label:'Documents', path:'/documents', icon:'📄' },
    { label:'Settings', path:'/settings', icon:'⚙️' },
  ];

  const fetch = async () => {
    try { const r = await caseAPI.list(); setCases(r.data?.data||[]); }
    catch { showToast('Failed to load cases','error'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ fetch(); },[]);

  const stats = {
    active: cases.filter(c=>c.status==='active').length,
    pending: cases.filter(c=>c.status==='pending').length,
    total: cases.length,
    upcoming: cases.filter(c=>c.hearing_date&&new Date(c.hearing_date)>=new Date()).length,
  };

  const next = cases.filter(c=>c.hearing_date&&new Date(c.hearing_date)>=new Date())
    .sort((a,b)=>new Date(a.hearing_date).getTime()-new Date(b.hearing_date).getTime()).slice(0,3);

  const openCreate = () => { setEditCase(null); setForm({ client_name:'',case_type:'Civil',description:'',status:'pending',hearing_date:'' }); setShowForm(true); };
  const openEdit = (c:any) => { setEditCase(c); setForm({ client_name:c.client_name,case_type:c.case_type,description:c.description,status:c.status,hearing_date:c.hearing_date||'' }); setShowForm(true); };

  const handleSave = async () => {
    try {
      if (editCase) {
        const r = await caseAPI.update(editCase.id,form); setCases(prev=>prev.map(c=>c.id===editCase.id?r.data?.data:c));
        showToast('Case updated in MongoDB','success');
      } else {
        const r = await caseAPI.create(form); setCases(prev=>[r.data?.data,...prev]);
        showToast('Case saved to MongoDB','success');
      }
      setShowForm(false);
    } catch { showToast('Save failed','error'); }
  };

  const handleStatus = async (id:number, status:string) => {
    try { const r = await caseAPI.update(id,{status}); setCases(prev=>prev.map(c=>c.id===id?r.data?.data:c)); showToast('Updated','success'); }
    catch { showToast('Failed','error'); }
  };

  const handleDelete = async (id:number) => {
    try { await caseAPI.delete(id); setCases(prev=>prev.filter(c=>c.id!==id)); setDeleteId(null); showToast('Deleted from MongoDB','success'); }
    catch { showToast('Delete failed','error'); }
  };

  const handleResearch = async () => {
    if(!aiQuery.trim()) return;
    setAiLoading(true);
    try { const r = await adviceAPI.ask(aiQuery); setAiResult(r.data?.data?.advice?.ai_response); showToast('Saved to MongoDB','success'); }
    catch(e:any) { showToast(e.response?.data?.message||'Research failed','error'); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="flex min-h-screen" style={{ background:'#060b18' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast}/>}
      <Sidebar items={sidebar} userName={user?.full_name||''} userRole={user?.role||''} onLogout={logout} currentPath={location.pathname}/>

      <main className="flex-1 overflow-y-auto">
        {/* Topbar */}
        <div className="sticky top-0 z-10 px-8 py-4 flex items-center justify-between"
          style={{ background:'rgba(6,11,24,.85)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(79,110,247,.1)' }}>
          <div>
            <h1 className="text-lg font-bold text-white">Advocate Dashboard</h1>
            <p className="text-slate-400 text-xs">Manage your cases and conduct legal research</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={openCreate} className="btn-glow text-white px-4 py-2 rounded-xl text-sm font-medium">+ New Case</button>
          </div>
        </div>

        <div className="p-8 max-w-6xl mx-auto">
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label:'Active Cases',  value:stats.active,  icon:'🟢', accent:'rgba(5,205,153,.15)' },
              { label:'Pending',       value:stats.pending, icon:'🟡', accent:'rgba(245,166,35,.15)' },
              { label:'Total Cases',   value:stats.total,   icon:'📋', accent:'rgba(79,110,247,.15)' },
              { label:'Upcoming',      value:stats.upcoming,icon:'📅', accent:'rgba(168,85,247,.15)' },
            ].map(s=>(
              <div key={s.label} className="stat-card">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3" style={{ background:s.accent }}>{s.icon}</div>
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="text-slate-400 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Upcoming hearings banner */}
          {next.length>0 && (
            <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-4" style={{ borderColor:'rgba(245,166,35,.2)' }}>
              <span className="text-xl">📅</span>
              <p className="text-amber-300 text-sm font-medium flex-1">Upcoming Hearings:</p>
              <div className="flex gap-3">
                {next.map(c=>(
                  <div key={c.id} className="px-3 py-1.5 rounded-lg text-xs"
                    style={{ background:'rgba(245,166,35,.1)', border:'1px solid rgba(245,166,35,.25)', color:'#fbbf24' }}>
                    {c.client_name} · {new Date(c.hearing_date).toLocaleDateString()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background:'rgba(15,29,58,.6)' }}>
            {(['cases','research'] as const).map(t=>(
              <button key={t} onClick={()=>setActiveTab(t)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize"
                style={activeTab===t ? { background:'linear-gradient(135deg,rgba(79,110,247,.3),rgba(124,58,237,.2))', color:'#93c5fd', border:'1px solid rgba(79,110,247,.3)' } : { color:'#64748b' }}>
                {t==='cases'?'📋 Cases':'🔍 AI Research'}
              </button>
            ))}
          </div>

          {activeTab==='cases' ? (
            <div className="glass rounded-3xl overflow-hidden">
              <div className="px-6 py-4" style={{ borderBottom:'1px solid rgba(79,110,247,.1)' }}>
                <p className="text-white font-semibold">{cases.length} total cases</p>
              </div>
              {loading ? <p className="text-slate-500 text-sm p-6">Loading from MongoDB…</p> : cases.length===0 ? (
                <div className="py-14 text-center">
                  <span className="text-5xl block mb-3">📋</span>
                  <p className="text-slate-500">No cases yet. Create your first case.</p>
                </div>
              ) : (
                <div>
                  {cases.map((c:any)=>(
                    <div key={c.id} className="table-row px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-medium text-sm">{c.client_name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[c.status]}`}>{c.status}</span>
                          </div>
                          <p className="text-slate-500 text-xs">{c.case_type}{c.hearing_date?' · '+new Date(c.hearing_date).toLocaleDateString():''}</p>
                          <p className="text-slate-400 text-xs mt-1 line-clamp-1">{c.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select value={c.status} onChange={e=>handleStatus(c.id,e.target.value)}
                            className="text-xs px-2 py-1.5 rounded-lg cursor-pointer outline-none"
                            style={{ background:'rgba(15,29,58,.9)', border:'1px solid rgba(79,110,247,.2)', color:'#94a3b8' }}>
                            {STATUSES.map(s=><option key={s} value={s} className="bg-slate-900">{s}</option>)}
                          </select>
                          <button onClick={()=>openEdit(c)} className="text-xs px-3 py-1.5 rounded-lg transition-all"
                            style={{ color:'#818cf8', background:'rgba(79,110,247,.1)', border:'1px solid rgba(79,110,247,.2)' }}>Edit</button>
                          <button onClick={()=>setDeleteId(c.id)} className="text-xs px-3 py-1.5 rounded-lg transition-all"
                            style={{ color:'#f87171', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)' }}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-3xl p-6">
              <p className="text-white font-semibold mb-4">AI Legal Research</p>
              <textarea value={aiQuery} onChange={e=>setAiQuery(e.target.value)}
                className="input-field resize-none mb-4" rows={4} placeholder="Ask a research question about Indian law…" />
              <button onClick={handleResearch} disabled={aiLoading||!aiQuery.trim()}
                className="btn-glow text-white px-6 py-3 rounded-xl text-sm font-medium w-full mb-4">
                {aiLoading?'Researching…':'🔍 Research Now'}
              </button>
              {aiResult && (
                <div className="p-4 rounded-2xl space-y-2" style={{ background:'rgba(79,110,247,.06)', border:'1px solid rgba(79,110,247,.15)' }}>
                  {aiResult.applicable_law && <p className="text-slate-300 text-sm"><span className="text-indigo-400 font-medium">Applicable Law:</span> {aiResult.applicable_law}</p>}
                  {aiResult.constitution_reference && <p className="text-slate-300 text-sm"><span className="text-indigo-400 font-medium">Reference:</span> {aiResult.constitution_reference}</p>}
                  {aiResult.where_to_file && <p className="text-slate-300 text-sm"><span className="text-indigo-400 font-medium">Forum:</span> {aiResult.where_to_file}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Case form modal */}
      {showForm && (
        <Modal title={editCase?'Edit Case':'New Case'} onClose={()=>setShowForm(false)} wide>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-slate-400 text-xs mb-1.5">Client Name</label>
              <input value={form.client_name} onChange={e=>setForm({...form,client_name:e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">Case Type</label>
              <select value={form.case_type} onChange={e=>setForm({...form,case_type:e.target.value})}
                className="input-field">
                {CASE_TYPES.map(t=><option key={t} className="bg-slate-900">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">Status</label>
              <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="input-field">
                {STATUSES.map(s=><option key={s} className="bg-slate-900 capitalize">{s}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-slate-400 text-xs mb-1.5">Description</label>
              <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="input-field resize-none" rows={3} />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-400 text-xs mb-1.5">Hearing Date (optional)</label>
              <input type="date" value={form.hearing_date} onChange={e=>setForm({...form,hearing_date:e.target.value})} className="input-field" />
            </div>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 rounded-xl text-sm text-slate-300"
              style={{ border:'1px solid rgba(79,110,247,.2)', background:'rgba(15,29,58,.5)' }}>Cancel</button>
            <button onClick={handleSave} className="flex-1 btn-glow text-white py-2.5 rounded-xl text-sm font-medium">
              {editCase?'Update Case':'Save to MongoDB'}
            </button>
          </div>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Delete Case" onClose={()=>setDeleteId(null)}>
          <p className="text-slate-400 text-sm mb-5">This will permanently delete the case from MongoDB. This action cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={()=>setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm text-slate-300"
              style={{ border:'1px solid rgba(79,110,247,.2)', background:'rgba(15,29,58,.5)' }}>Cancel</button>
            <button onClick={()=>handleDelete(deleteId)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background:'rgba(239,68,68,.8)' }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
