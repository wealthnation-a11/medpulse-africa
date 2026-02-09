import { AppLayout } from "@/components/AppLayout";
import { ObservationForm } from "@/components/observation/ObservationForm";

export default function SubmitObservation() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">
            Submit Health Observation
          </h1>
          <p className="text-muted-foreground mt-2">
            Report health symptoms observed in your community to help detect
            potential outbreaks early. All submissions are reviewed by medical
            professionals.
          </p>
        </div>
        <ObservationForm />
      </div>
    </AppLayout>
  );
}
