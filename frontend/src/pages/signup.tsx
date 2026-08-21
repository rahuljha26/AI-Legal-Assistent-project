import { useState } from "react";
import OAuthButtons, { OAuthDivider, type OAuthUser } from "../components/OAuthButtons";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";


// ─── API helpers ──────────────────────────────────────────────────────────────
const api = {
  signup: (data: Record<string, any>) =>
    fetch(`${API_BASE}/auth/signup/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  login: (data: Record<string, any>) =>
    fetch(`${API_BASE}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  googleAuth: (token: string) =>
    fetch(`${API_BASE}/auth/google/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then((r) => r.json()),
};

// ─── Icons ────────────────────────────────────────────────────────────────────


const EyeIcon = ({ open }: { open: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SpinnerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const ScalesIcon = () => (
  <svg width="48" height="48" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="32" y1="8" x2="32" y2="56" />
    <line x1="16" y1="56" x2="48" y2="56" />
    <line x1="8" y1="20" x2="56" y2="20" />
    <line x1="8" y1="20" x2="20" y2="36" />
    <line x1="56" y1="20" x2="44" y2="36" />
    <path d="M8 36 Q14 42 20 36" />
    <path d="M44 36 Q50 42 56 36" />
    <circle cx="32" cy="8" r="3" fill="currentColor" stroke="none" />
  </svg>
);

// ─── Password strength checker ────────────────────────────────────────────────
function getPasswordStrength(pw: string) {
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
type ToastItem = { id: number; message: string; type: string };

function Toast({ toasts, remove }: { toasts: ToastItem[]; remove: (id: number) => void }) {
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

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const add = (message: string, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => remove(id), 4000);
  };
  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));
  return { toasts, toast: add, remove };
}

// ─── Shared Input component ───────────────────────────────────────────────────
interface InputProps {
  label: any;
  type?: string;
  value: string;
  onChange: any;
  placeholder?: string;
  error?: string | null | boolean;
  hint?: string;
  rightEl?: any;
  required?: boolean;
}

function Input({ label, type = "text", value, onChange, placeholder, error, hint, rightEl, required }: InputProps) {
  return (
    <div style={{ marginBottom: error ? 6 : 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#EF4444", marginLeft: 3 }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete="off"
          style={{
            width: "100%", padding: rightEl ? "11px 44px 11px 14px" : "11px 14px",
            border: `1.5px solid ${error ? "#FCA5A5" : "#E5E7EB"}`,
            borderRadius: 10, fontSize: 14, color: "#111827",
            background: error ? "#FFF5F5" : "#FAFAFA",
            outline: "none", fontFamily: "inherit", transition: "border 0.2s, background 0.2s",
            boxSizing: "border-box",
          }}
          onFocus={(e) => { e.target.style.border = `1.5px solid ${error ? "#EF4444" : "#6366F1"}`; e.target.style.background = "#fff"; }}
          onBlur={(e) => { e.target.style.border = `1.5px solid ${error ? "#FCA5A5" : "#E5E7EB"}`; e.target.style.background = error ? "#FFF5F5" : "#FAFAFA"; }}
        />
        {rightEl && (
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", cursor: "pointer" }}>
            {rightEl}
          </div>
        )}
      </div>
      {error && <p style={{ margin: "4px 0 10px", fontSize: 12, color: "#EF4444" }}>{error}</p>}
      {hint && !error && <p style={{ margin: "4px 0 10px", fontSize: 12, color: "#9CA3AF" }}>{hint}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGN UP PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function SignUpPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { toasts, toast, remove } = useToast();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm_password: "", role: "user" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const pwStrength = getPasswordStrength(form.password);

  const set = (field: string) => (e: any) => setForm({ ...form, [field]: e.target.value });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim()) e.full_name = "Full name is required";
    else if (form.full_name.trim().length < 2) e.full_name = "Name must be at least 2 characters";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (!form.confirm_password) e.confirm_password = "Please confirm your password";
    else if (form.password !== form.confirm_password) e.confirm_password = "Passwords do not match";
    if (!agreed) e.agreed = "You must accept the terms to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.signup({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirm_password: form.confirm_password,
        role: form.role,
      });
      if (res.success) {
        setSuccess(true);
        toast("Account created! Redirecting to login…", "success");
        setTimeout(() => onNavigate("login"), 2000);
      } else {
        // Check res.errors (serializer field errors) first, then res.data
        const fieldErrSource =
          (res.errors && typeof res.errors === "object" && Object.keys(res.errors).length > 0)
            ? res.errors
            : (res.data && typeof res.data === "object" ? res.data : null);

        if (fieldErrSource) {
          const fieldErrors: Record<string, string> = {};
          Object.entries(fieldErrSource).forEach(([k, v]) => {
            fieldErrors[k] = Array.isArray(v) ? v[0] : String(v);
          });
          setErrors(fieldErrors);
        } else {
          toast(res.message || "Sign up failed. Please try again.", "error");
        }
      }
    } catch {
      toast("Connection error. Please check your internet and try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSuccess = (user: OAuthUser) => {
    toast(`Welcome, ${user.full_name}!`, "success");
    setTimeout(() => {
      if (user.role === "admin") window.location.href = "/admin/dashboard";
      else if (user.role === "advocate") window.location.href = "/advocate/dashboard";
      else window.location.href = "/dashboard";
    }, 1000);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'DM Sans', sans-serif" }}>
      <Toast toasts={toasts} remove={remove} />

      {/* Left panel */}
      <div style={{
        width: "42%", background: "linear-gradient(160deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)",
        display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px 52px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }} />
        <div style={{ position: "absolute", bottom: 60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.12)" }} />
        <div style={{ position: "absolute", top: "50%", left: "60%", width: 120, height: 120, borderRadius: "50%", background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.1)" }} />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 64 }}>
            <div style={{ color: "#818CF8" }}><ScalesIcon /></div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>AI Legal Assistant</span>
          </div>
          <div style={{ color: "#818CF8", fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>
            Get started free
          </div>
          <h2 style={{ color: "#fff", fontSize: 36, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-1px", margin: "0 0 20px" }}>
            Justice made accessible with AI
          </h2>
          <p style={{ color: "#94A3B8", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            Get instant legal guidance powered by the Indian Constitution and Gemini AI. Free for every citizen.
          </p>
        </div>

        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { icon: "⚖️", title: "AI legal guidance", desc: "Instant answers backed by Indian Constitution" },
            { icon: "📄", title: "Document generator", desc: "Create legal notices and affidavits in seconds" },
            { icon: "🔒", title: "Secure & private", desc: "Your data is encrypted and never shared" },
          ].map((item) => (
            <div key={item.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                {item.icon}
              </div>
              <div>
                <div style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                <div style={{ color: "#64748B", fontSize: 12 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          {success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#ECFDF5", border: "2px solid #6EE7B7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32 }}>✓</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 8 }}>You're all set!</h2>
              <p style={{ color: "#6B7280", fontSize: 15 }}>Account created. Redirecting you to login…</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.5px", margin: "0 0 6px" }}>Create your account</h1>
                <p style={{ color: "#6B7280", fontSize: 15, margin: 0 }}>Start your free legal journey today</p>
              </div>

              {/* Google + GitHub sign-up */}
              <OAuthButtons
                onSuccess={handleOAuthSuccess}
                onError={(msg) => toast(msg, "error")}
                googleLabel="Sign up with Google"
                githubLabel="Sign up with GitHub"
              />

              <OAuthDivider text="or sign up with email" />

              <form onSubmit={handleSubmit} noValidate>
                <Input
                  label="Full name" value={form.full_name} onChange={set("full_name")}
                  placeholder="Rahul Jha" error={errors.full_name} required
                />
                <Input
                  label="Email address" type="email" value={form.email} onChange={set("email")}
                  placeholder="you@example.com" error={errors.email} required
                />

                {/* Password with strength meter */}
                <div style={{ marginBottom: 6 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
                    Password <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPw ? "text" : "password"} value={form.password}
                      onChange={set("password")} placeholder="Min. 8 characters"
                      style={{
                        width: "100%", padding: "11px 44px 11px 14px",
                        border: `1.5px solid ${errors.password ? "#FCA5A5" : "#E5E7EB"}`,
                        borderRadius: 10, fontSize: 14, color: "#111827",
                        background: errors.password ? "#FFF5F5" : "#FAFAFA",
                        outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = "#6366F1"; e.target.style.background = "#fff"; }}
                      onBlur={(e) => { e.target.style.borderColor = errors.password ? "#FCA5A5" : "#E5E7EB"; e.target.style.background = errors.password ? "#FFF5F5" : "#FAFAFA"; }}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", padding: 0 }}>
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                  {errors.password && <p style={{ margin: "4px 0 6px", fontSize: 12, color: "#EF4444" }}>{errors.password}</p>}
                  {form.password && (
                    <div style={{ marginTop: 8, marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= pwStrength.score ? pwStrength.color : "#E5E7EB", transition: "background 0.3s" }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: pwStrength.color }}>{pwStrength.label}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>
                    Confirm password <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirm ? "text" : "password"} value={form.confirm_password}
                      onChange={set("confirm_password")} placeholder="Repeat password"
                      style={{
                        width: "100%", padding: "11px 44px 11px 14px",
                        border: `1.5px solid ${errors.confirm_password ? "#FCA5A5" : form.confirm_password && form.confirm_password === form.password ? "#6EE7B7" : "#E5E7EB"}`,
                        borderRadius: 10, fontSize: 14, color: "#111827",
                        background: errors.confirm_password ? "#FFF5F5" : "#FAFAFA",
                        outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = "#6366F1"; e.target.style.background = "#fff"; }}
                      onBlur={(e) => { e.target.style.borderColor = errors.confirm_password ? "#FCA5A5" : "#E5E7EB"; }}
                    />
                    <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 6 }}>
                      {form.confirm_password && form.confirm_password === form.password && (
                        <span style={{ color: "#10B981" }}><CheckIcon /></span>
                      )}
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", padding: 0 }}>
                        <EyeIcon open={showConfirm} />
                      </button>
                    </div>
                  </div>
                  {errors.confirm_password && <p style={{ margin: "4px 0 10px", fontSize: 12, color: "#EF4444" }}>{errors.confirm_password}</p>}
                </div>

                {/* Role selector */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>
                    I am a <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[
                      { value: "user", label: "Citizen / User", icon: "👤" },
                      { value: "advocate", label: "Advocate", icon: "⚖️" },
                    ].map((r) => (
                      <button
                        key={r.value} type="button"
                        onClick={() => setForm({ ...form, role: r.value })}
                        style={{
                          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                          fontWeight: 600, fontSize: 13, transition: "all 0.2s",
                          border: `2px solid ${form.role === r.value ? "#6366F1" : "#E5E7EB"}`,
                          background: form.role === r.value ? "#EEF2FF" : "#fff",
                          color: form.role === r.value ? "#4338CA" : "#6B7280",
                        }}
                      >
                        <span>{r.icon}</span>{r.label}
                      </button>
                    ))}
                  </div>
                  {form.role === "advocate" && (
                    <p style={{ margin: "8px 0 0", fontSize: 12, color: "#D97706", background: "#FFFBEB", padding: "8px 12px", borderRadius: 8, border: "1px solid #FDE68A" }}>
                      ⚠️ Advocate accounts require admin verification before activation.
                    </p>
                  )}
                </div>

                {/* Terms checkbox */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                    <div
                      onClick={() => { setAgreed(!agreed); setErrors({ ...errors, agreed: "" }); }}
                      style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
                        border: `2px solid ${errors.agreed ? "#EF4444" : agreed ? "#6366F1" : "#D1D5DB"}`,
                        background: agreed ? "#6366F1" : "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s", cursor: "pointer",
                      }}
                    >
                      {agreed && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
                      I agree to the{" "}
                      <a href="#" style={{ color: "#6366F1", fontWeight: 600 }}>Terms of Service</a>
                      {" "}and{" "}
                      <a href="#" style={{ color: "#6366F1", fontWeight: 600 }}>Privacy Policy</a>
                    </span>
                  </label>
                  {errors.agreed && <p style={{ margin: "4px 0 0 28px", fontSize: 12, color: "#EF4444" }}>{errors.agreed}</p>}
                </div>

                <button
                  type="submit" disabled={loading}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "13px 24px", background: loading ? "#A5B4FC" : "#4F46E5",
                    color: "#fff", border: "none", borderRadius: 10, fontSize: 15,
                    fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "inherit", transition: "all 0.2s", letterSpacing: "-0.2px",
                  }}
                  onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#4338CA"; }}
                  onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#4F46E5"; }}
                >
                  {loading ? <><SpinnerIcon /> Creating account…</> : "Create account →"}
                </button>
              </form>

              <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#6B7280" }}>
                Already have an account?{" "}
                <button onClick={() => onNavigate("login")} style={{ background: "none", border: "none", color: "#4F46E5", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function LoginPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { toasts, toast, remove } = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const set = (field: string) => (e: any) => setForm({ ...form, [field]: e.target.value });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address";
    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const redirectByRole = (role: string) => {
    const routes: Record<string, string> = {
      super_admin: "/admin/dashboard",
      admin: "/admin/dashboard",
      lawyer: "/advocate/dashboard",
      advocate: "/advocate/dashboard",
      user: "/dashboard",
      citizen: "/dashboard",
    };
    window.location.href = routes[role] || "/dashboard";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.login({ email: form.email.trim().toLowerCase(), password: form.password });
      if (res.success) {
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("refresh_token", res.data.refresh_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        toast(`Welcome back, ${res.data.user.full_name}!`, "success");
        setTimeout(() => redirectByRole(res.data.user.role), 1000);
      } else {
        toast(res.message || "Invalid email or password.", "error");
        setErrors({ password: "Incorrect email or password" });
      }
    } catch {
      toast("Connection error. Please check your internet and try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSuccess = (user: OAuthUser) => {
    toast(`Welcome back, ${user.full_name}!`, "success");
    setTimeout(() => redirectByRole(user.role), 1000);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'DM Sans', sans-serif" }}>
      <Toast toasts={toasts} remove={remove} />

      {/* Left panel */}
      <div style={{
        width: "42%", background: "linear-gradient(160deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)",
        display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "48px 52px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }} />
        <div style={{ position: "absolute", bottom: 60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.12)" }} />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 80 }}>
            <div style={{ color: "#818CF8" }}><ScalesIcon /></div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>AI Legal Assistant</span>
          </div>
          <div style={{ color: "#818CF8", fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>
            Welcome back
          </div>
          <h2 style={{ color: "#fff", fontSize: 36, fontWeight: 800, lineHeight: 1.2, letterSpacing: "-1px", margin: "0 0 20px" }}>
            Your legal assistant is ready
          </h2>
          <p style={{ color: "#94A3B8", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            Continue where you left off. Your advice history, documents, and cases are waiting.
          </p>
        </div>

        {/* Testimonial */}
        <div style={{ position: "relative", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px" }}>
          <p style={{ color: "#CBD5E1", fontSize: 14, lineHeight: 1.7, margin: "0 0 16px", fontStyle: "italic" }}>
            "Finally understood my rights as a tenant. The AI explained it so clearly, I filed the complaint myself!"
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#4F46E5", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>RS</div>
            <div>
              <div style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 600 }}>Ritu Sharma</div>
              <div style={{ color: "#64748B", fontSize: 12 }}>Citizen, Mumbai</div>
            </div>
            <div style={{ marginLeft: "auto", color: "#FBBF24", fontSize: 13 }}>★★★★★</div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 40px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", letterSpacing: "-0.5px", margin: "0 0 6px" }}>Sign in</h1>
            <p style={{ color: "#6B7280", fontSize: 15, margin: 0 }}>Login to your AI Legal Assistant account</p>
          </div>

          {/* Google + GitHub sign-in */}
          <OAuthButtons
            onSuccess={handleOAuthSuccess}
            onError={(msg) => toast(msg, "error")}
            googleLabel="Continue with Google"
            githubLabel="Continue with GitHub"
          />

          <OAuthDivider text="or sign in with email" />

          <form onSubmit={handleSubmit} noValidate>
            <Input
              label="Email address" type="email" value={form.email} onChange={set("email")}
              placeholder="you@example.com" error={errors.email} required
            />

            <div style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  Password <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <button type="button" style={{ background: "none", border: "none", fontSize: 13, color: "#6366F1", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Forgot password?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"} value={form.password}
                  onChange={set("password")} placeholder="Your password"
                  style={{
                    width: "100%", padding: "11px 44px 11px 14px",
                    border: `1.5px solid ${errors.password ? "#FCA5A5" : "#E5E7EB"}`,
                    borderRadius: 10, fontSize: 14, color: "#111827",
                    background: errors.password ? "#FFF5F5" : "#FAFAFA",
                    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "#6366F1"; e.target.style.background = "#fff"; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.password ? "#FCA5A5" : "#E5E7EB"; }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", padding: 0 }}>
                  <EyeIcon open={showPw} />
                </button>
              </div>
              {errors.password && <p style={{ margin: "4px 0 10px", fontSize: 12, color: "#EF4444" }}>{errors.password}</p>}
            </div>

            {/* Remember me */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, marginTop: 8 }}>
              <div
                onClick={() => setRememberMe(!rememberMe)}
                style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  border: `2px solid ${rememberMe ? "#6366F1" : "#D1D5DB"}`,
                  background: rememberMe ? "#6366F1" : "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s", cursor: "pointer",
                }}
              >
                {rememberMe && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 13, color: "#6B7280", cursor: "pointer" }} onClick={() => setRememberMe(!rememberMe)}>
                Remember me for 7 days
              </span>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "13px 24px", background: loading ? "#A5B4FC" : "#4F46E5",
                color: "#fff", border: "none", borderRadius: 10, fontSize: 15,
                fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "all 0.2s", letterSpacing: "-0.2px",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#4338CA"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#4F46E5"; }}
            >
              {loading ? <><SpinnerIcon /> Signing in…</> : "Sign in →"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "#6B7280" }}>
            Don't have an account?{" "}
            <button onClick={() => onNavigate("signup")} style={{ background: "none", border: "none", color: "#4F46E5", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
              Sign up free
            </button>
          </p>

          {/* Role hint */}
          <div style={{ marginTop: 32, padding: "14px 16px", background: "#EEF2FF", borderRadius: 10, border: "1px solid #C7D2FE" }}>
            <p style={{ margin: 0, fontSize: 12, color: "#4338CA", fontWeight: 600, marginBottom: 6 }}>After sign-in, you'll be redirected to:</p>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#6366F1" }}>
              <span>👤 User → /dashboard</span>
              <span>⚖️ Advocate → /advocate</span>
              <span>🛡️ Admin → /admin</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT — toggle between pages
// ═══════════════════════════════════════════════════════════════════════════════
export default function AuthApp() {
  const [page, setPage] = useState("signup");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
      {page === "signup"
        ? <SignUpPage onNavigate={setPage} />
        : <LoginPage onNavigate={setPage} />}
    </>
  );
}
