/**
 * NotificationBell.tsx
 * "What's New" announcement bell for the AI Legal Assistant.
 * Fetches announcements from the backend API and shows them in an
 * animated dropdown panel with unread-count badge.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { announcementsAPI } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Announcement {
  id: number;
  title: string;
  content: string;
  tag: 'feature' | 'update' | 'fix';
  tag_display: string;
  created_at: string;
}

// ─── Tag config ───────────────────────────────────────────────────────────────

const TAG_CFG: Record<string, { bg: string; color: string; icon: string }> = {
  feature: { bg: 'rgba(79,110,247,.18)', color: '#818cf8', icon: '✨' },
  update:  { bg: 'rgba(245,166,35,.15)', color: '#fbbf24', icon: '🔄' },
  fix:     { bg: 'rgba(5,205,153,.15)',  color: '#34d399', icon: '🛠' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEEN_KEY = 'lexai_seen_announcements';

function getSeenIds(): number[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); }
  catch { return []; }
}

function markAllSeen(ids: number[]) {
  localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open, setOpen]               = useState(false);
  const [items, setItems]             = useState<Announcement[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [unread, setUnread]           = useState(0);
  const [animateBell, setAnimateBell] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);

  // ── Fetch announcements ──────────────────────────────────────────────────
  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await announcementsAPI.list();
      const data: Announcement[] = res.data?.data ?? [];
      setItems(data);
      const seen = getSeenIds();
      const newCount = data.filter(a => !seen.includes(a.id)).length;
      setUnread(newCount);
      if (newCount > 0) {
        setAnimateBell(true);
        setTimeout(() => setAnimateBell(false), 3000);
      }
    } catch {
      setError('Could not load announcements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
    const timer = setInterval(fetchAnnouncements, 5 * 60 * 1000); // re-poll every 5 min
    return () => clearInterval(timer);
  }, [fetchAnnouncements]);

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Toggle + mark as seen ────────────────────────────────────────────────
  const toggle = () => {
    setOpen(prev => {
      if (!prev) {
        // Mark all as seen when opening
        markAllSeen(items.map(a => a.id));
        setUnread(0);
      }
      return !prev;
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="What's new"
        style={{
          position: 'relative',
          background: open ? 'rgba(79,110,247,.15)' : 'rgba(79,110,247,.07)',
          border: `1px solid ${open ? 'rgba(79,110,247,.35)' : 'rgba(79,110,247,.18)'}`,
          borderRadius: 12,
          width: 40, height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all .2s',
          animation: animateBell ? 'bell-ring .5s ease 3' : 'none',
        }}
      >
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke={open ? '#818cf8' : 'rgba(148,163,184,.7)'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'linear-gradient(135deg,#4f6ef7,#7c3aed)',
            color: '#fff', fontSize: 9, fontWeight: 700,
            minWidth: 16, height: 16, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            boxShadow: '0 0 8px rgba(79,110,247,.6)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 360,
            maxHeight: 480,
            borderRadius: 20,
            background: 'rgba(9,15,31,.97)',
            border: '1px solid rgba(79,110,247,.18)',
            boxShadow: '0 24px 80px rgba(0,0,0,.6)',
            backdropFilter: 'blur(24px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            animation: 'slide-in-bell .18s ease',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px 12px',
            borderBottom: '1px solid rgba(79,110,247,.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '.3px' }}>
                What's New
              </span>
            </div>
            {items.length > 0 && (
              <span style={{
                background: 'rgba(79,110,247,.15)',
                color: '#818cf8',
                fontSize: 11, fontWeight: 600,
                padding: '2px 8px', borderRadius: 20,
              }}>
                {items.length} update{items.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Body */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
            {loading && (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#4f6ef7',
                      animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {!loading && error && (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: '#f87171', fontSize: 13 }}>
                {error}
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
                <p style={{ color: '#64748b', fontSize: 13 }}>No announcements yet.</p>
                <p style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>
                  Check back soon for updates!
                </p>
              </div>
            )}

            {!loading && !error && items.map((item, idx) => {
              const cfg = TAG_CFG[item.tag] ?? TAG_CFG.feature;
              return (
                <div
                  key={item.id}
                  style={{
                    margin: '4px 10px',
                    borderRadius: 14,
                    padding: '12px 14px',
                    background: idx === 0 ? 'rgba(79,110,247,.06)' : 'transparent',
                    border: idx === 0 ? '1px solid rgba(79,110,247,.1)' : '1px solid transparent',
                    transition: 'background .2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,110,247,.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = idx === 0 ? 'rgba(79,110,247,.06)' : 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {/* Tag pill + icon */}
                    <span style={{
                      marginTop: 2,
                      background: cfg.bg, color: cfg.color,
                      fontSize: 10, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 20,
                      whiteSpace: 'nowrap', flexShrink: 0,
                      letterSpacing: '.4px', textTransform: 'uppercase',
                    }}>
                      {cfg.icon} {item.tag_display}
                    </span>

                    {/* Time */}
                    <span style={{
                      marginLeft: 'auto', marginTop: 2, flexShrink: 0,
                      color: '#475569', fontSize: 11,
                    }}>
                      {timeAgo(item.created_at)}
                    </span>
                  </div>

                  {/* Title */}
                  <p style={{
                    color: '#e2e8f0', fontSize: 13, fontWeight: 600,
                    margin: '8px 0 4px', lineHeight: 1.4,
                  }}>
                    {item.title}
                  </p>

                  {/* Content */}
                  <p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                    {item.content}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid rgba(79,110,247,.08)',
            textAlign: 'center',
          }}>
            <p style={{ color: '#334155', fontSize: 11, margin: 0 }}>
              ⚖️ AI Legal Assistant — Release Notes
            </p>
          </div>
        </div>
      )}

      {/* Inline keyframes */}
      <style>{`
        @keyframes bell-ring {
          0%,100% { transform: rotate(0deg); }
          20%      { transform: rotate(-15deg); }
          40%      { transform: rotate(15deg); }
          60%      { transform: rotate(-10deg); }
          80%      { transform: rotate(10deg); }
        }
        @keyframes slide-in-bell {
          from { opacity: 0; transform: translateY(-8px) scale(.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}
