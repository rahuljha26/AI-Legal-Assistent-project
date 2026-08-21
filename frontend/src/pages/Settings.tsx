import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar, Toast, useToast, Modal } from '../components/index';
import NotificationBell from '../components/NotificationBell';
import { authAPI } from '../services/api';

type Section='profile'|'security'|'notifications'|'appearance'|'danger';

const NAV: { id:Section; label:string; icon:string }[] = [
  { id:'profile',       label:'Profile',         icon:'👤' },
  { id:'security',      label:'Security',         icon:'🔒' },
  { id:'notifications', label:'Notifications',    icon:'🔔' },
  { id:'appearance',    label:'Appearance',       icon:'🎨' },
  { id:'danger',        label:'Danger Zone',      icon:'⚠️' },
];

export default function Settings() {
  const { user, logout, refreshUser } = useAuth();
  const location = useLocation();
  const { toast, showToast, clearToast } = useToast();
  const [section, setSection] = useState<Section>('profile');
  const [fullName, setFullName] = useState(user?.full_name||'');
  const [savingProfile, setSavingProfile] = useState(false);
  const [pw, setPw] = useState({ current_password:'', new_password:'', confirm_new_password:'' });
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [notifs, setNotifs] = useState({ email_advice:true, email_document:true, case_updates:false, weekly_digest:false });
  const [theme, setTheme] = useState('dark');
  const [lang, setLang] = useState('en');
  const [deleteModal, setDeleteModal] = useState(false);

  const sidebar = [
    { label:'Dashboard', path:user?.role==='admin'?'/admin/dashboard':user?.role==='advocate'?'/advocate/dashboard':'/dashboard', icon:'🏠' },
    { label:'AI Chat', path:'/chat', icon:'💬' },
    { label:'Documents', path:'/documents', icon:'📄' },
    { label:'Settings', path:'/settings', icon:'⚙️' },
  ];

  const initials = (user?.full_name||'').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);

  const saveProfile = async () => {
    if (!fullName.trim()) { showToast('Name required','error'); return; }
    setSavingProfile(true);
    try { await authAPI.updateProfile({ full_name:fullName }); await refreshUser(); showToast('Profile updated in MongoDB','success'); }
    catch { showToast('Update failed','error'); } finally { setSavingProfile(false); }
  };

  const savePw = async () => {
    setPwError('');
    if (pw.new_password!==pw.confirm_new_password) { setPwError('Passwords do not match'); return; }
    if (pw.new_password.length<8) { setPwError('Minimum 8 characters'); return; }
    setSavingPw(true);
    try { await authAPI.changePassword(pw); setPw({ current_password:'',new_password:'',confirm_new_password:'' }); showToast('Password updated in MongoDB','success'); }
    catch(e:any) { const m=e.response?.data?.message||'Failed'; setPwError(m); showToast(m,'error'); }
    finally { setSavingPw(false); }
  };

  const SectionCard = ({ title, children }: { title:string; children:React.ReactNode }) => (
    <div className="glass rounded-3xl p-6">
      <p className="text-white font-semibold text-base mb-6">{title}</p>
      {children}
    </div>
  );

  const Toggle = ({ on, onChange }: { on:boolean; onChange:()=>void }) => (
    <button onClick={onChange} className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
      style={{ background:on?'linear-gradient(135deg,#4f6ef7,#7c3aed)':'rgba(30,52,101,.5)' }}>
      <span className="absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all"
        style={{ left:on?'calc(100% - 20px)':'4px' }} />
    </button>
  );

  return (
    <div className="flex min-h-screen" style={{ background:'#060b18' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast}/>}
      <Sidebar items={sidebar} userName={user?.full_name||''} userRole={user?.role||''} onLogout={logout} currentPath={location.pathname}/>

      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 px-8 py-4 flex items-center justify-between" style={{ background:'rgba(6,11,24,.85)', backdropFilter:'blur(16px)', borderBottom:'1px solid rgba(79,110,247,.1)' }}>
          <div>
            <h1 className="text-lg font-bold text-white">Settings</h1>
            <p className="text-slate-400 text-xs">Manage your account preferences</p>
          </div>
          <NotificationBell />
        </div>

        <div className="p-8 max-w-5xl mx-auto">
          <div className="flex gap-6">
            {/* Side nav */}
            <nav className="w-52 flex-shrink-0">
              <div className="glass rounded-2xl p-2 space-y-1">
                {NAV.map(n=>(
                  <button key={n.id} onClick={()=>setSection(n.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all"
                    style={section===n.id && n.id!=='danger' ? {
                      background:'linear-gradient(135deg,rgba(79,110,247,.2),rgba(124,58,237,.12))',
                      color:'#93c5fd', border:'1px solid rgba(79,110,247,.3)'
                    } : n.id==='danger' ? {
                      color:'#f87171', background:'transparent'
                    } : { color:'#64748b' }}>
                    <span>{n.icon}</span>{n.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Content */}
            <div className="flex-1">
              {section==='profile' && (
                <SectionCard title="Profile Information">
                  <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl" style={{ background:'rgba(79,110,247,.05)', border:'1px solid rgba(79,110,247,.12)' }}>
                    {user?.profile_picture ? (
                      <img src={user.profile_picture} alt={user?.full_name} referrerPolicy="no-referrer" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" style={{ boxShadow:'0 0 20px rgba(79,110,247,.3)' }} />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                        style={{ background:'linear-gradient(135deg,#4f6ef7,#7c3aed)', boxShadow:'0 0 20px rgba(79,110,247,.3)' }}>
                        {initials}
                      </div>
                    )}
                    <div>
                      <p className="text-white font-semibold">{user?.full_name}</p>
                      <p className="text-slate-400 text-sm">{user?.email}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block badge-${user?.role}`}>{user?.role}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-400 text-xs mb-1.5">Full Name</label>
                      <input value={fullName} onChange={e=>setFullName(e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1.5">Email (read-only)</label>
                      <input value={user?.email||''} disabled className="input-field opacity-50 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1.5">Role (read-only)</label>
                      <input value={user?.role||''} disabled className="input-field opacity-50 cursor-not-allowed capitalize" />
                    </div>
                  </div>
                  <button onClick={saveProfile} disabled={savingProfile} className="btn-glow text-white px-5 py-2.5 rounded-xl text-sm font-medium mt-5">
                    {savingProfile?'Saving…':'Save Changes'}
                  </button>
                </SectionCard>
              )}

              {section==='security' && (
                <SectionCard title="Change Password">
                  <div className="space-y-4">
                    {([['current_password','Current Password'],['new_password','New Password'],['confirm_new_password','Confirm New Password']] as const).map(([k,l])=>(
                      <div key={k}>
                        <label className="block text-slate-400 text-xs mb-1.5">{l}</label>
                        <input type="password" value={pw[k]} onChange={e=>setPw({...pw,[k]:e.target.value})} className="input-field" />
                      </div>
                    ))}
                    {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
                  </div>
                  <button onClick={savePw} disabled={savingPw} className="btn-glow text-white px-5 py-2.5 rounded-xl text-sm font-medium mt-5">
                    {savingPw?'Updating…':'Update Password'}
                  </button>
                </SectionCard>
              )}

              {section==='notifications' && (
                <SectionCard title="Notification Preferences">
                  <div className="space-y-2">
                    {([
                      ['email_advice','Email AI Advice','Receive legal advice summaries by email'],
                      ['email_document','Email Documents','Notify when documents are generated'],
                      ['case_updates','Case Updates','Get alerts for case status changes'],
                      ['weekly_digest','Weekly Digest','Weekly activity summary'],
                    ] as const).map(([k,l,d])=>(
                      <div key={k} className="flex items-center justify-between p-4 rounded-xl" style={{ background:'rgba(79,110,247,.04)', border:'1px solid rgba(79,110,247,.08)' }}>
                        <div>
                          <p className="text-slate-200 text-sm font-medium">{l}</p>
                          <p className="text-slate-500 text-xs">{d}</p>
                        </div>
                        <Toggle on={notifs[k]} onChange={()=>setNotifs(p=>({...p,[k]:!p[k]}))} />
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {section==='appearance' && (
                <SectionCard title="Appearance">
                  <div className="mb-6">
                    <label className="block text-slate-400 text-xs mb-3">Theme</label>
                    <div className="flex gap-2">
                      {['light','dark','system'].map(t=>(
                        <button key={t} onClick={()=>setTheme(t)}
                          className="px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all"
                          style={theme===t ? { background:'linear-gradient(135deg,rgba(79,110,247,.3),rgba(124,58,237,.2))', color:'#93c5fd', border:'1px solid rgba(79,110,247,.4)' } : { background:'rgba(15,29,58,.5)', color:'#64748b', border:'1px solid rgba(79,110,247,.12)' }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-xs mb-2">Language</label>
                    <select value={lang} onChange={e=>setLang(e.target.value)} className="input-field">
                      <option value="en">English</option>
                      <option value="hi">हिन्दी</option>
                      <option value="mr">मराठी</option>
                      <option value="gu">ગુજરાતી</option>
                      <option value="ta">தமிழ்</option>
                    </select>
                  </div>
                </SectionCard>
              )}

              {section==='danger' && (
                <div className="glass rounded-3xl p-6" style={{ borderColor:'rgba(239,68,68,.25)' }}>
                  <p className="text-red-400 font-semibold mb-2">⚠️ Danger Zone</p>
                  <p className="text-slate-400 text-sm mb-6">These actions are permanent and cannot be undone.</p>
                  <div className="p-5 rounded-2xl" style={{ background:'rgba(239,68,68,.05)', border:'1px solid rgba(239,68,68,.2)' }}>
                    <p className="text-white font-medium text-sm mb-1">Delete Account</p>
                    <p className="text-slate-400 text-xs mb-4">Permanently delete your account and all data from MongoDB.</p>
                    <button onClick={()=>setDeleteModal(true)} className="px-4 py-2 rounded-lg text-sm transition-all"
                      style={{ background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.3)' }}>
                      Delete Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {deleteModal && (
        <Modal title="⚠️ Delete Account" onClose={()=>setDeleteModal(false)}>
          <p className="text-slate-400 text-sm mb-5">This will permanently delete your account. Enter your password to confirm.</p>
          <input type="password" className="input-field mb-4" placeholder="Enter your password" />
          <div className="flex gap-3">
            <button onClick={()=>setDeleteModal(false)} className="flex-1 py-2.5 rounded-xl text-sm text-slate-300"
              style={{ border:'1px solid rgba(79,110,247,.2)', background:'rgba(15,29,58,.5)' }}>Cancel</button>
            <button onClick={()=>{ showToast('Account deletion not enabled','warning'); setDeleteModal(false); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background:'rgba(239,68,68,.8)' }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
