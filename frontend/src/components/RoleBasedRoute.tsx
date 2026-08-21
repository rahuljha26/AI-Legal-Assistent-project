import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermission?: string;
  redirectTo?: string;
}

export const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermission,
  redirectTo = "/login",
}) => {
  const { isLoggedIn, isLoading, user, hasRole, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Verifying RBAC permissions...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Permission Check
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            🚫
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Forbidden</h2>
          <p className="text-sm text-slate-400 mb-6">
            Your account does not possess the required permission (<code className="text-amber-400 bg-slate-800 px-2 py-0.5 rounded">{requiredPermission}</code>) to access this feature.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-semibold rounded-xl text-sm hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20"
          >
            Return to Safety
          </a>
        </div>
      </div>
    );
  }

  // Role Check
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    const roleCode = user.role_code || user.role;
    if (roleCode === "super_admin" || roleCode === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (roleCode === "lawyer" || roleCode === "advocate") {
      return <Navigate to="/advocate/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RoleBasedRoute;
