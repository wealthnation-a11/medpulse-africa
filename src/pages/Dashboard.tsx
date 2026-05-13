import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

/**
 * Smart redirect — sends each user to their role-specific dashboard.
 * /dashboard/doctor, /dashboard/volunteer, /dashboard/patient, or /admin.
 */
export default function Dashboard() {
  const { loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasRole("doctor")) return <Navigate to="/dashboard/doctor" replace />;
  if (hasRole("volunteer")) return <Navigate to="/dashboard/volunteer" replace />;
  if (hasRole("patient")) return <Navigate to="/dashboard/patient" replace />;
  if (hasRole("admin")) return <Navigate to="/admin" replace />;

  return <Navigate to="/auth" replace />;
}
