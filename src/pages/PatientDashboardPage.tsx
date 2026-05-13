import { AppLayout } from "@/components/AppLayout";
import { PatientDashboard } from "@/components/dashboard/PatientDashboard";
import { useAuth } from "@/hooks/useAuth";

export default function PatientDashboardPage() {
  const { displayName } = useAuth();
  return (
    <AppLayout>
      <PatientDashboard displayName={displayName} />
    </AppLayout>
  );
}