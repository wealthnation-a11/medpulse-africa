import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ArrowLeft, Loader2, Stethoscope, HeartHandshake, User, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Mode = "login" | "signup";
type SelectedRole = "volunteer" | "doctor" | "patient";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  const defaultRole: SelectedRole =
    roleParam === "doctor" ? "doctor" : roleParam === "patient" ? "patient" : "volunteer";

  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<SelectedRole>(defaultRole);
  const [patientIdentifier, setPatientIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && role === "doctor") {
      toast({
        title: "Doctor accounts require approval",
        description:
          "For patient safety, clinician accounts must be provisioned by an administrator. Please contact your MedPulse admin.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);

    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password, displayName, role, patientIdentifier);
        if (error) {
          toast({ title: "Signup failed", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Account created!", description: "Welcome to MedPulse!" });
          navigate("/dashboard");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: "Login failed", description: error.message, variant: "destructive" });
        } else {
          navigate("/dashboard");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      <div className="container mx-auto px-4 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
                <Activity className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-display">
              {mode === "signup" ? "Create Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription>
              {mode === "signup"
                ? "Join MedPulse to help detect disease outbreaks"
                : "Sign in to your MedPulse account"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role selection — always visible */}
              <div className="space-y-2">
                <Label>{mode === "signup" ? "I want to join as" : "I am signing in as"}</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("volunteer")}
                    className={`rounded-lg border-2 p-3 text-center transition-all ${
                      role === "volunteer"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <HeartHandshake className={`h-6 w-6 mx-auto mb-1.5 ${role === "volunteer" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="font-semibold text-sm">Volunteer</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Reporter</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("doctor")}
                    className={`rounded-lg border-2 p-3 text-center transition-all ${
                      role === "doctor"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Stethoscope className={`h-6 w-6 mx-auto mb-1.5 ${role === "doctor" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="font-semibold text-sm">Doctor</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Clinical</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("patient")}
                    className={`rounded-lg border-2 p-3 text-center transition-all ${
                      role === "patient"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <User className={`h-6 w-6 mx-auto mb-1.5 ${role === "patient" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="font-semibold text-sm">Patient</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">My health</div>
                  </button>
                </div>
              </div>

              {mode === "signup" && role === "doctor" && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                  <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Doctor accounts must be provisioned by an administrator. Sign in if your admin has already created your account, or contact your MedPulse admin to request access.
                  </span>
                </div>
              )}

              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder={role === "doctor" ? "Dr. Jane Doe" : "Jane Doe"}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              )}

              {mode === "signup" && role === "patient" && (
                <div className="space-y-2">
                  <Label htmlFor="mrn">Medical Record Number (optional)</Label>
                  <Input
                    id="mrn"
                    placeholder="e.g. MRN-00123"
                    value={patientIdentifier}
                    onChange={(e) => setPatientIdentifier(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Link your account to existing screenings entered by your clinician.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting || (mode === "signup" && role === "doctor")}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signup" ? "Create Account" : `Sign In as ${role === "doctor" ? "Doctor" : "Volunteer"}`}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button onClick={() => setMode("login")} className="font-medium text-primary hover:underline">
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <button onClick={() => setMode("signup")} className="font-medium text-primary hover:underline">
                    Sign up
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
