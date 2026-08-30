import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useAuth();

  if (!isLoggedIn) return null;

  const roleCode = (user?.role_code || user?.role || "").toLowerCase();
  const isAdvocate = roleCode === "lawyer" || roleCode === "advocate";
  const isAdmin = roleCode === "super_admin" || roleCode === "admin";

  const homePath = isAdmin
    ? "/admin/dashboard"
    : isAdvocate
    ? "/advocate/dashboard"
    : "/dashboard";

  const items = [
    {
      id: "home",
      label: "Home",
      path: homePath,
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: "documents",
      label: "Docs",
      path: "/documents",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      id: "security",
      label: "Security",
      path: "/security-settings",
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ),
    },
    {
      id: "logout",
      label: "Logout",
      path: null,
      icon: (_active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: "rgba(6, 11, 24, 0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(79, 110, 247, 0.15)",
        boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.5)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        minHeight: "60px",
      }}
    >
      {items.map((item) => {
        const active = item.path ? location.pathname === item.path : false;
        const isLogoutBtn = item.id === "logout";
        return (
          <button
            key={item.id}
            onClick={() => {
              if (isLogoutBtn) {
                logout();
              } else if (item.path) {
                navigate(item.path);
              }
            }}
            type="button"
            aria-label={item.label}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px 4px",
              minHeight: "48px",
              color: isLogoutBtn
                ? "rgba(248, 113, 113, 0.75)"
                : active
                ? "#818cf8"
                : "rgba(148, 163, 184, 0.75)",
              transition: "color 0.2s ease",
              position: "relative",
            }}
          >
            {/* Active indicator dot */}
            {active && !isLogoutBtn && (
              <div
                style={{
                  position: "absolute",
                  top: 4,
                  width: 20,
                  height: 3,
                  borderRadius: 99,
                  background: "linear-gradient(90deg, #4f6ef7, #7c3aed)",
                }}
              />
            )}
            <div
              style={{
                padding: "4px",
                borderRadius: 10,
                background: active && !isLogoutBtn
                  ? "rgba(79, 110, 247, 0.15)"
                  : "transparent",
                transition: "background 0.2s ease, transform 0.2s ease",
                transform: active && !isLogoutBtn ? "scale(1.1)" : "scale(1)",
              }}
            >
              {item.icon(active)}
            </div>
            <span
              style={{
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                marginTop: 2,
                letterSpacing: "0.02em",
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
