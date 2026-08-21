import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

interface TwoFAData {
  secret: string;
  qr_code_base64: string;
  backup_codes?: string[];
}

export default function SecuritySettings() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [twoFAMethod, setTwoFAMethod] = useState<string | null>(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState<TwoFAData | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const fetchSecurityData = async () => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("access_token")}` };
      const [sessRes, histRes, twoFaRes] = await Promise.all([
        axios.get(`${API_BASE}/auth/sessions/`, { headers }),
        axios.get(`${API_BASE}/auth/login-history/`, { headers }),
        axios.get(`${API_BASE}/auth/2fa/`, { headers }).catch(() => null)
      ]);
      setSessions(sessRes.data.data);
      setHistory(histRes.data.data);
      if (twoFaRes && twoFaRes.data.success) {
        setIs2FAEnabled(twoFaRes.data.data.two_factor_enabled);
        setTwoFAMethod(twoFaRes.data.data.two_factor_method);
      }
    } catch (err) {
      toast.error("Failed to load security data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const revokeSession = async (id: number) => {
    try {
      await axios.delete(`${API_BASE}/auth/session/${id}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      toast.success("Session terminated");
      fetchSecurityData();
    } catch (err) {
      toast.error("Failed to terminate session");
    }
  };

  const initiate2FASetup = async () => {
    try {
      const res = await axios.post(`${API_BASE}/auth/2fa/`, { action: "enable" }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      if (res.data.success) {
        setTotpSetupData(res.data.data);
        setShow2FAModal(true);
      }
    } catch (err) {
      toast.error("Failed to setup 2FA");
    }
  };

  const confirmEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode || verifyCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    setVerifying(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/2fa/`, {
        action: "verify_enable",
        code: verifyCode
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      if (res.data.success) {
        toast.success("Google Authenticator 2FA enabled successfully!");
        setShow2FAModal(false);
        setVerifyCode("");
        fetchSecurityData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid verification code");
    } finally {
      setVerifying(false);
    }
  };

  const disable2FA = async () => {
    if (!window.confirm("Are you sure you want to disable Two-Factor Authentication?")) return;
    try {
      const res = await axios.post(`${API_BASE}/auth/2fa/`, { action: "disable" }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
      });
      if (res.data.success) {
        toast.success("2FA has been disabled");
        fetchSecurityData();
      }
    } catch (err) {
      toast.error("Failed to disable 2FA");
    }
  };

  if (loading) return <div className="p-8">Loading security settings...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Security Settings</h1>

      <section className="mb-12 bg-white p-6 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Two-Factor Authentication (Google Authenticator)</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${is2FAEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
            {is2FAEnabled ? `Active (${twoFAMethod === 'totp' ? 'Google Authenticator' : twoFAMethod})` : "Disabled"}
          </span>
        </div>
        <p className="text-gray-600 mb-6">
          Enhance your account security by linking Google Authenticator or any TOTP app to require a verification code during sign in.
        </p>

        {is2FAEnabled ? (
          <button onClick={disable2FA} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition">
            Disable Google Authenticator
          </button>
        ) : (
          <button onClick={initiate2FASetup} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Set Up Google Authenticator
          </button>
        )}
      </section>

      {/* 2FA Setup Modal */}
      {show2FAModal && totpSetupData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full relative shadow-xl">
            <button
              onClick={() => setShow2FAModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Google Authenticator Setup</h3>
            <p className="text-sm text-gray-600 mb-4">
              Scan the QR code below using your Google Authenticator app, or enter the secret key manually.
            </p>

            <div className="flex justify-center mb-4 p-2 bg-gray-50 rounded border">
              <img
                src={`data:image/png;base64,${totpSetupData.qr_code_base64}`}
                alt="Google Authenticator QR Code"
                className="w-48 h-48 object-contain"
              />
            </div>

            <div className="mb-4 text-center">
              <span className="text-xs text-gray-500 block">Manual Entry Secret Key:</span>
              <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm select-all font-mono">
                {totpSetupData.secret}
              </code>
            </div>

            {totpSetupData.backup_codes && totpSetupData.backup_codes.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-amber-900">Emergency Backup Codes (Save these safely):</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(totpSetupData.backup_codes?.join("\n") || "");
                      toast.success("Emergency backup codes copied to clipboard!");
                    }}
                    className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 px-2 py-0.5 rounded font-medium"
                  >
                    Copy Codes
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 font-mono text-xs text-amber-800 bg-white p-2 rounded border border-amber-100">
                  {totpSetupData.backup_codes.map((code, idx) => (
                    <span key={idx} className="text-center">{code}</span>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={confirmEnable2FA} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter 6-digit Authenticator Code:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-center tracking-widest text-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShow2FAModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {verifying ? "Verifying..." : "Enable 2FA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="mb-12 bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Active Sessions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="pb-2">Device</th>
                <th className="pb-2">IP Address</th>
                <th className="pb-2">Last Activity</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} className="border-b">
                  <td className="py-3">{s.os} - {s.browser}</td>
                  <td>{s.ip_address}</td>
                  <td>{new Date(s.last_activity).toLocaleString()}</td>
                  <td>
                    <button onClick={() => revokeSession(s.id)} className="text-red-600 hover:underline">
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Login History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="pb-2">Date</th>
                <th className="pb-2">Device</th>
                <th className="pb-2">IP Address</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{new Date(h.created_at).toLocaleString()}</td>
                  <td>{h.os} - {h.browser}</td>
                  <td>{h.ip_address}</td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs ${h.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
