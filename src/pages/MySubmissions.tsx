import { AppLayout } from "@/components/AppLayout";
import { MySubmissions } from "@/components/dashboard/MySubmissions";

export default function MySubmissionsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            My Submissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Track the status of your submitted health observations.
          </p>
        </div>
        <MySubmissions />
      </div>
    </AppLayout>
  );
}
