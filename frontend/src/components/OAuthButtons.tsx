/**
 * OAuthButtons.tsx
 * Reusable Google + GitHub OAuth login buttons for the AI Legal Assistant.
 */

import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "239460814371-37p3163iq29chuf504e2rh1hdrnbbgtl.apps.googleusercontent.com";
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || "";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OAuthUser {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "advocate" | "user";
  is_verified: boolean;
  profile_picture?: string;
}

interface OAuthButtonsProps {
  onSuccess: (user: OAuthUser) => void;
  onError: (message: string) => void;
  googleLabel?: string;
  githubLabel?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function saveAuthData(data: { access: string; refresh: string; user: OAuthUser }) {
  localStorage.setItem("access_token", data.access);
  localStorage.setItem("refresh_token", data.refresh);
  localStorage.setItem("user", JSON.stringify(data.user));
}

// ─── Google Icon ──────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg width="19" height="19" viewBox="0 0 48 48" fill="none">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

// ─── GitHub Icon ──────────────────────────────────────────────────────────────

const GitHubIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner = () => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5"
    style={{ animation: "spin 0.8s linear infinite" }}
  >
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </svg>
);

// ─── Divider ──────────────────────────────────────────────────────────────────

export function OAuthDivider({ text = "or" }: { text?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
      <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>{text}</span>
      <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
    </div>
  );
}

// ─── Google Button ────────────────────────────────────────────────────────────

function GoogleOAuthButton({
  onSuccess,
  onError,
  label,
}: {
  onSuccess: (user: OAuthUser) => void;
  onError: (msg: string) => void;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const timerRef = useRef<number | null>(null);

  const cleanup = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "GOOGLE_OAUTH_ERROR") {
        cleanup();
        setLoading(false);
        onError(event.data.error || "Google sign-in was cancelled.");
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
        return;
      }

      if (event.data?.type !== "GOOGLE_OAUTH_TOKEN") return;

      const token = event.data.token as string;
      cleanup();
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      setLoading(true);

      try {
        const response = await fetch(`${API_BASE}/auth/google/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "1" },
          body: JSON.stringify({ token }),
        });

        const res = await response.json();

        if (res.success && res.data) {
          if (res.data.requires_2fa) {
            window.location.href = `/verify-otp?email=${encodeURIComponent(res.data.email)}`;
            return;
          }
          saveAuthData(res.data);
          onSuccess(res.data.user);
        } else {
          onError(res.message || "Google account verification failed.");
        }
      } catch (err: unknown) {
        const errMessage = (err as any)?.message;
        if (!window.navigator.onLine) {
          onError("Google sign-in could not connect to the server. Check your network.");
        } else if (errMessage) {
          onError(`Google sign-in error: ${errMessage}`);
        } else {
          onError("Server authentication failed. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
      cleanup();
    };
  }, [onSuccess, onError]);

  const handleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      onError("Google OAuth is not configured. Missing VITE_GOOGLE_CLIENT_ID.");
      return;
    }
    if (loading) return;

    cleanup();
    setLoading(true);

    const callbackUrl = `${window.location.origin}/oauth/google/callback`;
    const nonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const state = Math.random().toString(36).substring(2);
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: callbackUrl,
      response_type: "id_token",
      scope: "openid email profile",
      prompt: "select_account",
      nonce: nonce,
      state: state,
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    const w = 550, h = 650;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;

    const popup = window.open(
      url, "google-oauth",
      `width=${w},height=${h},left=${left},top=${top},resizable,scrollbars`
    );

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      setLoading(false);
      onError("Popup was blocked by the browser. Please allow popups for this site.");
      return;
    }

    popupRef.current = popup;

    // Monitor if the user manually closes the popup window
    timerRef.current = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        setLoading(false);
      }
    }, 1000);
  };

  return (
    <OAuthBtn
      onClick={handleClick}
      disabled={loading}
      isLoading={loading}
      loadingLabel="Signing in with Google…"
      label={label}
      icon={loading ? <Spinner /> : <GoogleIcon />}
      style={{
        background: "#fff",
        border: "1.5px solid #E5E7EB",
        color: "#374151",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    />
  );
}

// ─── GitHub Button ────────────────────────────────────────────────────────────

function OAuthBtn({
  onClick,
  disabled,
  icon,
  label,
  loadingLabel,
  isLoading,
  style,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  loadingLabel?: string;
  isLoading?: boolean;
  style?: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "11px 20px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s",
        opacity: disabled ? 0.55 : 1,
        filter: hovered && !disabled ? "brightness(0.9)" : "none",
        transform: hovered && !disabled ? "translateY(-1px)" : "none",
        ...style,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {icon}
      {isLoading ? (loadingLabel ?? "Signing in…") : label}
    </button>
  );
}

function GitHubOAuthButton({
  onSuccess,
  onError,
  label,
}: {
  onSuccess: (user: OAuthUser) => void;
  onError: (msg: string) => void;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "GITHUB_OAUTH_CODE") return;

      const code = event.data.code as string;
      popupRef.current?.close();
      setLoading(true);

      try {
        const res = await fetch(`${API_BASE}/auth/github/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Bypass-Tunnel-Reminder": "1" },
          body: JSON.stringify({ code }),
        }).then((r) => r.json());

        if (res.success) {
          saveAuthData(res.data);
          onSuccess(res.data.user);
        } else {
          onError(res.message || "GitHub sign-in failed");
        }
      } catch {
        onError("GitHub authentication failed. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onSuccess, onError]);

  const handleClick = () => {
    if (!GITHUB_CLIENT_ID) {
      onError("GitHub OAuth is not configured. Contact support.");
      return;
    }
    if (loading) return;

    const callbackUrl = `${window.location.origin}/oauth/github/callback`;
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: callbackUrl,
      scope: "user:email",
      state: Math.random().toString(36).slice(2),
    });

    const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
    const w = 600, h = 700;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    popupRef.current = window.open(
      url, "github-oauth",
      `width=${w},height=${h},left=${left},top=${top},resizable,scrollbars`
    );
  };

  return (
    <OAuthBtn
      onClick={handleClick}
      disabled={loading}
      isLoading={loading}
      loadingLabel="Signing in with GitHub…"
      label={label}
      icon={loading ? <Spinner /> : <GitHubIcon />}
      style={{
        background: "#24292F",
        border: "1.5px solid #24292F",
        color: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
      }}
    />
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function OAuthButtons({
  onSuccess,
  onError,
  googleLabel = "Continue with Google",
  githubLabel = "Continue with GitHub",
}: OAuthButtonsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <GoogleOAuthButton onSuccess={onSuccess} onError={onError} label={googleLabel} />
      <GitHubOAuthButton onSuccess={onSuccess} onError={onError} label={githubLabel} />
    </div>
  );
}
