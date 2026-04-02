import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Activity,
  LayoutDashboard,
  FileText,
  ShieldCheck,
  ClipboardList,
  LogOut,
  Menu,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Submit Observation", href: "/submit", icon: FileText, roles: ["volunteer", "doctor"] as const },
  { label: "My Submissions", href: "/my-submissions", icon: ClipboardList, roles: ["volunteer", "doctor"] as const },
  { label: "Validations", href: "/validations", icon: ShieldCheck, roles: ["doctor"] as const },
  { label: "Admin Panel", href: "/admin", icon: Settings, roles: ["admin"] as const },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, displayName, roles, hasRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const visibleItems = navItems.filter(
    (item) =>
      !item.roles || item.roles.some((r) => hasRole(r)) || hasRole("admin")
  );

  const roleLabel = roles.length > 0 ? roles[0].charAt(0).toUpperCase() + roles[0].slice(1) : "User";

  return (
    <div className="min-h-screen bg-background">
      {/* Top navbar */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="flex flex-col gap-2 mt-8">
                  <div className="flex items-center gap-2.5 mb-6">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                      <Activity className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span className="font-display text-lg font-bold">MedPulse</span>
                  </div>
                  {visibleItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        location.pathname === item.href
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-foreground hidden sm:inline">
                MedPulse
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  location.pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-foreground leading-tight">
                  {displayName || user?.email?.split("@")[0] || "User"}
                </span>
                <span className="text-xs text-muted-foreground">{roleLabel}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
