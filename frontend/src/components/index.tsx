import { useState, useEffect, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export { ChatWidget } from './ChatWidget';
export { NyayaAssistant } from './NyayaAssistant';
export { RoleBasedRoute } from './RoleBasedRoute';

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
export const ProtectedRoute = ({ children, roles }: { children: ReactNode; roles?: string[] }) => {
  const { user, isLoading, hasRole } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen mesh-bg flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl btn-glow flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚖️</span>
        </div>
        <div className="flex gap-2 justify-center">
          {[0,1,2].map(i=>(
            <div key={i} className="w-2 h-2 rounded-full bg-indigo-400"
              style={{ animation:`pulse-dot 1.2s ease-in-out ${i*0.2}s infinite` }} />
          ))}
        </div>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && roles.length > 0 && !hasRole(...roles)) {
    const roleCode = user.role_code || user.role;
    if (roleCode === 'super_admin' || roleCode === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (roleCode === 'lawyer' || roleCode === 'advocate') return <Navigate to="/advocate/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = 'success'|'error'|'warning'|'info';
interface ToastProps { message:string; type:ToastType; onClose:()=>void; }

const TOAST_CFG: Record<ToastType,{bg:string;icon:string;border:string}> = {
  success:{ bg:'rgba(5,205,153,.12)', icon:'✓', border:'rgba(5,205,153,.4)' },
  error:  { bg:'rgba(239,68,68,.12)', icon:'✕', border:'rgba(239,68,68,.4)' },
  warning:{ bg:'rgba(245,166,35,.12)',icon:'⚠', border:'rgba(245,166,35,.4)' },
  info:   { bg:'rgba(79,110,247,.12)',icon:'ℹ', border:'rgba(79,110,247,.4)' },
};
const TOAST_TEXT: Record<ToastType,string> = {
  success:'#05cd99', error:'#f87171', warning:'#f5a623', info:'#818cf8',
};

export const Toast = ({ message, type, onClose }: ToastProps) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return ()=>clearTimeout(t); }, [onClose]);
  const cfg = TOAST_CFG[type];
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up max-w-sm"
      style={{ background:'rgba(9,15,31,.95)', border:`1px solid ${cfg.border}`, borderRadius:16,
        boxShadow:'0 20px 60px rgba(0,0,0,.5)', backdropFilter:'blur(20px)', padding:'14px 18px' }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background:cfg.bg, color:TOAST_TEXT[type], fontSize:14 }}>
          {cfg.icon}
        </div>
        <p className="text-sm text-slate-200 flex-1">{message}</p>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none ml-2">×</button>
      </div>
    </div>
  );
};

// ─── useToast ─────────────────────────────────────────────────────────────────
interface ToastState { message:string; type:ToastType; id:number; }
export const useToast = () => {
  const [toast, setToast] = useState<ToastState|null>(null);
  const showToast = (message:string, type:ToastType='info') => setToast({ message, type, id:Date.now() });
  const clearToast = () => setToast(null);
  return { toast, showToast, clearToast };
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
interface SidebarItem { label:string; path:string; icon:string; }
interface SidebarProps { items:SidebarItem[]; userName:string; userRole:string; onLogout:()=>void; currentPath:string; }

export const Sidebar = ({ items, userName, userRole, onLogout, currentPath }: SidebarProps) => {
  const { user } = useAuth();
  const initials = userName.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
  const roleMap: Record<string,string> = { admin:'badge-admin', advocate:'badge-advocate', user:'badge-user' };
  const roleLabel: Record<string,string> = { admin:'Admin', advocate:'Advocate', user:'Citizen' };

  return (
    <aside className="sidebar-bg w-64 min-h-screen flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-6 pt-7 pb-5 border-b" style={{ borderColor:'rgba(79,110,247,.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl btn-glow flex items-center justify-center">
            <span className="text-lg">⚖️</span>
          </div>
          <div>
            <p className="font-bold text-white text-sm tracking-wide">LexAI</p>
            <p className="text-xs" style={{ color:'rgba(129,140,248,.6)' }}>Legal Assistant</p>
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="mx-3 mt-4 mb-2 rounded-2xl p-3" style={{ background:'rgba(79,110,247,.07)', border:'1px solid rgba(79,110,247,.12)' }}>
        <div className="flex items-center gap-3">
          {user?.profile_picture ? (
            <img src={user.profile_picture} alt={userName} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background:'linear-gradient(135deg,#4f6ef7,#7c3aed)', color:'white' }}>
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{userName}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleMap[userRole]}`}>
              {roleLabel[userRole] || userRole}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1">
        {items.map(item => {
          const active = currentPath === item.path;
          return (
            <a key={item.path} href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all no-underline ${
                active ? 'nav-active' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
            </a>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 border-t pt-3" style={{ borderColor:'rgba(79,110,247,.1)' }}>
        <button onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full transition-all text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
};

// ─── PageHeader ───────────────────────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, action }: { title:string; subtitle?:string; action?:ReactNode }) => (
  <div className="flex items-center justify-between mb-8">
    <div>
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {subtitle && <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

// ─── GlassCard ────────────────────────────────────────────────────────────────
export const GlassCard = ({ children, className='', onClick }:{ children:ReactNode; className?:string; onClick?:()=>void }) => (
  <div className={`glass rounded-2xl ${onClick?'cursor-pointer card-hover':''} ${className}`} onClick={onClick}>{children}</div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────
export const Modal = ({ title, children, onClose, wide=false }:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ background:'rgba(0,0,0,.65)', backdropFilter:'blur(8px)' }}>
    <div className={`glass rounded-2xl p-6 w-full shadow-2xl animate-slide-up ${wide?'max-w-xl':'max-w-md'}`}
      style={{ boxShadow:'0 40px 80px rgba(0,0,0,.6)' }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-semibold">{title}</h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">✕</button>
      </div>
      {children}
    </div>
  </div>
);

// ─── PrimaryButton ────────────────────────────────────────────────────────────
export const PrimaryButton=({children,onClick,disabled=false,fullWidth=false,className=''}:{children:ReactNode;onClick?:()=>void;disabled?:boolean;fullWidth?:boolean;className?:string})=>(
  <button onClick={onClick} disabled={disabled}
    className={`btn-glow text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-all ${fullWidth?'w-full':''} ${className}`}>
    {children}
  </button>
);
