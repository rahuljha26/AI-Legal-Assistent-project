import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import VerifyEmail from "./pages/VerifyEmail";
import OTPVerification from "./pages/OTPVerification";
import SecuritySettings from "./pages/SecuritySettings";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import Login           from "./pages/Login";
import SignUp          from "./pages/SignUp";
import GitHubCallback  from "./pages/GitHubCallback";
import GoogleCallback  from "./pages/GoogleCallback";
import UserDashboard     from "./pages/UserDashboard";
import AdvocateDashboard from "./pages/AdvocateDashboard";
import AdminDashboard    from "./pages/AdminDashboard";
import DocumentGenerator from "./pages/DocumentGenerator";
import { GeminiChat } from "./components";
import MobileBottomNav from "./components/MobileBottomNav";

function ProtectedRoute({ children, roles, requiredPermission }: { children: React.ReactNode; roles?: string[]; requiredPermission?: string }) {
  const { isLoggedIn, isLoading, user, hasRole, hasPermission } = useAuth();
  if (isLoading) return <div style={{color:"#fff",textAlign:"center",marginTop:80}}>Verifying access...</div>;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  if (roles && roles.length > 0 && !hasRole(...roles)) {
    const roleCode = user?.role_code || user?.role;
    if (roleCode === "super_admin" || roleCode === "admin") return <Navigate to="/admin/dashboard" replace />;
    if (roleCode === "lawyer" || roleCode === "advocate") return <Navigate to="/advocate/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      {children}
      <GeminiChat />
      <MobileBottomNav />
    </>
  );
}

function SmartRedirect() {
  const { isLoggedIn, user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  const roleCode = user?.role_code || user?.role;
  if (roleCode === "super_admin" || roleCode === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (roleCode === "lawyer" || roleCode === "advocate") return <Navigate to="/advocate/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/"       element={<SmartRedirect />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-otp" element={<OTPVerification />} />
          <Route path="/security-settings" element={
            <ProtectedRoute>
              <SecuritySettings />
            </ProtectedRoute>
          } />
          <Route path="/admin/audit-logs" element={
            <ProtectedRoute roles={["admin"]}>
              <AdminAuditLogs />
            </ProtectedRoute>
          } />
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* GitHub OAuth callback — loaded in popup, sends code to opener */}
          <Route path="/oauth/github/callback" element={<GitHubCallback />} />

          {/* Google OAuth callback — loaded in popup, sends token to opener */}
          <Route path="/oauth/google/callback" element={<GoogleCallback />} />

          {/* Protected: citizen */}
          <Route path="/dashboard" element={
            <ProtectedRoute roles={["user"]}>
              <UserDashboard />
            </ProtectedRoute>
          } />

          {/* Protected: advocate */}
          <Route path="/advocate/dashboard" element={
            <ProtectedRoute roles={["advocate"]}>
              <AdvocateDashboard />
            </ProtectedRoute>
          } />

          {/* Protected: documents */}
          <Route path="/documents" element={
            <ProtectedRoute roles={["user","advocate"]}>
              <DocumentGenerator />
            </ProtectedRoute>
          } />

          {/* Protected: admin */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
