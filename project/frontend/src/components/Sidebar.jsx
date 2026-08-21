import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const icons = {
  home: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  chat: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  folder: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>,
  clock: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  book: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  gear: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  users: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  shield: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  chart: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  briefcase: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
  search: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  calendar: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  scale: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 3v18"/><path d="M3 9l9-6 9 6"/><path d="M6 9l-3 6h6L6 9zM18 9l-3 6h6l-3-6z"/><path d="M8 21h8"/></svg>,
};

const userNav = [
  { label: 'Home',                icon: 'home',   path: '/dashboard' },
  { label: 'Ask Legal Question',  icon: 'chat',   path: '/dashboard/chat' },
  { label: 'My Documents',        icon: 'folder', path: '/dashboard/documents' },
  { label: 'Chat History',        icon: 'clock',  path: '/dashboard/history' },
  { label: 'Know Your Rights',    icon: 'book',   path: '/dashboard/constitution' },
  { label: 'Settings',            icon: 'gear',   path: '/dashboard/settings' },
];

const advocateNav = [
  { label: 'Dashboard',       icon: 'home',      path: '/advocate/dashboard' },
  { label: 'My Cases',        icon: 'briefcase', path: '/advocate/cases' },
  { label: 'Clients',         icon: 'users',     path: '/advocate/clients' },
  { label: 'AI Research',     icon: 'search',    path: '/advocate/chat' },
  { label: 'Know Your Rights', icon: 'book',     path: '/advocate/constitution' },
  { label: 'Documents',       icon: 'folder',    path: '/advocate/documents' },
  { label: 'Calendar',        icon: 'calendar',  path: '/advocate/calendar' },
];

const adminNav = [
  { label: 'Dashboard',       icon: 'home',   path: '/admin/dashboard' },
  { label: 'User Management', icon: 'users',  path: '/admin/users' },
  { label: 'Advocate Verify', icon: 'shield', path: '/admin/verify' },
  { label: 'Reports',         icon: 'chart',  path: '/admin/reports' },
  { label: 'Settings',        icon: 'gear',   path: '/admin/settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const navItems = user?.role === 'admin' ? adminNav : user?.role === 'advocate' ? advocateNav : userNav;
  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'U';

  const roleLabel = user?.role === 'admin' ? 'Administrator' : user?.role === 'advocate' ? 'Advocate' : 'User';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        Dharma <span>Vault</span>
      </div>

      <div className="sidebar-profile">
        {user?.profile_picture ? (
          <img src={user.profile_picture} alt={user?.full_name} className="avatar" style={{ objectFit: 'cover' }} />
        ) : (
          <div className="avatar" style={{ background: user?.role === 'admin' ? '#DC2626' : user?.role === 'advocate' ? '#7C3AED' : 'var(--primary)' }}>{initials}</div>
        )}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div className="name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.role === 'admin' ? 'Super Admin' : user?.role === 'advocate' ? `Adv. ${user?.full_name?.split(' ')[0] || 'User'}` : user?.full_name || 'User'}
          </div>
          <div className="role" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {roleLabel}
            {user?.role === 'admin' && <span style={{ background: 'rgba(220,38,38,0.2)', color: '#FCA5A5', fontSize: '10px', padding: '1px 6px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin</span>}
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard' || item.path === '/advocate/dashboard' || item.path === '/admin/dashboard'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            {icons[item.icon]}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          <span style={{ fontSize: 16 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button className="btn btn-ghost btn-full" onClick={() => { logout(); navigate('/'); }}
          style={{ color: '#DC2626', justifyContent: 'flex-start', gap: 10, padding: 0 }}>
          Logout
        </button>
      </div>
    </aside>
  );
}

export function ScalesIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v18M3 9l9-6 9 6"/>
      <path d="M6 9l-3 6h6L6 9zM18 9l-3 6h6l-3-6z"/>
      <path d="M8 21h8"/>
    </svg>
  );
}

export { icons };
