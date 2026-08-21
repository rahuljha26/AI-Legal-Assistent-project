import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = ['Profile','Account Security','Notifications','Appearance','Privacy & Data','Danger Zone'];

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="toggle-slider" />
    </label>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [active, setActive] = useState(0);
  const [profile, setProfile] = useState({ full_name: user?.full_name || '', email: user?.email || '', phone: '' });
  const [pass, setPass]        = useState({ current:'', newp:'', confirm:'' });
  const [notifs, setNotifs]    = useState({ aiAdvice:true, hearings:true, documents:false, newsletter:true });
  const [theme, setTheme]      = useState('Light');
  const [lang, setLang]        = useState('English');
  const initials = user?.full_name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'U';
  const roleLabel = user?.role === 'admin' ? 'Admin' : user?.role === 'advocate' ? 'Advocate' : 'User';
  const roleBadge = user?.role === 'admin' ? 'badge-admin' : user?.role === 'advocate' ? 'badge-advocate' : 'badge-user';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar"><h3>Settings & Profile</h3></header>
        <div className="page-body">
          <div className="settings-layout">
            {/* Settings Nav */}
            <div className="settings-nav">
              {NAV_ITEMS.map((n, i) => (
                <div key={n} className={`settings-nav-item${active===i?' active':''}${n==='Danger Zone'?' danger':''}`} onClick={()=>setActive(i)}>{n}</div>
              ))}
            </div>

            {/* Content */}
            <div>
              {active === 0 && (
                <div className="card settings-section">
                  <h3 className="mb-24">Profile</h3>
                  <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:28 }}>
                    {user?.profile_picture ? (
                      <img src={user.profile_picture} alt={user?.full_name} className="avatar avatar-xl" style={{ objectFit: 'cover' }} />
                    ) : (
                      <div className="avatar avatar-xl">{initials}</div>
                    )}
                    <div><a href="#" style={{ fontSize:13 }}>Change Photo</a></div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input className="form-control" value={profile.full_name} onChange={e=>setProfile({...profile,full_name:e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address <span>🔒</span></label>
                      <input className="form-control" value={profile.email} readOnly style={{ background:'#F8FAFC', color:'var(--muted)' }} />
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <span className={`badge ${roleBadge}`}>{roleLabel}</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number (Optional)</label>
                      <input className="form-control" placeholder="+91 98765 43210" value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})} />
                    </div>
                  </div>
                  <button className="btn btn-primary">Save Changes</button>
                </div>
              )}

              {active === 1 && (
                <div className="card settings-section">
                  <h3 className="mb-24">Account Security</h3>
                  <div className="form-group mb-16">
                    <label className="form-label">Current Password</label>
                    <input className="form-control" type="password" placeholder="••••••••" value={pass.current} onChange={e=>setPass({...pass,current:e.target.value})} />
                  </div>
                  <div className="form-group mb-16">
                    <label className="form-label">New Password</label>
                    <input className="form-control" type="password" placeholder="••••••••" value={pass.newp} onChange={e=>setPass({...pass,newp:e.target.value})} />
                  </div>
                  <div className="form-group mb-24">
                    <label className="form-label">Confirm New Password</label>
                    <input className="form-control" type="password" placeholder="••••••••" value={pass.confirm} onChange={e=>setPass({...pass,confirm:e.target.value})} />
                  </div>
                  <button className="btn btn-primary">Update Password</button>
                  <p className="text-sm mt-16">Last password changed: 3 months ago</p>
                </div>
              )}

              {active === 2 && (
                <div className="card settings-section">
                  <h3 className="mb-24">Notifications</h3>
                  {[
                    { key:'aiAdvice', label:'AI Advice email notifications', desc:'Receive your AI advice in your inbox' },
                    { key:'hearings', label:'Hearing reminders', desc:'Get reminders for upcoming court hearings' },
                    { key:'documents', label:'New document alerts', desc:'Be notified when documents are generated' },
                    { key:'newsletter', label:'Weekly legal tips newsletter', desc:'Weekly digest of important legal updates' },
                  ].map(item => (
                    <div key={item.key} className="toggle-row">
                      <div>
                        <div style={{ fontSize:14, fontWeight:500 }}>{item.label}</div>
                        <div className="text-sm">{item.desc}</div>
                      </div>
                      <Toggle checked={notifs[item.key]} onChange={()=>setNotifs({...notifs,[item.key]:!notifs[item.key]})} />
                    </div>
                  ))}
                </div>
              )}

              {active === 3 && (
                <div className="card settings-section">
                  <h3 className="mb-24">Appearance</h3>
                  <div className="form-group mb-24">
                    <label className="form-label" style={{ marginBottom:12 }}>Theme</label>
                    <div style={{ display:'flex', gap:0, border:'1.5px solid var(--border)', borderRadius:8, overflow:'hidden', width:'fit-content' }}>
                      {['Light','Dark','System'].map(t => (
                        <button key={t} onClick={()=>setTheme(t)} style={{
                          padding:'8px 20px', border:'none', cursor:'pointer', fontSize:14,
                          background: theme===t ? 'var(--primary)' : '#fff',
                          color: theme===t ? '#fff' : 'var(--muted)',
                          fontFamily:'Inter,sans-serif', transition:'all .15s'
                        }}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Language</label>
                    <select className="form-control" style={{ maxWidth:240, paddingLeft:14 }} value={lang} onChange={e=>setLang(e.target.value)}>
                      <option>English</option>
                      <option>Hindi</option>
                      <option>Marathi</option>
                    </select>
                  </div>
                </div>
              )}

              {active === 4 && (
                <div className="card settings-section">
                  <h3 className="mb-24">Privacy & Data</h3>
                  <p className="text-muted mb-16">We store your queries and documents securely. You can request data export or deletion at any time.</p>
                  <button className="btn btn-outline">Download My Data</button>
                </div>
              )}

              {active === 5 && (
                <div className="card settings-section danger-zone-card">
                  <h3 style={{ color:'var(--danger)', marginBottom:16 }}>Danger Zone</h3>
                  <p style={{ fontSize:14, color:'var(--muted)', marginBottom:20 }}>
                    <strong>Delete Account</strong> — This will permanently delete all your data including queries, documents, and case history. This action cannot be undone.
                  </p>
                  <button className="btn btn-danger">Delete My Account</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
