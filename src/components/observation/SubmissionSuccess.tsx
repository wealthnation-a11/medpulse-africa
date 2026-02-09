import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRiskBadgeClasses } from "@/lib/riskCalculation";
import { CheckCircle2, ArrowRight } from "lucide-react";

interface SubmissionSuccessProps {
  riskLevel: string;
  onSubmitAnother: () => void;
  onViewDashboard?: () => void;
}

export function SubmissionSuccess({
  riskLevel,
  onSubmitAnother,
  onViewDashboard,
}: SubmissionSuccessProps) {
  return (
    <div className="max-w-lg mx-auto py-12 text-center">
      <div className="flex justify-center mb-6">
        <div className="rounded-full bg-primary/10 p-4">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
      </div>
      <h2 className="text-2xl font-display font-bold mb-2">
        Observation Submitted Successfully
      </h2>
      <p className="text-muted-foreground mb-6">
        Your health observation has been recorded and will be reviewed by medical professionals.
      </p>
      <div className="flex justify-center mb-8">
        <Badge className={`text-lg px-4 py-2 ${getRiskBadgeClasses(riskLevel)}`}>
          Risk Level: {riskLevel}
        </Badge>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={onSubmitAnother} variant="outline">
          Submit Another Observation
        </Button>
        {onViewDashboard && (
          <Button onClick={onViewDashboard}>
            View Dashboard
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
