import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "239460814371-37p3163iq29chuf504e2rh1hdrnbbgtl.apps.googleusercontent.com";

// ─── Icons ────────────────────────────────────────────────────────────────────
export const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

export const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    )}
  </svg>
);

export const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export const SpinnerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:"spin 0.8s linear infinite"}}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);

export const ScalesIcon = () => (
  <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="32" y1="8" x2="32" y2="56"/>
    <line x1="16" y1="56" x2="48" y2="56"/>
    <line x1="8" y1="20" x2="56" y2="20"/>
    <line x1="8" y1="20" x2="20" y2="36"/>
    <line x1="56" y1="20" x2="44" y2="36"/>
    <path d="M8 36 Q14 42 20 36"/>
    <path d="M44 36 Q50 42 56 36"/>
    <circle cx="32" cy="8" r="3" fill="currentColor" stroke="none"/>
  </svg>
);

// ─── Password strength checker ────────────────────────────────────────────────
export function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: "Too short", color: "#EF4444" },
    { label: "Weak", color: "#F97316" },
    { label: "Fair", color: "#EAB308" },
    { label: "Good", color: "#22C55E" },
    { label: "Strong", color: "#10B981" },
  ];
  return { score, ...map[score] };
}

// ─── Toast component ──────────────────────────────────────────────────────────
export function Toast({ toasts, remove }) {
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          background: t.type === "success" ? "#064E3B" : t.type === "error" ? "#7F1D1D" : "#1E3A5F",
          color: "#fff", padding: "12px 16px", borderRadius: 12,
          fontSize: 13, fontWeight: 500, minWidth: 280, maxWidth: 380,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          animation: "slideIn 0.3s ease",
        }}>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", opacity: 0.7, fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => remove(id), 4000);
  };
  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
  return { toasts, toast: add, remove };
}

// ─── Shared Input component ───────────────────────────────────────────────────
export function Input({ label, type = "text", value, onChange, placeholder, error, hint, rightEl, required, id }) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <div style={{ marginBottom: error ? 6 : 16 }}>
      <label htmlFor={inputId} style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#EF4444", marginLeft: 3 }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={inputId}
          type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete="off"
          style={{
            width: "100%", padding: rightEl ? "11px 44px 11px 14px" : "11px 14px",
            border: `1.5px solid ${error ? "#FCA5A5" : "#E5E7EB"}`,
            borderRadius: 10, fontSize: 14, color: "#111827",
            background: error ? "#FFF5F5" : "rgba(255,255,255,0.7)",
            outline: "none", fontFamily: "inherit", transition: "all 0.3s ease",
            boxSizing: "border-box", backdropFilter: "blur(10px)",
          }}
          onFocus={(e) => { 
            e.target.style.border = `1.5px solid ${error ? "#EF4444" : "#6366F1"}`; 
            e.target.style.background = "#fff"; 
            e.target.style.boxShadow = error ? "0 0 0 4px rgba(239, 68, 68, 0.1)" : "0 0 0 4px rgba(99, 102, 241, 0.15)";
          }}
          onBlur={(e) => { 
            e.target.style.border = `1.5px solid ${error ? "#FCA5A5" : "#E5E7EB"}`; 
            e.target.style.background = error ? "#FFF5F5" : "rgba(255,255,255,0.7)"; 
            e.target.style.boxShadow = "none";
          }}
        />
        {rightEl && (
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", cursor: "pointer" }}>
            {rightEl}
          </div>
        )}
      </div>
      {error && <p id={`${inputId}-error`} role="alert" style={{ margin: "4px 0 10px", fontSize: 12, color: "#EF4444" }}>{error}</p>}
      {hint && !error && <p id={`${inputId}-hint`} style={{ margin: "4px 0 10px", fontSize: 12, color: "#9CA3AF" }}>{hint}</p>}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ text = "or" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
      <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>{text}</span>
      <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
    </div>
  );
}

// ─── Google Sign-In Button (loads GSI SDK) ────────────────────────────────────
export function GoogleSignInButton({ onSuccess, onError, label = "Continue with Google" }) {
  const btnRef = useRef(null);
  const [sdkReady, setSdkReady] = useState(false);
  const { googleLogin } = useAuth();

  useEffect(() => {
    // Load Google Identity Services SDK
    if (window.google) { initGoogle(); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  function initGoogle() {
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    setSdkReady(true);
  }

  async function handleCredentialResponse(response) {
    try {
      const user = await googleLogin(response.credential);
      onSuccess({ user });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Google authentication failed. Please try again.";
      onError(msg);
    }
  }

  function handleClick() {
    if (!window.google) {
      onError("Google SDK not loaded. Check your internet connection.");
      return;
    }
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: open Google OAuth popup
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: "outline", size: "large", width: 320,
        });
      }
    });
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handleClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        gap: 10, padding: "11px 20px", background: "#fff",
        border: "1.5px solid #E5E7EB", borderRadius: 10, cursor: "pointer",
        fontSize: 14, fontWeight: 600, color: "#374151",
        fontFamily: "inherit", transition: "all 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#F9FAFB"; e.currentTarget.style.borderColor = "#D1D5DB"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#E5E7EB"; }}
    >
      <GoogleIcon />
      {label}
    </button>
  );
}
