import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar, Toast, useToast, Modal } from '../components/index';
import NotificationBell from '../components/NotificationBell';
import { adminAPI } from '../services/api';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { toast, showToast, clearToast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number|null>(null);

  const sidebar = [
    { label:'Dashboard', path:'/admin/dashboard', icon:'🏠' },
    { label:'AI Chat', path:'/chat', icon:'💬' },
    { label:'Documents', path:'/documents', icon:'📄' },
    { label:'Settings', path:'/settings', icon:'⚙️' },
  ];

  const fetchStats = async () => { try { const r=await adminAPI.stats(); setStats(r.data?.data); } catch {} };
  const fetchUsers = async (p=1,role=roleFilter) => {
    setLoading(true);
    try { const r=await adminAPI.users(p,role||undefined); setUsers(r.data?.data?.results||[]); setTotalPages(r.data?.data?.pages||1); }
    catch { showToast('Failed to load users','error'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ fetchStats(); fetchUsers(); },[]);
  useEffect(()=>{ fetchUsers(1,roleFilter); setPage(1); },[roleFilter]);

  const handleVerify = async (id:number) => {
    try { await adminAPI.verifyUser(id); setUsers(p=>p.map(u=>u.id===id?{...u,is_verified:true}:u)); fetchStats(); showToast('User verified','success'); }
    catch { showToast('Verification failed','error'); }
  };
  const handleDelete = async (id:number) => {
    try { await adminAPI.deleteUser(id); setUsers(p=>p.filter(u=>u.id!==id)); setDeleteId(null); fetchStats(); showToast('Deleted from MongoDB','success'); }
    catch { showToast('Delete failed','error'); }
  };

  const pending = users.filter(u=>u.role==='advocate'&&!u.is_verified);
  const daysAgo=(d:string)=>Math.floor((Date.now()-new Date(d).getTime())/86400000);

  const STAT_CARDS = stats ? [
    { label:'Total Users',   value:stats.total_users,           icon:'👥', accent:'rgba(79,110,247,.15)',  text:'#818cf8' },
    { label:'Advocates',     value:stats.total_advocates,       icon:'⚖️', accent:'rgba(168,85,247,.15)',  text:'#c084fc' },
    { label:'Pending KYC',   value:stats.pending_verifications, icon:'⏳', accent:'rgba(245,166,35,.15)',  text:'#fbbf24' },
    { label:'AI Queries',    value:stats.ai_queries_today,      icon:'🤖', accent:'rgba(5,205,153,.15)',   text:'#34d399' },
    { label:'Cases',         value:stats.total_cases,           icon:'📋', accent:'rgba(239,68,68,.15)',   text:'#f87171' },
    { label:'Documents',     value:stats.documents_generated,   icon:'📄', accent:'rgba(20,184,166,.15)',  text:'#2dd4bf' },
  ] : [];

  return (
    <div className="flex min-h-screen" style={{ background:'#060b18' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast}/>}
      <Sidebar items={sidebar} userName={user?.full_name||''} userRole={user?.role||''} onLogout={logout} currentPath={location.pathname}/>

      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 px-8 py-4 flex items-center justify-between"
          style={{ background:'rgba(6,11,24,.85)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(79,110,247,.1)' }}>
          <div>
            <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400 text-xs">Manage users, verify advocates, and monitor platform health</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {pending.length>0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl animate-pulse"
                style={{ background:'rgba(245,166,35,.1)', border:'1px solid rgba(245,166,35,.3)' }}>
                <span className="text-amber-400 text-sm">⏳</span>
                <span className="text-amber-300 text-sm font-medium">{pending.length} pending verification{pending.length>1?'s':''}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 max-w-6xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {STAT_CARDS.map(s=>(
              <div key={s.label} className="stat-card text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 mx-auto" style={{ background:s.accent }}>{s.icon}</div>
                <p className="text-2xl font-bold" style={{ color:s.text }}>{s.value}</p>
                <p className="text-slate-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Pending verifications */}
          {pending.length>0 && (
            <div className="glass rounded-3xl p-5 mb-6" style={{ borderColor:'rgba(245,166,35,.2)' }}>
              <p className="text-amber-300 font-semibold mb-4 flex items-center gap-2">
                <span>⏳</span> Pending Advocate Verifications ({pending.length})
              </p>
              <div className="space-y-3">
                {pending.map((u:any)=>{
                  const days=daysAgo(u.created_at);
                  return (
                    <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl"
                      style={{ background:'rgba(15,29,58,.6)', border:'1px solid rgba(245,166,35,.12)' }}>
                      <div className="flex items-center gap-3">
                        {u.profile_picture ? (
                          <img src={u.profile_picture} alt={u.full_name} className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm"
                            style={{ background:'linear-gradient(135deg,rgba(168,85,247,.3),rgba(79,110,247,.3))', color:'#c084fc' }}>
                            {u.full_name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-white text-sm font-medium">{u.full_name}</p>
                          <p className="text-slate-500 text-xs">{u.email} · {days}d ago {days>3&&<span style={{color:'#f87171'}}>⚠ Urgent</span>}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={()=>handleVerify(u.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                          style={{ background:'rgba(5,205,153,.7)' }}>Approve</button>
                        <button onClick={()=>setDeleteId(u.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background:'rgba(239,68,68,.12)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)' }}>Reject</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Users table */}
          <div className="glass rounded-3xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3" style={{ borderBottom:'1px solid rgba(79,110,247,.1)' }}>
              <p className="text-white font-semibold">All Users</p>
              <div className="flex gap-1 p-1 rounded-xl" style={{ background:'rgba(15,29,58,.6)' }}>
                {['','user','advocate','admin'].map(r=>(
                  <button key={r} onClick={()=>setRoleFilter(r)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                    style={roleFilter===r ? { background:'linear-gradient(135deg,rgba(79,110,247,.3),rgba(124,58,237,.2))', color:'#93c5fd' } : { color:'#64748b' }}>
                    {r===''?'All':r}
                  </button>
                ))}
              </div>
            </div>
            {loading ? <div className="p-8 text-center text-slate-600 text-sm">Loading from MongoDB…</div> : (
              <>
                <div>
                  {users.map((u:any)=>(
                    <div key={u.id} className="table-row px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {u.profile_picture ? (
                          <img src={u.profile_picture} alt={u.full_name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
                            style={{ background:'linear-gradient(135deg,rgba(79,110,247,.3),rgba(124,58,237,.3))', color:'#93c5fd' }}>
                            {u.full_name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-slate-200 text-sm font-medium truncate">{u.full_name}</p>
                          <p className="text-slate-500 text-xs truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium badge-${u.role}`}>{u.role}</span>
                        {!u.is_verified&&u.role==='advocate'&&(
                          <button onClick={()=>handleVerify(u.id)} className="text-xs px-2 py-1 rounded-lg transition-all"
                            style={{ color:'#34d399', background:'rgba(5,205,153,.1)', border:'1px solid rgba(5,205,153,.25)' }}>Verify</button>
                        )}
                        {u.is_verified&&<span style={{ color:'#34d399', fontSize:12 }}>✓</span>}
                        {u.id!==user?.id&&(
                          <button onClick={()=>setDeleteId(u.id)} className="text-xs px-2 py-1 rounded-lg transition-all"
                            style={{ color:'#f87171', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.18)' }}>Delete</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {totalPages>1&&(
                  <div className="flex justify-between items-center px-6 py-4" style={{ borderTop:'1px solid rgba(79,110,247,.1)' }}>
                    <button disabled={page===1} onClick={()=>{setPage(p=>p-1);fetchUsers(page-1);}}
                      className="text-sm px-4 py-2 rounded-lg disabled:opacity-30 transition-all"
                      style={{ background:'rgba(79,110,247,.1)', color:'#818cf8', border:'1px solid rgba(79,110,247,.2)' }}>← Previous</button>
                    <span className="text-slate-500 text-xs">Page {page} / {totalPages}</span>
                    <button disabled={page===totalPages} onClick={()=>{setPage(p=>p+1);fetchUsers(page+1);}}
                      className="text-sm px-4 py-2 rounded-lg disabled:opacity-30 transition-all"
                      style={{ background:'rgba(79,110,247,.1)', color:'#818cf8', border:'1px solid rgba(79,110,247,.2)' }}>Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {deleteId&&(
        <Modal title="Delete User" onClose={()=>setDeleteId(null)}>
          <p className="text-slate-400 text-sm mb-5">This will permanently delete the user and all their data from MongoDB.</p>
          <div className="flex gap-3">
            <button onClick={()=>setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm text-slate-300"
              style={{ border:'1px solid rgba(79,110,247,.2)', background:'rgba(15,29,58,.5)' }}>Cancel</button>
            <button onClick={()=>handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background:'rgba(239,68,68,.8)' }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
